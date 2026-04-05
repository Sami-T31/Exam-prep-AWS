import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  closeTestApp,
  createMockPrismaService,
  createMockRedisClient,
  MOCK_STUDENT,
  MOCK_ADMIN,
  STUDENT_ACCESS_TOKEN,
  ADMIN_ACCESS_TOKEN,
  signTestAccessToken,
  signTestRefreshToken,
} from './test-setup';

// ---------------------------------------------------------------------------
// Suite-wide state
// ---------------------------------------------------------------------------
let app: INestApplication;
let prisma: ReturnType<typeof createMockPrismaService>;
let redisClient: ReturnType<typeof createMockRedisClient>;

beforeAll(async () => {
  const ctx = await createTestApp();
  app = ctx.app;
  prisma = ctx.prisma;
  redisClient = ctx.redisClient;
});

afterAll(async () => {
  await closeTestApp(app);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// 1. HEALTH CHECK
// ===========================================================================
describe('Health Check (GET /api/v1/health)', () => {
  it('returns 200 with status, timestamp, and dependencies when services are healthy', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    redisClient.ping.mockResolvedValueOnce('PONG');

    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(typeof res.body.timestamp).toBe('string');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('dependencies');
    expect(res.body.dependencies).toHaveProperty('postgres');
    expect(res.body.dependencies.postgres).toHaveProperty('status', 'connected');
    expect(res.body.dependencies).toHaveProperty('redis');
    expect(res.body.dependencies.redis).toHaveProperty('status', 'connected');
  });

  it('returns degraded status when Postgres is down', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('connection refused'));
    redisClient.ping.mockResolvedValueOnce('PONG');

    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(res.body.status).toBe('degraded');
    expect(res.body.dependencies.postgres.status).toBe('disconnected');
    expect(res.body.dependencies.redis.status).toBe('connected');
  });

  it('returns degraded status when Redis is down', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
    redisClient.ping.mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(res.body.status).toBe('degraded');
    expect(res.body.dependencies.postgres.status).toBe('connected');
    expect(res.body.dependencies.redis.status).toBe('disconnected');
  });

  it('does not require authentication (public route)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health');

    expect(res.status).toBe(200);
  });
});

