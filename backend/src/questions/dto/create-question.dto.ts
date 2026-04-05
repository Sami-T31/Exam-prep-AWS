import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateOptionDto {
  @ApiProperty({ description: 'Option label (A, B, C, or D)', example: 'A' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(1)
  optionLabel!: string;

  @ApiProperty({ description: 'Text of the answer option' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  optionText!: string;

  @ApiProperty({ description: 'Whether this option is the correct answer' })
  @IsBoolean()
  isCorrect!: boolean;
}

/**
 * DTO for POST /admin/questions.
 *
 * @ValidateNested({ each: true }) tells class-validator to recursively
 * validate each item in the `options` array using CreateOptionDto's rules.
 * Without this, the nested objects would pass validation unchecked.
 *
 * @Type(() => CreateOptionDto) tells class-transformer which class to
 * instantiate for each array element — plain JSON objects from the request
 * body get turned into CreateOptionDto instances with their decorators active.
 */
export class CreateQuestionDto {
  @ApiProperty({ description: 'Question text (10-2000 chars)' })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  questionText!: string;

  @ApiPropertyOptional({ description: 'Explanation shown after the student answers' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  explanation?: string;

  @ApiProperty({ description: 'Difficulty level', enum: ['EASY', 'MEDIUM', 'HARD'] })
  @IsEnum(['EASY', 'MEDIUM', 'HARD'])
  difficulty!: string;

  @ApiProperty({ description: 'Topic ID this question belongs to' })
  @IsInt()
  @Min(1)
  topicId!: number;

  @ApiProperty({ description: 'Grade ID for this question' })
  @IsInt()
  @Min(1)
  gradeId!: number;

  @ApiPropertyOptional({ description: 'National exam year (Ethiopian calendar)' })
  @IsOptional()
  @IsInt()
  year?: number;

  @ApiPropertyOptional({
    description: 'Question status (default DRAFT)',
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
  })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: string;

  @ApiProperty({ description: 'Exactly 4 options, one must be correct', type: [CreateOptionDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateOptionDto)
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  options!: CreateOptionDto[];
}
