import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { type SignOptions } from 'jsonwebtoken';
import * as crypto from 'crypto';

/**
 * The data we embed inside every JWT access token.
 * When a protected endpoint receives a request, the guard decodes
 * the token and makes this payload available as `request.user`.
 */
export interface AccessTokenPayload {
  sub: string; // "subject" — the user's ID (standard JWT claim name)
  role: string; // "STUDENT" or "ADMIN"
}

/**
 * The data we embed inside every JWT refresh token.
 * Refresh tokens also carry the user ID, but their purpose is
 * solely to obtain new access tokens — not to authorize requests.
 */
export interface RefreshTokenPayload {
  sub: string;
  jti: string; // "JWT ID" — a unique identifier we store in the DB
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiry: string;
  private readonly refreshExpiry: string;

  constructor(private readonly config: ConfigService) {
    this.accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.accessExpiry = this.config.getOrThrow<string>('JWT_ACCESS_EXPIRY');
    this.refreshExpiry = this.config.getOrThrow<string>('JWT_REFRESH_EXPIRY');
  }

  /**
   * Create a short-lived access token.
   * This token is sent with every API request in the Authorization header.
   * It's small and fast to verify — no database lookup needed.
   */
  signAccessToken(userId: string, role: string): string {
    const payload: AccessTokenPayload = { sub: userId, role };
    const options: SignOptions = { expiresIn: this.accessExpiry as any };
    return jwt.sign(payload, this.accessSecret, options);
  }

  /**
   * Create a long-lived refresh token.
   * @param userId - the user's ID
   * @param jti - the unique token ID (stored in the database so we can revoke it)
   */
  signRefreshToken(userId: string, jti: string): string {
    const payload: RefreshTokenPayload = { sub: userId, jti };
    const options: SignOptions = { expiresIn: this.refreshExpiry as any };
    return jwt.sign(payload, this.refreshSecret, options);
  }

  /**
   * Verify and decode an access token.
   * Returns the payload if valid, or null if expired/tampered.
   */
  verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      return jwt.verify(token, this.accessSecret) as AccessTokenPayload;
    } catch (error) {
      this.logger.debug(
        `Access token verification failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  /**
   * Verify and decode a refresh token.
   * Returns the payload if valid, or null if expired/tampered.
   */
  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      return jwt.verify(token, this.refreshSecret) as RefreshTokenPayload;
    } catch (error) {
      this.logger.debug(
        `Refresh token verification failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return null;
    }
  }

  /**
   * SHA-256 hash a token before storing it in the database.
   * We never store raw tokens — if the database is breached, the attacker
   * can't use the hashes to impersonate users.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a cryptographically random token string.
   * Used for password reset tokens — these aren't JWTs, just random bytes.
   */
  generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Parse the refresh token expiry string (e.g., "7d") into a Date.
   * Used when storing the expiration timestamp in the database.
   */
  getRefreshTokenExpiry(): Date {
    return this.parseExpiry(this.refreshExpiry);
  }

  /**
   * Get a Date 1 hour from now (for password reset tokens).
   */
  getPasswordResetExpiry(): Date {
    return new Date(Date.now() + 60 * 60 * 1000);
  }

  private parseExpiry(expiry: string): Date {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: "${expiry}"`);
    }

    const value = parseInt(match[1]!, 10);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * (multipliers[unit!] ?? 0));
  }
}
