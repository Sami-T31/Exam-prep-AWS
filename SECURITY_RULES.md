# Security Rules

Current implementation references: `backend/src/main.ts`, `backend/src/auth/**`, `backend/src/app.module.ts`, `backend/src/common/**`, `SECURITY_AUDIT_CHECKPOINT17.md`.

## Current Controls Implemented

## Auth and Authorization
- JWT bearer auth via global `JwtAuthGuard`
- Public endpoints must be explicitly marked `@Public()`
- Role-based access via global `RolesGuard` + `@Roles('ADMIN')`
- Refresh token rotation and hash-at-rest storage
- Password reset tokens hashed and single-use (`usedAt`)

## Password and Login Hardening
- Password hashing: bcrypt (`12` rounds)
- Auth endpoint throttle overrides for register/login/forgot/reset
- Brute-force lockout in Redis for failed login attempts

## Request Validation and Input Handling
- Global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`
- DTO validation with `class-validator`
- Input sanitization helper used in auth and admin content write paths
- CSV upload checks include extension, MIME allowlist, and 2MB limit

## Transport and Header Security
- CORS allowlist from env (`CORS_ORIGINS`)
- Helmet enabled, CSP strict in production API mode
- `xPoweredBy` disabled
- Request ID middleware for traceability

## Data Access and Query Safety
- Prisma ORM is primary data access layer (parameterized queries)
- SQL/raw-query audit documented in `SECURITY_AUDIT_CHECKPOINT17.md`
- Sensitive Prisma query text logging has been removed in current code

## Secrets and Configuration
- Secrets expected via environment variables (`.env`, `.env.example` template)
- JWT secrets and Redis credentials are validated at startup
- Admin analytics export can include PII only via explicit `includePII=true` query and admin role

## Analytics Privacy Controls
- Consent model (`analyticsOptIn`, `personalizationOptIn`, `marketingOptIn`)
- Event ingestion paths skip writes when analytics consent is off
- Aggregated analytics endpoint enforces cohort privacy threshold

## Rules We Must Follow Going Forward
1. Do not introduce raw SQL string concatenation; use Prisma or parameterized bindings.
2. Keep new endpoints validated with DTOs and class-validator decorators.
3. Protect admin routes with `@Roles('ADMIN')` and bearer auth.
4. Never return password hashes, tokens, reset secrets, or provider secrets in API responses.
5. New file upload paths must enforce size/type checks.
6. New analytics collection must remain consent-gated.
7. Keep rate limiting in place on sensitive and high-volume endpoints.
8. Keep security headers (Helmet/CSP) active unless explicitly justified.
9. Store new secrets only in env, never hardcoded in source.
10. Update security audit docs/checklist when changes alter risk posture.

## UNKNOWN / TODO
- XSS audit for all frontend rendering paths is still checklist-open
- CSRF strategy requires confirmation if auth storage moves to cookies
- Admin action audit-log trail is still checklist-open

---

## Update Protocol
### When to update
- Any auth/guard/security-header/rate-limit/input-sanitization/export-privacy change

### Scan these areas
- `backend/src/main.ts`, `backend/src/app.module.ts`
- `backend/src/auth/**`, `backend/src/common/**`
- `backend/src/analytics/**`
- `SECURITY_AUDIT_CHECKPOINT17.md`, `WEB_APP_DEVELOPMENT_CHECKLIST.md`

### Checklist
- New threat surface identified
- Existing controls still accurate
- Forward rules updated with new constraints
- UNKNOWN/TODO aligned with checklist status
