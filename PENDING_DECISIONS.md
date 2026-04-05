# Pending Decisions and Placeholder Values

This document tracks every hardcoded value, placeholder, temporary solution, and business decision that requires confirmation or replacement before production release. Each item includes the file it appears in, what the current value is, and what action is needed.

**Priority Legend**: `P0` Must fix before production | `P1` Should fix before production | `P2` Can address post-launch

---

## Business Decisions (Need Stakeholder Input)

### BD-001: Subscription Pricing (P0)

- **File**: Not yet implemented (will be in backend subscription module)
- **Current state**: No pricing defined
- **Action needed**: Decide on pricing in Ethiopian Birr (ETB) for each plan:
  - Monthly plan: ___ ETB
  - Quarterly plan: ___ ETB
  - Yearly plan: ___ ETB
- **Impact**: Blocks payment integration and pricing page UI

### BD-002: Free Tier Question Limit (P1)

- **File**: `packages/shared/src/constants/subjects.ts` line 41
- **Current value**: `FREE_TIER_QUESTIONS_PER_SUBJECT = 10`
- **Action needed**: Confirm or adjust. This controls how many questions a non-paying user can access per subject. Too few and users can't evaluate the product; too many and there's no incentive to pay.
- **Considerations**: 10 per subject across 11 subjects = 110 free questions total

### BD-003: Offline Grace Period (P1)

- **File**: `packages/shared/src/constants/subjects.ts` line 47
- **Current value**: `OFFLINE_GRACE_PERIOD_DAYS = 3`
- **Action needed**: Confirm or adjust. This is how many days a subscriber can use the app without internet before being forced to re-verify their subscription. Ethiopian internet reliability makes this an important UX decision. Shorter = less piracy risk, longer = better UX for rural users.

### BD-004: Product Name and Branding (P0)

- **File**: `.env.example` line 37
- **Current value**: `NEXT_PUBLIC_APP_NAME=Exam Prep Ethiopia`
- **Action needed**: Decide on the final product name. This appears in the browser tab title, headers, and metadata. The name should ideally work in both English and be recognizable to Amharic speakers.

### BD-005: Subject List Verification (P0)

- **File**: `packages/shared/src/constants/subjects.ts` lines 12-24
- **Current value**: 11 subjects mapped to two streams based on general knowledge of the Ethiopian MOE curriculum
- **Action needed**: Verify this list against the current official Ministry of Education curriculum for the 12th Grade National Exam. Specifically confirm:
  - Are all subjects present? (Are there others like ICT, Technical Drawing, etc.?)
  - Is Civics/Ethical Education included as an exam subject?
  - Is Aptitude still a component of the national exam?
  - Which subjects are shared across both streams?

### BD-006: Password Policy (P1)

- **File**: `packages/shared/src/validation/auth.ts`
- **Current value**: Minimum 8 characters, must contain uppercase + lowercase + digit
- **Action needed**: Confirm this policy. Current policy does not require special characters. This is intentional -- overly complex password rules reduce usability without meaningfully improving security for most users.

### BD-007: Ethiopian Calendar Support (P2)

- **File**: Not yet implemented
- **Current state**: Dates use Gregorian calendar throughout
- **Action needed**: Decide if the app should display dates in the Ethiopian calendar (which is 7-8 years behind Gregorian). Many Ethiopian users think in Ethiopian calendar dates. Options:
  - Show Ethiopian calendar only
  - Show both calendars
  - Show Gregorian only (simpler but less familiar to users)

---

## Environment and Secrets (Must Replace for Production)

### ENV-001: PostgreSQL Password (P0)

- **File**: `.env.example` line 13, `.env` line 13
- **Current value**: `.env.example` uses `change_this_to_a_strong_password`
- **Status**: Local `.env` also uses this placeholder value
- **Action needed**: Before any deployment, generate a strong random password. The `.env.example` is fine as a template, but the deployed environment must use a unique, strong password (32+ characters, random).

### ENV-002: Production DATABASE_URL (P0)

