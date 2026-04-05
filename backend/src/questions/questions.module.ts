import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { AdminQuestionsController } from './admin-questions.controller';
import { QuestionsService } from './questions.service';

/**
 * The Questions module has TWO controllers:
 * - QuestionsController: student-facing (browse + attempt)
 * - AdminQuestionsController: admin-only (CRUD + bulk import)
 *
 * Both share the same QuestionsService — the service contains
 * all the business logic, and the controllers just route requests to it.
 */
@Module({
  controllers: [QuestionsController, AdminQuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
