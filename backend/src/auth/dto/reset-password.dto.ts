import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for POST /auth/reset-password
 *
 * The user clicks a reset link (which contains the token), then provides
 * their new password. The server verifies the token is valid and not expired,
 * then hashes and stores the new password.
 */
export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token from the forgot-password email/link' })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token!: string;

  @ApiProperty({ example: 'NewPassword1', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one digit',
  })
  password!: string;
}
