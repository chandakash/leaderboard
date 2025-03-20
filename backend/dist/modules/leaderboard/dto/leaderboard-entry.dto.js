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
exports.LeaderboardEntryDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class LeaderboardEntryDto {
    user_id;
    username;
    total_score;
    rank;
}
exports.LeaderboardEntryDto = LeaderboardEntryDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The unique identifier of the user',
        example: 1
    }),
    __metadata("design:type", Number)
], LeaderboardEntryDto.prototype, "user_id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The username of the user',
        example: 'akash'
    }),
    __metadata("design:type", String)
], LeaderboardEntryDto.prototype, "username", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The total score of the user',
        example: 5000
    }),
    __metadata("design:type", Number)
], LeaderboardEntryDto.prototype, "total_score", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'The rank of the user on the leaderboard',
        example: 1
    }),
    __metadata("design:type", Number)
], LeaderboardEntryDto.prototype, "rank", void 0);
//# sourceMappingURL=leaderboard-entry.dto.js.map