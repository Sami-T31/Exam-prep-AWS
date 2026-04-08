import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'Push notification device token' })
  @IsString()
  @IsNotEmpty()
  deviceToken!: string;

  @ApiProperty({ enum: ['IOS', 'ANDROID'], example: 'IOS' })
  @IsString()
  @IsEnum(['IOS', 'ANDROID'])
  platform!: 'IOS' | 'ANDROID';
}
