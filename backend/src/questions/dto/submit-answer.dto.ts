import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for POST /questions/:id/attempt.
 *
 * When a student answers a question, they send:
 * - selectedOptionId: which answer they chose (UUID of a QuestionOption)
 * - timeSpentSeconds: how long they took (for analytics)
 */
export class SubmitAnswerDto {
  @ApiProperty({ description: 'UUID of the selected option' })
  @IsUUID()
  selectedOptionId!: string;

  @ApiProperty({ description: 'Time the user spent on this question in seconds' })
  @IsInt()
  @Min(0)
  @Max(3600)
  timeSpentSeconds!: number;
}
