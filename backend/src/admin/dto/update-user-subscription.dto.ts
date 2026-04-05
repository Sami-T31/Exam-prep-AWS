import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateUserSubscriptionDto {
  @IsEnum(['ACTIVATE', 'DEACTIVATE'])
  action!: 'ACTIVATE' | 'DEACTIVATE';

  @IsOptional()
  @IsEnum(['MONTHLY', 'QUARTERLY', 'YEARLY'])
  plan?: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(730)
  durationDays?: number;
}
