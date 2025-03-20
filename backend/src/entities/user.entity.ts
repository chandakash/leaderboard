import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, Index } from 'typeorm';
import { GameSession } from './game-session.entity';
import { Leaderboard } from './leaderboard.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  username: string;

  @CreateDateColumn({ name: 'join_date' })
  joinDate: Date;

  @OneToMany(() => GameSession, (gameSession) => gameSession.user)
  gameSessions: GameSession[];

  @OneToMany(() => Leaderboard, (leaderboard) => leaderboard.user)
  leaderboardEntries: Leaderboard[];
} 