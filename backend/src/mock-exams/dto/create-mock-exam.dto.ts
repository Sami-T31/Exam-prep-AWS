import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a mock exam (admin only).
 *
 * The admin can either:
 * - Provide specific questionIds (hand-picked exam)
 * - Omit questionIds and let the server pick random published questions
 *   matching the subject and grade
 */
export class CreateMockExamDto {
  @ApiProperty({ description: 'Exam title (e.g., "Grade 12 Physics Mock 1")' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: 'Subject ID' })
  @IsInt()
  @Min(1)
  subjectId!: number;

  @ApiProperty({ description: 'Grade ID' })
  @IsInt()
  @Min(1)
  gradeId!: number;

  @ApiProperty({ description: 'Time limit in minutes' })
  @IsInt()
  @Min(5)
  durationMinutes!: number;

  @ApiProperty({ description: 'Number of questions to include' })
  @IsInt()
  @Min(1)
  questionCount!: number;

  @ApiPropertyOptional({
    description:
      'If false, create an empty mock exam and add questions later in admin editor',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  shouldAutoGenerateQuestions?: boolean;

  @ApiPropertyOptional({
    description:
      'Specific question UUIDs to include (optional — if omitted, random questions are selected)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(5)
  questionIds?: string[];
}
