import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for query parameters on GET /questions.
 *
 * @Type(() => Number) tells class-transformer to convert query string
 * values (which are always strings) into numbers before validation.
 * Without this, "10" stays as the string "10" and @IsInt() fails.
 *
 * @IsOptional() means the field can be omitted entirely.
 */
export class QuestionFilterDto {
  @ApiPropertyOptional({ description: 'Filter by subject ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  subjectId?: number;

  @ApiPropertyOptional({ description: 'Filter by grade ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  gradeId?: number;

  @ApiPropertyOptional({ description: 'Filter by topic ID' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId?: number;

  @ApiPropertyOptional({ description: 'Filter by difficulty', enum: ['EASY', 'MEDIUM', 'HARD'] })
  @IsOptional()
  @IsEnum(['EASY', 'MEDIUM', 'HARD'])
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Page size (1-100, default 20)', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Number of items to skip (default 0)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
