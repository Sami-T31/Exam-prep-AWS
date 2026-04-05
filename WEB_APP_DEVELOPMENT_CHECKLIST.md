# Web App Development Checklist -- Ethiopian Exam Prep

**Status Legend**: `[ ]` Not started | `[~]` In progress | `[x]` Complete | `[!]` Blocked

---

## Checkpoint 0: Environment and Monorepo Setup

- [x] Install Node.js (LTS), npm, Docker Desktop
- [x] Initialize Git repository
- [x] Set up monorepo with npm workspaces (`package.json` at root)
- [x] Configure root `tsconfig.json` (base TypeScript config)
- [x] Configure ESLint and Prettier (shared config across all packages)
- [x] Set up `.gitignore` (node_modules, .env, build artifacts, .next)
- [x] Create `docker-compose.yml` with PostgreSQL and Redis services
- [x] Verify Docker services start and are accessible locally
- [x] Create `.env.example` files for backend and web app
- [x] Create shared package skeleton (`packages/shared/`)
- [x] Define TypeScript interfaces in shared package (User, Subject, Stream, Grade, Topic, Question, QuestionOption, MockExam, Subscription, Bookmark, LeaderboardEntry)
- [x] Define shared enums/constants (difficulty levels, subscription plans, user roles, streams)
- [x] Set up Zod validation schemas in shared package
- [x] Build and verify shared package is importable by other workspaces

**Production hardening (added during review):**
- [x] Generate real JWT secrets for local `.env` (not placeholder strings)
- [x] Add Redis password authentication to `docker-compose.yml`
- [x] Harden phone validation to Ethiopian-specific format (+251 / 09 / 07)
- [x] Add password complexity requirements (uppercase + lowercase + digit)
- [x] Normalize email to lowercase in registration validation
- [x] Resolve all npm audit vulnerabilities (0 remaining)
- [x] Create `PENDING_DECISIONS.md` tracking all placeholders and business decisions

**Exit Criteria**: Running `docker compose up` starts PostgreSQL and Redis. All workspaces resolve the shared package. ESLint and TypeScript compile cleanly. Zero npm audit vulnerabilities. **-- PASSED --**

---

## Checkpoint 1: Backend -- Project Scaffold and Database

### 1A. NestJS Project Setup
- [x] Scaffold NestJS project in `backend/` (within existing monorepo workspace)
- [x] Install dependencies (Prisma, bcryptjs, jsonwebtoken, class-validator, class-transformer, helmet, @nestjs/config, @nestjs/swagger, @nestjs/throttler)
- [x] Configure NestJS to read environment variables (ConfigModule, validate required vars on startup)
- [x] Set global API prefix `/api/v1` (versioned API from the start)
- [x] Configure CORS (whitelist frontend origins, reject all others)
- [x] Add Helmet.js middleware (security headers: clickjacking, MIME sniffing, XSS protection)
- [x] Add request ID middleware (generate UUID per request, attach to logs and response headers)
- [x] Configure graceful shutdown hooks (close DB connections, finish in-flight requests on SIGTERM)

### 1B. Prisma Schema and Database
- [x] Write Prisma schema for all entities (User, Stream, Subject, Grade, Topic, Question, QuestionOption, QuestionAttempt, Bookmark, MockExam, MockExamQuestion, MockExamAttempt, Subscription, LeaderboardEntry, Payment, RefreshToken, SubjectStream, MockExamQuestion)
- [x] Add `deletedAt` soft delete column on User, Question, and MockExam entities
- [x] Add database indexes on frequently queried columns (QuestionAttempt.userId, Question.topicId, Question.gradeId, Question.difficulty, Bookmark.userId, LeaderboardEntry.period+subjectId, plus composite and additional indexes)
- [x] Configure Prisma connection pooling in DATABASE_URL (`?connection_limit=10&pool_timeout=30`)
- [x] Cross-verify Prisma models against shared TypeScript interfaces for field name and type alignment
- [x] Run initial Prisma migration (`prisma migrate dev` — migration `20260221214326_initial_schema`)
- [x] Create `PrismaService` (lifecycle-managed, structured logging) and global `PrismaModule`
- [x] Integrate `PrismaModule` into `AppModule` — verified Prisma connects on startup
- [x] Resolved port conflict: local PostgreSQL installation on port 5432 — Docker mapped to port 5433

### 1C. Seed Data
- [x] Create seed script with initial data (2 streams, 11 subjects with stream mappings, 4 grades, 25 sample topics across 5 subjects, 5 sample questions with 4 options each)
- [x] Seed script is idempotent (uses upsert and existence checks — safe to re-run)
- [x] Verify seed data appears in database via psql — all tables populated correctly
- [x] Configured `prisma.seed` in `package.json` — runs via `npx prisma db seed`

### 1D. Core Backend Infrastructure
- [x] Set up global exception filter (consistent error response format with request ID)
- [x] Set up request validation pipe (class-validator, whitelist unknown properties, transform payloads)
- [ ] Set up structured logging (Pino -- JSON format, includes request ID, timestamp, level)
- [x] Set up Swagger/OpenAPI auto-documentation (accessible at `/api/docs` in development)
- [x] Create health check endpoint (`GET /api/v1/health`) -- basic uptime check working
- [x] Extend health check to report DB connection status (Prisma `SELECT 1` with latency measurement) — Redis will be added when Redis module is implemented

**Exit Criteria**: `GET /api/v1/health` returns 200 with `{ "status": "ok", "postgres": "connected", "redis": "connected" }`. Database has seeded data. Prisma Studio shows all tables with correct relationships and indexes. Swagger docs are accessible at `/api/docs`. All requests include a unique `X-Request-Id` header in the response. Security headers are present (verify with browser dev tools).

