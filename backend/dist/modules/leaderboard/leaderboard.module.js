"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const leaderboard_controller_1 = require("./leaderboard.controller");
const leaderboard_service_1 = require("./leaderboard.service");
const user_entity_1 = require("../../entities/user.entity");
const game_session_entity_1 = require("../../entities/game-session.entity");
const leaderboard_entity_1 = require("../../entities/leaderboard.entity");
const redis_module_1 = require("../redis/redis.module");
let LeaderboardModule = class LeaderboardModule {
};
exports.LeaderboardModule = LeaderboardModule;
exports.LeaderboardModule = LeaderboardModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, game_session_entity_1.GameSession, leaderboard_entity_1.Leaderboard]),
            redis_module_1.RedisModule,
        ],
        controllers: [leaderboard_controller_1.LeaderboardController],
        providers: [
            leaderboard_service_1.LeaderboardService,
        ],
        exports: [leaderboard_service_1.LeaderboardService],
    })
], LeaderboardModule);
//# sourceMappingURL=leaderboard.module.js.map