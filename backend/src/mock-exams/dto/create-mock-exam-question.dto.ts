import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CreateMockExamQuestionOptionDto {
  @ApiProperty({ enum: ['A', 'B', 'C', 'D'] })
  @IsEnum(['A', 'B', 'C', 'D'])
  optionLabel!: 'A' | 'B' | 'C' | 'D';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  optionText!: string;

  @ApiProperty()
  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateMockExamQuestionDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  questionText!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  explanation?: string;

  @ApiProperty({ enum: ['EASY', 'MEDIUM', 'HARD'] })
  @IsEnum(['EASY', 'MEDIUM', 'HARD'])
  difficulty!: 'EASY' | 'MEDIUM' | 'HARD';

  @ApiProperty({
    description: 'Topic (chapter) ID. Must belong to this exam subject/grade.',
  })
  @IsInt()
  @Min(1)
  topicId!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  year?: number;

  @ApiProperty({ type: [CreateMockExamQuestionOptionDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateMockExamQuestionOptionDto)
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  options!: CreateMockExamQuestionOptionDto[];
}
