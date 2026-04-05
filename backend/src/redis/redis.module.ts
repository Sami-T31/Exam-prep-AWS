import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * @Global() makes RedisService available to all modules without
 * explicitly importing RedisModule — same pattern as PrismaModule.
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
