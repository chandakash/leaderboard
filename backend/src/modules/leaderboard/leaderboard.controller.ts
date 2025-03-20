import { Controller, Post, Get, Body, Param, Query, ParseIntPipe, UsePipes, ValidationPipe, HttpCode, HttpStatus, Logger, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';
import { SubmitScoreDto } from './dto/submit-score.dto';
import { LeaderboardEntryDto } from './dto/leaderboard-entry.dto';
import { ApiTokenGuard } from 'src/utils/auth.guard';

@ApiTags('Leaderboard')
@Controller('api/leaderboard')
export class LeaderboardController {
  // private readonly logger = new Logger(LeaderboardController.name);

  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  // @UseGuards(ApiTokenGuard)
  // @ApiBearerAuth()
  // @ApiHeader({
  //   name: 'X-Request-Timestamp',
  //   description: 'Current timestamp in milliseconds',
  //   required: true,
  // })
  // @ApiHeader({
  //   name: 'X-User-Id',
  //   description: 'User ID for the request',
  //   required: true,
  // })
  @ApiOperation({ summary: 'Submit a new score' })
  @ApiResponse({ status: 200, description: 'Score submitted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async submitScore(@Body() submitScoreDto: SubmitScoreDto): Promise<any> {
    const result = await this.leaderboardService.submitScore(submitScoreDto);
    return {
      success: true,
      message: 'Score submitted successfully',
      data: {
        user_id: result.userId,
        total_score: result.totalScore,
        rank: result.rank,
      },
    };
  }

  @Get('top')
  @ApiOperation({ summary: 'Get the top players on the leaderboard' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of top players to retrieve', type: Number })
  @ApiResponse({ status: 200, description: 'Top players retrieved successfully', type: [LeaderboardEntryDto] })
  async getTopPlayers(@Query('limit', new ParseIntPipe({ optional: true })) limit = 10): Promise<any> {
    const topPlayers = await this.leaderboardService.getTopPlayers(limit);
    return {
      success: true,
      data: topPlayers,
    };
  }

  @Get('rank/:user_id')
  @ApiOperation({ summary: 'Get the rank of a specific player' })
  @ApiParam({ name: 'user_id', description: 'The user ID' })
  @ApiResponse({ status: 200, description: 'Player rank retrieved successfully', type: LeaderboardEntryDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPlayerRank(@Param('user_id', ParseIntPipe) userId: number): Promise<any> {
    const playerRank = await this.leaderboardService.getPlayerRank(userId);
    return {
      success: true,
      data: playerRank,
    };
  }
} 