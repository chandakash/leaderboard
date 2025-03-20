import { User } from './user.entity';
export declare class GameSession {
    id: number;
    userId: number;
    user: User;
    score: number;
    gameMode: string;
    timestamp: Date;
}
