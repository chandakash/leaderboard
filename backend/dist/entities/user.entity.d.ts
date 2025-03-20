import { GameSession } from './game-session.entity';
import { Leaderboard } from './leaderboard.entity';
export declare class User {
    id: number;
    username: string;
    joinDate: Date;
    gameSessions: GameSession[];
    leaderboardEntries: Leaderboard[];
}
