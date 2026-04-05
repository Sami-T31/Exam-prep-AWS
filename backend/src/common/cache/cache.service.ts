import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis';

const KEY_PREFIX = 'cache:';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.getClient().get(KEY_PREFIX + key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      this.logger.warn(`Cache read failed for key "${key}"`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.getClient().set(KEY_PREFIX + key, serialized, 'EX', ttlSeconds);
    } catch {
      this.logger.warn(`Cache write failed for key "${key}"`);
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.redis.getClient().del(KEY_PREFIX + key);
    } catch {
      this.logger.warn(`Cache invalidation failed for key "${key}"`);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const client = this.redis.getClient();
      let cursor = '0';
      do {
        const [nextCursor, keys] = await client.scan(
          cursor,
          'MATCH',
          KEY_PREFIX + pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } while (cursor !== '0');
    } catch {
      this.logger.warn(`Cache pattern invalidation failed for "${pattern}"`);
    }
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const fresh = await factory();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  }
}
