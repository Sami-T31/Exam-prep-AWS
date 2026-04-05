import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'production'
          ? [{ emit: 'event', level: 'error' }]
          : [
              { emit: 'event', level: 'error' },
              { emit: 'event', level: 'warn' },
            ],
    });

    (this as any).$on('error', (e: any) => {
      this.logger.error(`Prisma error: ${e.message}`);
    });

    (this as any).$on('warn', (e: any) => {
      this.logger.warn(`Prisma warning: ${e.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to PostgreSQL…');
    await this.$connect();
    this.logger.log('Connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from PostgreSQL…');
    await this.$disconnect();
    this.logger.log('Disconnected from PostgreSQL');
  }
}
