# Naming Conventions

This document is the authoritative reference for all naming patterns in the codebase. Every file, variable, function, class, database column, API endpoint, and component must follow these rules. Consult this document before writing any code.

Last updated: 2026-03-04

---

## 1. General Principles

- **Consistency over preference.** If a pattern is established, follow it even if you personally prefer something different.
- **Be descriptive.** `questionAttempt` over `qa`. `isCorrect` over `correct`. `durationMinutes` over `duration`.
- **No abbreviations** unless universally understood (`id`, `url`, `api`, `db`, `dto`).
- **Singular nouns for types and models.** `User`, `Question`, `MockExam` -- not `Users`, `Questions`, `MockExams`.
- **Plural nouns for collections.** An array of questions is `questions`, a database table is mapped from singular model `Question`.

---

## 2. TypeScript (All Packages)

### Variables and Functions

| Element | Convention | Example |
|---------|-----------|---------|
| Local variables | `camelCase` | `questionCount`, `isCorrect`, `currentUser` |
| Functions | `camelCase` | `calculateScore()`, `formatDate()`, `validateToken()` |
| Boolean variables | Prefix with `is`, `has`, `can`, `should` | `isCorrect`, `hasSubscription`, `canAccess` |
| Constants (module-level) | `UPPER_SNAKE_CASE` | `FREE_TIER_QUESTIONS_PER_SUBJECT`, `OPTION_LABELS` |
| Private class fields | `camelCase` (no underscore prefix) | `this.logger`, `this.prisma` |

### Types and Interfaces

| Element | Convention | Example |
|---------|-----------|---------|
| Interfaces | `PascalCase`, no `I` prefix | `User`, `Question`, `QuestionOption` |
| Type aliases | `PascalCase` | `QuestionFilter`, `PaginatedResponse<T>` |
| Enums | `PascalCase` name, `UPPER_SNAKE_CASE` values | `enum Difficulty { EASY = 'EASY' }` |
| Generic type parameters | Single uppercase letter or descriptive `PascalCase` | `T`, `TResponse` |

### Request/Response Types

| Purpose | Pattern | Example |
|---------|---------|---------|
| API request body | `{Action}{Entity}Request` | `RegisterRequest`, `SubmitAnswerRequest`, `InitiateSubscriptionRequest` |
| API response body | `{Entity}{Context}Response` or `{Action}{Entity}Response` | `AuthResponse`, `SubmitAnswerResponse`, `ExamResultResponse` |
| Aggregated data | `{Entity}Stats` | `UserStats`, `SubjectStats` |

### Zod Validation Schemas

| Element | Convention | Example |
|---------|-----------|---------|
| Schema variables | `camelCase` ending in `Schema` | `registerSchema`, `loginSchema`, `createQuestionSchema` |
| Regex constants | `UPPER_SNAKE_CASE` ending in `_REGEX` | `ETHIOPIAN_PHONE_REGEX`, `PASSWORD_COMPLEXITY_REGEX` |

### Imports and Exports

- Use **named exports** everywhere. No default exports.
- Each directory has an `index.ts` barrel file that re-exports its contents.
- Import from the barrel: `import { User, Question } from '@exam-prep/shared'`
- When importing within the same package, use relative paths: `import { Stream } from '../constants/enums'`

---

## 3. File and Folder Naming

### Shared Package (`packages/shared/`)

| Element | Convention | Example |
|---------|-----------|---------|
| Folders | `lowercase` | `types/`, `constants/`, `validation/` |
| Files | `lowercase` single word or `kebab-case` if multi-word | `user.ts`, `content.ts`, `mock-exam.ts` |
| Barrel files | `index.ts` | `types/index.ts` |

### Backend (`backend/`)

NestJS follows a modular structure. Each module is a folder containing its controller, service, DTOs, and related files.