---

## Checkpoint 2: Backend -- Authentication System

- [x] Create Auth module (controller, service, DTOs)
- [x] Implement `POST /auth/register` (name, email, phone, password)
- [x] Password hashing with bcrypt (salt rounds = 12)
- [x] Implement `POST /auth/login` (email + password, returns access + refresh tokens)
- [x] JWT access token (short-lived, 15 min, configurable via env)
- [x] JWT refresh token (long-lived, 7 days, hashed and stored in DB)
- [x] Implement `POST /auth/refresh` (exchange refresh token for new access + refresh token pair, with rotation)
- [x] Implement `POST /auth/logout` (invalidate refresh token)
- [x] Implement `POST /auth/forgot-password` (generate reset token, log to console for now -- email integration later)
- [x] Implement `POST /auth/reset-password` (validate reset token, update password, revoke all sessions)
- [x] Create JWT AuthGuard (protects routes, extracts user from token) — registered globally via APP_GUARD
- [x] Create Roles decorator and RolesGuard (admin vs student) — registered globally via APP_GUARD
- [x] Add rate limiting to auth endpoints (register/login: 5/min, forgot-password: 3/min, refresh: 10/min)
- [x] Test: register a user, login, access protected route, refresh token, logout — 30/30 tests passed
- [x] Test: invalid credentials return 401, expired token returns 401, refreshed token works

**Added items (not in original checklist, integral to auth):**
- [x] Add `PasswordResetToken` model to Prisma schema (required for forgot/reset password flow)
- [x] Create `TokenService` (JWT sign/verify, SHA-256 hashing, random token generation)
- [x] Create `@Public()` decorator (marks routes as accessible without auth)
- [x] Create `@CurrentUser()` parameter decorator (extracts user from request)
- [x] Extend Express `Request` type declaration for `request.user`
- [x] Register `ThrottlerGuard` globally via APP_GUARD (activates rate limiting)
- [x] Refresh token rotation (old token is deleted when used — limits stolen token damage)
- [x] Same error message for "user not found" and "wrong password" (prevents email enumeration)
- [x] Forgot-password always returns 200 regardless of email existence (prevents enumeration)
- [x] Password reset invalidates all existing refresh tokens (forces re-login on all devices)
- [x] Mark `HealthController` as `@Public()` (since all routes are now auth-protected by default)

**Exit Criteria**: Full auth flow works end-to-end (30/30 tests). Protected routes reject unauthenticated requests (401). Duplicate emails return 409. Weak passwords return 400. Token rotation prevents refresh token reuse. Rate limiting active on all auth endpoints. **-- PASSED --**

---

## Checkpoint 3: Backend -- Core Content API

