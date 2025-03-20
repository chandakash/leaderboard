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
const redis_service_1 = require("../../services/redis.service");
let LeaderboardService = LeaderboardService_1 = class LeaderboardService {
    userRepository;
    gameSessionRepository;
    leaderboardRepository;
    dataSource;
    redisService;
    logger = new common_1.Logger(LeaderboardService_1.name);
    TOP_LEADERBOARD_SIZE = 100;
    constructor(userRepository, gameSessionRepository, leaderboardRepository, dataSource, redisService) {
        this.userRepository = userRepository;
        this.gameSessionRepository = gameSessionRepository;
        this.leaderboardRepository = leaderboardRepository;
        this.dataSource = dataSource;
        this.redisService = redisService;
    }
    async submitScore(submitScoreDto) {
        const { user_id, score, game_mode } = submitScoreDto;
        this.logger.log(`userId: ${user_id}, score: ${score}, game_mode: ${game_mode}`);
        const user = await this.userRepository.findOne({ where: { id: user_id } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${user_id} not found`);
        }
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
            let leaderboardEntry = await this.leaderboardRepository.findOne({
                where: { userId: user_id },
            });
            if (!leaderboardEntry) {
                leaderboardEntry = this.leaderboardRepository.create({
                    userId: user_id,
                    totalScore: 0,
                    user,
                });
            }
            leaderboardEntry.totalScore += score;
            await queryRunner.manager.save(leaderboardEntry);
            await queryRunner.commitTransaction();
            const totalScore = await this.redisService.addScore(user_id, score);
            const { rank } = await this.redisService.getUserRank(user_id);
            console.log({ rank });
            leaderboardEntry.rank = rank;
            this.logger.log(`User ${user_id} submitted score ${score}, new total: ${totalScore}, rank: ${rank}`);
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
        const cachedLeaderboard = await this.redisService.getCachedAssembledLeaderboard(limit);
        if (cachedLeaderboard) {
            this.logger.debug(`Using cached leaderboard for limit ${limit}`);
            return cachedLeaderboard;
        }
        const topScores = await this.redisService.getTopScores(limit);
        if (topScores.length === 0) {
            return this.populateRedisFromDatabase(limit);
        }
        const userIds = topScores.map(item => item.userId);
        const users = await this.userRepository.find({
            where: { id: (0, typeorm_2.In)(userIds) },
        });
        const userMap = new Map(users.map(user => [user.id, user.username]));
        const leaderboardEntries = topScores.map(item => ({
            user_id: item.userId,
            username: userMap.get(item.userId) || 'Unknown',
            total_score: item.score,
            rank: item.rank,
        }));
        await this.redisService.cacheAssembledLeaderboard(limit, leaderboardEntries);
        return leaderboardEntries;
    }
    async getPlayerRank(userId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        const { rank, score } = await this.redisService.getUserRank(userId);
        if (rank === -1) {
            const leaderboardEntry = await this.leaderboardRepository.findOne({
                where: { userId },
            });
            if (!leaderboardEntry) {
                return {
                    user_id: userId,
                    username: user.username,
                    total_score: 0,
                    rank: -1,
                };
            }
            await this.redisService.addScore(userId, leaderboardEntry.totalScore);
            const redisRank = await this.redisService.getUserRank(userId);
            return {
                user_id: userId,
                username: user.username,
                total_score: leaderboardEntry.totalScore,
                rank: redisRank.rank,
            };
        }
        return {
            user_id: userId,
            username: user.username,
            total_score: score,
            rank: rank,
        };
    }
    async getUserGameSessions(userId, limit = 10) {
        const userExists = await this.userRepository.exist({
            where: { id: userId }
        });
        if (!userExists) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        return this.gameSessionRepository.find({
            where: { userId },
            order: { timestamp: 'DESC' },
            take: limit,
        });
    }
    async populateRedisFromDatabase(limit) {
        this.logger.log('Populating Redis from database');
        const leaderboardEntries = await this.leaderboardRepository
            .createQueryBuilder('leaderboard')
            .innerJoin('leaderboard.user', 'user')
            .select([
            'leaderboard.userId as user_id',
            'user.username as username',
            'leaderboard.totalScore as total_score',
        ])
            .orderBy('leaderboard.totalScore', 'DESC')
            .limit(this.TOP_LEADERBOARD_SIZE)
            .getRawMany();
        const scoresToAdd = leaderboardEntries.map(entry => ({
            userId: entry.user_id,
            score: entry.total_score
        }));
        await this.redisService.addScoresBulk(scoresToAdd);
        const topScores = await this.redisService.getTopScores(limit);
        const result = leaderboardEntries
            .slice(0, limit)
            .map((entry, index) => ({
            user_id: entry.user_id,
            username: entry.username,
            total_score: entry.total_score,
            rank: index + 1,
        }));
        await this.redisService.cacheAssembledLeaderboard(limit, result);
        return result;
    }
};
exports.LeaderboardService = LeaderboardService;
exports.LeaderboardService = LeaderboardService = LeaderboardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(game_session_entity_1.GameSession)),
    __param(2, (0, typeorm_1.InjectRepository)(leaderboard_entity_1.Leaderboard)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        redis_service_1.RedisService])
], LeaderboardService);
//# sourceMappingURL=leaderboard.service.js.map