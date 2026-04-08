import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({ example: 'NewPassword1', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
  })
  newPassword!: string;
}
