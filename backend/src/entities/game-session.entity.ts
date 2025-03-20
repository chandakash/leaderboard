import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('game_sessions')
export class GameSession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  @Index()
  userId: number;

  @ManyToOne(() => User, user => user.gameSessions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  score: number;

  @Column({ name: 'game_mode', default: 'standard' })
  gameMode: string;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;
} 