import { User } from './user.entity';
export declare class Leaderboard {
    id: number;
    userId: number;
    totalScore: number;
    rank: number;
    user: User;
}
