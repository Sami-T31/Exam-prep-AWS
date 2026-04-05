# Architecture

High-level references:
- API details: [API_SPEC.md](./API_SPEC.md)
- Data model: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
- Security controls: [SECURITY_RULES.md](./SECURITY_RULES.md)

## System Diagram (Text)

```text
[Student Browser]
   -> web (Next.js, :3000)
   -> backend API (/api/v1, :3001)

[Admin Browser]
   -> admin (Next.js, :3002)
   -> backend API (/api/v1, :3001)

backend
   -> PostgreSQL (Docker service: postgres, host port default 5433)
   -> Redis (Docker service: redis, host port default 6379)
```

## Services

### `backend/` (NestJS)
- Global API prefix: `/api/v1`
- Global validation pipe (`whitelist`, `forbidNonWhitelisted`)
- Global throttling guard
- Global auth + role guards
- Swagger in non-production at `/api/docs`
- Scheduled jobs (analytics cleanup + aggregate recompute)

Modules include: auth, streams, subjects, grades, topics, questions, bookmarks, progress, mock-exams, leaderboard, subscriptions, payments, admin, analytics, prisma, redis.

### `web/` (Next.js App Router)
Student-facing app with pages for auth, dashboard, subjects/topics, practice, mock exams, bookmarks, progress, leaderboard, subscribe, account privacy/subscription.

### `admin/` (Next.js App Router)
Admin-facing app with login, dashboard, mock exam editor flows, and analytics page. Uses separate token storage and admin API client.

### `packages/shared/`
Shared TypeScript constants/types/validation reused across workspaces.

## Data Flow

### Auth flow
1. User logs in via `POST /api/v1/auth/login`
2. Client stores access+refresh tokens
3. Axios interceptors attach bearer token and attempt refresh on `401`

### Practice flow
1. Web calls `GET /questions` and `GET /questions/:id`
2. User submits via `POST /questions/:id/attempt`
3. Backend stores `question_attempts`; emits event for leaderboard update

### Mock exam flow
1. Web lists exams (`GET /mock-exams`), starts attempt (`POST /mock-exams/:id/start`)
2. Submit all answers (`POST /mock-exams/attempts/:id/submit`)
3. Review completed attempt (`GET /mock-exams/attempts/:id/review`)

### Analytics/governance flow
1. User consent read/write (`GET/PUT /users/me/consent`)
2. Event ingestion (`analytics/sessions`, `analytics/events`, `analytics/video-progress`) is consent-gated
3. Scheduled jobs compute aggregate tables and clean old raw events
4. Admin analytics views and export consume aggregates/raw windows

## Storage and Caching

### PostgreSQL (Prisma)
Primary system of record for users, content, attempts, subscriptions, payments, analytics, and aggregate metrics.

### Redis
Used for:
- Leaderboard ranking operations
- Login lockout/brute-force counters
- (Checklist mentions broader caching/rate-limiting support patterns)

## Deployment Notes (Current Repo)
- Local infra via `docker-compose.yml` for PostgreSQL + Redis
- Backend reads root `.env`
- Ports in current setup:
  - web: `3000`
  - admin: `3002`
  - backend: `3001`
  - postgres host port defaults to `5433`
  - redis host port defaults to `6379`

## UNKNOWN / TODO
- Production deployment manifests (Kubernetes/Terraform/Nginx) are not in repo
- Background worker separation (if any) is not present; scheduler currently runs in backend process
- CDN and object storage strategy for question media is not defined in code

---

## Update Protocol
### When to update
- Any new service/module/store, changed ports, changed data flow, or new infra pattern

### Scan these areas
- `docker-compose.yml`, `.env.example`
- `backend/src/app.module.ts`, `backend/src/main.ts`
- `web/src/lib/api-client.ts`, `admin/src/lib/admin-api.ts`

### Checklist
- Diagram still matches runtime topology
- Module list aligns with `AppModule`
- Redis/Postgres roles still accurate
- Deployment notes match current commands and ports
