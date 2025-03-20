import { LeaderboardService } from './leaderboard.service';
import { SubmitScoreDto } from './dto/submit-score.dto';
export declare class LeaderboardController {
    private readonly leaderboardService;
    constructor(leaderboardService: LeaderboardService);
    submitScore(submitScoreDto: SubmitScoreDto): Promise<any>;
    getTopPlayers(limit?: number): Promise<any>;
    getPlayerRank(userId: number): Promise<any>;
}
