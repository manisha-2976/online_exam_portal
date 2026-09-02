import Redis from 'ioredis';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';

export class CacheService {
  private redis: Redis;
  private errorHandler: ErrorHandler;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.errorHandler = new ErrorHandler();

    this.initializeRedis();
  }

  private initializeRedis(): void {
    this.redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      this.errorHandler.handleError(error, 'CacheService.initializeRedis');
    });
  }

  public async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serializedValue);
      } else {
        await this.redis.set(key, serializedValue);
      }
    } catch (error) {
      this.errorHandler.handleError(error, 'CacheService.set');
      throw error;
    }
  }

  public async get(key: string): Promise<any> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.errorHandler.handleError(error, 'CacheService.get');
      throw error;
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.errorHandler.handleError(error, 'CacheService.del');
      throw error;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.errorHandler.handleError(error, 'CacheService.exists');
      throw error;
    }
  }

  public async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.errorHandler.handleError(error, 'CacheService.ttl');
      throw error;
    }
  }

  public async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.redis.expire(key, seconds);
    } catch (error) {
      this.errorHandler.handleError(error, 'CacheService.expire');
      throw error;
    }
  }

  public async keys(pattern: string): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.errorHandler.handleError(error, 'CacheService.keys');
      throw error;
    }
  }

  public async flushAll(): Promise<void> {
    try {
      await this.redis.flushall();
    } catch (error) {
      this.errorHandler.handleError(error, 'CacheService.flushAll');
      throw error;
    }
  }

  public async quit(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      this.errorHandler.handleError(error, 'CacheService.quit');
      throw error;
    }
  }
} 