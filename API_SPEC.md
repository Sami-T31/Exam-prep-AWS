# API Specification (Current Implementation)

Base URL: `http://localhost:3001/api/v1`
Global prefix/versioning is configured in `backend/src/main.ts`.

Related docs: [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md), [SECURITY_RULES.md](./SECURITY_RULES.md).

## Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `POST /auth/me` (protected token check endpoint)

## Catalog / Content Browse
- `GET /health` (public)
- `GET /streams` (public)
- `GET /subjects` (public)
- `GET /subjects/:id` (public)
- `GET /grades` (public)
- `GET /subjects/:subjectId/topics?grade=<gradeId>` (public)

## Questions (Student)
- `GET /questions?subjectId&gradeId&topicId&difficulty&limit&offset`
- `GET /questions/:id`
- `POST /questions/:id/attempt`
  - body: `{ selectedOptionId, timeSpentSeconds }`
  - returns correctness + correct option label/id + explanation

## Questions (Admin)
- `GET /admin/questions` (filters include subject/grade/topic/difficulty/status)
- `POST /admin/questions`
  - body includes `questionText`, `difficulty`, `topicId`, `gradeId`, optional `explanation/year/status`, and exactly 4 `options`
- `PATCH /admin/questions/:id`
- `DELETE /admin/questions/:id` (soft delete)
- `POST /admin/questions/:id/review` (`PUBLISH` | `REQUEST_CHANGES`)
- `POST /admin/questions/bulk-import` (multipart CSV upload)

## Mock Exams
- `GET /mock-exams` (public; filter by subjectId/gradeId)
- `POST /mock-exams/:id/start`
- `POST /mock-exams/attempts/:id/submit`
- `GET /mock-exams/attempts/history`
- `GET /mock-exams/attempts/:id/review`

### Mock Exams (Admin)
- `POST /mock-exams`
- `PATCH /mock-exams/:id`
- `DELETE /mock-exams/:id`
- `GET /mock-exams/:id/questions` (editor payload)
- `POST /mock-exams/:id/questions` (add/create mock-exam question)
- `PATCH /mock-exams/:id/questions/:questionId`
- `DELETE /mock-exams/:id/questions/:questionId`

## Bookmarks
- `GET /bookmarks`
- `POST /bookmarks` (body: `{ questionId }`)
- `DELETE /bookmarks/:id`

## Progress / Stats
- `GET /users/me/stats`
- `GET /users/me/stats/subjects`
- `GET /users/me/stats/grades`
- `GET /users/me/stats/subjects/:subjectId`
- `GET /users/me/stats/weak-topics?threshold=50`
- `GET /users/me/stats/trend?days=14`

## Leaderboard
- `GET /leaderboard?period=weekly|monthly|alltime&subjectId&limit`

## Subscription / Payments
- `GET /subscriptions/plans` (public)
- `GET /subscriptions/status`
- `GET /subscriptions/free-tier/:subjectId`

- `POST /payments/initiate`
- `POST /payments/webhook` (public)
- `POST /payments/:id/verify` (admin)
- `GET /payments/pending` (admin)
- `GET /payments/history`

## Admin Management
- `GET /admin/overview`
- `GET /admin/users?search&limit&offset`
- `GET /admin/users/:id`
- `PATCH /admin/users/:id/subscription`

- `GET /admin/subjects`
- `POST /admin/subjects`
- `PATCH /admin/subjects/:id`
- `DELETE /admin/subjects/:id`

- `GET /admin/topics?subjectId`
- `POST /admin/topics`
- `PATCH /admin/topics/:id`
- `DELETE /admin/topics/:id`

## Analytics / Governance
- `GET /users/me/consent`
- `PUT /users/me/consent`
- `POST /analytics/sessions/start`
- `POST /analytics/sessions/:id/end`
- `POST /analytics/events`
- `PUT /analytics/video-progress`
- `GET /reports/me` (premium + personalization-aware)
- `DELETE /users/me`

### Admin Analytics
- `GET /admin/analytics/retention?days=30`
- `GET /admin/analytics/aggregates`
- `GET /admin/analytics/export?startDate&endDate&format=json|ndjson&includePII=false&gzip=true`

## Response Shape Notes
- List endpoints often return `{ data, total, limit, offset }`
- Auth returns `{ user, accessToken, refreshToken }`
- Errors follow Nest exception format with global filter/request id behavior

## UNKNOWN / TODO
- Swagger has source-of-truth response schemas; this file intentionally summarizes and is not exhaustive for every field
- Confirm if `POST /auth/me` will be replaced by a richer profile endpoint
- Confirm any pending endpoint renames introduced after checkpoint 17/18 work

---

## Update Protocol
### When to update
- Any controller route/decorator or DTO contract change

### Scan these areas
- `backend/src/**/**.controller.ts`
- `backend/src/**/dto/*.ts`
- `backend/src/main.ts` (global prefix)

### Checklist
- New route added under correct group
- Removed/renamed route reflected
- New query/body fields captured at summary level
- Admin-only endpoints clearly marked
