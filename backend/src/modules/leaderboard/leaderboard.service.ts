import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
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
import {
  CACHE_TOP_KEY,
  CACHE_TTL,
  TOP_LEADERBOARD_SIZE,
} from 'src/utils/Constants';

// Redis sorted set key for leaderboard
const LEADERBOARD_REDIS_KEY = 'game:leaderboard:scores';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);
  private topUserIds: Set<number> = new Set();
  private lowestTopScore: number = 0;
  private lastCacheRefresh: number = 0;
  private readonly TOP_USERS_REFRESH_LOCK = 'top_users_refresh_lock';
  private isRefreshing: boolean = false;
  private cacheRefreshPromise: Promise<void> | null = null;

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
    this.syncLeaderboardToRedis();
  }

  // Sync the entire leaderboard to Redis sorted set
  private async syncLeaderboardToRedis(): Promise<void> {
    try {
      this.logger.log('Syncing leaderboard to Redis sorted set');
      
      // Get all leaderboard entries
      const allEntries = await this.leaderboardRepository
        .createQueryBuilder('leaderboard')
        .select(['leaderboard.userId', 'leaderboard.totalScore'])
        .getRawMany();

      // Clear existing sorted set
      const redisClient = (this.cacheManager as any).store.getClient();
      await redisClient.del(LEADERBOARD_REDIS_KEY);

      // If there are entries, add them to Redis sorted set
      if (allEntries.length > 0) {
        const zadd = redisClient.multi();
        for (const entry of allEntries) {
          zadd.zadd(LEADERBOARD_REDIS_KEY, entry.total_score, entry.user_id.toString());
        }
        await zadd.exec();
        this.logger.log(`Synced ${allEntries.length} entries to Redis leaderboard`);
      }
    } catch (error) {
      this.logger.error(`Failed to sync leaderboard to Redis: ${error.message}`, error.stack);
    }
  }

  async submitScore(submitScoreDto: SubmitScoreDto): Promise<Leaderboard> {
    // console.log({name: "submitScore"});
    const { user_id, score, game_mode } = submitScoreDto;

    const user = await this.userRepository.findOne({ where: { id: user_id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${user_id} not found`);
    }

    this.ensureTopUsersCacheIsRefreshed();
    const isInTopLeaderboard = this.topUserIds.has(user_id);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const gameSession = this.gameSessionRepository.create({
        userId: user_id,
        score,
        gameMode: game_mode,
      });
      await queryRunner.manager.save(gameSession);

      const currentUserScore = await queryRunner.query(
        `SELECT total_score FROM leaderboard WHERE user_id = $1 FOR UPDATE`,
        [user_id],
      );
      const userHadScore = currentUserScore.length > 0;
      const oldTotalScore = userHadScore ? currentUserScore[0].total_score : 0;
      const newTotalScore = oldTotalScore + score;
      this.logger.log(`Current user new total score: ${newTotalScore} for user id: ${user_id}`);
      const couldEnterTopLeaderboard = !isInTopLeaderboard && newTotalScore > this.lowestTopScore;

      const result = await queryRunner.query(
        `INSERT INTO leaderboard (user_id, total_score)
                    VALUES ($1, $2)
                    ON CONFLICT (user_id) 
                    DO UPDATE SET total_score = leaderboard.total_score + $2
                    RETURNING id, user_id, total_score`,
        [user_id, score],
      );

      // Update ranks in database for backward compatibility
      if (isInTopLeaderboard || couldEnterTopLeaderboard) {
        await this.updateTopLeaderboardRanks(queryRunner.manager);
      } else {
        await this.updateSingleUserRank(
          queryRunner.manager,
          user_id,
          newTotalScore,
        );
      }

      await queryRunner.commitTransaction();

      const leaderboardEntry = await this.leaderboardRepository.findOne({
        where: { id: result[0].id },
      });

      if (!leaderboardEntry) {
        throw new NotFoundException(
          `Leaderboard entry with ID ${result[0].id} not found`,
        );
      }

      // Update Redis sorted set
      const redisClient = (this.cacheManager as any).store.getClient();
      await redisClient.zadd(LEADERBOARD_REDIS_KEY, newTotalScore, user_id.toString());

      if (isInTopLeaderboard || couldEnterTopLeaderboard) {
        setImmediate(() => {
          this.invalidateTopLeaderboardCache()
            .then(() => this.refreshTopUsersCache())
            .catch((err) => {
              this.logger.error('Failed to update cache:', err.message);
            });
        });
      }

      return leaderboardEntry;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(
        `Failed to submit score: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException('Failed to submit score');
    } finally {
      await queryRunner.release();
    }
  }

  async getTopPlayers(limit: number = 10): Promise<LeaderboardEntryDto[]> {
    const cacheKey = CACHE_TOP_KEY;
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      this.logger.debug('Returning cached leaderboard data');
      return cachedData as LeaderboardEntryDto[];
    }

    this.logger.debug('Cache miss for leaderboard data, querying Redis sorted set');

    try {
      // Get top players from Redis sorted set with scores
      const redisClient = (this.cacheManager as any).store.getClient();
      const topScores = await redisClient.zrevrange(
        LEADERBOARD_REDIS_KEY, 
        0, 
        limit - 1, 
        'WITHSCORES'
      );

      // Format results
      const topPlayersArray: LeaderboardEntryDto[] = [];
      for (let i = 0; i < topScores.length; i += 2) {
        const userId = parseInt(topScores[i]);
        const score = parseInt(topScores[i + 1]);
        
        // Get user details
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user) {
          topPlayersArray.push({
            user_id: userId,
            username: user.username,
            total_score: score,
            rank: i / 2 + 1, // Calculate rank based on position
          });
        }
      }

      await this.cacheManager.set(cacheKey, topPlayersArray, CACHE_TTL);
      return topPlayersArray;
    } catch (error) {
      this.logger.error(`Error getting top players from Redis: ${error.message}`);
      
      // Fallback to database
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
  }

  async getPlayerRank(userId: number): Promise<LeaderboardEntryDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    try {
      // Get player rank from Redis sorted set
      const redisClient = (this.cacheManager as any).store.getClient();
      
      // Get player score
      const score = await redisClient.zscore(LEADERBOARD_REDIS_KEY, userId.toString());
      if (!score) {
        throw new NotFoundException(`Player with ID ${userId} not found on the leaderboard`);
      }
      
      // Get player rank (0-based, add 1 to make it 1-based)
      const rank = await redisClient.zrevrank(LEADERBOARD_REDIS_KEY, userId.toString());
      if (rank === null) {
        throw new NotFoundException(`Player with ID ${userId} not found on the leaderboard`);
      }
      
      return {
        user_id: userId,
        username: user.username,
        total_score: parseInt(score),
        rank: rank + 1, // Convert from 0-based to 1-based
      };
    } catch (error) {
      this.logger.error(`Error getting player rank from Redis: ${error.message}`);
      
      // Fallback to database
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
        throw new NotFoundException(
          `Player with ID ${userId} not found on the leaderboard`,
        );
      }

      return leaderboardEntry;
    }
  }

  async getUserGameSessions(
    userId: number,
    limit: number = 10,
  ): Promise<GameSession[]> {
    return this.gameSessionRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }

  private async refreshTopUsersCache(): Promise<void> {
    if (this.isRefreshing) {
      return;
    }

    try {
      this.isRefreshing = true;
      const lockValue = await this.cacheManager.get<string>(
        this.TOP_USERS_REFRESH_LOCK,
      );
      if (lockValue && Date.now() - parseInt(lockValue) < 5000) {
        return;
      }

      await this.cacheManager.set(
        this.TOP_USERS_REFRESH_LOCK,
        Date.now().toString(),
        10,
      );
      const cacheKey = CACHE_TOP_KEY;
      const cachedData =
        await this.cacheManager.get<LeaderboardEntryDto[]>(cacheKey);

      if (cachedData && cachedData.length > 0) {
        this.topUserIds = new Set(cachedData.map((entry) => entry.user_id));
        this.lowestTopScore =
          cachedData.length === TOP_LEADERBOARD_SIZE
            ? cachedData[cachedData.length - 1].total_score
            : 0;
        this.lastCacheRefresh = Date.now();
        this.logger.debug('Refreshed top users cache from Redis cache');
      } else {
        const topUsers = await this.leaderboardRepository
          .createQueryBuilder('leaderboard')
          .select([
            'leaderboard.userId as user_id',
            'leaderboard.totalScore as total_score',
          ])
          .orderBy('leaderboard.totalScore', 'DESC')
          .limit(TOP_LEADERBOARD_SIZE)
          .getRawMany();
        // console.log({topUsers});
        this.topUserIds = new Set(topUsers.map((user) => user.user_id));
        this.lowestTopScore =
          topUsers.length === TOP_LEADERBOARD_SIZE
            ? topUsers[topUsers.length - 1].total_score
            : 0;

        this.lastCacheRefresh = Date.now();

        this.logger.debug(
          `Refreshed top users cache from DB. Top users count: ${this.topUserIds.size}, Lowest score: ${this.lowestTopScore}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to refresh top users cache: ${error.message}`,
        error.stack,
      );
    } finally {
      this.isRefreshing = false;
      this.cacheRefreshPromise = null;
      await this.cacheManager.del(this.TOP_USERS_REFRESH_LOCK);
    }
  }
  
  // Keep these methods for database sync but they are no longer the primary source of rank
  private async updateTopLeaderboardRanks(
    entityManager: EntityManager,
  ): Promise<void> {
    await entityManager.query(`
            WITH top_scores AS (
                SELECT id, total_score
                FROM leaderboard
                ORDER BY total_score DESC
                LIMIT ${TOP_LEADERBOARD_SIZE}
                FOR UPDATE SKIP LOCKED
            ),
            ranked_scores AS (
                SELECT 
                id,
                RANK() OVER (ORDER BY total_score DESC) as rank
                FROM top_scores
            )
            UPDATE leaderboard
            SET rank = ranked_scores.rank
            FROM ranked_scores
            WHERE leaderboard.id = ranked_scores.id
    `);
  }

  private async updateSingleUserRank(
    entityManager: EntityManager,
    userId: number,
    newTotalScore: number,
  ): Promise<void> {
    const result = await entityManager.query(
      `
        SELECT COUNT(*) + 1 as rank
        FROM leaderboard
        WHERE total_score > $1
        `,
      [newTotalScore],
    );

    await entityManager.query(
      `
        UPDATE leaderboard
        SET rank = $1
        WHERE user_id = $2
        `,
      [result[0].rank, userId],
    );
  }

  private async invalidateTopLeaderboardCache(): Promise<void> {
    try {
      this.logger.debug('Invalidating top leaderboard cache');
      await this.cacheManager.del(CACHE_TOP_KEY);
    } catch (error) {
      this.logger.warn('Cache invalidation failed:', error);
    }
  }

  private async ensureTopUsersCacheIsRefreshed(): Promise<void> {
    if (Date.now() - this.lastCacheRefresh < 5000) {
      return;
    }
    if (this.cacheRefreshPromise) {
      await this.cacheRefreshPromise;
      return;
    }

    this.cacheRefreshPromise = this.refreshTopUsersCache();
    await this.cacheRefreshPromise;
  }
}
