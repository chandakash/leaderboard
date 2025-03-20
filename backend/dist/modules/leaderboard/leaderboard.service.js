"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LeaderboardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../entities/user.entity");
const game_session_entity_1 = require("../../entities/game-session.entity");
const leaderboard_entity_1 = require("../../entities/leaderboard.entity");
const cache_manager_1 = require("@nestjs/cache-manager");
const common_2 = require("@nestjs/common");
const Constants_1 = require("../../utils/Constants");
let LeaderboardService = LeaderboardService_1 = class LeaderboardService {
    userRepository;
    gameSessionRepository;
    leaderboardRepository;
    dataSource;
    cacheManager;
    logger = new common_1.Logger(LeaderboardService_1.name);
    topUserIds = new Set();
    lowestTopScore = 0;
    lastCacheRefresh = 0;
    TOP_USERS_REFRESH_LOCK = 'top_users_refresh_lock';
    isRefreshing = false;
    cacheRefreshPromise = null;
    constructor(userRepository, gameSessionRepository, leaderboardRepository, dataSource, cacheManager) {
        this.userRepository = userRepository;
        this.gameSessionRepository = gameSessionRepository;
        this.leaderboardRepository = leaderboardRepository;
        this.dataSource = dataSource;
        this.cacheManager = cacheManager;
        this.refreshTopUsersCache();
    }
    async submitScore(submitScoreDto) {
        const { user_id, score, game_mode } = submitScoreDto;
        const user = await this.userRepository.findOne({ where: { id: user_id } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${user_id} not found`);
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
            const currentUserScore = await queryRunner.query(`SELECT total_score FROM leaderboard WHERE user_id = $1 FOR UPDATE`, [user_id]);
            const userHadScore = currentUserScore.length > 0;
            const oldTotalScore = userHadScore ? currentUserScore[0].total_score : 0;
            const newTotalScore = oldTotalScore + score;
            this.logger.log(`Current user new total score: ${newTotalScore} for user id: ${user_id}`);
            const couldEnterTopLeaderboard = !isInTopLeaderboard && newTotalScore > this.lowestTopScore;
            const result = await queryRunner.query(`INSERT INTO leaderboard (user_id, total_score)
                    VALUES ($1, $2)
                    ON CONFLICT (user_id) 
                    DO UPDATE SET total_score = leaderboard.total_score + $2
                    RETURNING id, user_id, total_score`, [user_id, score]);
            if (isInTopLeaderboard || couldEnterTopLeaderboard) {
                await this.updateTopLeaderboardRanks(queryRunner.manager);
            }
            else {
                await this.updateSingleUserRank(queryRunner.manager, user_id, newTotalScore);
            }
            await queryRunner.commitTransaction();
            const leaderboardEntry = await this.leaderboardRepository.findOne({
                where: { id: result[0].id },
            });
            if (!leaderboardEntry) {
                throw new common_1.NotFoundException(`Leaderboard entry with ID ${result[0].id} not found`);
            }
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
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error(`Failed to submit score: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('Failed to submit score');
        }
        finally {
            await queryRunner.release();
        }
    }
    async getTopPlayers(limit = 10) {
        const cacheKey = Constants_1.CACHE_TOP_KEY;
        const cachedData = await this.cacheManager.get(cacheKey);
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
        await this.cacheManager.set(cacheKey, leaderboardEntries, Constants_1.CACHE_TTL);
        return leaderboardEntries;
    }
    async getPlayerRank(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
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
            throw new common_1.NotFoundException(`Player with ID ${userId} not found on the leaderboard`);
        }
        return leaderboardEntry;
    }
    async getUserGameSessions(userId, limit = 10) {
        return this.gameSessionRepository.find({
            where: { userId },
            order: { timestamp: 'DESC' },
            take: limit,
        });
    }
    async refreshTopUsersCache() {
        if (this.isRefreshing) {
            return;
        }
        try {
            this.isRefreshing = true;
            const lockValue = await this.cacheManager.get(this.TOP_USERS_REFRESH_LOCK);
            if (lockValue && Date.now() - parseInt(lockValue) < 5000) {
                return;
            }
            await this.cacheManager.set(this.TOP_USERS_REFRESH_LOCK, Date.now().toString(), 10);
            const cacheKey = Constants_1.CACHE_TOP_KEY;
            const cachedData = await this.cacheManager.get(cacheKey);
            if (cachedData && cachedData.length > 0) {
                this.topUserIds = new Set(cachedData.map((entry) => entry.user_id));
                this.lowestTopScore =
                    cachedData.length === Constants_1.TOP_LEADERBOARD_SIZE
                        ? cachedData[cachedData.length - 1].total_score
                        : 0;
                this.lastCacheRefresh = Date.now();
                this.logger.debug('Refreshed top users cache from Redis cache');
            }
            else {
                const topUsers = await this.leaderboardRepository
                    .createQueryBuilder('leaderboard')
                    .select([
                    'leaderboard.userId as user_id',
                    'leaderboard.totalScore as total_score',
                ])
                    .orderBy('leaderboard.totalScore', 'DESC')
                    .limit(Constants_1.TOP_LEADERBOARD_SIZE)
                    .getRawMany();
                this.topUserIds = new Set(topUsers.map((user) => user.user_id));
                this.lowestTopScore =
                    topUsers.length === Constants_1.TOP_LEADERBOARD_SIZE
                        ? topUsers[topUsers.length - 1].total_score
                        : 0;
                this.lastCacheRefresh = Date.now();
                this.logger.debug(`Refreshed top users cache from DB. Top users count: ${this.topUserIds.size}, Lowest score: ${this.lowestTopScore}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to refresh top users cache: ${error.message}`, error.stack);
        }
        finally {
            this.isRefreshing = false;
            this.cacheRefreshPromise = null;
            await this.cacheManager.del(this.TOP_USERS_REFRESH_LOCK);
        }
    }
    async updateTopLeaderboardRanks(entityManager) {
        await entityManager.query(`
            WITH top_scores AS (
                SELECT id, total_score
                FROM leaderboard
                ORDER BY total_score DESC
                LIMIT ${Constants_1.TOP_LEADERBOARD_SIZE}
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
    async updateSingleUserRank(entityManager, userId, newTotalScore) {
        const result = await entityManager.query(`
        SELECT COUNT(*) + 1 as rank
        FROM leaderboard
        WHERE total_score > $1
        `, [newTotalScore]);
        await entityManager.query(`
        UPDATE leaderboard
        SET rank = $1
        WHERE user_id = $2
        `, [result[0].rank, userId]);
    }
    async invalidateTopLeaderboardCache() {
        try {
            this.logger.debug('Invalidating top leaderboard cache');
            await this.cacheManager.del(Constants_1.CACHE_TOP_KEY);
        }
        catch (error) {
            this.logger.warn('Cache invalidation failed:', error);
        }
    }
    async ensureTopUsersCacheIsRefreshed() {
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
};
exports.LeaderboardService = LeaderboardService;
exports.LeaderboardService = LeaderboardService = LeaderboardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(game_session_entity_1.GameSession)),
    __param(2, (0, typeorm_1.InjectRepository)(leaderboard_entity_1.Leaderboard)),
    __param(4, (0, common_2.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource, Object])
], LeaderboardService);
//# sourceMappingURL=leaderboard.service.js.map