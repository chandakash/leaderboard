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
var LeaderboardController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const leaderboard_service_1 = require("./leaderboard.service");
const submit_score_dto_1 = require("./dto/submit-score.dto");
const leaderboard_entry_dto_1 = require("./dto/leaderboard-entry.dto");
let LeaderboardController = LeaderboardController_1 = class LeaderboardController {
    leaderboardService;
    logger = new common_1.Logger(LeaderboardController_1.name);
    constructor(leaderboardService) {
        this.leaderboardService = leaderboardService;
    }
    async submitScore(submitScoreDto) {
        const result = await this.leaderboardService.submitScore(submitScoreDto);
        return {
            success: true,
            message: 'Score submitted successfully',
            data: {
                user_id: result.userId,
                total_score: result.totalScore,
                rank: result.rank,
            },
        };
    }
    async getTopPlayers(limit = 10) {
        const topPlayers = await this.leaderboardService.getTopPlayers(limit);
        return {
            success: true,
            data: topPlayers,
        };
    }
    async getPlayerRank(userId) {
        const playerRank = await this.leaderboardService.getPlayerRank(userId);
        return {
            success: true,
            data: playerRank,
        };
    }
};
exports.LeaderboardController = LeaderboardController;
__decorate([
    (0, common_1.Post)('submit'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ transform: true })),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a new score' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Score submitted successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input data' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Unauthorized' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [submit_score_dto_1.SubmitScoreDto]),
    __metadata("design:returntype", Promise)
], LeaderboardController.prototype, "submitScore", null);
__decorate([
    (0, common_1.Get)('top'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the top players on the leaderboard' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, description: 'Number of top players to retrieve', type: Number }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Top players retrieved successfully', type: [leaderboard_entry_dto_1.LeaderboardEntryDto] }),
    __param(0, (0, common_1.Query)('limit', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LeaderboardController.prototype, "getTopPlayers", null);
__decorate([
    (0, common_1.Get)('rank/:user_id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get the rank of a specific player' }),
    (0, swagger_1.ApiParam)({ name: 'user_id', description: 'The user ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Player rank retrieved successfully', type: leaderboard_entry_dto_1.LeaderboardEntryDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, common_1.Param)('user_id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], LeaderboardController.prototype, "getPlayerRank", null);
exports.LeaderboardController = LeaderboardController = LeaderboardController_1 = __decorate([
    (0, swagger_1.ApiTags)('Leaderboard'),
    (0, common_1.Controller)('api/leaderboard'),
    __metadata("design:paramtypes", [leaderboard_service_1.LeaderboardService])
], LeaderboardController);
//# sourceMappingURL=leaderboard.controller.js.map