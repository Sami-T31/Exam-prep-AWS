import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class MockExamAnswerDto {
  @ApiProperty({ description: 'Question UUID' })
  @IsUUID()
  questionId!: string;

  @ApiProperty({ description: 'Selected option UUID' })
  @IsUUID()
  selectedOptionId!: string;
}

/**
 * DTO for submitting all answers to a mock exam at once.
 *
 * Unlike individual question attempts (which are submitted one at a time),
 * mock exam answers are submitted in bulk. This matches how real exams work —
 * you answer everything, then hand in the whole test.
 */
export class SubmitMockExamDto {
  @ApiProperty({ description: 'Array of answers', type: [MockExamAnswerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MockExamAnswerDto)
  answers!: MockExamAnswerDto[];

  @ApiProperty({ description: 'Total time spent on the exam in seconds' })
  @IsInt()
  @Min(0)
  timeSpentSeconds!: number;
}
