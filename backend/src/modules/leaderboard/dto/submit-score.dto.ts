import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

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
  @Max(1000)
  score: number;

  @ApiProperty({
    description: 'The game mode (optional)',
    example: 'solo',
    required: false
  })
  @IsEnum(["solo", "team"])
  game_mode: string = 'solo';
} 
