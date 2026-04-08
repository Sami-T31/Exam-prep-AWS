import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  dailyReminderEnabled?: boolean;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Daily reminder time in HH:mm format',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  dailyReminderTime?: string;

  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  preferredLanguage?: string;
}
