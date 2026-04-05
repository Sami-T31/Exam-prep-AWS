import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Wraps an ioredis client as a NestJS injectable service.
 *
 * Why a separate module instead of using Redis directly?
 * - Centralized configuration (host, port, password from .env)
 * - Graceful startup/shutdown (connect on boot, disconnect on shutdown)
 * - Any module can inject RedisService without knowing connection details
 * - Easier to mock in tests
 *
 * ioredis is the most popular Node.js Redis client. It supports all
 * Redis commands and handles reconnection automatically if the
 * connection drops.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD'),
      retryStrategy: (times) => Math.min(times * 200, 5000),
    });
  }

  async onModuleInit() {
    try {
      await this.client.ping();
      this.logger.log('Connected to Redis');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Disconnected from Redis');
  }

  getClient(): Redis {
    return this.client;
  }
}
