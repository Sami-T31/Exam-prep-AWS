import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class TrackSessionStartDto {
  @IsEnum(['WEB', 'MOBILE'])
  platform!: 'WEB' | 'MOBILE';

  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;
}