| Element | Convention | Example |
|---------|-----------|---------|
| Module folders | `kebab-case` | `auth/`, `questions/`, `mock-exams/` |
| Module files | `{module-name}.module.ts` | `auth.module.ts`, `questions.module.ts` |
| Controller files | `{module-name}.controller.ts` | `auth.controller.ts` |
| Service files | `{module-name}.service.ts` | `questions.service.ts` |
| DTO files | `{action}-{entity}.dto.ts` | `create-question.dto.ts`, `login.dto.ts` |
| Guard files | `{name}.guard.ts` | `jwt-auth.guard.ts`, `roles.guard.ts` |
| Interceptor files | `{name}.interceptor.ts` | `request-id.interceptor.ts` |
| Filter files | `{name}.filter.ts` | `http-exception.filter.ts` |
| Decorator files | `{name}.decorator.ts` | `current-user.decorator.ts`, `roles.decorator.ts` |
| Middleware files | `{name}.middleware.ts` | `request-id.middleware.ts` |
| Spec/test files | `{file-name}.spec.ts` | `auth.service.spec.ts` |
| Barrel files | `index.ts` | `dto/index.ts`, `guards/index.ts` |

**DTO placement rule**: Every DTO class must live in its own file under a `dto/` subdirectory within the module folder, never inline in a controller file. Each `dto/` directory must have a barrel `index.ts` that re-exports all DTOs.

### Web App (`web/`)

Next.js App Router has its own conventions for pages. Everything else follows these rules.

