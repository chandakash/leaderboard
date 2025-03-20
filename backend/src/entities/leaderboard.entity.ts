import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('leaderboard')
export class Leaderboard {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'user_id', unique: true })
  @Index()
  userId: number;

  @Column({ name: 'total_score' })
  totalScore: number;

  @Column({ nullable: true })
  @Index()
  rank: number;

  @ManyToOne(() => User, (user) => user.leaderboardEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
} 