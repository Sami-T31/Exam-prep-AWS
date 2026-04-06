import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { RedisService } from '../redis';
import { TokenService } from './token.service';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import {
  requireSanitizedText,
  sanitizeTextInput,
} from '../common/utils/sanitize';

/**
 * Shape returned to the controller after successful login/register.
 * The controller sends this as the HTTP response body.
 */
export interface AuthResult {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    onboardingCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

/**
 * Number of bcrypt salt rounds. Higher = slower hash = harder to brute-force.
 * 12 rounds takes ~250ms per hash on modern hardware — good enough to make
 * password cracking impractical, fast enough not to annoy users at login.
 */
const BCRYPT_SALT_ROUNDS = 12;
const LOGIN_FAILURE_WINDOW_SECONDS = 15 * 60;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
  ) {}

  // =========================================================================
  // REGISTER
  // =========================================================================
  /**
   * Create a new user account.
   *
   * Flow:
   * 1. Check if email or phone is already taken (unique constraint)
   * 2. Hash the password (so we never store the raw password)
   * 3. Create the user record
   * 4. Generate access + refresh tokens
   * 5. Store the refresh token hash in the database
   * 6. Return user + tokens
   */
  async register(
    name: string,
    email: string,
    phone: string,
    password: string,
  ): Promise<AuthResult> {
    const sanitizedName = requireSanitizedText(name, 'Name');
    const normalizedEmail = sanitizeTextInput(email).toLowerCase();
    const normalizedPhone = sanitizeTextInput(phone);

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { phone: normalizedPhone }],
        deletedAt: null,
      },
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw new ConflictException(
        'An account with this phone number already exists',
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        name: sanitizedName,
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash,
        role: UserRole.STUDENT,
        consent: {
          create: {
            analyticsOptIn: false,
            personalizationOptIn: false,
            marketingOptIn: false,
          },
        },
      },
    });

    const tokens = await this.generateAndStoreTokens(user.id, user.role);

    this.logger.log(`User registered: ${user.email} (${user.id})`);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      ...tokens,
    };
  }

  // =========================================================================
  // LOGIN
  // =========================================================================
  /**
   * Authenticate a user with email + password.
   *
   * Flow:
   * 1. Find user by email (excluding soft-deleted accounts)
   * 2. Compare the provided password against the stored hash
   * 3. If match: generate new tokens, return them
   * 4. If no match: throw 401 Unauthorized
   *
   * Note: We use the same error message for "user not found" and "wrong
   * password" to prevent attackers from discovering valid email addresses.
   */
  async login(email: string, password: string): Promise<AuthResult> {
    const normalizedEmail = sanitizeTextInput(email).toLowerCase();
    await this.assertLoginNotLocked(normalizedEmail);

    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
    });

    if (!user) {
      await this.recordFailedLogin(normalizedEmail);
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      await this.recordFailedLogin(normalizedEmail);
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.clearFailedLogin(normalizedEmail);

    const tokens = await this.generateAndStoreTokens(user.id, user.role);

    this.logger.log(`User logged in: ${user.email} (${user.id})`);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      ...tokens,
    };
  }

  // =========================================================================
  // REFRESH
  // =========================================================================
  /**
   * Exchange a refresh token for a new access token + refresh token pair.
   *
   * Flow:
   * 1. Verify the JWT signature and expiration
   * 2. Hash the token and look it up in the database
   * 3. If found: delete the old token (rotation), create new pair
   * 4. If not found: the token was already used or revoked — reject
   *
   * Token rotation: every time a refresh token is used, it's replaced
   * with a new one. This limits the damage if a refresh token is stolen —
   * the legitimate user's next refresh will fail (because the token was
   * already consumed), alerting them to compromise.
   */
  async refresh(
    rawRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = this.tokenService.verifyRefreshToken(rawRefreshToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.tokenService.hashToken(rawRefreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      this.logger.warn(
        `Refresh token reuse detected for user ${payload.sub} — revoking all sessions`,
      );
      await this.prisma.refreshToken.deleteMany({
        where: { userId: payload.sub },
      });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    return this.generateAndStoreTokens(user.id, user.role);
  }

  // =========================================================================
  // LOGOUT
  // =========================================================================
  /**
   * Invalidate a refresh token so it can't be used again.
   *
   * Flow:
   * 1. Verify the JWT to extract the token ID
   * 2. Hash the token and delete the matching row from the database
   *
   * After logout, the access token is still valid until it expires (15 min).
   * This is normal for JWT — there's no server-side "session" to destroy.
   * The short 15-minute window is an acceptable trade-off for performance.
   */
  async logout(rawRefreshToken: string): Promise<void> {
    const payload = this.tokenService.verifyRefreshToken(rawRefreshToken);
    if (!payload) {
      return; // Token already invalid — nothing to revoke
    }

    const tokenHash = this.tokenService.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.deleteMany({
      where: { userId: payload.sub, tokenHash },
    });

    this.logger.log(`User logged out: ${payload.sub}`);
  }

  // =========================================================================
  // FORGOT PASSWORD
  // =========================================================================
  /**
   * Initiate the password reset flow.
   *
   * Flow:
   * 1. Look up the user by email
   * 2. If found: generate a random token, hash it, store it with 1-hour expiry
   * 3. Log the raw token to console (email integration is a future task)
   * 4. Always return success — even if the email doesn't exist
   *
   * Why always return success? If we returned "email not found", an attacker
   * could use this endpoint to check if someone has an account. By always
   * saying "check your email", we reveal nothing.
   */
  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = sanitizeTextInput(email).toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail, deletedAt: null },
    });

    if (!user) {
      this.logger.debug(
        `Forgot password for non-existent email: ${normalizedEmail}`,
      );
      return; // Silent return — don't reveal that email doesn't exist
    }

    // Invalidate any existing unused reset tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = this.tokenService.generateRandomToken();
    const tokenHash = this.tokenService.hashToken(rawToken);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: this.tokenService.getPasswordResetExpiry(),
      },
    });

    // TODO: Replace with actual email/SMS sending (see PENDING_DECISIONS.md)
    // Never log raw reset tokens to avoid credential exposure in logs.
    this.logger.log(
      `[DEV ONLY] Password reset requested for user ${user.id}; token generated and stored securely.`,
    );
  }

  private failedLoginKey(email: string): string {
    return `auth:failed-login:${email}`;
  }

  private lockKey(email: string): string {
    return `auth:login-lock:${email}`;
  }

  private async assertLoginNotLocked(email: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const locked = await client.get(this.lockKey(email));
      if (!locked) return;

      const ttl = await client.ttl(this.lockKey(email));
      const safeTtl = ttl > 0 ? ttl : LOGIN_FAILURE_WINDOW_SECONDS;
      throw new UnauthorizedException(
        `Too many failed login attempts. Try again in ${Math.ceil(
          safeTtl / 60,
        )} minutes.`,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn('Redis unavailable for login lockout check');
    }
  }

  private async recordFailedLogin(email: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const failedKey = this.failedLoginKey(email);
      const currentCount = await client.incr(failedKey);
      if (currentCount === 1) {
        await client.expire(failedKey, LOGIN_FAILURE_WINDOW_SECONDS);
      }
      if (currentCount < MAX_FAILED_LOGIN_ATTEMPTS) {
        return;
      }

      await client.set(
        this.lockKey(email),
        '1',
        'EX',
        LOGIN_FAILURE_WINDOW_SECONDS,
      );
      await client.del(failedKey);
      this.logger.warn(`Login lockout triggered for ${email}`);
    } catch {
      this.logger.warn('Redis unavailable for failed login tracking');
    }
  }

  private async clearFailedLogin(email: string): Promise<void> {
    try {
      const client = this.redisService.getClient();
      await client.del(this.failedLoginKey(email), this.lockKey(email));
    } catch {
      this.logger.warn('Redis unavailable while clearing failed login state');
    }
  }

  // =========================================================================
  // RESET PASSWORD
  // =========================================================================
  /**
   * Complete the password reset by setting a new password.
   *
   * Flow:
   * 1. Hash the provided token and look it up in the database
   * 2. Check it hasn't expired and hasn't been used
   * 3. Hash the new password and update the user record
   * 4. Mark the reset token as used
   * 5. Delete all the user's refresh tokens (force re-login everywhere)
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.tokenService.hashToken(rawToken);

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!resetToken) {
      throw new UnauthorizedException(
        'Invalid or expired password reset token',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Force re-login on all devices by wiping all refresh tokens
      this.prisma.refreshToken.deleteMany({
        where: { userId: resetToken.userId },
      }),
    ]);

    this.logger.log(`Password reset completed for user ${resetToken.userId}`);
  }

  // =========================================================================
  // PROFILE
  // =========================================================================

  async getProfile(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    return user;
  }

  async completeOnboarding(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });
  }

  // =========================================================================
  // HELPERS
  // =========================================================================

  /**
   * Generate a new access + refresh token pair and store the refresh token
   * hash in the database. Used by register, login, and refresh flows.
   */
  private async generateAndStoreTokens(
    userId: string,
    role: UserRole,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Create the refresh token DB row first to get its ID
    const refreshTokenRow = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: 'pending', // Placeholder — updated below
        expiresAt: this.tokenService.getRefreshTokenExpiry(),
      },
    });

    const accessToken = this.tokenService.signAccessToken(userId, role);
    const refreshToken = this.tokenService.signRefreshToken(
      userId,
      refreshTokenRow.id,
    );

    // Store the hash of the actual token
    const tokenHash = this.tokenService.hashToken(refreshToken);
    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRow.id },
      data: { tokenHash },
    });

    return { accessToken, refreshToken };
  }
}
