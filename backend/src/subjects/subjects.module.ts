import { Module } from '@nestjs/common';
import { AdminSubjectsController } from './admin-subjects.controller';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

@Module({
  controllers: [SubjectsController, AdminSubjectsController],
  providers: [SubjectsService],
})
export class SubjectsModule {}
