import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';

// ── Module-level mocks ──────────────────────────────────────────────────────

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('../common/utils/sanitize', () => ({
  requireSanitizedText: jest.fn(),
  sanitizeTextInput: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require('bcryptjs') as {
  hash: jest.Mock<(password: string, saltOrRounds: number) => Promise<string>>;
  compare: jest.Mock<(data: string, encrypted: string) => Promise<boolean>>;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { requireSanitizedText, sanitizeTextInput } = require(
  '../common/utils/sanitize',
) as {
  requireSanitizedText: jest.Mock<(value: string, fieldName: string) => string>;
  sanitizeTextInput: jest.Mock<(value: string) => string>;
};

// ── Constants ───────────────────────────────────────────────────────────────

const MOCK_USER_ID = 'user-uuid-1';
const MOCK_EMAIL = 'test@example.com';
const MOCK_PHONE = '+2348012345678';
const MOCK_NAME = 'Test User';
const MOCK_PASSWORD = 'P@ssword123';
const MOCK_PASSWORD_HASH = '$2a$12$hashedpassword';
const MOCK_ACCESS_TOKEN = 'access.jwt.token';
const MOCK_REFRESH_TOKEN = 'refresh.jwt.token';
const MOCK_TOKEN_HASH = 'sha256-hash-of-token';
const MOCK_RANDOM_TOKEN = 'random-hex-token';
const MOCK_REFRESH_TOKEN_ROW_ID = 'rt-row-uuid-1';
const MOCK_RESET_TOKEN_ID = 'reset-token-uuid-1';

const NOW = new Date('2026-03-05T12:00:00.000Z');
const FUTURE_DATE = new Date('2026-03-12T12:00:00.000Z');

const MOCK_USER = {
  id: MOCK_USER_ID,
  name: MOCK_NAME,
  email: MOCK_EMAIL,
  phone: MOCK_PHONE,
  passwordHash: MOCK_PASSWORD_HASH,
  role: UserRole.STUDENT,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
};

// ── Mock builders ───────────────────────────────────────────────────────────

function buildMockRedisClient() {
  return {
    get: jest.fn<(...args: unknown[]) => Promise<string | null>>().mockResolvedValue(null),
    set: jest.fn<(...args: unknown[]) => Promise<string>>().mockResolvedValue('OK'),
    incr: jest.fn<(...args: unknown[]) => Promise<number>>().mockResolvedValue(1),
    expire: jest.fn<(...args: unknown[]) => Promise<number>>().mockResolvedValue(1),
    del: jest.fn<(...args: unknown[]) => Promise<number>>().mockResolvedValue(1),
    ttl: jest.fn<(...args: unknown[]) => Promise<number>>().mockResolvedValue(900),
  };
}

function buildMockDependencies() {
  const redisClient = buildMockRedisClient();

  const prisma = {
    user: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    refreshToken: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      deleteMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    passwordResetToken: {
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    $transaction: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(undefined),
  };

  const tokenService = {
    signAccessToken: jest.fn<(...args: unknown[]) => string>().mockReturnValue(MOCK_ACCESS_TOKEN),
    signRefreshToken: jest.fn<(...args: unknown[]) => string>().mockReturnValue(MOCK_REFRESH_TOKEN),
    verifyRefreshToken: jest.fn<(...args: unknown[]) => unknown>(),
    hashToken: jest.fn<(...args: unknown[]) => string>().mockReturnValue(MOCK_TOKEN_HASH),
    generateRandomToken: jest.fn<() => string>().mockReturnValue(MOCK_RANDOM_TOKEN),
    getRefreshTokenExpiry: jest.fn<() => Date>().mockReturnValue(FUTURE_DATE),
    getPasswordResetExpiry: jest.fn<() => Date>().mockReturnValue(FUTURE_DATE),
  };

  const redisService = {
    getClient: jest.fn().mockReturnValue(redisClient),
  };

  return { prisma, tokenService, redisService, redisClient };
}

// ── Test suite ──────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof buildMockDependencies>['prisma'];
  let tokenService: ReturnType<typeof buildMockDependencies>['tokenService'];
  let redisService: ReturnType<typeof buildMockDependencies>['redisService'];
  let redisClient: ReturnType<typeof buildMockRedisClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    const deps = buildMockDependencies();
    prisma = deps.prisma;
    tokenService = deps.tokenService;
    redisService = deps.redisService;
    redisClient = deps.redisClient;

    sanitizeTextInput.mockImplementation((v: string) => v.trim());
    requireSanitizedText.mockImplementation((v: string) => v.trim());

    service = new AuthService(
      prisma as never,
      tokenService as never,
      redisService as never,
    );
  });

  /**
   * Wire up the prisma.refreshToken.create mock to return a row with the
   * given user ID, so `generateAndStoreTokens` works end-to-end.
   */
  function stubTokenGeneration(userId: string = MOCK_USER_ID) {
    prisma.refreshToken.create.mockResolvedValue({
      id: MOCK_REFRESH_TOKEN_ROW_ID,
      userId,
      tokenHash: 'pending',
      expiresAt: FUTURE_DATE,
    });
    prisma.refreshToken.update.mockResolvedValue({
      id: MOCK_REFRESH_TOKEN_ROW_ID,
      tokenHash: MOCK_TOKEN_HASH,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTER
  // ═══════════════════════════════════════════════════════════════════════════

  describe('register', () => {
    it('should create a user and return tokens on success', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...MOCK_USER });
      bcrypt.hash.mockResolvedValue(MOCK_PASSWORD_HASH);
      stubTokenGeneration();

      const result = await service.register(MOCK_NAME, MOCK_EMAIL, MOCK_PHONE, MOCK_PASSWORD);

      expect(result.user.id).toBe(MOCK_USER_ID);
      expect(result.user.email).toBe(MOCK_EMAIL);
      expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN);
      expect(result.refreshToken).toBe(MOCK_REFRESH_TOKEN);

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(tokenService.signAccessToken).toHaveBeenCalledWith(MOCK_USER_ID, UserRole.STUDENT);
      expect(tokenService.signRefreshToken).toHaveBeenCalledWith(MOCK_USER_ID, MOCK_REFRESH_TOKEN_ROW_ID);
    });

    it('should throw ConflictException for duplicate email', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...MOCK_USER });

      await expect(
        service.register(MOCK_NAME, MOCK_EMAIL, MOCK_PHONE, MOCK_PASSWORD),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.register(MOCK_NAME, MOCK_EMAIL, MOCK_PHONE, MOCK_PASSWORD),
      ).rejects.toThrow('An account with this email already exists');
    });

    it('should throw ConflictException for duplicate phone', async () => {
      const existingWithDifferentEmail = { ...MOCK_USER, email: 'other@example.com' };
      prisma.user.findFirst.mockResolvedValue(existingWithDifferentEmail);

      await expect(
        service.register(MOCK_NAME, MOCK_EMAIL, MOCK_PHONE, MOCK_PASSWORD),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.register(MOCK_NAME, MOCK_EMAIL, MOCK_PHONE, MOCK_PASSWORD),
      ).rejects.toThrow('An account with this phone number already exists');
    });

    it('should normalize email to lowercase', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...MOCK_USER });
      bcrypt.hash.mockResolvedValue(MOCK_PASSWORD_HASH);
      stubTokenGeneration();
      sanitizeTextInput.mockImplementation((v: string) => v.trim());

      await service.register(MOCK_NAME, 'TEST@EXAMPLE.COM', MOCK_PHONE, MOCK_PASSWORD);

      const createCall = prisma.user.create.mock.calls[0] as [{ data: { email: string } }];
      expect(createCall[0].data.email).toBe('test@example.com');
    });

    it('should sanitize the name input', async () => {
      requireSanitizedText.mockReturnValue('Clean Name');
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...MOCK_USER, name: 'Clean Name' });
      bcrypt.hash.mockResolvedValue(MOCK_PASSWORD_HASH);
      stubTokenGeneration();

      await service.register('<script>alert("xss")</script>', MOCK_EMAIL, MOCK_PHONE, MOCK_PASSWORD);

      expect(requireSanitizedText).toHaveBeenCalledWith('<script>alert("xss")</script>', 'Name');
      const createCall = prisma.user.create.mock.calls[0] as [{ data: { name: string } }];
      expect(createCall[0].data.name).toBe('Clean Name');
    });

    it('should hash the password with bcrypt', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...MOCK_USER });
      bcrypt.hash.mockResolvedValue(MOCK_PASSWORD_HASH);
      stubTokenGeneration();

      await service.register(MOCK_NAME, MOCK_EMAIL, MOCK_PHONE, MOCK_PASSWORD);

      expect(bcrypt.hash).toHaveBeenCalledWith(MOCK_PASSWORD, 12);
    });

    it('should create a default consent record with all flags false', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...MOCK_USER });
      bcrypt.hash.mockResolvedValue(MOCK_PASSWORD_HASH);
      stubTokenGeneration();

      await service.register(MOCK_NAME, MOCK_EMAIL, MOCK_PHONE, MOCK_PASSWORD);

      const createCall = prisma.user.create.mock.calls[0] as [{ data: { consent: { create: unknown } } }];
      expect(createCall[0].data.consent).toEqual({
        create: {
          analyticsOptIn: false,
          personalizationOptIn: false,
          marketingOptIn: false,
        },
      });
    });

    it('should set role to STUDENT for new registrations', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...MOCK_USER });
      bcrypt.hash.mockResolvedValue(MOCK_PASSWORD_HASH);
      stubTokenGeneration();

      await service.register(MOCK_NAME, MOCK_EMAIL, MOCK_PHONE, MOCK_PASSWORD);

      const createCall = prisma.user.create.mock.calls[0] as [{ data: { role: UserRole } }];
      expect(createCall[0].data.role).toBe(UserRole.STUDENT);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════════════════

  describe('login', () => {
    it('should authenticate and return tokens for valid credentials', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...MOCK_USER });
      bcrypt.compare.mockResolvedValue(true);
      stubTokenGeneration();

      const result = await service.login(MOCK_EMAIL, MOCK_PASSWORD);

      expect(result.user.id).toBe(MOCK_USER_ID);
      expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN);
      expect(result.refreshToken).toBe(MOCK_REFRESH_TOKEN);
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login('nobody@example.com', MOCK_PASSWORD)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...MOCK_USER });
      bcrypt.compare.mockResolvedValue(false);

      await expect(service.login(MOCK_EMAIL, 'wrongpassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should use the same error message for missing user and wrong password (anti-enumeration)', async () => {
      const EXPECTED_MESSAGE = 'Invalid email or password';

      prisma.user.findFirst.mockResolvedValue(null);
      const missingUserError = await service.login(MOCK_EMAIL, MOCK_PASSWORD).catch((e) => e);

      prisma.user.findFirst.mockResolvedValue({ ...MOCK_USER });
      bcrypt.compare.mockResolvedValue(false);
      const wrongPasswordError = await service.login(MOCK_EMAIL, 'wrong').catch((e) => e);

      expect(missingUserError.message).toBe(EXPECTED_MESSAGE);
      expect(wrongPasswordError.message).toBe(EXPECTED_MESSAGE);
    });

    it('should record failed login attempt in Redis when user not found', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await service.login(MOCK_EMAIL, MOCK_PASSWORD).catch(() => {});

      expect(redisClient.incr).toHaveBeenCalled();
    });

    it('should record failed login attempt in Redis when password is wrong', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...MOCK_USER });
      bcrypt.compare.mockResolvedValue(false);

      await service.login(MOCK_EMAIL, MOCK_PASSWORD).catch(() => {});

      expect(redisClient.incr).toHaveBeenCalled();
    });

    it('should lock account after MAX_FAILED_LOGIN_ATTEMPTS (5) failures', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      redisClient.incr.mockResolvedValue(5);

      await service.login(MOCK_EMAIL, MOCK_PASSWORD).catch(() => {});

      expect(redisClient.set).toHaveBeenCalledWith(
        expect.stringContaining('auth:login-lock:'),
        '1',
        'EX',
        expect.any(Number),
      );
      expect(redisClient.del).toHaveBeenCalled();
    });

    it('should throw when account is locked', async () => {
      redisClient.get.mockResolvedValue('1');

      await expect(service.login(MOCK_EMAIL, MOCK_PASSWORD)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(MOCK_EMAIL, MOCK_PASSWORD)).rejects.toThrow(
        /Too many failed login attempts/,
      );
    });

    it('should clear failed login count on successful login', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...MOCK_USER });
      bcrypt.compare.mockResolvedValue(true);
      stubTokenGeneration();

      await service.login(MOCK_EMAIL, MOCK_PASSWORD);

      expect(redisClient.del).toHaveBeenCalled();
    });

    it('should handle Redis unavailability gracefully during lockout check', async () => {
      redisService.getClient.mockImplementation(() => {
        throw new Error('Redis connection refused');
      });
      prisma.user.findFirst.mockResolvedValue({ ...MOCK_USER });
      bcrypt.compare.mockResolvedValue(true);
      stubTokenGeneration();

      const result = await service.login(MOCK_EMAIL, MOCK_PASSWORD);

      expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN);
    });

    it('should set expiry on the failed-login key on first failure', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      redisClient.incr.mockResolvedValue(1);

      await service.login(MOCK_EMAIL, MOCK_PASSWORD).catch(() => {});

      expect(redisClient.expire).toHaveBeenCalledWith(
        expect.stringContaining('auth:failed-login:'),
        expect.any(Number),
      );
    });

    it('should not set expiry on subsequent failures (count > 1)', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      redisClient.incr.mockResolvedValue(3);

      await service.login(MOCK_EMAIL, MOCK_PASSWORD).catch(() => {});

      expect(redisClient.expire).not.toHaveBeenCalled();
    });

    it('should return user shape with expected fields', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...MOCK_USER });
      bcrypt.compare.mockResolvedValue(true);
      stubTokenGeneration();

      const result = await service.login(MOCK_EMAIL, MOCK_PASSWORD);

      expect(result.user).toEqual({
        id: MOCK_USER_ID,
        name: MOCK_NAME,
        email: MOCK_EMAIL,
        phone: MOCK_PHONE,
        role: UserRole.STUDENT,
        createdAt: NOW,
        updatedAt: NOW,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REFRESH
  // ═══════════════════════════════════════════════════════════════════════════

  describe('refresh', () => {
    it('should rotate tokens on valid refresh', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: MOCK_USER_ID, jti: 'jti-1' });
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: MOCK_REFRESH_TOKEN_ROW_ID,
        userId: MOCK_USER_ID,
        tokenHash: MOCK_TOKEN_HASH,
        expiresAt: FUTURE_DATE,
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ ...MOCK_USER });
      stubTokenGeneration();

      const result = await service.refresh(MOCK_REFRESH_TOKEN);

      expect(result.accessToken).toBe(MOCK_ACCESS_TOKEN);
      expect(result.refreshToken).toBe(MOCK_REFRESH_TOKEN);
    });

    it('should throw for invalid/expired refresh token (verification fails)', async () => {
      tokenService.verifyRefreshToken.mockReturnValue(null);

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh('bad-token')).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should revoke all sessions and throw for reused token (not found in DB)', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: MOCK_USER_ID, jti: 'jti-1' });
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refresh(MOCK_REFRESH_TOKEN)).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_ID },
      });
    });

    it('should delete old token before creating new one', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: MOCK_USER_ID, jti: 'jti-1' });
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: MOCK_REFRESH_TOKEN_ROW_ID,
        userId: MOCK_USER_ID,
        tokenHash: MOCK_TOKEN_HASH,
        expiresAt: FUTURE_DATE,
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue({ ...MOCK_USER });
      stubTokenGeneration();

      await service.refresh(MOCK_REFRESH_TOKEN);

      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: MOCK_REFRESH_TOKEN_ROW_ID },
      });

      const deleteOrder = prisma.refreshToken.delete.mock.invocationCallOrder[0];
      const createOrder = prisma.refreshToken.create.mock.invocationCallOrder[0];
      expect(deleteOrder).toBeLessThan(createOrder!);
    });

    it('should throw when user account is missing (soft-deleted after token issued)', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: MOCK_USER_ID, jti: 'jti-1' });
      prisma.refreshToken.findFirst.mockResolvedValue({
        id: MOCK_REFRESH_TOKEN_ROW_ID,
        userId: MOCK_USER_ID,
        tokenHash: MOCK_TOKEN_HASH,
        expiresAt: FUTURE_DATE,
      });
      prisma.refreshToken.delete.mockResolvedValue({});
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.refresh(MOCK_REFRESH_TOKEN)).rejects.toThrow(UnauthorizedException);
      await expect(service.refresh(MOCK_REFRESH_TOKEN)).rejects.toThrow('User account not found');
    });

    it('should hash the raw token to look it up in the database', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: MOCK_USER_ID, jti: 'jti-1' });
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      await service.refresh('raw-token-value').catch(() => {});

      expect(tokenService.hashToken).toHaveBeenCalledWith('raw-token-value');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('logout', () => {
    it('should delete matching refresh token from database', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: MOCK_USER_ID, jti: 'jti-1' });
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout(MOCK_REFRESH_TOKEN);

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_ID, tokenHash: MOCK_TOKEN_HASH },
      });
    });

    it('should return silently for invalid token (nothing to revoke)', async () => {
      tokenService.verifyRefreshToken.mockReturnValue(null);

      await expect(service.logout('bad-token')).resolves.toBeUndefined();
      expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });

    it('should hash the raw token before querying', async () => {
      tokenService.verifyRefreshToken.mockReturnValue({ sub: MOCK_USER_ID, jti: 'jti-1' });
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await service.logout('some-raw-token');

      expect(tokenService.hashToken).toHaveBeenCalledWith('some-raw-token');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FORGOT PASSWORD
  // ═══════════════════════════════════════════════════════════════════════════

  describe('forgotPassword', () => {
    it('should create a password reset token for an existing user', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...MOCK_USER });
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      prisma.passwordResetToken.create.mockResolvedValue({});

      await service.forgotPassword(MOCK_EMAIL);

      expect(tokenService.generateRandomToken).toHaveBeenCalled();
      expect(tokenService.hashToken).toHaveBeenCalledWith(MOCK_RANDOM_TOKEN);
      expect(prisma.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: MOCK_USER_ID,
          tokenHash: MOCK_TOKEN_HASH,
          expiresAt: FUTURE_DATE,
        },
      });
    });

    it('should return silently for non-existent email (anti-enumeration)', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.forgotPassword('nobody@example.com')).resolves.toBeUndefined();
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('should invalidate existing unused reset tokens before creating a new one', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...MOCK_USER });
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 2 });
      prisma.passwordResetToken.create.mockResolvedValue({});

      await service.forgotPassword(MOCK_EMAIL);

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId: MOCK_USER_ID, usedAt: null },
        data: { usedAt: expect.any(Date) },
      });

      const updateOrder = prisma.passwordResetToken.updateMany.mock.invocationCallOrder[0];
      const createOrder = prisma.passwordResetToken.create.mock.invocationCallOrder[0];
      expect(updateOrder).toBeLessThan(createOrder!);
    });

    it('should use getPasswordResetExpiry for the token expiration', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...MOCK_USER });
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      prisma.passwordResetToken.create.mockResolvedValue({});

      await service.forgotPassword(MOCK_EMAIL);

      expect(tokenService.getPasswordResetExpiry).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET PASSWORD
  // ═══════════════════════════════════════════════════════════════════════════

  describe('resetPassword', () => {
    const MOCK_RESET_TOKEN_ROW = {
      id: MOCK_RESET_TOKEN_ID,
      userId: MOCK_USER_ID,
      tokenHash: MOCK_TOKEN_HASH,
      usedAt: null,
      expiresAt: FUTURE_DATE,
      user: MOCK_USER,
    };

    it('should update the password hash and mark the reset token as used', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValue({ ...MOCK_RESET_TOKEN_ROW });
      bcrypt.hash.mockResolvedValue('new-hashed-password');

      await service.resetPassword(MOCK_RANDOM_TOKEN, 'NewP@ss123');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewP@ss123', 12);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should revoke all refresh tokens to force re-login on all devices', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValue({ ...MOCK_RESET_TOKEN_ROW });
      bcrypt.hash.mockResolvedValue('new-hashed-password');

      await service.resetPassword(MOCK_RANDOM_TOKEN, 'NewP@ss123');

      const transactionArg = prisma.$transaction.mock.calls[0]![0] as unknown[];
      expect(transactionArg).toHaveLength(3);
    });

    it('should throw for invalid/expired/used reset token', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword('bad-token', 'NewP@ss123')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.resetPassword('bad-token', 'NewP@ss123')).rejects.toThrow(
        'Invalid or expired password reset token',
      );
    });

    it('should use $transaction for atomicity', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValue({ ...MOCK_RESET_TOKEN_ROW });
      bcrypt.hash.mockResolvedValue('new-hashed-password');

      await service.resetPassword(MOCK_RANDOM_TOKEN, 'NewP@ss123');

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should hash the raw token to find it in the database', async () => {
      prisma.passwordResetToken.findFirst.mockResolvedValue(null);

      await service.resetPassword('raw-reset-token', 'NewP@ss123').catch(() => {});

      expect(tokenService.hashToken).toHaveBeenCalledWith('raw-reset-token');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET PROFILE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getProfile', () => {
    it('should return user data for a valid userId', async () => {
      const profileData = {
        id: MOCK_USER_ID,
        name: MOCK_NAME,
        email: MOCK_EMAIL,
        phone: MOCK_PHONE,
        role: UserRole.STUDENT,
        createdAt: NOW,
        updatedAt: NOW,
      };
      prisma.user.findFirst.mockResolvedValue(profileData);

      const result = await service.getProfile(MOCK_USER_ID);

      expect(result).toEqual(profileData);
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: MOCK_USER_ID, deletedAt: null },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it('should throw UnauthorizedException for a missing user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(UnauthorizedException);
      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(
        'User account not found',
      );
    });

    it('should exclude soft-deleted users', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await service.getProfile(MOCK_USER_ID).catch(() => {});

      const callArgs = prisma.user.findFirst.mock.calls[0] as [{ where: { deletedAt: null } }];
      expect(callArgs[0].where.deletedAt).toBeNull();
    });
  });
});
