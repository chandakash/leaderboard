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
exports.Leaderboard = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
let Leaderboard = class Leaderboard {
    id;
    userId;
    totalScore;
    rank;
    user;
};
exports.Leaderboard = Leaderboard;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('increment'),
    __metadata("design:type", Number)
], Leaderboard.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], Leaderboard.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_score' }),
    __metadata("design:type", Number)
], Leaderboard.prototype, "totalScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Number)
], Leaderboard.prototype, "rank", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.leaderboardEntries, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Leaderboard.prototype, "user", void 0);
exports.Leaderboard = Leaderboard = __decorate([
    (0, typeorm_1.Entity)('leaderboard')
], Leaderboard);
//# sourceMappingURL=leaderboard.entity.js.map