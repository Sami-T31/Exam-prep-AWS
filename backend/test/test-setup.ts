import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from '../src/health.controller';
import { PrismaModule, PrismaService } from '../src/prisma';
import { RedisModule, RedisService } from '../src/redis';
import { CacheModule, CacheService } from '../src/common/cache';
import { AuthModule } from '../src/auth/auth.module';
import { StreamsModule } from '../src/streams/streams.module';
import { SubjectsModule } from '../src/subjects/subjects.module';
import { GradesModule } from '../src/grades/grades.module';
import { TopicsModule } from '../src/topics/topics.module';
import { QuestionsModule } from '../src/questions/questions.module';
import { BookmarksModule } from '../src/bookmarks/bookmarks.module';
import { ProgressModule } from '../src/progress/progress.module';
import { MockExamsModule } from '../src/mock-exams/mock-exams.module';
import { LeaderboardModule } from '../src/leaderboard/leaderboard.module';
import { SubscriptionsModule } from '../src/subscriptions/subscriptions.module';
import { PaymentsModule } from '../src/payments/payments.module';
import { AdminModule } from '../src/admin/admin.module';
import { AnalyticsModule } from '../src/analytics/analytics.module';
import { AdminAuditInterceptor } from '../src/common/interceptors/admin-audit.interceptor';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';

// ---------------------------------------------------------------------------
// Test environment variables – supplies the values ConfigModule.forRoot
// would normally read from .env so the testing module can boot without a
// real .env file.
// ---------------------------------------------------------------------------
const TEST_ENV = {
  NODE_ENV: 'test',
  BACKEND_PORT: '3001',
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
  REDIS_HOST: 'localhost',
  REDIS_PORT: '6379',
  REDIS_PASSWORD: 'testpassword',
  JWT_ACCESS_SECRET: 'test-access-secret-that-is-long-enough',
  JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-long-enough',
  JWT_ACCESS_EXPIRY: '15m',
  JWT_REFRESH_EXPIRY: '7d',
  CORS_ORIGINS: '',
};

// ---------------------------------------------------------------------------
// Mock Redis client – stubs out every ioredis method the app touches.
// ---------------------------------------------------------------------------
export function createMockRedisClient() {
  return {
    ping: jest.fn().mockResolvedValue('PONG'),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ttl: jest.fn().mockResolvedValue(-1),
    scan: jest.fn().mockResolvedValue(['0', []]),
    quit: jest.fn().mockResolvedValue('OK'),
  };
}

// ---------------------------------------------------------------------------
// Mock PrismaService – extends a plain object with the same shape the app
// expects (model delegates as jest.fn() stubs, plus lifecycle hooks).
// ---------------------------------------------------------------------------
export function createMockPrismaService() {
  const mockModel = () => ({
    findFirst: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  });

  const mock = {
    user: mockModel(),
    refreshToken: mockModel(),
    passwordResetToken: mockModel(),
    stream: mockModel(),
    subject: mockModel(),
    grade: mockModel(),
    topic: mockModel(),
    question: mockModel(),
    bookmark: mockModel(),
    progress: mockModel(),
    mockExam: mockModel(),
    mockExamQuestion: mockModel(),
    mockExamAttempt: mockModel(),
    mockExamAnswer: mockModel(),
    leaderboard: mockModel(),
    subscription: mockModel(),
    payment: mockModel(),
    userConsent: mockModel(),
    analyticsEvent: mockModel(),

    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    $transaction: jest.fn() as jest.Mock,

    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  mock.$transaction.mockImplementation((fns: unknown) => {
    if (Array.isArray(fns)) return Promise.all(fns);
    if (typeof fns === 'function') return (fns as Function)(mock);
    return Promise.resolve();
  });

  return mock;
}

// ---------------------------------------------------------------------------
// Mock user fixtures
// ---------------------------------------------------------------------------
const MOCK_STUDENT_ID = '00000000-0000-4000-a000-000000000001';
const MOCK_ADMIN_ID = '00000000-0000-4000-a000-000000000002';

export const MOCK_STUDENT = {
  id: MOCK_STUDENT_ID,
  name: 'Test Student',
  email: 'student@test.com',
  phone: '+251912345678',
  passwordHash: '$2a$12$mockhashmockhashmockhashmockhashmockhashmockha',
  role: 'STUDENT' as const,
  deletedAt: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

export const MOCK_ADMIN = {
  id: MOCK_ADMIN_ID,
  name: 'Test Admin',
  email: 'admin@test.com',
  phone: '+251987654321',
  passwordHash: '$2a$12$mockhashmockhashmockhashmockhashmockhashmockha',
  role: 'ADMIN' as const,
  deletedAt: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

// ---------------------------------------------------------------------------
// Token helpers – use the real TokenService from the compiled app so that
// JwtAuthGuard verifies against the same secret.
// ---------------------------------------------------------------------------
import jwt from 'jsonwebtoken';

export function signTestAccessToken(
  userId: string,
  role: string,
): string {
  return jwt.sign(
    { sub: userId, role },
    TEST_ENV.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );
}

export function signTestRefreshToken(
  userId: string,
  jti: string,
): string {
  return jwt.sign(
    { sub: userId, jti },
    TEST_ENV.JWT_REFRESH_SECRET,
    { expiresIn: '7d' },
  );
}

export const STUDENT_ACCESS_TOKEN = signTestAccessToken(MOCK_STUDENT.id, 'STUDENT');
export const ADMIN_ACCESS_TOKEN = signTestAccessToken(MOCK_ADMIN.id, 'ADMIN');

// ---------------------------------------------------------------------------
// createTestApp – builds the NestJS app with mocked infra services.
// ---------------------------------------------------------------------------
export async function createTestApp(): Promise<{
  app: INestApplication;
  module: TestingModule;
  prisma: ReturnType<typeof createMockPrismaService>;
  redisClient: ReturnType<typeof createMockRedisClient>;
}> {
  // Populate process.env so ConfigService.getOrThrow finds the values
  Object.assign(process.env, TEST_ENV);

  const mockPrisma = createMockPrismaService();
  const mockRedisClient = createMockRedisClient();

  const mockRedisService = {
    getClient: jest.fn().mockReturnValue(mockRedisClient),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  const moduleBuilder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => TEST_ENV],
      }),

      ScheduleModule.forRoot(),
      EventEmitterModule.forRoot(),

      PrismaModule,
      RedisModule,
      CacheModule,

      AuthModule,

      StreamsModule,
      SubjectsModule,
      GradesModule,
      TopicsModule,
      QuestionsModule,
      BookmarksModule,
      ProgressModule,
      MockExamsModule,
      LeaderboardModule,
      SubscriptionsModule,
      PaymentsModule,
      AdminModule,
      AnalyticsModule,

      ThrottlerModule.forRoot({
        throttlers: [{ name: 'default', ttl: 60_000, limit: 1000 }],
      }),
    ],
    controllers: [HealthController],
    providers: [
      { provide: APP_INTERCEPTOR, useClass: AdminAuditInterceptor },
    ],
  });

  moduleBuilder
    .overrideProvider(PrismaService)
    .useValue(mockPrisma)
    .overrideProvider(RedisService)
    .useValue(mockRedisService)
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true });

  const module = await moduleBuilder.compile();

  const app = module.createNestApplication();

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.init();

  return { app, module, prisma: mockPrisma, redisClient: mockRedisClient };
}

// ---------------------------------------------------------------------------
// Cleanup helper
// ---------------------------------------------------------------------------
export async function closeTestApp(app: INestApplication): Promise<void> {
  await app.close();
}
