import { IsEnum } from 'class-validator';

export class ReviewQuestionDto {
  @IsEnum(['PUBLISH', 'REQUEST_CHANGES'])
  action!: 'PUBLISH' | 'REQUEST_CHANGES';
}
