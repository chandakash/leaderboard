import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { User } from '../../entities/user.entity';
import { GameSession } from '../../entities/game-session.entity';
import { Leaderboard } from '../../entities/leaderboard.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, GameSession, Leaderboard]),
    RedisModule,
  ],
  controllers: [LeaderboardController],
  providers: [
    LeaderboardService,
  ],
  exports: [LeaderboardService],
})
export class LeaderboardModule {} 