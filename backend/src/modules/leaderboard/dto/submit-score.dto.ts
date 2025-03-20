import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class SubmitScoreDto {
  @ApiProperty({
    description: 'The unique identifier of the user',
    example: 1
  })
  @IsNotEmpty()
  @IsNumber()
  user_id: number;

  @ApiProperty({
    description: 'The score achieved by the user',
    example: 1000
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'Score cannot be negative' })
  score: number;

  @ApiProperty({
    description: 'The game mode (optional)',
    example: 'solo',
    required: false
  })
  @IsString()
  game_mode: string = 'solo';
} 