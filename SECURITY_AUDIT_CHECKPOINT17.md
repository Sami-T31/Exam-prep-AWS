# Checkpoint 17 Security Audit Evidence (2026-03-04)

This document records evidence for the remaining security audit items completed in Checkpoint 17:

1. SQL injection raw-query audit
2. Sensitive data response audit
3. API keys/secrets audit
4. XSS rendering audit
5. CSRF posture review
6. Admin action audit logging
7. Dependency vulnerability scan
8. Auth-flow security review

## 1) SQL Injection Raw-Query Audit

### Audit command

```bash
rg -n '\$queryRaw|\$executeRaw|Unsafe' backend/src -g'*.ts'
```

### Result summary

- Found only tagged-template raw query usage (`$queryRaw\`...\``), which Prisma parameterizes.
- Found **no** `\$queryRawUnsafe` or `\$executeRawUnsafe`.
- Raw-query usage reviewed in:
  - `backend/src/progress/progress.service.ts`
  - `backend/src/analytics/analytics.service.ts`
  - `backend/src/mock-exams/mock-exams.service.ts`
  - `backend/src/subscriptions/subscriptions.service.ts`
  - `backend/src/health.controller.ts`

### Evidence interpretation

- No unsafe raw SQL API is in use.
- Dynamic values are interpolated through Prisma tagged templates, which parameterize user input.

## 2) Sensitive Data Response Audit

### Audit commands

```bash
rg -n 'passwordHash|password_hash|tokenHash|refreshToken' backend/src -g'*.ts'
rg -n 'email|phone|payment' backend/src/admin backend/src/payments backend/src/auth -g'*.ts'
```

### Result summary

- No API controller returns `passwordHash` or `tokenHash` in response payloads.
- User-facing auth responses return limited user profile + JWTs as designed.
- Payment history endpoints return payment metadata, amount, method, and status, but not card data/CVV.

### Hardening fixes applied

- Removed raw password-reset token logging from auth flow:
  - `backend/src/auth/auth.service.ts`
  - Replaced raw token log with safe operational message containing only user ID.
- Removed Prisma query text logging (which could contain sensitive values in SQL):
  - `backend/src/prisma/prisma.service.ts`
  - Non-production logs now include `warn`/`error` events only.

## 3) API Keys / Secrets Audit

### Audit command

```bash
rg -n 'sk_live|sk_test|AKIA|AIza|xoxb-|-----BEGIN|postgres://|redis://|api[_-]?key|secret' . \
  -g'*.ts' -g'*.tsx' -g'*.js' -g'*.json' -g'*.md' -g'*.yml' -g'*.yaml' -g'*.env*'
```

### Result summary

- No hardcoded production API keys/secrets found in source files.
- Secret references are environment-variable based (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, etc.).
- `.env.example` contains placeholders and explicit "do not commit" guidance.

### Evidence interpretation

- Secret material is configuration-driven (environment variables), not source-embedded.
- No leaked provider tokens or private keys detected by pattern scan.

## 4) XSS Rendering Audit

### Audit command

```bash
rg -n 'dangerouslySetInnerHTML' web admin backend
```

### Result summary

- No `dangerouslySetInnerHTML` usage found in `web/`, `admin/`, or `backend/`.
- UI text is rendered through normal React JSX bindings.

### Evidence interpretation

- No direct HTML injection sink was found in current frontend code paths.

## 5) CSRF Posture Review

### Evidence reviewed

- `web/src/lib/api-client.ts` and `admin/src/lib/admin-api.ts` send bearer tokens in `Authorization` headers.
- Current auth design stores and rotates JWT access/refresh tokens; no cookie-based session auth path is implemented.

### Evidence interpretation

- Classic browser CSRF risk is significantly reduced because auth is not cookie-session based.
- If the project moves to cookie auth later, CSRF tokens/SameSite strategy must be added.

## 6) Admin Action Audit Logging

### Implementation

- Added a global interceptor:
  - `backend/src/common/interceptors/admin-audit.interceptor.ts`
- Registered as global app interceptor in:
  - `backend/src/app.module.ts`

### Logged fields

- `requestId`
- `actorId`
- HTTP `method`
- `route`
- `status`
- route `params`
- write `bodyKeys` (keys only, not raw values)
- `durationMs`
- `outcome` (`success` / `failure`)

### Scope

- Logs only mutation requests (`POST`, `PATCH`, `PUT`, `DELETE`) from users with `role=ADMIN`.

## 7) Dependency Vulnerability Scan

### Audit commands and result

```bash
npm audit
npm audit --omit=dev
```

- Full dependency graph still includes development-tooling advisories (Nest CLI/schematics chain).
- Runtime-only scan result:
  - `npm audit --omit=dev` => **found 0 vulnerabilities**

### Evidence interpretation

- No known runtime production vulnerabilities in non-dev dependencies at audit time.
- Remaining advisories are currently in dev tooling chain and tracked.

## 8) Auth-Flow Security Review

### Flows reviewed

- register/login/refresh/logout
- forgot-password/reset-password
- JWT guard + roles guard enforcement

### Findings confirmed in code

- Login lockout after repeated failures (Redis-backed).
- Refresh-token rotation and hash-at-rest storage.
- Password reset tokens hashed, expiring, and single-use.
- Password reset invalidates existing refresh tokens.
- Generic error messages avoid account enumeration.

### Evidence interpretation

- Auth flow includes common baseline protections against brute force, token reuse, and reset-token leakage.
