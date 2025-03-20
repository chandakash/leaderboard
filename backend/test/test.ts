import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, EntityManager } from 'typeorm';
import { User } from '../../entities/user.entity';
import { GameSession } from '../../entities/game-session.entity';
import { Leaderboard } from '../../entities/leaderboard.entity';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { CACHE_TOP_KEY, CACHE_TTL, TOP_LEADERBOARD_SIZE } from 'src/utils/Constants';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class LeaderboardService {
    private readonly logger = new Logger(LeaderboardService.name);
    private topUserIds: Set<number> = new Set();
    private lowestTopScore: number = 0;
    private lastCacheRefresh: number = 0;
    private readonly TOP_USERS_REFRESH_LOCK = 'top_users_refresh_lock';
    private isRefreshing: boolean = false;
    private cacheRefreshPromise: Promise<void> | null = null;
    private eventEmitter: EventEmitter2

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(GameSession)
        private gameSessionRepository: Repository<GameSession>,
        @InjectRepository(Leaderboard)
        private leaderboardRepository: Repository<Leaderboard>,
        private dataSource: DataSource,
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {
        this.refreshTopUsersCache();
    }

    async submitScore(submitScoreDto: SubmitScoreDto): Promise<Leaderboard> {
        const { user_id, score, game_mode } = submitScoreDto;

        const user = await this.userRepository.findOne({ where: { id: user_id } });
        if (!user) {
            throw new NotFoundException(`User with ID ${user_id} not found`);
        }

        // Ensure cache is refreshed before proceeding
        await this.ensureTopUsersCacheIsRefreshed();
        const isInTopLeaderboard = this.topUserIds.has(user_id);
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        
        // Use READ COMMITTED instead of REPEATABLE READ for better concurrency
        await queryRunner.startTransaction('READ COMMITTED');

        try {
            // Create game session
            const gameSession = this.gameSessionRepository.create({
                userId: user_id,
                score,
                gameMode: game_mode,
            });
            await queryRunner.manager.save(gameSession);

            // Get current score
            const currentUserScore = await queryRunner.query(
                `SELECT id, total_score FROM leaderboard WHERE user_id = $1 FOR UPDATE`,
                [user_id]
            );

            const userHadScore = currentUserScore.length > 0;
            const oldTotalScore = userHadScore ? currentUserScore[0].total_score : 0;
            const leaderboardId = userHadScore ? currentUserScore[0].id : null;
            const newTotalScore = oldTotalScore + score;

            const couldEnterTopLeaderboard = !isInTopLeaderboard && newTotalScore > this.lowestTopScore;
            
            let result;
            
            if (userHadScore) {
                // Update existing record with a direct update
                result = await queryRunner.query(
                    `UPDATE leaderboard 
                     SET total_score = total_score + $1
                     WHERE user_id = $2
                     RETURNING id, user_id, total_score`,
                    [score, user_id]
                );
            } else {
                // Insert new record
                result = await queryRunner.query(
                    `INSERT INTO leaderboard (user_id, total_score)
                     VALUES ($1, $2)
                     RETURNING id, user_id, total_score`,
                    [user_id, score]
                );
            }

            // Handle rank updates more efficiently
            if (isInTopLeaderboard || couldEnterTopLeaderboard) {
                await this.updateTopLeaderboardRanks(queryRunner.manager);
            } else {
                await this.updateSingleUserRank(queryRunner.manager, user_id, newTotalScore);
            }

            await queryRunner.commitTransaction();

            const leaderboardEntry = await this.leaderboardRepository.findOne({
                where: { id: result[0].id }
            });

            if (!leaderboardEntry) {
                throw new NotFoundException(`Leaderboard entry with ID ${result[0].id} not found`);
            }

            // Schedule cache updates asynchronously after transaction completes
            if (isInTopLeaderboard || couldEnterTopLeaderboard) {
                setImmediate(() => {
                    this.invalidateTopLeaderboardCache()
                        .then(() => this.refreshTopUsersCache())
                        .catch(err => {
                            this.logger.error('Failed to update cache:', err.message);
                        });
                });
            }
            // Notify about score submission via WebSocket
            if (leaderboardEntry) {
                const username = user.username || `User ${user_id}`;
                this.notifyScoreSubmission(user_id, score, username);
            }

            return leaderboardEntry;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to submit score: ${error.message}`, error.stack);
            throw new BadRequestException('Failed to submit score');
        } finally {
            await queryRunner.release();
        }
    }

    async getTopPlayers(limit: number = 10): Promise<LeaderboardEntryDto[]> {
        const cacheKey = CACHE_TOP_KEY;
        const cachedData = await this.cacheManager.get<LeaderboardEntryDto[]>(cacheKey);
        console.log({cacheConfig: this.cacheManager});
        if (cachedData) {
            this.logger.debug('Returning cached leaderboard data');
            return cachedData;
        }

        this.logger.debug('Cache miss for leaderboard data, querying database');

        const leaderboardEntries = await this.leaderboardRepository
            .createQueryBuilder('leaderboard')
            .innerJoin('leaderboard.user', 'user')
            .select([
                'leaderboard.userId as user_id',
                'user.username as username',
                'leaderboard.totalScore as total_score',
                'leaderboard.rank as rank',
            ])
            .orderBy('leaderboard.totalScore', 'DESC')
            .limit(limit)
            .getRawMany();

        await this.cacheManager.set(cacheKey, leaderboardEntries, CACHE_TTL);

        return leaderboardEntries;
    }

    async getPlayerRank(userId: number): Promise<LeaderboardEntryDto> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }
        const leaderboardEntry = await this.leaderboardRepository
            .createQueryBuilder('leaderboard')
            .innerJoin('leaderboard.user', 'user')
            .select([
                'leaderboard.userId as user_id',
                'user.username as username',
                'leaderboard.totalScore as total_score',
                'leaderboard.rank as rank',
            ])
            .where('leaderboard.userId = :userId', { userId })
            .getRawOne();

        if (!leaderboardEntry) {
            throw new NotFoundException(`Player with ID ${userId} not found on the leaderboard`);
        }

        return leaderboardEntry;
    }

    async getUserGameSessions(userId: number, limit: number = 10): Promise<GameSession[]> {
        return this.gameSessionRepository.find({
            where: { userId },
            order: { timestamp: 'DESC' },
            take: limit
        });
    }

    // Ensures cache is refreshed, but doesn't duplicate work if already in progress
    private async ensureTopUsersCacheIsRefreshed(): Promise<void> {
        // If cache was refreshed recently, just return
        if (Date.now() - this.lastCacheRefresh < 5000) {
            return;
        }
        
        // If a refresh is in progress, wait for it to complete
        if (this.cacheRefreshPromise) {
            await this.cacheRefreshPromise;
            return;
        }
        
        // Otherwise, start a new refresh
        this.cacheRefreshPromise = this.refreshTopUsersCache();
        await this.cacheRefreshPromise;
    }

    private async refreshTopUsersCache(): Promise<void> {
        if (this.isRefreshing) {
            return;
        }

        try {
            this.isRefreshing = true;
            
            // Use a distributed lock with a short TTL
            const lockValue = await this.cacheManager.get<string>(this.TOP_USERS_REFRESH_LOCK);
            if (lockValue && Date.now() - parseInt(lockValue) < 5000) {
                return;
            }
            
            await this.cacheManager.set(this.TOP_USERS_REFRESH_LOCK, Date.now().toString(), 10);
            const cacheKey = CACHE_TOP_KEY;
            const cachedData = await this.cacheManager.get<LeaderboardEntryDto[]>(cacheKey);

            if (cachedData && cachedData.length > 0) {
                this.topUserIds = new Set(cachedData.map(entry => entry.user_id));
                this.lowestTopScore = cachedData.length === TOP_LEADERBOARD_SIZE
                    ? cachedData[cachedData.length - 1].total_score
                    : 0;
                this.lastCacheRefresh = Date.now();

                this.logger.debug('Refreshed top users cache from Redis cache');
            } else {
                const topUsers = await this.leaderboardRepository
                    .createQueryBuilder('leaderboard')
                    .select(['leaderboard.userId as user_id', 'leaderboard.totalScore as total_score'])
                    .orderBy('leaderboard.totalScore', 'DESC')
                    .limit(TOP_LEADERBOARD_SIZE)
                    .getRawMany();

                this.topUserIds = new Set(topUsers.map(user => user.user_id));
                this.lowestTopScore = topUsers.length === TOP_LEADERBOARD_SIZE
                    ? topUsers[topUsers.length - 1].total_score
                    : 0;

                this.lastCacheRefresh = Date.now();

                this.logger.debug(`Refreshed top users cache from DB. Top users count: ${this.topUserIds.size}, Lowest score: ${this.lowestTopScore}`);
            }
        } catch (error) {
            this.logger.error(`Failed to refresh top users cache: ${error.message}`, error.stack);
        } finally {
            this.isRefreshing = false;
            this.cacheRefreshPromise = null;
            await this.cacheManager.del(this.TOP_USERS_REFRESH_LOCK);
        }
    }

    private async updateTopLeaderboardRanks(entityManager: EntityManager): Promise<void> {
        // More efficient update that minimizes locks and uses SKIP LOCKED for concurrency
        await entityManager.query(`
            WITH top_scores AS (
                SELECT id, total_score
                FROM leaderboard
                ORDER BY total_score DESC, id ASC
                LIMIT ${TOP_LEADERBOARD_SIZE}
                FOR UPDATE SKIP LOCKED
            ),
            ranked_scores AS (
                SELECT 
                    id,
                    RANK() OVER (ORDER BY total_score DESC, id ASC) as rank
                FROM top_scores
            )
            UPDATE leaderboard
            SET rank = ranked_scores.rank
            FROM ranked_scores
            WHERE leaderboard.id = ranked_scores.id
        `);
    }

    private async updateSingleUserRank(entityManager: EntityManager, userId: number, newTotalScore: number): Promise<void> {
        // Use a consistent ordering for tie-breaking
        const result = await entityManager.query(`
            SELECT COUNT(*) + 1 as rank
            FROM leaderboard
            WHERE total_score > $1 OR (total_score = $1 AND id < (SELECT id FROM leaderboard WHERE user_id = $2))
        `, [newTotalScore, userId]);

        await entityManager.query(`
            UPDATE leaderboard
            SET rank = $1
            WHERE user_id = $2
        `, [result[0].rank, userId]);
    }

    private async invalidateTopLeaderboardCache(): Promise<void> {
        try {
            this.logger.debug('Invalidating top leaderboard cache');
            await this.cacheManager.del(CACHE_TOP_KEY);
        } catch (error) {
            this.logger.warn('Cache invalidation failed:', error);
        }
    }
private notifyScoreSubmission(userId: number, score: number, username: string): void {
    this.eventEmitter.emit('leaderboard.score.submitted', {
        user_id: userId,
        score: score,
        username: username,
        timestamp: new Date()
    });
}
} 