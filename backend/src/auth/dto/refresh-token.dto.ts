import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for POST /auth/refresh
 *
 * The client sends the refresh token it received during login.
 * The server validates it and returns a fresh access token + refresh token.
 * The old refresh token is deleted (rotated) so it can never be reused.
 */
export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token received from login or a previous refresh' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken!: string;
}
