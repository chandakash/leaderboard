import { DataSource, Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { GameSession } from '../../entities/game-session.entity';
import { Leaderboard } from '../../entities/leaderboard.entity';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto';
import { RedisService } from '../../services/redis.service';
export declare class LeaderboardService {
    private userRepository;
    private gameSessionRepository;
    private leaderboardRepository;
    private dataSource;
    private redisService;
    private readonly logger;
    private readonly TOP_LEADERBOARD_SIZE;
    constructor(userRepository: Repository<User>, gameSessionRepository: Repository<GameSession>, leaderboardRepository: Repository<Leaderboard>, dataSource: DataSource, redisService: RedisService);
    submitScore(submitScoreDto: SubmitScoreDto): Promise<Leaderboard>;
    getTopPlayers(limit?: number): Promise<LeaderboardEntryDto[]>;
    getPlayerRank(userId: number): Promise<LeaderboardEntryDto>;
    getUserGameSessions(userId: number, limit?: number): Promise<GameSession[]>;
    private populateRedisFromDatabase;
}
