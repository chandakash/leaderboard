import { Controller, Post, Get, Body, Param, ParseIntPipe, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Users')
@Controller('api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Username already exists' })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<any> {
    const user = await this.userService.createUser(createUserDto.username);
    return {
      success: true,
      message: 'User created successfully',
      data: {
        id: user.id,
        username: user.username,
        join_date: user.joinDate,
      },
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getAllUsers(): Promise<any> {
    const users = await this.userService.getAllUsers();
    return {
      success: true,
      data: users.map(user => ({
        id: user.id,
        username: user.username,
        join_date: user.joinDate,
      })),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'The user ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id', ParseIntPipe) id: number): Promise<any> {
    const user = await this.userService.getUserById(id);
    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        join_date: user.joinDate,
        leaderboard: user.leaderboardEntries?.[0] ? {
          total_score: user.leaderboardEntries[0].totalScore,
          rank: user.leaderboardEntries[0].rank,
        } : null,
      },
    };
  }
} 