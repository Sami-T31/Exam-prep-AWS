import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ConsentController } from './consent.controller';

@Module({
  imports: [AnalyticsModule],
  controllers: [ConsentController],
})
export class ConsentModule {}
