import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: RedisClientType;
  
  private readonly LEADERBOARD_KEY = 'leaderboard:scores';
  private readonly LEADERBOARD_CACHE_KEY = 'cache:leaderboard';
  private readonly LOCK_PREFIX = 'lock:user:';

  private readonly LEADERBOARD_CACHE_TTL = 60; 
  private readonly LOCK_TTL = 10; 
  
  get leaderboardKey(): string {
    return this.LEADERBOARD_KEY;
  }
  
  constructor(private configService: ConfigService) {}
  
  async onModuleInit() {
    const redisHost = this.configService.get<string>('redis.host', 'localhost');
    const redisPort = this.configService.get<number>('redis.port', 6379);
    
    this.client = createClient({
      url: `redis://${redisHost}:${redisPort}`,
    });
    
    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`, err.stack);
    });
    
    try {
      await this.client.connect();
      this.logger.log(`Connected to Redis at ${redisHost}:${redisPort}`);
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${error.message}`, error.stack);
      throw error;
    }
  }
  
  async onModuleDestroy() {
    if (this.client && this.client.isOpen) {
      await this.client.quit();
      this.logger.log('Redis connection closed');
    }
  }
  
  async addScore(userId: number, score: number): Promise<number> {
    const userIdStr = userId.toString();
    const lockKey = `${this.LOCK_PREFIX}${userIdStr}`;
    
    try {
      const locked = await this.acquireLock(lockKey, userIdStr); // for race
      if (!locked) {
        this.logger.warn(`Failed to acquire lock for user ${userId} - another operation in progress`);
      }
      const totalScore = await this.client.zIncrBy(this.LEADERBOARD_KEY, score, userIdStr);
      await this.invalidateCache(this.LEADERBOARD_CACHE_KEY);
      
      return totalScore;
    } finally {
      if (await this.client.get(lockKey) === userIdStr) {
        await this.client.del(lockKey);
      }
    }
  }

  async getUserRank(userId: number): Promise<{ rank: number; score: number }> {
    const userIdStr = userId.toString();
    const score = await this.client.zScore(this.LEADERBOARD_KEY, userIdStr);
    
    if (score === null) {
      return { rank: -1, score: 0 };
    }

    const rank = await this.client.zRevRank(this.LEADERBOARD_KEY, userIdStr);
    
    return {
      rank: rank !== null ? rank + 1 : -1,
      score: score
    };
  }
  

  async getTopScores(limit: number): Promise<Array<{ userId: number; score: number; rank: number }>> {
    const cacheKey = `${this.LEADERBOARD_CACHE_KEY}:${limit}`;
  
    const cachedData = await this.client.get(cacheKey);
    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      } catch (error) {
        this.logger.warn(`Error parsing cached leaderboard data: ${error.message}`);
      }
    }
    
    const results = await this.client.zRangeWithScores(
      this.LEADERBOARD_KEY,
      0,
      limit - 1,
      { REV: true }
    );
    
    const topScores = results.map((item, index) => ({
      userId: parseInt(item.value, 10),
      score: item.score,
      rank: index + 1
    }));
    
    if (topScores.length > 0) {
      await this.client.set(
        cacheKey, 
        JSON.stringify(topScores), 
        { EX: this.LEADERBOARD_CACHE_TTL }
      );
    }
    
    return topScores;
  }

  async cacheAssembledLeaderboard(limit: number, leaderboardData: any[]): Promise<void> {
    const cacheKey = `${this.LEADERBOARD_CACHE_KEY}:assembled:${limit}`;
    await this.client.set(
      cacheKey, 
      JSON.stringify(leaderboardData), 
      { EX: this.LEADERBOARD_CACHE_TTL }
    );
  }
  
  async getCachedAssembledLeaderboard(limit: number): Promise<any[] | null> {
    const cacheKey = `${this.LEADERBOARD_CACHE_KEY}:assembled:${limit}`;
    const cachedData = await this.client.get(cacheKey);
    
    if (!cachedData) {
      return null;
    }
    
    try {
      return JSON.parse(cachedData);
    } catch (error) {
      this.logger.warn(`Error parsing cached assembled leaderboard: ${error.message}`);
      return null;
    }
  }

  async addScoresBulk(scores: Array<{userId: number, score: number}>): Promise<any[]> {
    const multi = this.client.multi();
    
    for (const entry of scores) {
      multi.zAdd(this.LEADERBOARD_KEY, {
        score: entry.score,
        value: entry.userId.toString(),
      });
    }
    
    await this.invalidateCache(this.LEADERBOARD_CACHE_KEY);
    return multi.exec();
  }

  async getTotalUsers(): Promise<number> {
    return this.client.zCard(this.LEADERBOARD_KEY);
  }

  private async invalidateCache(cacheKeyPrefix: string): Promise<void> {
    const keys = await this.client.keys(`${cacheKeyPrefix}*`);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  private async acquireLock(lockKey: string, value: string): Promise<boolean> {
    const result = await this.client.set(lockKey, value, {
      NX: true,
      EX: this.LOCK_TTL
    });
    
    return result === 'OK';
  }
} 