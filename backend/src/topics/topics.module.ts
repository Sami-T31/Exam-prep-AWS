import { Module } from '@nestjs/common';
import { AdminTopicsController } from './admin-topics.controller';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

@Module({
  controllers: [TopicsController, AdminTopicsController],
  providers: [TopicsService],
})
export class TopicsModule {}
