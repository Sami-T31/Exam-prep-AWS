# Project Context

This repository contains the Ethiopian Exam Prep platform monorepo:
- Student web app: `web/` (Next.js, port `3000`)
- Admin dashboard: `admin/` (Next.js, port `3002`)
- Backend API: `backend/` (NestJS, port `3001`)
- Shared types/constants/validation: `packages/shared/`

See [ARCHITECTURE.md](./ARCHITECTURE.md), [API_SPEC.md](./API_SPEC.md), [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md), and [NAMING_CONVENTIONS.md](./NAMING_CONVENTIONS.md).

All code must follow the naming rules in [NAMING_CONVENTIONS.md](./NAMING_CONVENTIONS.md). The [LEARNING_GUIDE.md](./LEARNING_GUIDE.md) contains detailed explanations of each checkpoint with naming convention references.

## Product Goal
Help Ethiopian students prepare for national exams with:
- Practice questions by subject/grade/topic/difficulty
- Timed mock exams
- Progress tracking and weak-topic insights
- Leaderboards and subscription-based premium access

## Target Users
- Primary: students (grades 9–12 flows exist; seed/demo content is mostly grade 12)
- Secondary: admin/content team managing subjects, topics, questions, mock exams, and payment verification

## Current Feature Areas (from code)
- Authentication and account lifecycle (`/auth/*`)
- Content browsing (streams, subjects, grades, topics, questions)
- Practice attempts + explanations
- Bookmarks
- Mock exams (start, submit, review, admin authoring)
- Progress dashboard/stats/trends
- Leaderboard (Redis + persistence snapshot table)
- Subscriptions and payment verification
- Admin operations (content, users, subscriptions, payment queue)
- Analytics/governance (consent, retention metrics, admin analytics export)
- i18n foundation in web (`messages/en.json`, `messages/am.json`)

## Monetization
Implemented monetization primitives:
- Subscription plans (`MONTHLY`, `QUARTERLY`, `YEARLY`)
- Payment methods (`TELEBIRR`, `CBE_BIRR`, `BANK_TRANSFER`)
- Payment status + admin verification flow
- Premium-gated personalized report endpoint (`GET /reports/me`)

## Non-Goals (Current State)
- Offline mode is explicitly deferred (Checkpoint 16 in checklist)
- Native mobile app implementation is not present in this repo yet (only platform enum + analytics split)
- Fully localized bilingual UI is not complete yet (checkpoint marked in progress)

## Scaling Assumptions
The codebase already includes patterns aimed at scale:
- Prisma/PostgreSQL indexes for hot filters and joins
- Redis for leaderboard and lockout state
- Scheduled aggregation jobs for retention/institutional analytics
- Raw event retention cleanup (90 days) for sessions/feature events
- Streaming admin analytics export with pagination/chunking support
- Checklist references aggregate-table strategy for larger user counts (100k+)

## UNKNOWN / TODO
- Confirm production MAU/DAU and throughput targets (not encoded in repo config)
- Confirm exact subscription pricing source-of-truth and ETB amounts across plans
- Confirm whether mobile clients are scheduled in next milestone or remain future phase

---

## Update Protocol
### When to update
- Any change to product scope, monetization, user roles, or major checkpoints

### Scan these areas
- `WEB_APP_DEVELOPMENT_CHECKLIST.md`
- `README.md`
- `web/src/app/**`, `admin/src/app/**`, `backend/src/**`
- `PENDING_DECISIONS.md`

### Checklist
- Product goal still accurate
- Feature list reflects shipped routes/pages
- Monetization section matches subscription/payment code
- Non-goals/deferred items still correct
- UNKNOWN/TODO refreshed
