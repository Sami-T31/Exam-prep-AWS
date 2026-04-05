# Database Schema

Source of truth: `backend/prisma/schema.prisma` (Prisma + PostgreSQL).
Related docs: [ARCHITECTURE.md](./ARCHITECTURE.md), [API_SPEC.md](./API_SPEC.md).

## ORM and Migrations
- ORM: Prisma (`@prisma/client`)
- DB: PostgreSQL
- Migrations present:
  - `20260221214326_initial_schema`
  - `20260222193936_add_password_reset_tokens`
  - `20260304044637_checkpoint14_analytics_governance`

## Enums
`UserRole`, `StreamSlug`, `Difficulty`, `QuestionStatus`, `SubscriptionPlan`, `SubscriptionStatus`, `PaymentMethod`, `PaymentStatus`, `LeaderboardPeriod`, `AppPlatform`.

## Core Domain Models
- `User` (`id` UUID): profile/auth fields, `role`, `region`, soft delete `deletedAt`
- `Stream` (int id): curriculum stream (`NATURAL_SCIENCE`, `SOCIAL_SCIENCE`)
- `Subject` (int id): subject catalog
- `SubjectStream` (composite key): many-to-many subject<->stream
- `Grade` (int id, `gradeNumber` unique)
- `Topic` (int id): belongs to `subjectId` + `gradeId`
- `Question` (UUID): text, difficulty, status, topic, grade, optional year, soft delete
- `QuestionOption` (UUID): option label/text, correctness
- `QuestionAttempt` (UUID): user answer + correctness + time spent, optional mock exam attempt link
- `Bookmark` (UUID): user<->question saved mapping, unique `(userId, questionId)`

## Mock Exam Models
- `MockExam` (UUID): title, subject, grade, duration, questionCount, soft delete
- `MockExamQuestion` (UUID): exam<->question join + sort order
- `MockExamAttempt` (UUID): score/total/time, started/completed timestamps

## Auth + Session Models
- `RefreshToken` (UUID): hashed refresh tokens + expiry
- `PasswordResetToken` (UUID): one-time reset tokens

## Billing Models
- `Subscription` (UUID): plan, status, starts/expires
- `Payment` (UUID): amount, method, status, provider reference, verification timestamps

## Leaderboard Model
- `LeaderboardEntry` (UUID): persisted leaderboard snapshot by `(userId, subjectId, period)`

## Analytics + Governance Models
- `Consent` (1:1 with user): analytics/personalization/marketing opt-ins + policy acceptance timestamps
- `AppSession`: started/ended session records by platform
- `FeatureUsageEvent`: eventName + metadata JSON + platform
- `VideoProgress`: per user/video progress upsert model

### Aggregate/derived analytics tables
- `DailyActiveMetric`
- `SignupRetentionMetric`
- `TopicAccuracyAggregate`
- `QuestionMissAggregate`
- `GradeRegionEngagementAggregate`

## Key Relations
- `User` 1:N with attempts, bookmarks, payments, subscriptions, sessions/events/progress
- `User` 1:1 with `Consent`
- `Subject` 1:N `Topic`, `MockExam`
- `Grade` 1:N `Topic`, `Question`, `MockExam`
- `Topic` 1:N `Question`
- `Question` 1:N `QuestionOption` and `QuestionAttempt`
- `MockExam` 1:N `MockExamQuestion`, `MockExamAttempt`

## Indexing / Constraints (selected)
- Unique: `users.email`, `users.phone`, `grades.gradeNumber`, `subjects.name`
- Composite indexes for question filters: topic+grade+difficulty
- Attempt indexes by user and attemptedAt
- Aggregate tables indexed by date and privacy cohort fields

## UNKNOWN / TODO
- Confirm whether Prisma relation on `Topic.questions` should remain strict after mock-exam-only question workflow changes
- Confirm long-term retention policy for `video_progress` (currently kept)
- Confirm whether additional partitioning is planned for large analytics event volumes

---

## Update Protocol
### When to update
- Any Prisma schema change, migration, or relationship/index update

### Scan these areas
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**/migration.sql`
- Services using new/removed models

### Checklist
- New models listed with purpose
- New enums captured
- Key relations and unique constraints updated
- Migration history summary still accurate
