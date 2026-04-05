# AI Rules (Repo Working Agreement)

This file defines how Codex/agents should work in this repository to reduce drift and context reliance.

Related docs: [NAMING_CONVENTIONS.md](./NAMING_CONVENTIONS.md), [LEARNING_GUIDE.md](./LEARNING_GUIDE.md), [API_SPEC.md](./API_SPEC.md), [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md).

## Core Operating Rules
1. Read before writing: inspect existing modules, DTOs, Prisma schema, and checklist before editing.
2. Prefer editing existing code paths over creating parallel implementations.
3. Keep diffs small and scoped to the requested outcome.
4. Follow naming conventions strictly from `NAMING_CONVENTIONS.md`.
5. Preserve existing architecture patterns (Nest module structure, Prisma-first data access, shared package contracts).
6. Do not invent behavior not present in code; document unknowns explicitly.

## API and Database Change Rules
1. If API contract changes, update:
   - backend DTO/controller/service
   - affected web/admin client calls
   - [API_SPEC.md](./API_SPEC.md)
2. If Prisma schema/migrations change, update:
   - [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)
   - relevant service logic/tests
3. Avoid raw SQL string concatenation. Use Prisma or parameterized queries only.
4. Respect consent/privacy rules in analytics features.

## Documentation Rules
1. Keep these repo-memory docs current:
   - `PROJECT_CONTEXT.md`
   - `ARCHITECTURE.md`
   - `DATABASE_SCHEMA.md`
   - `API_SPEC.md`
   - `SECURITY_RULES.md`
   - `QUESTION_FORMAT.md`
2. Always update `LEARNING_GUIDE.md` when implementing substantive checkpoint/feature changes.
3. Keep `WEB_APP_DEVELOPMENT_CHECKLIST.md` status aligned with actual implementation.

## Safety and Quality Rules
1. Run targeted verification commands after changes (`build`, `lint`, `test` where feasible).
2. Do not commit secrets (`.env`, credentials, private keys).
3. Keep admin-only functionality behind role checks; keep student flows isolated.
4. Prefer non-destructive data changes unless explicitly required.

## Practical Workflow for New Tasks
1. Scan code paths touched by the request.
2. Summarize facts discovered.
3. Implement minimal required edits.
4. Run checks and capture outcomes.
5. Update docs/checklist/learning guide as needed.
6. Commit with clear message.

## UNKNOWN / TODO
- Confirm if future automation should enforce docs update via CI check
- Confirm required minimum test matrix per workspace before merge

---

## Update Protocol
### When to update
- New team conventions, coding standards, security standards, or workflow changes

### Scan these areas
- `NAMING_CONVENTIONS.md`
- `AGENTS.md` instructions
- `WEB_APP_DEVELOPMENT_CHECKLIST.md`
- `LEARNING_GUIDE.md`

### Checklist
- Rules still match actual repo workflows
- Required docs list complete
- Safety constraints still aligned with current security posture
