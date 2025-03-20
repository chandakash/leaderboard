import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { User } from '../../entities/user.entity';
import { GameSession } from '../../entities/game-session.entity';
import { Leaderboard } from '../../entities/leaderboard.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, GameSession, Leaderboard]),
  ],
  controllers: [LeaderboardController],
  providers: [
    LeaderboardService,
  ],
  exports: [LeaderboardService],
})
export class LeaderboardModule {} 