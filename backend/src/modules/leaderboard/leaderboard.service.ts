import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';
import { User } from '../../entities/user.entity';
import { GameSession } from '../../entities/game-session.entity';
import { Leaderboard } from '../../entities/leaderboard.entity';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto';
import { RedisService } from '../../services/redis.service';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);
  private readonly TOP_LEADERBOARD_SIZE = 100;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(GameSession)
    private gameSessionRepository: Repository<GameSession>,
    @InjectRepository(Leaderboard)
    private leaderboardRepository: Repository<Leaderboard>,
    private dataSource: DataSource,
    private redisService: RedisService,
  ) {}

  async submitScore(submitScoreDto: SubmitScoreDto): Promise<Leaderboard> {
    const { user_id, score, game_mode } = submitScoreDto;
    this.logger.log(`userId: ${user_id}, score: ${score}, game_mode: ${game_mode}`);
    const user = await this.userRepository.findOne({ where: { id: user_id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${user_id} not found`);
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
      console.log({rank});
      leaderboardEntry.rank = rank;

      this.logger.log(`User ${user_id} submitted score ${score}, new total: ${totalScore}, rank: ${rank}`);
      
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
      where: { id: In(userIds) },
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

  async getPlayerRank(userId: number): Promise<LeaderboardEntryDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
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

  async getUserGameSessions(
    userId: number,
    limit: number = 10,
  ): Promise<GameSession[]> {
    const userExists = await this.userRepository.exist({ 
      where: { id: userId } 
    });
    
    if (!userExists) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    
    return this.gameSessionRepository.find({
      where: { userId },
      order: { timestamp: 'DESC' },
      take: limit,
    });
  }
  
  private async populateRedisFromDatabase(limit: number): Promise<LeaderboardEntryDto[]> {
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
    // console.log({topScores});
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
}
