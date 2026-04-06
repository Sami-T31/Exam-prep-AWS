import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto';
import { Public } from './decorators';
import { CurrentUser, RequestUser } from './decorators/current-user.decorator';

/**
 * AuthController — handles all authentication-related HTTP endpoints.
 *
 * All routes in this controller are @Public() because users need to
 * register and log in before they have a token. The only exception
 * would be if we add a "change password" route (which requires auth).
 *
 * Rate limiting is stricter here than the global default (100/min)
 * because auth endpoints are prime targets for brute-force attacks.
 * The @Throttle decorator overrides the global limit for these routes.
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/register
   *
   * Creates a new user account. Returns the user profile plus
   * access and refresh tokens so the user is immediately logged in.
   */
  @Public()
  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Create a new user account' })
  @ApiConflictResponse({ description: 'Email or phone already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(
      dto.name,
      dto.email,
      dto.phone,
      dto.password,
    );
  }

  /**
   * POST /api/v1/auth/login
   *
   * Authenticates with email + password. Returns access and refresh tokens.
   * HttpCode(200) overrides the default 201 for POST — login isn't "creating"
   * a resource, it's verifying identity.
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiOkResponse({ description: 'Login successful, returns tokens' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  /**
   * POST /api/v1/auth/refresh
   *
   * Exchanges a valid refresh token for a new access + refresh token pair.
   * The old refresh token is invalidated (token rotation).
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Exchange refresh token for new tokens' })
  @ApiOkResponse({ description: 'New token pair returned' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * POST /api/v1/auth/logout
   *
   * Invalidates the provided refresh token. The access token remains
   * valid until it expires naturally (max 15 min).
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out (invalidate refresh token)' })
  @ApiOkResponse({ description: 'Logged out successfully' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }

  /**
   * POST /api/v1/auth/forgot-password
   *
   * Initiates a password reset. Generates a reset token and logs it
   * to the console (email integration is a future task).
   * Always returns success to prevent email enumeration.
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @ApiOperation({ summary: 'Request a password reset' })
  @ApiOkResponse({ description: 'If the email exists, a reset token was generated' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {
      message:
        'If an account with that email exists, a password reset link has been sent',
    };
  }

  /**
   * POST /api/v1/auth/reset-password
   *
   * Completes the password reset using the token from forgot-password.
   * After success, all existing sessions (refresh tokens) are invalidated.
   */
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Reset password using a reset token' })
  @ApiOkResponse({ description: 'Password updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: 'Password has been reset successfully. Please log in.' };
  }

  /**
   * PATCH /api/v1/auth/onboarding-complete
   *
   * Marks the current user's onboarding as completed.
   * Idempotent — calling it multiple times is safe.
   */
  @Patch('onboarding-complete')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Mark onboarding as completed (requires auth)' })
  @ApiOkResponse({ description: 'Onboarding marked as completed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async completeOnboarding(@CurrentUser() user: RequestUser) {
    await this.authService.completeOnboarding(user.id);
    return { message: 'Onboarding completed' };
  }

  /**
   * GET /api/v1/auth/me
   *
   * Returns the currently authenticated user's profile.
   * This is NOT @Public() — it requires a valid access token.
   */
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile (requires auth)' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  async me(@CurrentUser() user: RequestUser) {
    return this.authService.getProfile(user.id);
  }
}