- **File**: `.env.example` line 16
- **Current value**: Points to localhost with placeholder password
- **Action needed**: Production will use a different host (the server's PostgreSQL instance or a managed database service). The production `DATABASE_URL` must be configured in the deployment environment, never committed to code.

### ENV-003: Production Redis Password (P0)

- **File**: `.env.example` line 22, `docker-compose.yml` line 49
- **Current value**: Dev password is `exam_prep_redis_dev`
- **Action needed**: Production must use a strong, unique Redis password.

### ENV-004: Production API URL (P0)

- **File**: `.env.example` line 36
- **Current value**: `http://localhost:3001`
- **Action needed**: Must be the production domain with HTTPS (e.g., `https://api.yourproductname.com`). This is set at deployment time, not in code.

### ENV-005: Production JWT Secrets (P0)

- **File**: `.env.example` lines 26-27
- **Current value**: Placeholder strings
- **Status**: Local `.env` has real generated secrets. Production must use separate, independently generated secrets.
- **Action needed**: Generate production secrets on the production server. Never reuse development secrets.

---

## Infrastructure (Needed Before Production)

### INFRA-001: Production Docker Compose (P0)

- **File**: `docker-compose.yml` (current file is development-only)
- **Current state**: Exposes ports to host machine, uses default resource limits, no SSL
- **Action needed**: Create `docker-compose.prod.yml` with:
  - Internal Docker network (no exposed database ports)
  - Nginx reverse proxy with SSL termination
  - Resource limits (memory, CPU) on each container
  - PostgreSQL connection pool limits
  - Redis maxmemory configuration
  - Backend service container
  - Log driver configuration
  - Restart policies

### INFRA-002: SSL/TLS Certificate (P0)

- **File**: Not yet created
- **Action needed**: Set up SSL certificate (Let's Encrypt / Certbot) for the production domain. All traffic must be HTTPS.

### INFRA-003: Domain Name (P0)

- **Current state**: No domain registered
- **Action needed**: Register a domain name for the product. Required before deployment.

### INFRA-004: Database Backup Strategy (P0)

- **Current state**: No backups configured
- **Action needed**: Set up automated daily PostgreSQL backups (`pg_dump`) to external storage. Test restore process. Define retention policy (e.g., keep daily for 30 days, weekly for 6 months).

### INFRA-005: Hosting Provider Selection (P0)

- **Current state**: Not selected
- **Action needed**: Choose between DigitalOcean, Hetzner, or an Ethiopian hosting provider. Ethiopian hosting gives lower latency but may have less reliability. A hybrid approach (Ethiopian CDN + international hosting) may be optimal.

### INFRA-006: CI/CD Pipeline (P1)

- **Current state**: Not configured
- **Action needed**: Set up GitHub Actions for:
  - Run linter and type check on every pull request
  - Run tests on every pull request
  - Build and deploy to staging on merge to main branch
  - Manual production deployment trigger

### INFRA-007: Error Tracking Service (P1)

- **Current state**: Not configured
- **Action needed**: Set up Sentry (or equivalent) for both backend and frontend error tracking. Requires account creation and DSN configuration.

### INFRA-008: Uptime Monitoring (P1)

- **Current state**: Not configured
- **Action needed**: Set up external uptime monitoring (e.g., UptimeRobot, Better Uptime) that pings the `/health` endpoint and alerts on downtime.

### INFRA-009: Email/SMS Service for Password Reset (P1)

- **File**: `backend/src/auth/auth.service.ts` — `forgotPassword()` method
- **Current state**: Reset tokens are logged to the server console (`[DEV ONLY] Password reset token for...`). No actual email or SMS is sent.
- **Action needed**: Integrate an email or SMS service to deliver password reset tokens to users. Options:
  - **Email**: SendGrid, Mailgun, or AWS SES
  - **SMS**: Twilio, AfricasTalking (better for Ethiopian phone numbers)
- **Impact**: Users cannot reset their passwords in production until this is implemented.

---

## Payment Integration (Needs External Accounts)

### PAY-001: Telebirr Merchant Account (P0)

- **Current state**: No account
- **Action needed**: Register as a Telebirr merchant with Ethio Telecom. Obtain:
  - Merchant ID
  - API key / secret
  - Test environment credentials
  - Webhook callback URL configuration
- **Lead time**: May take weeks for approval

### PAY-002: CBE Birr Integration (P0)

- **Current state**: No account
- **Action needed**: Contact Commercial Bank of Ethiopia for API access. Obtain:
  - API credentials
  - Test environment access
  - Documentation for payment initiation and callback
- **Lead time**: May take weeks for approval

### PAY-003: Bank Transfer Details (P1)

- **Current state**: No bank account designated for receiving payments
- **Action needed**: Set up a dedicated business bank account for receiving manual transfer payments. The account details will be shown to users who choose bank transfer as their payment method.

---

## Content (Needs Before Launch)

### CONTENT-001: Question Database (P0)

- **Current state**: No questions exist yet
- **Action needed**: Create or source exam preparation questions for all 11 subjects across grades 9-12. Minimum viable launch requires at least 50 questions per subject per grade level (2,200+ questions total). Each question needs:
  - Question text (English and/or Amharic)
  - 4 answer options
  - Correct answer marked
  - Explanation of why the answer is correct

### CONTENT-002: Amharic UI Translations (P1)

- **Current state**: Not started
- **Action needed**: Translate all UI strings to Amharic. This should be done by a native Amharic speaker with knowledge of educational terminology.

### CONTENT-003: Terms of Service and Privacy Policy (P0)

- **Current state**: Not created
- **Action needed**: Draft legal documents covering:
  - Terms of service (subscription terms, refund policy, usage rules)
  - Privacy policy (what data is collected, how it's used, GDPR-like compliance)
  - These should be reviewed by a legal professional familiar with Ethiopian law

---

## Development Environment Notes

### DEV-001: Local PostgreSQL Port Conflict (Resolved)

- **File**: `docker-compose.yml` line 23, `.env` line 16
- **Issue**: A local PostgreSQL installation on the development machine occupies port 5432, which prevented the Docker container from being reachable.
- **Resolution**: Changed Docker port mapping from `5432:5432` to `5433:5432`. The `DATABASE_URL` in `.env` and `.env.example` now uses port `5433`.
- **Impact on production**: None. Production will have its own PostgreSQL instance/service with no port conflict. The port is configurable via the `POSTGRES_PORT` environment variable.

### DEV-002: Prisma CLI Requires dotenv-cli (Development Tooling)

- **File**: `backend/package.json` — Prisma scripts prefixed with `dotenv -e ../.env --`
- **Reason**: Prisma CLI looks for `.env` relative to the schema file location (`backend/prisma/`), but our `.env` is at the monorepo root. `dotenv-cli` (dev dependency) loads the root `.env` before running Prisma commands.
- **Impact on production**: None. Production deployments set environment variables directly (not via `.env` files).

---

## Hardcoded Technical Values (Review Before Production)

### TECH-001: JWT Token Expiry Times (P1)

- **File**: `.env.example` lines 28-29
- **Current value**: Access token = 15 minutes, Refresh token = 7 days
- **Reasoning**: 15-minute access tokens limit the damage window if a token is stolen. 7-day refresh tokens balance security with convenience (students don't want to log in daily).
- **Action needed**: Confirm these values are acceptable. Consider:
  - Shorter access token (5 min) for higher security
  - Longer refresh token (30 days) for better mobile UX

### TECH-002: Pagination Default Size (P1)

- **File**: `packages/shared/src/validation/content.ts` line 61
- **Current value**: `default(20)` items per page, max 100
- **Action needed**: Confirm these limits are appropriate for the expected data volume and client bandwidth.

### TECH-003: Time Limit on Question Attempts (P2)

- **File**: `packages/shared/src/validation/content.ts` line 50
- **Current value**: `max(3600)` seconds (1 hour) per question
- **Action needed**: This caps the `timeSpentSeconds` field at 1 hour per individual question. This is a safety limit to prevent corrupted data. Confirm this is reasonable.

### TECH-004: Question and Explanation Text Limits (P2)

- **File**: `packages/shared/src/validation/content.ts` lines 10-15
- **Current value**: Question text max 2000 chars, explanation max 3000 chars, option text max 500 chars
- **Action needed**: Verify these limits accommodate Amharic text (which can be longer than English equivalents for the same content) and any mathematical notation.

### TECH-005: Mock Exam Grace Buffer Duration (P2)

- **File**: `backend/src/mock-exams/mock-exams.service.ts` — `GRACE_BUFFER_SECONDS` constant
- **Current value**: 30 seconds
- **Reasoning**: Allows for network latency between the client timer reaching zero and the submission arriving at the server. Ethiopian internet connections can be slow, so a longer buffer may be needed.
- **Action needed**: Confirm 30 seconds is adequate. Consider increasing to 60 seconds if users in rural areas report failed submissions.

### TECH-006: Streak Timezone Handling (P2)

- **File**: `backend/src/progress/progress.service.ts` — `calculateStreak()` method
- **Current state**: Streak dates are calculated in UTC. A student in Ethiopia (UTC+3) who practices at 11 PM local time would have their attempt counted on the next UTC calendar day.
- **Action needed**: Consider using the user's local timezone for streak calculation. This requires either storing a timezone preference per user or defaulting to Africa/Addis_Ababa (UTC+3).

### TECH-007: Weak Topics Minimum Attempt Threshold (P2)

- **File**: `backend/src/progress/progress.service.ts` — `getWeakTopics()` method
- **Current state**: Topics with even 1 attempt can appear as "weak" if that single attempt was wrong (0% accuracy). This could be misleading.
- **Action needed**: Consider adding a minimum attempt count (e.g., 3+ attempts) before a topic qualifies as "weak." This prevents noisy results from small sample sizes.

### TECH-008: CSV Bulk Import Memory Usage (P1)

- **File**: `backend/src/questions/admin-questions.controller.ts` — `bulkImport()` method
- **Current state**: The entire CSV file is loaded into memory and parsed at once. Individual rows are inserted sequentially.
- **Threshold**: Adequate for files under ~5,000 rows. For larger imports (10k+ rows), the in-memory approach may cause high memory usage.
- **Action needed**: If large CSV imports are expected, replace the in-memory parser with a streaming CSV library (e.g., `csv-parse`) and batch inserts using `createMany()` for better performance.

### TECH-009: Subscription Plan Pricing (P0)

- **File**: `backend/src/subscriptions/subscriptions.service.ts` — `PLANS` constant
- **Current value**: All plan prices are `0` ETB (placeholder)
- **Action needed**: Set actual pricing for MONTHLY, QUARTERLY, and YEARLY plans in Ethiopian Birr. This also connects to BD-001 (Subscription Pricing) above.

### TECH-010: Bank Transfer Account Details (P0)

- **File**: `backend/src/payments/payments.service.ts` — `initiate()` method
- **Current value**: `bankName`, `accountNumber`, `accountName` are all `[PLACEHOLDER]`
- **Action needed**: Replace with the actual business bank account details for receiving payment transfers.

### TECH-011: Payment Webhook Signature Verification (P0)

- **File**: `backend/src/payments/payments.controller.ts` — `handleWebhook()` method
- **Current state**: The webhook endpoint is public and accepts any request. No signature verification.
- **Action needed**: When Telebirr/CBE Birr credentials are obtained, implement signature verification to ensure webhooks actually come from the payment provider. Without this, anyone could fake a payment confirmation.

### TECH-012: Leaderboard Cron Timezone (P2)

- **File**: `backend/src/leaderboard/leaderboard.service.ts` — `@Cron` decorators
- **Current state**: Weekly reset triggers every Monday at 00:00 server time (UTC). Monthly reset triggers on the 1st of each month.
- **Action needed**: Confirm these times are appropriate for Ethiopian users. Ethiopia is UTC+3, so midnight UTC is 3:00 AM local time — this is likely fine (low activity).

### TECH-013: Free Tier Question Limit (P1)

- **File**: `backend/src/subscriptions/subscriptions.service.ts` — `FREE_TIER_QUESTIONS_PER_SUBJECT` constant
- **Current value**: 10 distinct questions per subject
- **Action needed**: This constant is duplicated from `packages/shared/src/constants/subjects.ts`. The value is intentionally hardcoded in the backend to avoid import path issues. Ensure both copies stay in sync. Consider moving to an environment variable for easier tuning.

### TECH-014: Internationalization Library (P2)

- **File**: N/A — `next-intl` was not installed in Checkpoint 6
- **Current state**: The original checklist included `next-intl` for Amharic language support. It was deferred because the UI text is not finalized and adding i18n before content exists creates unnecessary overhead.
- **Action needed**: Install `next-intl` and set up translation files when Amharic support is ready to implement. All visible strings should be wrapped in translation functions at that point.

### TECH-015: Token Storage Security (P1)

- **File**: `web/src/lib/token-storage.ts`
- **Current state**: Access tokens are stored in localStorage and a non-httpOnly cookie. This is standard for SPAs but means JavaScript on the page can read the token.
- **Action needed**: For production, evaluate using httpOnly cookies set by the backend (requires backend changes to set cookies on login/refresh responses). This would make tokens inaccessible to JavaScript, reducing XSS risk. The proxy already reads cookies, so the migration would be straightforward.
