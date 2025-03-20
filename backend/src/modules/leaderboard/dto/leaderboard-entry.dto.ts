import { ApiProperty } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty({
    description: 'The unique identifier of the user',
    example: 1
  })
  user_id: number;

  @ApiProperty({
    description: 'The username of the user',
    example: 'akash'
  })
  username: string;

  @ApiProperty({
    description: 'The total score of the user',
    example: 5000
  })
  total_score: number;

  @ApiProperty({
    description: 'The rank of the user on the leaderboard',
    example: 1
  })
  rank: number;
} 