- [x] Create Subjects module (`GET /subjects`, `GET /subjects/:id`)
- [x] Create Streams module (`GET /streams` with nested subjects)
- [x] Create Grades module (`GET /grades`)
- [x] Create Topics module (`GET /subjects/:subjectId/topics?grade=N`)
- [x] Create Questions module
- [x] `GET /questions` with filters: subjectId, gradeId, topicId, difficulty, limit, offset
- [x] `GET /questions/:id` (single question with options)
- [x] `POST /questions/:id/attempt` (record user's answer, return correct/incorrect + explanation)
- [x] Question response does NOT include `isCorrect` on options before the user attempts it
- [x] Create admin-only question endpoints (behind RolesGuard)
- [x] `POST /admin/questions` (create question with options)
- [x] `PATCH /admin/questions/:id` (update question)
- [x] `DELETE /admin/questions/:id` (soft delete)
- [x] `POST /admin/questions/bulk-import` (accept CSV, parse, validate, insert)
- [x] CSV format: questionText, difficulty, topicId, gradeId, optionA-D, correctOption, explanation (optional), year (optional)
- [x] Validate CSV rows per-row (reject invalid with error detail, import valid rows)
- [x] Pagination on all list endpoints (limit/offset with total count in response)
- [x] Test: browse subjects → topics → questions → attempt → see explanation (46/46 passed)
- [x] Install `@types/multer` for file upload TypeScript support (added in this checkpoint)
- [x] Register StreamsModule, SubjectsModule, GradesModule, TopicsModule, QuestionsModule in AppModule
- [x] Create `LEARNING_GUIDE.md` — teaching documentation covering Checkpoints 0–3

**Exit Criteria**: A student can browse content hierarchically and answer questions via the API. Admin can create and bulk-import questions. Pagination works on all list endpoints. **-- PASSED (46/46 tests) --**

---

## Checkpoint 4: Backend -- Mock Exams, Bookmarks, Progress

### Mock Exams
- [x] Create MockExam module (controller, service, DTOs)
- [x] `GET /mock-exams` (list available exams, filterable by subject/grade — public)
- [x] `POST /mock-exams/:id/start` (create a MockExamAttempt, return questions without answers)
- [x] `POST /mock-exams/attempts/:id/submit` (accept all answers, calculate score, return results)
- [x] `GET /mock-exams/attempts/:id/review` (detailed per-question review with explanations — only after submission)
- [x] Admin: `POST /mock-exams` (create exam: title, subject, grade, duration, specific or random question selection)
- [x] Enforce time limit server-side (reject submissions after durationMinutes + 30s grace buffer)
- [x] Prevent re-submission of completed attempts (returns 400)
- [x] Prevent review of incomplete attempts (returns 400)

### Bookmarks
- [x] Create Bookmarks module (controller, service)
- [x] `GET /bookmarks` (list user's bookmarked questions, filterable by subject/grade)
- [x] `POST /bookmarks` (bookmark a question — includes question existence check)
- [x] `DELETE /bookmarks/:id` (remove bookmark — ownership verified)
- [x] Prevent duplicate bookmarks (unique constraint on user_id + question_id, returns 409 on duplicate)

### Progress and Stats
- [x] `GET /users/me/stats` (overall accuracy, total questions attempted, streak)
- [x] `GET /users/me/stats/subjects` (per-subject accuracy and attempt counts — raw SQL for cross-relation groupBy)
- [x] `GET /users/me/stats/subjects/:subjectId` (detailed: per-topic accuracy within a subject)
- [x] Streak calculation logic (consecutive calendar days with at least 1 attempt)
- [x] `GET /users/me/stats/weak-topics?threshold=50` (topics where accuracy < configurable threshold)
- [x] Register BookmarksModule, ProgressModule, MockExamsModule in AppModule
- [x] Update LEARNING_GUIDE.md with Checkpoint 4 concepts

**Exit Criteria**: Mock exam full flow works (start → answer → submit → review). Bookmarks CRUD works. Stats endpoints return accurate data based on recorded attempts. **-- PASSED (41/41 tests) --**

---

## Checkpoint 5: Backend -- Leaderboard and Subscriptions

### Infrastructure (added — integral to this checkpoint)
- [x] Install `ioredis`, `@nestjs/schedule`, `@nestjs/event-emitter`
- [x] Create Redis module (global, wraps ioredis with config from .env)
- [x] Register `ScheduleModule.forRoot()` and `EventEmitterModule.forRoot()` in AppModule
- [x] Create `QuestionAttemptedEvent` and emit from QuestionsService (event-driven architecture)

### Leaderboard
- [x] Set up Redis connection in NestJS (ioredis via RedisModule)
- [x] Leaderboard service using Redis sorted sets (ZINCRBY, ZREVRANGE, ZREVRANK, ZSCORE)
- [x] Update leaderboard score on each question attempt via `@OnEvent` listener (increment by 1 for correct)
- [x] `GET /leaderboard?period=weekly&subjectId=1` (returns ranked list with user name, score, rank)
- [x] Support periods: weekly, monthly, all-time
- [x] Weekly/monthly reset via `@Cron` scheduled tasks (persists to PostgreSQL before clearing Redis)
- [x] Include requesting user's own rank and score in every response

### Subscriptions
- [x] Create Subscriptions module (global — guard available everywhere)
- [x] `GET /subscriptions/plans` (list available plans with pricing — public)
- [x] `GET /subscriptions/status` (return current user's subscription status)
- [x] `GET /subscriptions/free-tier/:subjectId` (remaining free questions for a subject)
- [x] `SubscriptionGuard` and `@Premium()` decorator for premium-gated endpoints
- [x] Free tier logic: allow 10 questions per subject (distinct) without subscription
- [x] Expiration handling: subscriptions past `expires_at` are inactive (checked in real-time)

### Payment Integration
- [x] Payment initiation: `POST /payments/initiate` — creates pending subscription + payment
- [x] Telebirr payment initiation (placeholder — logs warning, returns PENDING_INTEGRATION status)
- [x] CBE Birr payment initiation (placeholder — same pattern)
- [x] Manual bank transfer flow (returns bank details for the user)
- [x] Webhook endpoint: `POST /payments/webhook` (public, confirms payment from provider)
- [x] `POST /payments/:id/verify` — admin approves/rejects bank transfer
- [x] `GET /payments/pending` — admin lists pending payments
- [x] `GET /payments/history` — user's payment history
- [x] On payment confirmation: activate subscription via `activatePayment` helper
- [x] Payment idempotency: duplicate webhooks return `already_processed` (no double-activation)
- [x] All payment events logged via NestJS Logger
- [x] Register RedisModule, LeaderboardModule, SubscriptionsModule, PaymentsModule in AppModule

**Exit Criteria**: Leaderboards update in real-time and reset on schedule. Subscription gating blocks free users from premium content. Bank transfer flow works end-to-end. Telebirr/CBE Birr architecture ready for integration when credentials obtained. **-- PASSED (38/38 tests) --**

---

## Checkpoint 6: Next.js Web App -- Project Setup and Design System

- [x] Scaffold Next.js project in `web/` (App Router, TypeScript)
- [x] Install and configure Tailwind CSS (v4, CSS-first `@theme` configuration)
- [x] Install dependencies: Axios, Zustand, recharts, react-hot-toast, clsx
- [x] Set up API client (Axios instance with base URL, token interceptors, refresh logic)
- [x] Set up Zustand auth store (user, tokens, login/logout actions)
- [x] Set up centralized token storage (localStorage + cookie sync for proxy)
- [x] Create root layout with consistent structure (fonts, metadata, Providers wrapper)
- [x] Design and build reusable UI components:
  - [x] Button (primary, secondary, outline, ghost, danger, loading state)
  - [x] Input field (text, password with show/hide, validation error display)
  - [x] Card component (configurable padding)
  - [x] Modal / dialog (backdrop blur, sizes, close button)
  - [x] Loading spinner / skeleton screens
  - [x] Toast notifications (react-hot-toast configured in Providers)
  - [x] Badge (difficulty levels, status, streaks)
  - [x] Progress bar (colors, sizes, label)
  - [x] Empty state component (icon, description, CTA)
- [x] Set up color scheme (Ethiopian flag colors: emerald, amber, red)
- [x] Typography scale (Geist Sans + Mono, antialiased)
- [x] Responsive layout: mobile-first approach in all components
- [x] Dark mode support (Tailwind `dark:` classes throughout, CSS variable theming)
- [x] Create Next.js proxy for auth redirect (unauthenticated → login, authenticated → dashboard)
- [x] **(Integral)** Migrate middleware.ts → proxy.ts for Next.js 16 compatibility
- [x] **(Integral)** Create landing page with hero section and feature highlights
- [x] **(Integral)** Create placeholder pages for login, register, and dashboard routes
- [x] **(Integral)** Configure web/.env.local for NEXT_PUBLIC_* environment variables

**Exit Criteria**: Web app runs locally. Reusable component library is built and visually consistent. API client connects to backend. Auth proxy redirects correctly.

---

## Checkpoint 7: Next.js Web App -- Authentication Pages

- [x] Login page (`/login`)
  - [x] Email + password form with validation
  - [x] "Remember me" option
  - [x] Error handling (invalid credentials, network error)
  - [x] Loading state on submit
  - [x] Link to register and forgot password
- [x] Registration page (`/register`)
  - [x] Name, email, phone, password, confirm password
  - [x] Client-side validation (Zod schemas from shared package)
  - [x] Password strength indicator
  - [x] Terms of service checkbox
  - [x] Success → redirect to login (or auto-login)
- [x] Forgot password page (`/forgot-password`)
  - [x] Email input → sends reset link
  - [x] Confirmation message after submission
- [x] Reset password page (`/reset-password?token=...`)
  - [x] New password + confirm password
  - [x] Token validation
  - [x] Success → redirect to login
- [x] Token management
  - [x] Store tokens in secure httpOnly cookies or encrypted localStorage
  - [x] Auto-refresh access token when expired (Axios interceptor)
  - [x] Logout clears all tokens and redirects to login
- [ ] Test: full registration → login → token refresh → logout flow in browser

**Exit Criteria**: User can register, log in, and log out. Tokens refresh automatically. Invalid/expired sessions redirect to login.

---

## Checkpoint 8: Next.js Web App -- Student Dashboard and Content Browsing

- [x] Dashboard page (`/dashboard`)
  - [x] Welcome message with user's name
  - [x] Quick stats: questions answered today, overall accuracy, current streak
  - [x] Continue where you left off (last subject/topic)
  - [x] Weak topics summary (links to practice)
  - [x] Upcoming mock exams or suggestions
- [x] Stream selection (Natural Science / Social Science)
- [x] Subjects page (`/subjects`)
  - [x] Grid/list of subjects with icons
  - [x] Show per-subject progress (if the user has attempted questions)
  - [x] Filter by stream
- [x] Topics page (`/subjects/[id]/topics`)
  - [x] List of topics for the selected subject
  - [x] Grade selector (9, 10, 11, 12)
  - [x] Per-topic progress indicator (% complete, accuracy)
- [x] Breadcrumb navigation (Dashboard > Subject > Grade > Topic)
- [x] Responsive: works well as single-column on mobile
- [x] Loading skeletons for all data-fetching states
- [x] Error states with retry buttons

**Exit Criteria**: Student can navigate from dashboard → stream → subject → grade → topics. Progress data shows where applicable. Navigation is intuitive and responsive.

---

## Checkpoint 9: Next.js Web App -- Question Practice Interface

- [x] Practice page (`/practice?topicId=X&difficulty=Y`)
  - [x] Display question text (supports Amharic and English)
  - [x] Display question image if present (optimized with Next.js Image)
  - [x] Display 4 answer options (A, B, C, D) as selectable cards
  - [x] Submit answer button (disabled until an option is selected)
  - [x] After submission:
    - [x] Highlight correct answer in green
    - [x] Highlight wrong selection in red (if incorrect)
    - [x] Display explanation text
    - [x] Show time spent on this question
  - [x] "Next Question" button to advance
  - [x] "Bookmark" toggle button on each question
  - [x] Question counter (e.g., "Question 5 of 20")
  - [x] Difficulty badge on each question
- [x] Practice session summary (after completing a set of questions)
  - [x] Score: X out of Y correct
  - [x] Accuracy percentage
  - [x] Time spent
  - [x] Option to review incorrect answers
  - [x] Option to continue practicing or return to topics
- [x] Difficulty filter (easy, medium, hard, all)
- [x] Keyboard shortcuts (1-4 for options, Enter to submit, N for next)
- [x] Prevent going back to change answer after submission (answer is final)
- [x] Handle edge case: no more questions available for the selected filters

**Exit Criteria**: Complete question practice flow works: select topic → answer questions → see feedback → view summary. Bookmarking works. Keyboard shortcuts work.

---

## Checkpoint 10: Next.js Web App -- Mock Exams

- [x] Mock exam listing page (`/mock-exams`)
  - [x] List available exams grouped by subject
  - [x] Show exam details: subject, grade, question count, duration
  - [x] Show user's past attempts with scores (if any)
- [x] Mock exam start confirmation
  - [x] Display rules: time limit, navigation expectations, auto-submit behavior
  - [x] "Start Exam" button
- [x] Mock exam in-progress page (`/mock-exams/[id]/attempt`)
  - [x] Countdown timer (prominent, visible at all times)
  - [x] Question navigation panel (numbered buttons, shows answered/unanswered)
  - [x] One question displayed at a time
  - [x] Select answer and move to next
  - [x] Allow navigating between questions (change answers before final submit)
  - [x] "Flag for review" option on each question
  - [x] Submit button with confirmation dialog ("Are you sure? X questions unanswered")
  - [x] Auto-submit when timer reaches zero
  - [x] Prevent page navigation away (beforeunload warning)
- [x] Results page (`/mock-exams/attempts/[attemptId]`)
  - [x] Score prominently displayed (X/Y, percentage)
  - [x] Time taken vs time allowed
  - [x] Per-question review: your answer, correct answer, explanation
  - [x] Filter review by: all, incorrect only, flagged
  - [x] Comparison with average score (if enough data)
- [x] Handle browser refresh during exam (restore state from API or local storage)

**Exit Criteria**: Full mock exam flow works: browse → start → answer all → submit → review results. Timer auto-submits. Navigation between questions works. State survives page refresh.

---

## Checkpoint 11: Next.js Web App -- Progress, Bookmarks, Leaderboard

### Progress Dashboard (`/progress`)
- [x] Overall statistics card (total questions, accuracy, streak)
- [x] Per-subject progress bars (accuracy + completion)
- [x] Progress over time chart (line chart: questions per day, accuracy trend)
- [x] Weak topics list with links to practice
- [x] Grade-level breakdown

### Bookmarks (`/bookmarks`)
- [x] List of bookmarked questions
- [x] Filter by subject and grade
- [x] Remove bookmark directly from list
- [x] "Practice Bookmarked" button (enters practice mode with only bookmarked questions)

### Leaderboard (`/leaderboard`)
- [x] Period selector (this week, this month, all-time)
- [x] Subject filter (all subjects, or specific subject)
- [x] Ranked list: position, name, score, accuracy
- [x] Highlight current user's position
- [x] Pagination or "load more" for long lists
- [x] "Your Rank" card at the top showing user's current position

**Exit Criteria**: Progress page shows accurate per-subject stats and charts. Bookmarks are manageable and lead to practice mode. Leaderboard displays rankings and user's own position.

---

## Checkpoint 12: Next.js Web App -- Subscription and Payment UI

- [x] Pricing page (`/pricing` or `/subscribe`)
  - [x] Display available plans (Monthly, Quarterly, Yearly) with pricing in ETB
  - [x] Feature comparison (free vs premium)
  - [x] Highlight recommended plan
- [x] Payment method selection
  - [x] Telebirr option (with instructions)
  - [x] CBE Birr option (with instructions)
  - [x] Bank transfer option (with account details and receipt upload)
- [x] Payment flow
  - [x] Telebirr/CBE Birr: initiate + status messaging in UI
  - [x] Bank transfer: initiation + "pending verification" status
- [x] Subscription status page (`/account/subscription`)
  - [x] Current plan and expiry date
  - [x] Renewal / upgrade options
  - [x] Payment history
- [x] Content gating UI
  - [x] Free users see limited questions with a clear upgrade prompt
  - [x] Upgrade prompt is helpful, not aggressive (show what they get)
  - [x] Locked content shows "Subscribe to access"
- [x] Handle payment edge cases
  - [x] Payment timeout / failure → retry option
  - [x] Webhook delay → polling with "Verifying payment..." state
  - [x] Duplicate payment prevention

**Exit Criteria**: Complete subscription purchase flow works for at least one payment method. Free tier correctly limits content. Premium users have full access. Payment status is clearly communicated.

---

## Checkpoint 13: Admin Dashboard

- [x] Separate Next.js app in `admin/`
- [x] Admin login (reuses auth API, requires admin role)
- [x] Dashboard overview page
  - [x] Total users, active subscribers, new users this week
  - [x] Total questions in database
  - [x] Revenue summary (if payment data available)
- [x] Question management
  - [x] List questions with filters (subject, grade, topic, difficulty)
  - [x] Create question form (question text, 4 options, mark correct, explanation, difficulty, topic)
  - [x] Edit existing question (core fields)
  - [x] Delete question (soft delete)
  - [x] Bulk import CSV upload + process response
- [x] Subject / Topic management
  - [x] Subject management (create, list, update, delete)
  - [x] Topic management (create, list, update, delete)
- [x] Mock exam management
  - [x] Create/edit/delete mock exams (title, subject, grade, duration, question count)
  - [x] Dedicated mock exam question editor page (separate from practice question authoring flow)
  - [x] Enforce selected question limit in editor (no over-add; submit action appears when limit reached)
  - [x] Edit previously added mock exam questions (question text/options/correct answer)
- [x] User management
  - [x] List users with search
  - [x] View user details and activity
  - [x] Manually activate/deactivate subscriptions
- [x] Payment verification
  - [x] Queue of pending payment verifications
  - [x] Approve or reject actions
  - [x] Approved → auto-activate subscription (backend flow already wired)
- [x] Content review workflow
  - [x] New questions default to "draft" status
  - [x] Review queue: admin can publish or request changes

**Exit Criteria**: Admin can manage all content (questions, topics, exams) without touching the database directly. Bulk import works with error reporting. Payment verification queue functions correctly.

---

## Checkpoint 14: Analytics and Data Governance (Privacy + Monetizable Insights)

### 14A. Consent System (Backend + Frontend)
- [x] Create `Consent` model tied 1:1 with `User`
- [x] Fields: `analyticsOptIn`, `personalizationOptIn`, `marketingOptIn`
- [x] Fields: `acceptedTermsAt`, `acceptedPrivacyAt`
- [x] Rule: if `analyticsOptIn = false`, do not store session/feature/video analytics events
- [x] Rule: if `personalizationOptIn = false`, do not compute personalized mastery/reports
- [x] `GET /users/me/consent`
- [x] `PUT /users/me/consent`
- [x] Add “Privacy & Data” section in account settings UI
- [x] Add toggles for analytics/personalization/marketing and save via API

### 14B. Event Tracking (Beyond Question Attempts)
- [x] Add `Session` tracking: `userId`, `startedAt`, `endedAt`, `platform` (`web|mobile`), `appVersion`
- [x] Add `FeatureUsageEvent` tracking: `userId`, `eventName`, `timestamp`, `metadata` (minimal JSON, no PII)
- [x] Add `VideoProgress` tracking: `userId`, `videoId`, `secondsWatched`, `percentComplete`, `lastPositionSec`, `completedAt`
- [x] Track events for key flows (`login_success`, `practice_started`, `mock_exam_submitted`, etc.)
- [x] Enforce consent gating in all event ingestion paths (skip writes when analytics disabled)
- [x] Retention policy: delete raw `Session` and `FeatureUsageEvent` rows after 90 days
- [x] Retention policy: keep `VideoProgress` for learning continuity

### 14C. Statistics and Analytics Page (Retention Tracking)
- [x] Add admin page route: `/admin/analytics`
- [x] Show DAU/WAU/MAU by platform (web and mobile split)
- [x] Show total sessions/day, unique active users/day, avg sessions/user, avg session duration
- [x] Show Day 1 / Day 7 / Day 30 retention by signup cohort
- [x] Add retention cohort analysis by signup date
- [x] Build nightly precomputed aggregate table(s) for retention metrics
- [x] Avoid heavy real-time retention queries on production tables

### 14D. Premium Personalized Study Report
- [x] `GET /reports/me` endpoint (subscription required)
- [x] Respect `personalizationOptIn` before computing personalized output
- [x] Report includes: top 5 weak topics
- [x] Report includes: predicted exam score range (simple heuristic)
- [x] Report includes: recommended next actions
- [x] Report includes: suggested daily study minutes
- [x] If personalization is disabled, return limited response with enable-personalization prompt

### 14E. Aggregated Institutional Analytics (Privacy-Safe)
- [x] Admin-only endpoint: `GET /admin/analytics/aggregates`
- [x] Return aggregated data only (no individual user-level rows)
- [x] Enforce privacy threshold: only return rows with `cohortSize >= 50`
- [x] Include average accuracy per topic
- [x] Include most missed questions (aggregated)
- [x] Include engagement metrics by grade and region
- [x] Include completion rates

### 14F. Data Export and Deletion (User Rights)
- [x] Admin-only export endpoint: `GET /admin/analytics/export`
- [x] Export query controls: `startDate`, `endDate`, `format=json|ndjson`, `includePII`, `gzip`
- [x] Export includes collected platform data (users, consent, analytics events, learning events, aggregates)
- [x] `DELETE /users/me`
- [x] Delete or anonymize user record safely
- [x] Delete associated analytics/session/feature/video data as required
- [x] Revoke all active tokens/sessions on account deletion

### 14G. Retention and Cleanup Jobs
- [x] Daily scheduled job: delete raw analytics events older than 90 days
- [x] Daily scheduled job: recompute aggregate retention metrics
- [x] Daily scheduled job: recompute topic accuracy aggregates
- [x] Daily scheduled job: recompute most-missed-question aggregates
- [x] Store aggregates in dedicated tables for scale (100k+ users)

**Exit Criteria**: Analytics events are blocked when consent is off. Personalization is disabled when opted out. DAU/WAU/MAU and D1/D7/D30 retention are visible by web/mobile platform. Aggregated analytics enforce cohort thresholds (`>= 50`). Raw events older than 90 days are deleted automatically. Users can export and delete their data.

---

## Checkpoint 15: Internationalization (Amharic + English)

- [ ] Set up next-intl in the web app
- [x] Create English translation file (`messages/en.json`) for core dashboard/progress strings (expand to full UI)
- [x] Create Amharic translation file (`messages/am.json`) for core dashboard/progress strings (expand to full UI)
- [x] Language switcher component in the web UI (global floating control)
- [x] Persist language preference (localStorage; profile persistence pending)
- [ ] Amharic font loading (ensure a font that renders Ge'ez script correctly, e.g., Noto Sans Ethiopic)
- [ ] Verify all UI text is extracted (no hardcoded strings in components)
- [ ] Test full app flow in Amharic (dashboard/progress translated; full flow pending)
- [ ] Question content supports both languages (questions stored with language field or both versions)
- [ ] Date/number formatting for Ethiopian context (Ethiopian calendar awareness optional but valuable)

**Exit Criteria**: Entire UI is available in both English and Amharic. Switching language updates all visible text instantly. Amharic renders correctly everywhere.

---

## Checkpoint 16: Offline Support (Service Worker + IndexedDB)

*Status: Deferred for now by product decision. Moving directly to Checkpoint 17.*

- [ ] Install and configure next-pwa
- [ ] Service Worker caches static assets (JS, CSS, images, fonts)
- [ ] Implement IndexedDB storage layer for questions
- [ ] On login / subscription verification: sync question sets to IndexedDB
- [ ] Delta sync: only fetch new/updated questions since last sync timestamp
- [ ] Practice mode works offline (reads from IndexedDB)
- [ ] Offline attempts stored in IndexedDB queue
- [ ] On reconnection: batch-sync queued attempts to API
- [ ] Conflict resolution: server is source of truth for scores/stats
- [ ] Offline indicator banner ("You are offline. Your progress will sync when reconnected.")
- [ ] Subscription grace period: allow 3 days offline before requiring re-validation
- [ ] Test: enable airplane mode → practice questions → reconnect → verify sync

**Exit Criteria**: Students can practice questions with no internet connection. Attempts sync correctly when connectivity returns. Clear offline/online state indicators.

---

## Checkpoint 17: Security Hardening (Audit and Remaining Items)

*Note: Helmet.js, CORS, password complexity, and database indexes are configured in earlier checkpoints. This checkpoint covers the remaining security surface.*

- [x] Rate limiting on all endpoints (not just auth) -- reviewed and tightened global throttle
- [x] Input sanitization (strip HTML from user inputs where needed)
- [x] SQL injection: verify Prisma parameterizes all queries (audit raw queries if any; evidence in `SECURITY_AUDIT_CHECKPOINT17.md`)
- [x] XSS: verify no `dangerouslySetInnerHTML` without sanitization in Next.js (evidence in `SECURITY_AUDIT_CHECKPOINT17.md`)
- [x] CSRF protection (if using cookies for auth) -- reviewed current bearer-token architecture; cookie CSRF not in active auth path
- [x] API keys and secrets audit: verify nothing is hardcoded, all in environment variables (evidence in `SECURITY_AUDIT_CHECKPOINT17.md`)
- [x] Brute force protection on login (account lockout after N failed attempts)
- [x] File upload validation (CSV bulk import: MIME type + file size cap)
- [x] Admin endpoints protected by role guard (verify all admin routes)
- [x] Sensitive data audit: verify password_hash, payment details never in API responses (evidence in `SECURITY_AUDIT_CHECKPOINT17.md`)
- [x] Audit logging for admin actions (who changed what, when)
- [x] Dependency vulnerability scan (`npm audit`) -- runtime scan `npm audit --omit=dev` reports 0 vulnerabilities
- [x] Penetration testing or security review of auth flow (security review completed and documented)
- [x] Content Security Policy (CSP) headers review

**Exit Criteria**: No known security vulnerabilities. All OWASP Top 10 web risks addressed. `npm audit` reports no high/critical vulnerabilities. Security audit checklist signed off.

---

## Checkpoint 18: Performance Optimization

*Note: Database indexes are defined in Checkpoint 1 Prisma schema. This checkpoint focuses on application-level optimization.*

- [x] API response caching with Redis (subject lists, streams, grades) via CacheService with TTL and invalidation
- [x] Pagination on all list endpoints (no unbounded queries) — caps enforced on bookmarks, payments, mock exam attempts
- [x] Next.js Image optimization for question images — removed `unoptimized` flag, configured `remotePatterns`
- [x] Lazy loading for below-the-fold content — Recharts dynamically imported on progress page
- [x] Code splitting (Next.js does this by default with App Router)
- [x] Bundle analysis (`@next/bundle-analyzer`) — configured behind `ANALYZE=true` env flag
- [x] Response compression middleware (`compression` package in NestJS main.ts)
- [ ] Gzip/Brotli compression via Nginx (deployment-level configuration)
- [x] Static page generation for public pages (landing page is already a server component)
- [x] TanStack Query for client-side data caching and deduplication — all major pages refactored
- [x] Query key organization for cache invalidation (`web/src/hooks/query-keys.ts`)
- [ ] Lighthouse audit: target score >= 90 on Performance, Accessibility, Best Practices
- [ ] Test page load on throttled connection (Slow 3G in Chrome DevTools)
- [x] Optimize Amharic font loading — Noto Sans Ethiopic with `display: swap` and `subsets: ['ethiopic']`
- [ ] N+1 query audit (reviewed during audit — no issues found in current queries)

**Exit Criteria**: Lighthouse score >= 90 on all categories. Pages load in under 3 seconds on a simulated slow 3G connection. No N+1 query problems in the backend.

---

## Checkpoint 19: Testing

### Backend Tests
- [x] Unit tests for auth service (register, login, token refresh) — 42 tests in `auth.service.spec.ts`
- [x] Unit tests for question service (filtering, attempt recording, scoring) — 97 tests in `questions.service.spec.ts`
- [x] Unit tests for mock exam service (start, submit, time enforcement) — 56 tests in `mock-exams.service.spec.ts`
- [x] Unit tests for leaderboard service (score updates, ranking, period resets) — 29 tests in `leaderboard.service.spec.ts`
- [x] Unit tests for subscription service (activation, expiration, gating) — 27 tests in `subscriptions.service.spec.ts`
- [x] Integration tests for all API endpoints (using Supertest + test module) — 43 tests in `test/app.e2e-spec.ts`
- [x] Test database seeding and teardown between test runs — mock-based via `test/test-setup.ts`

**Added items (integral to backend testing):**
- [x] Test infrastructure: `test/test-setup.ts` with `createTestApp()`, mock factories, fixture data, test token generation
- [x] E2E Jest config: `test/jest-e2e.json` with ts-jest transform
- [x] Added `supertest`, `@types/supertest`, `@types/jest` dependencies
- [x] Added `test:e2e` script to backend `package.json`

### Frontend Tests
- [x] Component tests for key UI components (Button, Badge, Card, EmptyState, ProgressBar) — 49 tests across 5 files
- [ ] Integration tests for auth flow (login → dashboard redirect)
- [ ] Integration tests for question practice flow
- [ ] Integration tests for mock exam flow

**Added items (integral to frontend testing):**
- [x] Testing infrastructure: `jest.config.ts`, `jest.setup.ts` with `@testing-library/jest-dom`
- [x] Added `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jest`, `jest-environment-jsdom` dependencies
- [x] Added `test`, `test:watch`, `test:coverage` scripts to web `package.json`

### End-to-End Tests
- [ ] E2E: Register → Login → Browse subjects → Answer questions → View progress
- [ ] E2E: Start mock exam → Complete → View results
- [ ] E2E: Subscribe → Access premium content
- [ ] E2E: Admin login → Create question → Verify it appears for students

### Load Testing
- [ ] Simulate 100 concurrent users practicing questions
- [ ] Simulate 50 concurrent mock exam submissions
- [ ] Identify and fix any bottlenecks

**Exit Criteria**: Backend test coverage >= 80% on services. All critical user flows covered by E2E tests. Load test confirms app handles expected concurrent users without degradation.

**Current status**: Backend unit tests complete (251 tests across 5 services). Integration tests complete (43 endpoint tests). Frontend component tests complete (49 tests across 5 components). Frontend integration tests, E2E tests, and load tests remain.

---

## Checkpoint 20: Deployment and DevOps

- [ ] Production Dockerfile for backend (multi-stage build, minimal image)
- [ ] Production build configuration for Next.js web app
- [ ] Production `docker-compose.yml` (backend, PostgreSQL, Redis, Nginx)
- [ ] Nginx configuration (reverse proxy, SSL termination, static file serving, gzip)
- [ ] SSL certificate setup (Let's Encrypt / Certbot)
- [ ] Domain name registered and DNS configured
- [ ] Environment variable management for production (.env on server, not in repo)
- [ ] Database migration strategy for production (Prisma migrate deploy)
- [ ] Database backup automation (daily pg_dump to external storage)
- [ ] CI/CD pipeline (GitHub Actions):
  - [ ] On PR: run linter, type check, tests
  - [ ] On merge to main: build, test, deploy to staging
  - [ ] Manual trigger: deploy to production
- [ ] Staging environment (mirrors production, uses separate database)
- [ ] Health check monitoring (uptime monitor hitting `/health` endpoint)
- [ ] Error tracking (Sentry or similar -- captures frontend and backend errors)
- [ ] Application logging to persistent storage (not just stdout)
- [ ] Log rotation (prevent disk space issues)

**Exit Criteria**: App deploys automatically to staging on merge. Production deployment is a single manual trigger. Monitoring alerts on downtime. Backups run daily and have been verified by restore test.

---

## Checkpoint 21: Pre-Launch Quality Assurance

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, if accessible)
- [ ] Samsung Internet (popular on budget Android in Ethiopia)
- [ ] Edge

### Device Testing
- [ ] Desktop (1440px+)
- [ ] Tablet (768px - 1024px)
- [ ] Mobile (320px - 480px)
- [ ] Test on a real low-end Android device (if available)

### Content Verification
- [ ] All seeded/imported questions reviewed for accuracy
- [ ] Explanations are clear and correct
- [ ] No broken images
- [ ] Amharic content renders correctly
- [ ] Subject/topic organization matches MOE curriculum structure

### Payment Flow Verification
- [ ] Telebirr: complete a test payment end-to-end
- [ ] CBE Birr: complete a test payment end-to-end
- [ ] Bank transfer: submit receipt → admin verifies → subscription activates
- [ ] Expired subscription correctly restricts access
- [ ] Renewal flow works

### Edge Cases and Error Handling
- [ ] Network timeout during question submission → graceful error + retry
- [ ] Token expiry during active session → silent refresh, no disruption
- [ ] Concurrent mock exam submissions → no duplicate scoring
- [ ] Very long question text / Amharic text renders without overflow
- [ ] Empty states: no questions in a topic, no mock exams available, no bookmarks
- [ ] 404 page for invalid routes
- [ ] 500 error page with helpful message

### Accessibility
- [ ] All interactive elements are keyboard accessible
- [ ] Form inputs have proper labels
- [ ] Color contrast meets WCAG AA standard
- [ ] Screen reader tested on at least one page

**Exit Criteria**: No critical bugs. All payment flows verified. App works across target browsers and devices. Content is accurate and complete for launch subjects.

---

## Checkpoint 22: Production Launch

- [ ] Final production deployment
- [ ] Smoke tests on production environment:
  - [ ] Register a new account
  - [ ] Log in
  - [ ] Browse subjects and topics
  - [ ] Answer a question
  - [ ] Start and complete a mock exam
  - [ ] View leaderboard
  - [ ] Complete a payment (Telebirr)
  - [ ] Verify subscription activation
  - [ ] Switch language to Amharic
  - [ ] Test offline mode
- [ ] Monitoring alerts configured and tested (downtime → notification)
- [ ] Error tracking (Sentry) receiving events
- [ ] Database backup verified by performing a test restore
- [ ] Admin team trained on the admin dashboard
- [ ] Support channel established (how do users report issues?)
- [ ] Analytics in place: track registrations, subscriptions, daily active users, popular subjects
- [ ] Landing page live with app description, pricing, and call to action

**Exit Criteria**: Production app is live, monitored, and accepting real users. Admin team can manage content and verify payments. Backups are running. Support process exists.

---

## Post-Launch Monitoring (First 2 Weeks)

- [ ] Monitor error rates daily (Sentry dashboard)
- [ ] Monitor server resource usage (CPU, memory, disk, database connections)
- [ ] Monitor API response times (flag anything > 2 seconds)
- [ ] Review user feedback and bug reports
- [ ] Check payment webhook reliability (any missed callbacks?)
- [ ] Verify daily backups are completing
- [ ] Check leaderboard reset runs on schedule
- [ ] Address any critical bugs within 24 hours
- [ ] Track key metrics: registration rate, conversion to paid, daily active users, questions answered per day

**Exit Criteria**: App is stable for 2 weeks. No recurring critical errors. Payment flow is reliable. User growth metrics are being tracked.
