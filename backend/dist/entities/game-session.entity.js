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
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameSession = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
let GameSession = class GameSession {
    id;
    userId;
    user;
    score;
    gameMode;
    timestamp;
};
exports.GameSession = GameSession;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], GameSession.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id' }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], GameSession.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, user => user.gameSessions),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], GameSession.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], GameSession.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'game_mode', default: 'standard' }),
    __metadata("design:type", String)
], GameSession.prototype, "gameMode", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'timestamp' }),
    __metadata("design:type", Date)
], GameSession.prototype, "timestamp", void 0);
exports.GameSession = GameSession = __decorate([
    (0, typeorm_1.Entity)('game_sessions')
], GameSession);
//# sourceMappingURL=game-session.entity.js.map