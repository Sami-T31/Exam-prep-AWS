import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma';
import { AnalyticsController } from './analytics.controller';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController, AdminAnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