| Element | Convention | Example |
|---------|-----------|---------|
| Page directories | `kebab-case` (matches URL slug) | `mock-exams/`, `forgot-password/` |
| Page files | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` | (Next.js convention) |
| Component files | `PascalCase.tsx` | `QuestionCard.tsx`, `ExamTimer.tsx` |
| Hook files | `use{Name}.ts` | `useAuth.ts`, `useQuestions.ts` |
| Utility files | `camelCase.ts` | `apiClient.ts`, `formatDate.ts` |
| Store files | `{name}Store.ts` | `authStore.ts`, `examStore.ts` |
| Component folders | `kebab-case` for groups | `components/ui/`, `components/exam/` |

---

## 4. NestJS Classes

| Element | Convention | Example |
|---------|-----------|---------|
| Modules | `PascalCase` + `Module` | `AuthModule`, `QuestionsModule`, `MockExamsModule` |
| Controllers | `PascalCase` + `Controller` | `AuthController`, `QuestionsController` |
| Services | `PascalCase` + `Service` | `AuthService`, `QuestionsService`, `LeaderboardService` |
| DTOs | `PascalCase` + `Dto` | `CreateQuestionDto`, `LoginDto`, `SubmitAnswerDto` |
| Guards | `PascalCase` + `Guard` | `JwtAuthGuard`, `RolesGuard`, `SubscriptionGuard` |
| Interceptors | `PascalCase` + `Interceptor` | `RequestIdInterceptor`, `LoggingInterceptor` |
| Filters | `PascalCase` + `Filter` | `HttpExceptionFilter`, `PrismaExceptionFilter` |
| Decorators | `PascalCase` (function) | `CurrentUser()`, `Roles()`, `Public()` |
| Pipes | `PascalCase` + `Pipe` | `ZodValidationPipe` |

### Controller Method Naming

| HTTP Method | NestJS Decorator | Method Name Pattern | Example |
|-------------|-----------------|-------------------|---------|
| GET (list) | `@Get()` | `findAll` | `findAll(): Promise<Subject[]>` |
| GET (one) | `@Get(':id')` | `findOne` | `findOne(id: string): Promise<Question>` |
| POST (create) | `@Post()` | `create` | `create(dto: CreateQuestionDto): Promise<Question>` |
| PATCH (update) | `@Patch(':id')` | `update` | `update(id: string, dto: UpdateQuestionDto)` |
| DELETE | `@Delete(':id')` | `remove` | `remove(id: string): Promise<void>` |
| POST (action) | `@Post(':id/action')` | Descriptive verb | `submitAttempt()`, `startExam()`, `verifyPayment()` |

---

## 5. Database (Prisma)

### Models and Fields

| Element | Convention | Example |
|---------|-----------|---------|
| Model names | `PascalCase` singular | `User`, `Question`, `MockExam`, `QuestionAttempt` |
| Field names | `camelCase` | `questionText`, `createdAt`, `selectedOptionId` |
| Relation fields | `camelCase`, singular for one-to-one, plural for one-to-many | `user`, `questions`, `mockExamAttempts` |
| Foreign key fields | `{relation}Id` in camelCase | `userId`, `topicId`, `mockExamId` |
| Timestamps | `createdAt`, `updatedAt`, `deletedAt` | Consistent across all models |
| Boolean fields | Prefix with `is`, `has`, `can` | `isCorrect`, `isPublished` |

### PostgreSQL Mapping

Prisma models use camelCase but PostgreSQL uses snake_case. Apply `@@map` and `@map` in the Prisma schema to control the database table and column names.

| Prisma | PostgreSQL |
|--------|-----------|
| `model QuestionAttempt` | `@@map("question_attempts")` |
| `questionText` | `@map("question_text")` |
| `createdAt` | `@map("created_at")` |
| `userId` | `@map("user_id")` |

Table names are **plural snake_case**: `users`, `questions`, `question_attempts`, `mock_exams`.
Column names are **singular snake_case**: `question_text`, `created_at`, `user_id`.

### Index Naming

| Type | Pattern | Example |
|------|---------|---------|
| Unique constraint | `{table}_{columns}_unique` | `bookmarks_user_id_question_id_unique` |
| Index | `{table}_{columns}_idx` | `questions_topic_id_grade_id_idx` |
| Foreign key | Auto-generated by Prisma | -- |

---

## 6. API Design

### URL Paths

| Rule | Example |
|------|---------|
| All lowercase, `kebab-case` | `/api/v1/mock-exams`, `/api/v1/question-attempts` |
| Plural nouns for resource collections | `/api/v1/questions`, `/api/v1/subjects` |
| Nested resources for parent-child | `/api/v1/subjects/:id/topics` |
| Actions as sub-paths | `/api/v1/mock-exams/:id/start`, `/api/v1/mock-exams/:id/submit` |
| Versioned prefix | `/api/v1/...` |

### Query Parameters

| Rule | Example |
|------|---------|
| `camelCase` | `?subjectId=1&gradeId=2&difficulty=EASY` |
| Pagination: `limit` and `offset` | `?limit=20&offset=0` |
| Sorting: `sortBy` and `sortOrder` | `?sortBy=createdAt&sortOrder=desc` |
| Filtering: field name directly | `?difficulty=HARD&topicId=5` |

### Request and Response Bodies

- All field names are **camelCase** in JSON: `{ "questionText": "...", "isCorrect": true }`
- Dates are **ISO 8601 strings**: `"2026-02-21T14:30:00.000Z"`
- IDs for auto-increment entities (Subject, Grade, Topic) are `number`
- IDs for UUID entities (User, Question, MockExam, Subscription) are `string`
- Null fields are explicitly `null`, not omitted from the response

### Standard Response Envelopes

Paginated list:
```json
{
  "data": [...],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

Error:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### HTTP Status Codes

| Code | When to use |
|------|-------------|
| `200` | Successful GET, PATCH, action |
| `201` | Successful POST that creates a resource |
| `204` | Successful DELETE (no response body) |
| `400` | Validation error, bad request |
| `401` | Not authenticated (missing or invalid token) |
| `403` | Authenticated but not authorized (wrong role, no subscription) |
| `404` | Resource not found |
| `409` | Conflict (duplicate email, already bookmarked) |
| `429` | Rate limit exceeded |
| `500` | Unexpected server error |

---

## 7. Environment Variables

| Convention | Example |
|-----------|---------|
| `UPPER_SNAKE_CASE` | `DATABASE_URL`, `JWT_ACCESS_SECRET`, `REDIS_PASSWORD` |
| Prefix with service name for clarity | `POSTGRES_USER`, `REDIS_PORT` |
| Public (exposed to browser) prefix with `NEXT_PUBLIC_` | `NEXT_PUBLIC_API_URL` |
| Boolean env vars: use `true` / `false` strings | `ENABLE_SWAGGER=true` |

---

## 8. React Components (Web App)

### Component Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Component functions | `PascalCase` | `QuestionCard`, `ExamTimer`, `SubjectGrid` |
| Props interfaces | `{Component}Props` | `QuestionCardProps`, `ExamTimerProps` |
| Event handler props | `on{Event}` | `onAnswer`, `onSubmit`, `onBookmark` |
| Event handler functions | `handle{Event}` | `handleAnswer`, `handleSubmit` |
| Render helper functions | `render{Thing}` | `renderOptions`, `renderTimer` |

### Hook Naming

| Element | Convention | Example |
|---------|-----------|---------|
| Custom hooks | `use{Name}` | `useAuth`, `useQuestions`, `useExamTimer` |
| Return values | Descriptive, matches what is returned | `{ user, login, logout, isLoading }` |

### State Naming

| Element | Convention | Example |
|---------|-----------|---------|
| State variable | `camelCase` | `selectedOption`, `timeRemaining` |
| State setter | `set{Variable}` | `setSelectedOption`, `setTimeRemaining` |
| Loading states | `is{Action}Loading` or `isLoading` | `isSubmitting`, `isLoading` |
| Error states | `{action}Error` or `error` | `submitError`, `error` |

---

## 9. CSS / Tailwind

- Use **Tailwind utility classes** directly. No custom CSS class names unless absolutely necessary.
- If custom classes are needed, use `kebab-case`: `question-card`, `exam-timer`.
- No BEM, no CSS modules naming conventions -- Tailwind eliminates the need.

---

## 10. Git

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/{short-description}` | `feature/mock-exam-timer` |
| Bug fix | `fix/{short-description}` | `fix/login-token-refresh` |
| Checkpoint | `checkpoint/{number}` | `checkpoint/1a-backend-scaffold` |

### Commit Messages

Format: `{type}: {concise description}`

| Type | When |
|------|------|
| `feat` | New feature or endpoint |
| `fix` | Bug fix |
| `refactor` | Code restructuring, no behavior change |
| `docs` | Documentation only |
| `chore` | Dependencies, config, tooling |
| `test` | Adding or updating tests |

Examples:
- `feat: add question attempt recording endpoint`
- `fix: prevent duplicate bookmark creation`
- `chore: upgrade prisma to 6.x`
- `docs: add API versioning notes to README`

---

## Quick Reference Card

```
Files/Folders:    kebab-case          (mock-exams/, create-question.dto.ts)
Classes:          PascalCase+Suffix   (QuestionsService, JwtAuthGuard)
Interfaces:       PascalCase          (Question, SubmitAnswerRequest)
Enums:            PascalCase/UPPER    (Difficulty, EASY)
Variables:        camelCase           (questionCount, isCorrect)
Functions:        camelCase           (calculateScore, findAll)
Constants:        UPPER_SNAKE_CASE    (FREE_TIER_QUESTIONS_PER_SUBJECT)
DB Tables:        plural_snake_case   (question_attempts, mock_exams)
DB Columns:       snake_case          (question_text, created_at)
API URLs:         /kebab-case         (/api/v1/mock-exams/:id/start)
API JSON:         camelCase           ({ "questionText": "..." })
Env Vars:         UPPER_SNAKE_CASE    (DATABASE_URL, JWT_ACCESS_SECRET)
React Components: PascalCase.tsx      (QuestionCard.tsx, ExamTimer.tsx)
React Hooks:      use{Name}.ts        (useAuth.ts, useQuestions.ts)
```
