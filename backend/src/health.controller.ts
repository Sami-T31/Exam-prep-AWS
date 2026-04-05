import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './prisma';
import { RedisService } from './redis';
import { Public } from './auth/decorators';

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Check API and dependency health status' })
  async check() {
    const [postgresHealth, redisHealth] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);

    const allConnected =
      postgresHealth.status === 'connected' && redisHealth.status === 'connected';

    return {
      status: allConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        postgres: postgresHealth,
        redis: redisHealth,
      },
    };
  }

  private async checkPostgres(): Promise<{ status: string; latencyMs?: number }> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'connected', latencyMs: Date.now() - start };
    } catch {
      return { status: 'disconnected' };
    }
  }

  private async checkRedis(): Promise<{ status: string; latencyMs?: number }> {
    try {
      const start = Date.now();
      await this.redis.getClient().ping();
      return { status: 'connected', latencyMs: Date.now() - start };
    } catch {
      return { status: 'disconnected' };
    }
  }
}
