import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookmarkDto {
  @ApiProperty({ description: 'UUID of the question to bookmark' })
  @IsUUID()
  questionId!: string;
}