// ===========================================================================
// 2. AUTH FLOW
// ===========================================================================
describe('Auth Flow', () => {
  // -------------------------------------------------------------------------
  // POST /api/v1/auth/register
  // -------------------------------------------------------------------------
  describe('POST /api/v1/auth/register', () => {
    it('creates a user and returns tokens on valid input', async () => {
      const NOW = new Date();
      const CREATED_USER = {
        id: 'new-user-id',
        name: 'Abebe Kebede',
        email: 'abebe@example.com',
        phone: '+251912345678',
        role: 'STUDENT',
        createdAt: NOW,
        updatedAt: NOW,
        passwordHash: 'hashed',
        deletedAt: null,
      };

      prisma.user.findFirst.mockResolvedValueOnce(null);
      prisma.user.create.mockResolvedValueOnce(CREATED_USER);
      prisma.refreshToken.create.mockResolvedValueOnce({
        id: 'rt-id-1',
        userId: CREATED_USER.id,
        tokenHash: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      prisma.refreshToken.update.mockResolvedValueOnce({});

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Abebe Kebede',
          email: 'abebe@example.com',
          phone: '+251912345678',
          password: 'MyPassword1',
        })
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email', 'abebe@example.com');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);

      expect(res.body).toHaveProperty('statusCode', 400);
      expect(res.body).toHaveProperty('message');
      expect(Array.isArray(res.body.message)).toBe(true);
    });

    it('returns 400 when email is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'not-an-email',
          phone: '+251912345678',
          password: 'MyPassword1',
        })
        .expect(400);
    });

    it('returns 400 when phone format is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'valid@test.com',
          phone: '12345',
          password: 'MyPassword1',
        })
        .expect(400);
    });

    it('returns 400 when password is too weak', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'valid@test.com',
          phone: '+251912345678',
          password: 'short',
        })
        .expect(400);
    });

    it('returns 400 when extra fields are sent (forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'valid@test.com',
          phone: '+251912345678',
          password: 'MyPassword1',
          role: 'ADMIN',
        })
        .expect(400);
    });

    it('returns 409 when email already exists', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        ...MOCK_STUDENT,
        email: 'duplicate@test.com',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'duplicate@test.com',
          phone: '+251911111111',
          password: 'MyPassword1',
        })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/v1/auth/login
  // -------------------------------------------------------------------------
  describe('POST /api/v1/auth/login', () => {
    it('returns 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ password: 'MyPassword1' })
        .expect(400);
    });

    it('returns 400 when password is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com' })
        .expect(400);
    });

    it('returns 401 when user does not exist', async () => {
      redisClient.get.mockResolvedValueOnce(null);
      prisma.user.findFirst.mockResolvedValueOnce(null);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: 'MyPassword1' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/v1/auth/refresh
  // -------------------------------------------------------------------------
  describe('POST /api/v1/auth/refresh', () => {
    it('returns 400 when refreshToken is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);
    });

    it('returns 401 when refresh token is invalid JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'not.a.valid.jwt' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // POST /api/v1/auth/logout
  // -------------------------------------------------------------------------
  describe('POST /api/v1/auth/logout', () => {
    it('returns 200 even with invalid refresh token (idempotent)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'expired-or-invalid-token' })
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Logged out successfully');
    });

    it('returns 400 when refreshToken field is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({})
        .expect(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/v1/auth/me
  // -------------------------------------------------------------------------
  describe('GET /api/v1/auth/me', () => {
    it('returns 401 without an auth token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('returns 401 with an invalid/expired token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('returns user profile with a valid access token', async () => {
      prisma.user.findFirst.mockResolvedValueOnce({
        id: MOCK_STUDENT.id,
        name: MOCK_STUDENT.name,
        email: MOCK_STUDENT.email,
        phone: MOCK_STUDENT.phone,
        role: MOCK_STUDENT.role,
        createdAt: MOCK_STUDENT.createdAt,
        updatedAt: MOCK_STUDENT.updatedAt,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${STUDENT_ACCESS_TOKEN}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', MOCK_STUDENT.id);
      expect(res.body).toHaveProperty('email', MOCK_STUDENT.email);
      expect(res.body).toHaveProperty('role', 'STUDENT');
      expect(res.body).not.toHaveProperty('passwordHash');
    });
  });
});

// ===========================================================================
// 3. CONTENT BROWSING (public routes)
// ===========================================================================
describe('Content Browsing', () => {
  describe('GET /api/v1/streams', () => {
    it('returns 200 with an array', async () => {
      prisma.stream.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Natural Science', subjects: [] },
        { id: 2, name: 'Social Science', subjects: [] },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/streams')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
    });

    it('does not require authentication', async () => {
      prisma.stream.findMany.mockResolvedValueOnce([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/streams');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/subjects', () => {
    it('returns 200 with an array', async () => {
      prisma.subject.findMany.mockResolvedValueOnce([
        { id: 1, name: 'Mathematics', streams: [] },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/subjects')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('does not require authentication', async () => {
      prisma.subject.findMany.mockResolvedValueOnce([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/subjects');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/v1/grades', () => {
    it('returns 200 with an array', async () => {
      prisma.grade.findMany.mockResolvedValueOnce([
        { id: 1, level: 9 },
        { id: 2, level: 10 },
        { id: 3, level: 11 },
        { id: 4, level: 12 },
      ]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/grades')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('does not require authentication', async () => {
      prisma.grade.findMany.mockResolvedValueOnce([]);

      const res = await request(app.getHttpServer())
        .get('/api/v1/grades');

      expect(res.status).toBe(200);
    });
  });
});

// ===========================================================================
// 4. PROTECTED ROUTES — auth required
// ===========================================================================
describe('Protected Routes', () => {
  const PROTECTED_ENDPOINTS = [
    { method: 'get' as const, path: '/api/v1/bookmarks' },
    { method: 'post' as const, path: '/api/v1/bookmarks' },
    { method: 'get' as const, path: '/api/v1/users/me/stats' },
  ];

  describe.each(PROTECTED_ENDPOINTS)(
    '$method $path',
    ({ method, path }) => {
      it('returns 401 without an auth token', async () => {
        const res = await request(app.getHttpServer())[method](path);
        expect(res.status).toBe(401);
      });

      it('returns 401 with an invalid token', async () => {
        const res = await request(app.getHttpServer())
          [method](path)
          .set('Authorization', 'Bearer garbage-token');
        expect(res.status).toBe(401);
      });
    },
  );

  it('allows access to protected endpoint with valid token', async () => {
    prisma.bookmark.findMany.mockResolvedValueOnce([]);

    const res = await request(app.getHttpServer())
      .get('/api/v1/bookmarks')
      .set('Authorization', `Bearer ${STUDENT_ACCESS_TOKEN}`);

    expect(res.status).not.toBe(401);
  });
});

// ===========================================================================
// 5. ADMIN ROUTES — role enforcement
// ===========================================================================
describe('Admin Routes', () => {
  const ADMIN_ENDPOINTS = [
    { method: 'get' as const, path: '/api/v1/admin/overview' },
    { method: 'get' as const, path: '/api/v1/admin/users' },
  ];

  describe.each(ADMIN_ENDPOINTS)(
    '$method $path',
    ({ method, path }) => {
      it('returns 401 without auth', async () => {
        const res = await request(app.getHttpServer())[method](path);
        expect(res.status).toBe(401);
      });

      it('returns 403 for STUDENT role', async () => {
        const res = await request(app.getHttpServer())
          [method](path)
          .set('Authorization', `Bearer ${STUDENT_ACCESS_TOKEN}`);
        expect(res.status).toBe(403);
      });

      it('allows ADMIN role access', async () => {
        if (path === '/api/v1/admin/overview') {
          prisma.user.count.mockResolvedValueOnce(10);
          prisma.question.count.mockResolvedValueOnce(50);
          prisma.mockExam.count.mockResolvedValueOnce(5);
          prisma.subscription.count.mockResolvedValueOnce(3);
          prisma.mockExamAttempt.count.mockResolvedValueOnce(20);
          prisma.user.count.mockResolvedValueOnce(2);
        } else {
          prisma.user.findMany.mockResolvedValueOnce([]);
          prisma.user.count.mockResolvedValueOnce(0);
        }

        const res = await request(app.getHttpServer())
          [method](path)
          .set('Authorization', `Bearer ${ADMIN_ACCESS_TOKEN}`);

        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
      });
    },
  );
});

// ===========================================================================
// 6. VALIDATION PIPE — DTO enforcement
// ===========================================================================
describe('Validation Pipe', () => {
  it('strips unknown properties (whitelist: true)', async () => {
    prisma.user.findFirst.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce({
      ...MOCK_STUDENT,
      id: 'new-id',
      name: 'Clean Name',
      email: 'clean@test.com',
    });
    prisma.refreshToken.create.mockResolvedValueOnce({
      id: 'rt-1',
      userId: 'new-id',
      tokenHash: 'pending',
      expiresAt: new Date(),
    });
    prisma.refreshToken.update.mockResolvedValueOnce({});

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Clean Name',
        email: 'clean@test.com',
        phone: '+251912345678',
        password: 'MyPassword1',
        isAdmin: true,
      });

    expect(res.status).toBe(400);
  });

  it('rejects request with wrong Content-Type for JSON body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Content-Type', 'text/plain')
      .send('not json');

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// ===========================================================================
// 7. 404 — unmatched routes
// ===========================================================================
describe('Unmatched Routes', () => {
  it('returns 404 for non-existent routes', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
  });
});
