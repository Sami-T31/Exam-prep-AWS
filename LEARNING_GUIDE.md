# Ethiopian Exam Prep App — Learning Guide

This document explains every major concept, tool, and decision in this project. It's written for someone with limited experience in web development and backend engineering. If something below is still unclear, it likely means the explanation needs improving — ask.

---

## Table of Contents

1. [The Big Picture](#1-the-big-picture)
2. [Tools and Technologies](#2-tools-and-technologies)
3. [Checkpoint 0: Project Structure and Monorepo](#3-checkpoint-0-project-structure-and-monorepo)
4. [Checkpoint 1A: NestJS Project Setup](#4-checkpoint-1a-nestjs-project-setup)
5. [Checkpoint 1B: Prisma Schema and Database](#5-checkpoint-1b-prisma-schema-and-database)
6. [Checkpoint 1C: Seed Data](#6-checkpoint-1c-seed-data)
7. [Checkpoint 2: Authentication System](#7-checkpoint-2-authentication-system)
8. [Checkpoint 3: Core Content API](#8-checkpoint-3-core-content-api)
9. [Checkpoint 4: Mock Exams, Bookmarks, and Progress](#9-checkpoint-4-mock-exams-bookmarks-and-progress)
10. [Checkpoint 5: Leaderboard, Subscriptions, and Payments](#10-checkpoint-5-leaderboard-subscriptions-and-payments)
11. [Checkpoint 6: Next.js Web App — Setup and Design System](#11-checkpoint-6-nextjs-web-app--setup-and-design-system)
12. [Checkpoint 7: Next.js Web App — Authentication Pages](#12-checkpoint-7-nextjs-web-app--authentication-pages)
13. [Checkpoint 8: Next.js Web App — Dashboard and Content Browsing](#13-checkpoint-8-nextjs-web-app--dashboard-and-content-browsing)
14. [Checkpoint 9: Next.js Web App — Question Practice Interface](#14-checkpoint-9-nextjs-web-app--question-practice-interface)
15. [Checkpoint 10: Next.js Web App — Mock Exams](#15-checkpoint-10-nextjs-web-app--mock-exams)
16. [Checkpoint 11: Next.js Web App — Progress, Bookmarks, Leaderboard](#16-checkpoint-11-nextjs-web-app--progress-bookmarks-leaderboard)
17. [Checkpoint 12: Next.js Web App — Subscription and Payment UI](#17-checkpoint-12-nextjs-web-app--subscription-and-payment-ui)
18. [Checkpoint 13: Admin Dashboard](#18-checkpoint-13-admin-dashboard)
19. [Checkpoint 14: Analytics and Data Governance](#19-checkpoint-14-analytics-and-data-governance)
20. [Checkpoint 17: Security Hardening](#20-checkpoint-17-security-hardening)
21. [Checkpoint 18: Performance Optimization](#21-checkpoint-18-performance-optimization)
22. [Checkpoint 19: Testing](#22-checkpoint-19-testing)
23. [Common Patterns in This Codebase](#23-common-patterns-in-this-codebase)
24. [Naming Conventions Reference](#24-naming-conventions-reference)
25. [Glossary](#25-glossary)

---

## 1. The Big Picture

### What are we building?

A platform that helps Ethiopian students prepare for the 12th Grade National Exam. Students select a stream (Natural Science or Social Science), browse subjects and topics by grade level (9–12), practice questions, see explanations, and track their progress.

### How does a web application work?

A web app has three layers:

```
[ Browser (Frontend) ]  ←→  [ Server (Backend API) ]  ←→  [ Database ]
```

- **Frontend**: What the user sees and interacts with (buttons, pages, forms). Built with Next.js (React).
- **Backend API**: The "brain" that processes requests. When a user clicks "Submit Answer," the browser sends a request to the backend, which checks the answer, records it, and sends back the result.
- **Database**: Where all data lives permanently — user accounts, questions, scores, etc.

The frontend and backend communicate over **HTTP** — the same protocol your browser uses to load websites. The backend exposes **endpoints** (URLs) that the frontend calls. For example:

| Action | HTTP Method | Endpoint | What it does |
|---|---|---|---|
| Browse subjects | GET | `/api/v1/subjects` | Returns list of all subjects |
| Answer a question | POST | `/api/v1/questions/:id/attempt` | Records the answer, returns result |
| Register | POST | `/api/v1/auth/register` | Creates a new user account |

**GET** = "give me data" (reading). **POST** = "here's some data, do something with it" (creating/submitting). **PATCH** = "update part of something." **DELETE** = "remove something."

---

## 2. Tools and Technologies

### TypeScript

JavaScript with type safety. In regular JavaScript, you can accidentally pass a number where a string was expected and your app crashes at runtime. TypeScript catches these mistakes at *build time* (before the code runs).

```typescript
// JavaScript — this runs but crashes later
function greet(name) {
  return name.toUpperCase(); // crashes if name is 42
}

// TypeScript — this is caught immediately
function greet(name: string): string {
  return name.toUpperCase(); // TypeScript won't let you pass 42
}
```

### Node.js

JavaScript was originally built to run only in web browsers. Node.js lets JavaScript run on a server (your computer or a cloud machine). Our entire backend is JavaScript/TypeScript running on Node.js.

### NestJS

A framework for building backend APIs with Node.js. It provides structure and conventions so that code is organized consistently. NestJS uses three core building blocks:

- **Module**: A container that groups related functionality (e.g., `AuthModule` contains everything about authentication).
- **Controller**: Receives HTTP requests and routes them to the right function. It's the "front door."
- **Service**: Contains the actual business logic — database queries, calculations, validations. The controller calls the service.

```
HTTP Request → Controller (routing) → Service (logic) → Database
                                    ← Service (result) ←
HTTP Response ← Controller (formatting)
```

### PostgreSQL

A relational database. Data is stored in **tables** (like spreadsheets). Each table has **columns** (fields) and **rows** (records). Tables can reference each other — for example, a Question row points to the Topic it belongs to.

### Prisma

An **ORM** (Object-Relational Mapper) — a tool that lets you interact with the database using TypeScript instead of writing raw SQL queries. You define your data models in a `schema.prisma` file, and Prisma generates TypeScript code that gives you type-safe functions like:

```typescript
// Instead of writing SQL: SELECT * FROM "Subject" WHERE id = 5
const subject = await prisma.subject.findUnique({ where: { id: 5 } });
```

### Redis

An in-memory data store — much faster than PostgreSQL for temporary data. We use it for things like caching, session management, and leaderboards (future checkpoint).

### Docker

A tool that runs applications in isolated **containers**. Instead of installing PostgreSQL and Redis directly on your computer (which can conflict with other projects), Docker runs them in their own little environments. `docker-compose.yml` defines what containers to run and how to configure them.

### JWT (JSON Web Tokens)

The mechanism we use for authentication. When a user logs in, the server creates a small, cryptographically signed token containing the user's ID and role. The browser includes this token in every subsequent request so the server knows who's asking.

```
Login → Server creates JWT → Browser stores it → Browser sends it with every request
```

### npm (Node Package Manager)

Manages third-party libraries (called "packages" or "dependencies"). Instead of writing everything from scratch, we install packages for common tasks — password hashing, JWT signing, database access, etc.

---

## 3. Checkpoint 0: Project Structure and Monorepo

### What is a monorepo?

A single repository that contains multiple related projects:

```
exam-prep-app/
├── backend/          ← NestJS API server
├── web/              ← Next.js web frontend (future)
├── admin/            ← Admin dashboard (future)
├── packages/
│   └── shared/       ← Code shared between all projects
├── docker-compose.yml
├── package.json      ← Root config (npm workspaces)
└── .env              ← Environment variables
```

The alternative would be separate repositories for frontend and backend. A monorepo is better here because:

- The frontend and backend share TypeScript types (e.g., the `Question` interface is defined once in `packages/shared` and used by both).
- One command (`docker compose up`) starts all development services.
- Changes that span both frontend and backend are in a single commit.

### npm Workspaces

The root `package.json` declares workspaces:

```json
{
  "workspaces": ["backend", "web", "admin", "packages/*"]
}
```

This tells npm that each folder is a separate project, but they share a single `node_modules` directory at the root. When `backend` depends on `@exam-prep/shared`, npm links it directly instead of downloading from the internet.

### Environment Variables (.env)

Sensitive configuration (database passwords, API keys, secret tokens) is stored in a `.env` file that is **never committed to git**. The `.env.example` file shows what variables are needed without revealing actual values.

```
DATABASE_URL=postgresql://user:password@localhost:5433/exam_prep_db
JWT_ACCESS_SECRET=your-secret-here
```

The code reads these at runtime using `process.env.DATABASE_URL`. This means you can change database credentials without modifying any code.

### Docker Compose

`docker-compose.yml` defines our development services:

```yaml
services:
  postgres:
    image: postgres:16-alpine    # Official PostgreSQL image
    ports:
      - "5433:5432"              # Host port 5433 → container port 5432
    environment:
      POSTGRES_DB: exam_prep_db
      POSTGRES_USER: exam_prep_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

`docker compose up -d` starts PostgreSQL and Redis in the background. `docker compose down` stops them.

---

## 4. Checkpoint 1A: NestJS Project Setup

### Application Entry Point (main.ts)

`main.ts` is where the application starts. It:

1. Creates the NestJS application
2. Configures security (Helmet, CORS)
3. Sets up validation (ValidationPipe)
4. Starts listening for HTTP requests on port 3001

**Helmet**: Adds security-related HTTP headers to every response. These headers tell browsers to enable protections against common attacks like clickjacking and MIME type sniffing.

**CORS (Cross-Origin Resource Sharing)**: By default, a browser blocks requests from one domain to another (e.g., `localhost:3000` calling `localhost:3001`). CORS tells the browser which origins are allowed.

**ValidationPipe**: Automatically validates incoming request data against DTO rules. If validation fails, the request is rejected with a 400 error before your controller code runs.

**Global Prefix**: All routes start with `/api/v1`. The `v1` is API versioning — if we make breaking changes later, we create `v2` without breaking existing clients.

### Modules (app.module.ts)

`AppModule` is the root module. It imports all other modules:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ ... }),   // Environment variable management
    PrismaModule,                    // Database access
    AuthModule,                      // Authentication
    StreamsModule,                   // Content: streams
    SubjectsModule,                  // Content: subjects
    GradesModule,                    // Content: grades
    TopicsModule,                    // Content: topics
    QuestionsModule,                 // Content: questions
    ThrottlerModule.forRoot({ ... }) // Rate limiting
  ],
})
```

NestJS reads this tree of imports to know what controllers and services exist.

### Rate Limiting (ThrottlerModule)

Prevents abuse by limiting how many requests a single client can make. Our default is 100 requests per 60 seconds. This stops someone from writing a script that hammers our API with thousands of requests per second.

### Request ID Middleware

Every incoming request gets a unique ID (`X-Request-Id` header). This is invaluable for debugging — if a user reports an error, the request ID lets you find the exact request in your server logs.

---

## 5. Checkpoint 1B: Prisma Schema and Database

### The Schema File (schema.prisma)

This file is the "blueprint" of our database. Every table, column, and relationship is defined here.

```prisma
model Subject {
  id      Int     @id @default(autoincrement())
  name    String  @unique
  icon    String?

  streams SubjectStream[]    // Many-to-many with Stream
  topics  Topic[]            // One-to-many with Topic
}
```

Key concepts:

- **`@id`**: This column is the primary key (unique identifier for each row).
- **`@default(autoincrement())`**: The database automatically assigns the next number (1, 2, 3...).
- **`@unique`**: No two rows can have the same value in this column.
- **`String?`**: The `?` means this field is optional (can be null).
- **Relations**: `Topic[]` means a Subject can have many Topics. Prisma uses these to generate JOIN queries.

### Migrations

When you change the schema, Prisma creates a **migration** — a SQL script that alters the database to match the new schema. This is version control for your database structure.

```bash
npx prisma migrate dev --name add_subjects_table
```

This generates a timestamped migration file and applies it. On a team, everyone runs the same migrations to keep their local databases identical.

### Many-to-Many Relationships

Some subjects belong to multiple streams (Mathematics is in both Natural Science and Social Science). This requires a **join table**:

```
Stream ←→ SubjectStream ←→ Subject
```

The `SubjectStream` table has two columns: `streamId` and `subjectId`. Each row represents one link between a stream and a subject.

### Soft Deletes

Instead of permanently removing a question from the database (`DELETE FROM questions WHERE id = ...`), we set a `deletedAt` timestamp. The question still exists but is filtered out of all queries. This preserves historical data (e.g., "how many questions were answered before it was removed?") and allows recovery if something was deleted by mistake.

---

## 6. Checkpoint 1C: Seed Data

### What is Seeding?

Seeding inserts initial data that the application needs to function. Our seed script (`prisma/seed.ts`) creates:

- 2 Streams (Natural Science, Social Science)
- 4 Grades (9, 10, 11, 12)
- 11 Subjects (Mathematics, Physics, Chemistry, etc.)
- 25 Topics for Grade 12
- 5 Sample Questions with options

### Idempotent Seeding

The seed script uses **`upsert`** instead of `create`:

```typescript
await prisma.stream.upsert({
  where: { slug: 'NATURAL_SCIENCE' },
  update: { name: 'Natural Science' },
  create: { name: 'Natural Science', slug: 'NATURAL_SCIENCE' },
});
```

**Upsert** = "update if it exists, create if it doesn't." This means you can run the seed script multiple times without creating duplicate data. This is important because during development you'll restart your database frequently.

---

## 7. Checkpoint 2: Authentication System

### How Authentication Works (Step by Step)

**Registration:**

1. User sends: `{ name, email, phone, password }`
2. Server hashes the password with bcrypt (one-way transformation — you can't reverse it)
3. Server stores the user with the hashed password
4. Server creates a JWT access token (short-lived, 15 minutes) and a refresh token (longer-lived, 7 days)
5. Server returns both tokens to the client

**Login:**

1. User sends: `{ email, password }`
2. Server finds the user by email
3. Server compares the provided password against the stored hash using `bcrypt.compare()`
4. If they match → create new tokens and return them
5. If they don't match → return "Invalid credentials" (same message whether email doesn't exist or password is wrong — this prevents attackers from discovering which emails are registered)

**Accessing Protected Routes:**

1. Browser includes the access token in the `Authorization` header: `Bearer eyJhbG...`
2. The `JwtAuthGuard` intercepts every request (globally)
3. It checks if the route is marked `@Public()` — if so, skip auth
4. It extracts the token, verifies its signature and expiry
5. If valid, it attaches the user's ID and role to `request.user`
6. The controller can then use `@CurrentUser()` to access this info

**Token Refresh:**

Access tokens expire after 15 minutes for security. Instead of making users log in again, the refresh token is used to get a new access token silently:

1. Client sends the refresh token to `POST /auth/refresh`
2. Server verifies the refresh token exists in the database and hasn't expired
3. Server **deletes the old refresh token** and creates a new pair (rotation)
4. Returns new access + refresh tokens

Token rotation means: if someone steals your refresh token and uses it, the original token gets invalidated. The next time you try to use your (now-deleted) token, it fails, alerting you that something is wrong.

### Password Hashing

We never store passwords in plain text. `bcrypt` applies a one-way hash:

```
"MyPassword123!" → "$2b$12$LJ3m5R8Gk...."
```

Even if the database is stolen, attackers can't reverse the hash to get the original password. The `12` in `$2b$12$` is the "cost factor" — it controls how computationally expensive the hash is, making brute-force attacks impractical.

### Guards and Decorators

NestJS uses **decorators** (the `@` symbols) to add behavior to classes and methods:

- **`@Public()`**: Marks a route as accessible without authentication.
- **`@Roles('ADMIN')`**: Restricts a route to users with a specific role.
- **`@CurrentUser()`**: Extracts the authenticated user's info from the request.

**Guards** are middleware that run before a controller method:

```
Request → ThrottlerGuard (rate limit) → JwtAuthGuard (auth check) → RolesGuard (role check) → Controller
```

If any guard rejects the request, the controller never runs.

---

## 8. Checkpoint 3: Core Content API

### The Content Hierarchy

The data model for educational content follows a tree structure:

```
Stream (e.g., Natural Science)
  └── Subject (e.g., Physics)
       └── Topic (e.g., Electromagnetism, per grade)
            └── Question (with 4 options)
```

Each level has its own NestJS module with a controller and service.

### Module Structure Pattern

Every content module follows the same three-file pattern:

```
streams/
  ├── streams.controller.ts   ← Handles HTTP requests
  ├── streams.service.ts      ← Business logic + database queries
  └── streams.module.ts       ← Wires controller and service together
```

**Why separate controller and service?**

- **Testability**: You can test the service without making HTTP requests.
- **Reusability**: Multiple controllers can call the same service.
- **Clarity**: The controller only deals with HTTP concerns (status codes, headers). The service only deals with data logic.

### Streams Module

The simplest module. One endpoint: `GET /streams` returns both streams with their subjects nested inside.

**Key concept — Prisma `include`:**

```typescript
const streams = await this.prisma.stream.findMany({
  include: {
    subjects: {
      include: { subject: true },
    },
  },
});
```

`include` tells Prisma to fetch related records in the same query. Without it, you'd only get the stream rows. With it, Prisma automatically JOINs the SubjectStream and Subject tables.

### Subjects Module

Two endpoints:
- `GET /subjects` — List all subjects with their stream memberships
- `GET /subjects/:id` — Get a single subject with all its topics

**Key concept — URL parameters:**

In `/subjects/:id`, the `:id` is a **route parameter**. When someone requests `/subjects/5`, NestJS extracts `5` and passes it to the controller method.

**`ParseIntPipe`** converts the string `"5"` to the number `5`. If someone requests `/subjects/abc`, it automatically returns a 400 error.

**`NotFoundException`** — when a subject with the given ID doesn't exist, we throw this exception. NestJS catches it and returns a 404 HTTP response.

### Topics Module

One endpoint: `GET /subjects/:subjectId/topics?grade=4`

**Key concept — Query parameters:**

Query parameters come after `?` in the URL. They're optional filters:
- `/subjects/1/topics` → all topics for subject 1
- `/subjects/1/topics?grade=4` → only grade 12 topics for subject 1

```typescript
async findBySubject(subjectId: number, gradeId?: number) {
  return this.prisma.topic.findMany({
    where: {
      subjectId,
      ...(gradeId !== undefined ? { gradeId } : {}),
    },
  });
}
```

The spread operator `...` conditionally adds the `gradeId` filter. If `gradeId` is undefined (parameter wasn't provided), nothing is added and Prisma returns all grades.

### Questions Module — Student Endpoints

Three endpoints:

**`GET /questions`** — Browse questions with pagination and filters.

**Key concept — Pagination:**

When you have 10,000 questions, you can't return them all at once. Pagination returns them in pages:

```
GET /questions?limit=20&offset=0   → Questions 1-20
GET /questions?limit=20&offset=20  → Questions 21-40
GET /questions?limit=20&offset=40  → Questions 41-60
```

The response includes `total` so the frontend knows how many pages exist:

```json
{
  "data": [...],
  "total": 10000,
  "limit": 20,
  "offset": 0
}
```

**`GET /questions/:id`** — Get a single question.

The response deliberately **excludes** `isCorrect` from the options. If the frontend could see which answer is correct before the user submits, it would defeat the purpose of the quiz.

**`POST /questions/:id/attempt`** — Submit an answer (requires authentication).

This is the only question endpoint that requires a logged-in user, because we need to know *who* is answering to track their progress. The response reveals the correct answer and explanation.

### Questions Module — Admin Endpoints

Four endpoints behind `@Roles('ADMIN')`:

**`POST /admin/questions`** — Create a new question with 4 options.

**Key concept — Nested creation:**

```typescript
await prisma.question.create({
  data: {
    questionText: '...',
    options: {
      create: [
        { optionLabel: 'A', optionText: '...', isCorrect: true },
        { optionLabel: 'B', optionText: '...', isCorrect: false },
        // ...
      ],
    },
  },
});
```

Prisma's `create` within `create` inserts the question and all 4 options in a **single transaction**. If any part fails, nothing is saved — you won't end up with a question that has only 2 options.

**`PATCH /admin/questions/:id`** — Partial update.

Uses `PartialType(CreateQuestionDto)` — NestJS takes the creation DTO and makes every field optional. You only send the fields you want to change.

**`DELETE /admin/questions/:id`** — Soft delete (sets `deletedAt` timestamp).

**`POST /admin/questions/bulk-import`** — Upload a CSV file with many questions at once.

**Key concept — File Upload:**

The `@UseInterceptors(FileInterceptor('file'))` decorator tells NestJS to use `multer` (a middleware) to handle the file upload. The CSV file arrives as a binary buffer, which we convert to text and parse line by line.

**CSV format:**

```csv
questionText,difficulty,topicId,gradeId,optionA,optionB,optionC,optionD,correctOption,explanation
"What is 2+2?",EASY,1,4,3,4,5,6,B,"2+2 equals 4"
```

Each row creates one question. Errors are reported per-row so that valid rows still import even if some rows have problems.

### DTOs (Data Transfer Objects)

DTOs define the exact shape of data the API accepts. They use decorators from `class-validator`:

```typescript
export class SubmitAnswerDto {
  @IsUUID()                  // Must be a valid UUID string
  selectedOptionId!: string;

  @IsInt()                   // Must be a whole number
  @Min(0)                    // Cannot be negative
  @Max(3600)                 // Maximum 1 hour
  timeSpentSeconds!: number;
}
```

The `!` after property names is a TypeScript **definite assignment assertion**. It tells TypeScript "trust me, this will be assigned" — NestJS populates these properties from the request body before the controller runs.

If a request doesn't match the DTO (e.g., `timeSpentSeconds: "abc"`), NestJS returns a 400 error with details about what's wrong, and the controller code never executes.

---

## 9. Checkpoint 4: Mock Exams, Bookmarks, and Progress

This checkpoint adds three features that make the app feel like a real product rather than just a data browser. Students can now take practice exams, save questions, and track their improvement over time.

### Bookmarks Module

**What problem does it solve?**

When studying, you often find a question you want to revisit later — maybe it was hard, or you got it wrong and want to try again. Bookmarks are a simple "save for later" feature, similar to favorites or starred items.

**How it works:**

- `POST /bookmarks` — Save a question. The request body only needs `{ questionId: "..." }`. The server knows *who* is bookmarking from the JWT token.
- `GET /bookmarks` — List your saved questions. Includes the full question data (text, topic, subject) so the frontend doesn't need a second request.
- `DELETE /bookmarks/:id` — Remove a bookmark.

**Key concept — Unique constraints and conflict handling:**

The database has a unique constraint on `(userId, questionId)` — the same user can't bookmark the same question twice. When they try, Prisma throws a `P2002` error code. We catch that specific error and return a `409 Conflict` HTTP status instead of letting it crash with a generic `500 Internal Server Error`.

```typescript
try {
  return await this.prisma.bookmark.create({ data: { userId, questionId } });
} catch (error) {
  if (error.code === 'P2002') {
    throw new ConflictException('Question is already bookmarked');
  }
  throw error;
}
```

This pattern — catching database constraint violations and translating them to meaningful HTTP errors — is common in API development.

**Key concept — Ownership verification:**

When deleting a bookmark, we verify the bookmark belongs to the requesting user. Without this check, User A could delete User B's bookmarks by guessing the bookmark UUID. This is called **authorization** (as opposed to authentication): checking not just *who* you are, but *whether you're allowed* to do what you're asking.

### Progress & Stats Module

**What problem does it solve?**

Students need feedback on how they're doing. Are they improving? Which subjects are they strong in? Which topics need more practice? This module aggregates data from all their question attempts into meaningful statistics.

**Endpoints:**

- `GET /users/me/stats` — Overall summary: total attempts, correct count, accuracy percentage, current daily streak.
- `GET /users/me/stats/subjects` — Per-subject breakdown: how accurate they are in Mathematics vs. Physics vs. Chemistry, etc.
- `GET /users/me/stats/subjects/:subjectId` — Drill down into a subject: accuracy per topic within that subject.
- `GET /users/me/stats/weak-topics?threshold=50` — Topics where accuracy is below a threshold (default 50%). Useful for "study recommendations."

**Key concept — Why `/users/me/stats` instead of `/users/:userId/stats`?**

Using `me` in the URL means "the currently authenticated user." This has three advantages:
1. **Privacy**: Users can only see their own stats. No need to check if the `:userId` matches the token.
2. **Simplicity**: The frontend never needs to know the user's UUID for this purpose.
3. **Security**: No risk of someone changing the URL to view another user's data.

**Key concept — Raw SQL queries:**

Most of our database calls use Prisma's built-in methods (`findMany`, `count`, `create`). But for the stats endpoints, we need to `GROUP BY` across multiple joined tables (QuestionAttempt → Question → Topic → Subject). Prisma's `groupBy` feature doesn't support grouping through nested relations, so we use raw SQL:

```typescript
const results = await this.prisma.$queryRaw`
  SELECT
    s.name AS subject_name,
    COUNT(qa.id) AS total,
    COUNT(qa.id) FILTER (WHERE qa.is_correct = true) AS correct
  FROM question_attempts qa
  JOIN questions q ON qa.question_id = q.id
  JOIN topics t ON q.topic_id = t.id
  JOIN subjects s ON t.subject_id = s.id
  WHERE qa.user_id = ${userId}
  GROUP BY s.id, s.name
`;
```

Key SQL concepts in this query:
- **`JOIN`**: Combines rows from multiple tables based on matching columns. `JOIN questions q ON qa.question_id = q.id` connects each attempt to its question.
- **`GROUP BY`**: Collapses many rows into summary rows. All attempts for the same subject are grouped, and `COUNT()` tallies them.
- **`FILTER (WHERE ...)`**: PostgreSQL-specific syntax that counts only rows matching a condition. This lets us count *all* attempts and *correct* attempts in the same query.
- **Template literal `${userId}`**: Prisma's tagged template safely escapes the variable to prevent SQL injection attacks.

**Key concept — Streak calculation:**

A "streak" is the number of consecutive calendar days the student practiced. The algorithm:
1. Get all unique dates the user has attempts on, sorted newest first.
2. Check if the most recent date is today or yesterday (if neither, streak is 0).
3. Walk backward through the dates. Each time the gap is exactly 1 day, increment the streak. The moment there's a gap of 2+ days, stop.

This is a good example of application logic that's simpler to implement in TypeScript than in SQL.

### Mock Exams Module

**What problem does it solve?**

Practice questions one-by-one are helpful, but the real national exam is a *timed test* with a fixed number of questions. Mock exams simulate that experience so students can practice under realistic conditions.

**The lifecycle of a mock exam:**

```
1. Admin creates exam → selects questions, sets time limit
2. Student starts exam → gets questions (answers hidden), timer starts
3. Student answers all questions
4. Student submits → server scores, saves results
5. Student reviews → sees correct answers + explanations
```

**Key concept — Server-side time enforcement:**

The time limit is enforced on the server, not the client. Why? Because client-side timers can be tampered with (pausing the browser's JavaScript, modifying the timer variable in dev tools). When the student starts an exam, we record `startedAt` in the database. When they submit, we calculate:

```typescript
const elapsedSeconds = (Date.now() - attempt.startedAt.getTime()) / 1000;
const allowedSeconds = exam.durationMinutes * 60 + GRACE_BUFFER_SECONDS;

if (elapsedSeconds > allowedSeconds) {
  throw new BadRequestException('Time limit exceeded');
}
```

The 30-second grace buffer accounts for network latency — it would be frustrating to finish at 29:59 and have the submission fail because it took 2 seconds to reach the server.

**Key concept — Bulk answer submission:**

Unlike individual practice questions (submitted one at a time), mock exam answers are submitted all at once. The DTO accepts an array:

```typescript
{
  answers: [
    { questionId: "...", selectedOptionId: "..." },
    { questionId: "...", selectedOptionId: "..." },
    // ... all questions
  ],
  timeSpentSeconds: 1450
}
```

All QuestionAttempt records are created inside a database transaction. If any part of the scoring fails, nothing is saved — you won't end up with a partially scored exam.

**Key concept — Random question selection:**

When an admin creates a mock exam without specifying exact question IDs, the server randomly selects published questions matching the subject and grade:

```sql
SELECT q.id FROM questions q
JOIN topics t ON q.topic_id = t.id
WHERE q.status = 'PUBLISHED' AND q.deleted_at IS NULL
  AND t.subject_id = $1 AND q.grade_id = $2
ORDER BY RANDOM()
LIMIT $3
```

`ORDER BY RANDOM()` is PostgreSQL's way of shuffling rows. `LIMIT` takes the first N from the shuffled result. This is straightforward and adequate for our data size (thousands of questions). For millions of rows, more efficient random sampling algorithms exist, but that's premature optimization at this stage.

**Key concept — Review vs. active exam security:**

During the exam (between start and submit), the API only returns option text — `isCorrect` is excluded. After submission, the review endpoint includes `isCorrect` and `explanation` for every question. This is the same pattern from Checkpoint 3 (individual questions), but applied across a whole exam.

---

## 10. Checkpoint 5: Leaderboard, Subscriptions, and Payments

This checkpoint introduces three new architectural concepts that don't exist in the earlier checkpoints: a second data store (Redis), event-driven communication between modules, and scheduled background tasks. It also implements the business model — how the app makes money.

### Redis and Why We Need a Second Database

PostgreSQL is great for structured, permanent data (users, questions, attempts). But leaderboards have different requirements:

- **Extremely frequent updates**: Every correct answer updates a score.
- **Ranked queries**: "Who has the highest score?" needs to be instant.
- **Temporary data**: Weekly leaderboards get reset every Monday.

PostgreSQL can do all this, but Redis does it orders of magnitude faster for this specific use case. Redis stores everything in RAM (memory) rather than on disk, and its Sorted Set data structure is purpose-built for ranking.

**Redis Sorted Sets** work like a dictionary where each entry has a numeric score, and Redis automatically keeps entries sorted by score:

```
ZINCRBY leaderboard:weekly:all 1 "user-123"   → Adds 1 point to user-123's score
ZREVRANGE leaderboard:weekly:all 0 9          → Returns top 10 users (highest first)
ZREVRANK leaderboard:weekly:all "user-123"    → Returns user-123's rank (0-indexed)
```

Our `RedisModule` wraps the `ioredis` library as a global injectable service, just like `PrismaModule` wraps the PostgreSQL connection. Any module that needs Redis just adds `RedisService` to its constructor.

### Event-Driven Architecture

When a student answers a question correctly, multiple things need to happen:
1. Record the attempt in PostgreSQL (QuestionsService)
2. Update the leaderboard in Redis (LeaderboardService)
3. *(Future)* Send a notification, update an achievement, etc.

The naive approach is to call the LeaderboardService directly from QuestionsService:

```typescript
// BAD: tight coupling
class QuestionsService {
  constructor(
    private prisma: PrismaService,
    private leaderboard: LeaderboardService, // QuestionsService shouldn't know about this
  ) {}
}
```

This creates "tight coupling" — the questions module depends on the leaderboard module. If we add 10 more features that react to question attempts, the QuestionsService would need 10 new dependencies. Instead, we use **events**:

```typescript
// GOOD: loose coupling via events
class QuestionsService {
  constructor(private eventEmitter: EventEmitter2) {}

  async submitAnswer(...) {
    // ... save attempt ...
    this.eventEmitter.emit('question.attempted', new QuestionAttemptedEvent(...));
  }
}

class LeaderboardService {
  @OnEvent('question.attempted')
  handleAttempt(event: QuestionAttemptedEvent) {
    if (event.isCorrect) {
      this.incrementScore(event.userId, event.subjectId);
    }
  }
}
```

The QuestionsService doesn't know (or care) who's listening. The LeaderboardService doesn't know (or care) who emitted the event. They communicate through a shared event name. This is the **Observer pattern**.

NestJS's `@nestjs/event-emitter` package provides `EventEmitter2` (emit events) and `@OnEvent` (listen for events).

### Scheduled Tasks (Cron Jobs)

The weekly leaderboard resets every Monday at midnight. We don't want a human to remember to do this — it should be automatic. NestJS's `@nestjs/schedule` package provides `@Cron` decorators:

```typescript
@Cron(CronExpression.EVERY_WEEK)
async resetWeekly() {
  // Persist current standings to PostgreSQL for historical records
  // Then clear the Redis sorted sets
}
```

**Cron expressions** are a standard format for specifying schedules. `EVERY_WEEK` runs at midnight on Monday. `EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT` runs on the 1st of each month. The format originates from Unix systems and is used across nearly all programming languages and platforms.

Before clearing the Redis data, we persist the final standings to PostgreSQL's `LeaderboardEntry` table. This way, even after the weekly board resets, we have a permanent record of past rankings for analytics.

### Subscriptions Module

**The business model:**

Users get a limited number of free questions per subject (currently 10 distinct questions). After that, they need a subscription for unlimited access. This is a common "freemium" model — give enough for free to demonstrate value, then charge for full access.

**Subscription status check:**

```typescript
async getStatus(userId: string) {
  const active = await prisma.subscription.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      expiresAt: { gt: new Date() }, // expiresAt must be in the future
    },
  });
  return { isSubscribed: !!active, plan: active?.plan, expiresAt: active?.expiresAt };
}
```

The `expiresAt: { gt: new Date() }` check means expired subscriptions are automatically treated as inactive without any background job. This is simpler and more reliable than running a cron job to mark expired subscriptions.

**The @Premium() decorator and SubscriptionGuard:**

Similar to how `@Roles('ADMIN')` restricts routes to admins, `@Premium()` restricts routes to subscribers. The `SubscriptionGuard` checks the user's subscription status before allowing access to premium endpoints:

```typescript
@Premium()
@Get('advanced-feature')
getAdvancedFeature() { ... }
```

Free-tier users get a `403 Forbidden` with a message directing them to subscribe.

**Free tier tracking:**

The service counts how many *distinct* questions the user has attempted per subject. Re-attempting the same question doesn't count against the limit. This prevents the limit from being artificially consumed by retries.

### Payments Module

**The payment lifecycle:**

```
1. User chooses plan + payment method → POST /payments/initiate
2. Server creates PENDING subscription + PENDING payment
3a. Telebirr/CBE Birr: Provider confirms → POST /payments/webhook → subscription activates
3b. Bank transfer: Admin verifies → POST /payments/:id/verify → subscription activates
```

**Why placeholder implementations for Telebirr/CBE Birr?**

These Ethiopian payment providers require merchant accounts with API credentials that need to be obtained through a business registration process. The code architecture is ready — when credentials arrive, the actual API calls slot into the existing flow. The current implementation logs a warning and returns a "pending integration" status.

The bank transfer flow works fully today: the user sees bank details, transfers money, and an admin confirms receipt.

**Webhook idempotency:**

Payment webhooks can be sent multiple times (the provider retries if it doesn't get an acknowledgment). Our handler checks if the payment is already processed:

```typescript
if (payment.status !== 'PENDING') {
  return { status: 'already_processed' }; // No double-activation
}
```

Without this check, a duplicate webhook could activate a subscription twice or corrupt the payment record.

**Admin payment verification:**

For bank transfers, an admin reviews the payment and either approves or rejects it. Approval activates the subscription. Rejection sets the payment to `FAILED` and the subscription to `CANCELLED`. Both actions are atomic (wrapped in a database transaction) so partial states are impossible.

---

## 11. Checkpoint 6: Next.js Web App — Setup and Design System

With the backend complete through five checkpoints, Checkpoint 6 shifts to the **frontend** — the visual application that users interact with in their browsers.

### 11.1 What Is the Frontend?

The **backend** is a server that processes data and talks to databases. Users never see it directly. The **frontend** is the application running in their web browser — the buttons they click, the forms they fill in, the pages they navigate. The frontend sends HTTP requests to the backend API and displays the responses in a human-readable way.

### 11.2 Why Next.js?

**React** is a JavaScript library for building user interfaces. It lets you compose pages from reusable components (buttons, cards, forms). But React alone doesn't handle routing (which URL shows which page), server-side rendering, or build optimization.

**Next.js** is a framework built on top of React that adds:

- **File-based routing**: Each file under `app/` becomes a URL. `app/login/page.tsx` → `/login`.
- **Server-side rendering (SSR)**: HTML is generated on the server for faster initial page loads.
- **Static generation**: Pages that don't change can be pre-built at deploy time.
- **Built-in code splitting**: Only the JavaScript needed for the current page is sent to the browser.
- **Image optimization, caching, and other production features**: Things that would otherwise require manual setup.

### 11.3 App Router and File-Based Routing

Next.js 16 uses the **App Router**, where each folder under `src/app/` represents a URL path:

```
src/app/
├── page.tsx          → /  (homepage)
├── login/
│   └── page.tsx      → /login
├── register/
│   └── page.tsx      → /register
├── dashboard/
│   └── page.tsx      → /dashboard
└── layout.tsx        → wraps ALL pages
```

The `layout.tsx` file wraps every page with shared UI (like the HTML structure, fonts, and providers). Unlike the `page.tsx` files, which change as you navigate, the layout persists across page transitions.

### 11.4 Server Components vs Client Components

In the App Router, components are **Server Components** by default. This means they run on the server and send pure HTML to the browser — no JavaScript overhead.

When a component needs **interactivity** (click handlers, useState, browser APIs), you mark it with `'use client'` at the top of the file. This makes it a **Client Component** — the JavaScript is sent to the browser and hydrated.

The rule of thumb: keep components as Server Components unless they need interactivity. This makes pages load faster.

### 11.5 Tailwind CSS

**Tailwind CSS** is a utility-first CSS framework. Instead of writing CSS in a separate file:

```css
/* Traditional CSS */
.button { background-color: green; padding: 8px 16px; border-radius: 8px; }
```

You apply small utility classes directly in the HTML:

```html
<!-- Tailwind approach -->
<button class="bg-emerald-600 px-4 py-2 rounded-lg">Click</button>
```

Each class does one thing: `bg-emerald-600` sets background color, `px-4` adds horizontal padding, `rounded-lg` rounds corners. This approach is faster to develop with because you never leave the component file to write CSS.

In Tailwind v4 (used here), configuration happens in the CSS file using `@theme` blocks rather than a `tailwind.config.ts` file.

### 11.6 The API Client (Axios)

**Axios** is an HTTP client library. It sends requests to our backend API. We create a single Axios instance configured with:

1. **Base URL**: All requests go to `http://localhost:3001/api/v1` (configured once).
2. **Request interceptor**: Automatically attaches the auth token to every request before it's sent.
3. **Response interceptor**: If the backend returns 401 (token expired), automatically attempts to refresh the token using the refresh token, then retries the original request.

This means individual components never have to worry about authentication or token management — the API client handles it transparently.

### 11.7 Token Refresh Flow

When a user logs in, they receive two tokens:

1. **Access token**: Short-lived (15 minutes). Used for API requests.
2. **Refresh token**: Long-lived (7 days). Used only to get a new access token.

The flow when a token expires:

```
1. Component makes API request with expired access token
2. Backend returns 401 Unauthorized
3. Response interceptor catches the 401
4. Interceptor sends refresh token to /auth/refresh
5. Backend validates refresh token, issues new pair
6. Interceptor stores new tokens
7. Interceptor retries the original request with the new token
8. Component receives data — it never knew the token expired
```

The `failedQueue` pattern handles a race condition: if multiple requests fail at once (all get 401), only one refresh attempt is made. The others wait in a queue and retry after the refresh completes.

### 11.8 Zustand State Management

**Zustand** is a state management library. State management answers the question: "How do different parts of the app share data?"

For example, the navigation bar needs to know if the user is logged in (to show "Log out" vs "Log in"). The dashboard needs the user's name. The API client needs the access token.

Zustand creates a **store** — a central object that holds this shared data and provides functions to change it. Any component can read from the store, and React automatically re-renders only the components that use the specific data that changed.

```typescript
// Reading from the store in a component:
const user = useAuthStore((state) => state.user);
const logout = useAuthStore((state) => state.logout);
```

Compared to Redux (another state management library), Zustand is simpler with less boilerplate code.

### 11.9 Token Storage: localStorage + Cookies

Tokens need to be stored in two places:

- **localStorage**: JavaScript can read it easily (for the API client's request interceptor).
- **Cookies**: The proxy (server-side code) can read it to decide if the user is authenticated.

Why both? localStorage is only accessible from client-side JavaScript. The proxy runs on the server before any JavaScript executes. So the proxy reads the cookie, and the API client reads localStorage. They're kept in sync by the `token-storage.ts` utility.

### 11.10 The Proxy (formerly Middleware)

Next.js 16 renamed "middleware" to **proxy**. The proxy runs on the server before any page starts rendering. It checks:

1. **Unauthenticated user visiting a protected page** (e.g., `/dashboard`): Redirect to `/login`.
2. **Authenticated user visiting a login/register page**: Redirect to `/dashboard` (they're already logged in).
3. **All other cases**: Let the request through.

This prevents the "flash of unauthorized content" — without the proxy, the dashboard would briefly render before JavaScript runs and realizes the user isn't logged in.

### 11.11 Reusable Component Library

Every application has common UI elements: buttons, input fields, cards, modals. Building them as reusable components with consistent styling means:

- **Consistency**: Every button in the app looks the same.
- **Speed**: New pages are assembled from existing building blocks.
- **Maintenance**: Changing a button's style in one file updates it everywhere.

Each component accepts **props** (parameters) to configure it. For example, the Button component accepts `variant` (primary/secondary/outline), `size` (sm/md/lg), and `isLoading` (shows a spinner).

### 11.12 Dark Mode with Tailwind

Tailwind's `dark:` prefix applies styles only when dark mode is active. For example:

```html
<div class="bg-white dark:bg-gray-800 text-black dark:text-white">
```

This renders white background with black text in light mode, and dark gray background with white text in dark mode. All our components include `dark:` variants from the start.

### 11.13 `clsx` for Conditional Classes

When a component needs different classes based on its state, string concatenation gets messy. `clsx` is a utility that cleanly merges class names:

```typescript
clsx(
  'base-styles always-applied',
  isActive && 'active-styles',       // only if isActive is true
  isDisabled && 'opacity-50',        // only if isDisabled is true
  variantStyles[variant],            // picks from a map
)
```

Only truthy values are included. This is cleaner and more readable than template literals.

### 11.14 Integral Additions

Several items not in the original checklist were necessary:

1. **Middleware → Proxy migration**: Next.js 16 renamed `middleware.ts` to `proxy.ts` and the `middleware()` export to `proxy()`. Same functionality, new name.
2. **Token storage utility**: Syncing tokens between localStorage (for API client) and cookies (for proxy) required a dedicated module.
3. **Landing page**: A homepage with hero section and feature highlights, serving as the public entry point.
4. **Placeholder auth pages**: Login, register, and dashboard pages needed to exist for routing and proxy redirects to work, even though full forms are in Checkpoint 7.
5. **Providers wrapper**: A Client Component that wraps the app with toast notifications and auth initialization, needed because the root layout is a Server Component.

---

## 12. Checkpoint 7: Next.js Web App — Authentication Pages

Checkpoint 7 builds the first interactive pages in the web app — the forms that let users create accounts, sign in, and recover passwords.

### 12.1 Login Page (`/login`)

The login page contains an email + password form connected to `POST /auth/login`. Key implementation details:

- **Client-side validation with Zod**: The form validates inputs before sending a request. `loginSchema` (from `@exam-prep/shared`) catches empty fields, invalid email formats, and short passwords before they reach the server.
- **Loading state management**: A boolean `isSubmitting` disables the submit button while the request is in flight, preventing duplicate login attempts.
- **Error handling**: Failed login attempts show a toast notification with the server's error message. The same "Invalid credentials" message is returned whether the email doesn't exist or the password is wrong (anti-enumeration — see Checkpoint 2).
- **Token storage**: On success, the auth store (`authStore.ts`) saves both tokens via `tokenStorage.ts`, which syncs localStorage (for the API client) and cookies (for the proxy).
- **"Remember me" option**: Controls whether tokens persist beyond the browser session.

**Naming conventions applied** (see [NAMING_CONVENTIONS.md](./NAMING_CONVENTIONS.md)):
- Page directory: `/login` (kebab-case, matches URL)
- Event handlers: `handleSubmit`, `handleLogin` (camelCase with `handle` prefix)
- State variables: `isSubmitting`, `isLoading` (boolean prefix `is`)
- Store file: `authStore.ts` (camelCase store naming)

### 12.2 Registration Page (`/register`)

Registration collects name, email, phone, password, and password confirmation:

- **Password strength indicator**: Visual feedback showing whether the password meets complexity requirements (uppercase, lowercase, digit, minimum length). Each requirement highlights green when satisfied.
- **Ethiopian phone validation**: The shared Zod schema enforces Ethiopian phone format (`+251`, `09`, `07` prefixes). This reuses `ETHIOPIAN_PHONE_REGEX` from the shared package (constant naming: `UPPER_SNAKE_CASE`).
- **Confirm password**: Client-side check that both password fields match before submission.
- **Terms of service checkbox**: Required before the form can be submitted.
- **Success flow**: After registration, the user is redirected to login (or auto-logged in, depending on configuration).

### 12.3 Forgot and Reset Password

Two pages work together:

1. **`/forgot-password`**: Accepts an email address and calls `POST /auth/forgot-password`. The server always returns 200 regardless of whether the email exists (anti-enumeration). A confirmation message is shown.
2. **`/reset-password?token=...`**: Reads the reset token from the URL query parameter, accepts a new password + confirmation, and calls `POST /auth/reset-password`. On success, the user is redirected to login.

### 12.4 Token Management

The token lifecycle is handled transparently:

- **Axios request interceptor**: Attaches the access token to every API request header.
- **Axios response interceptor**: On 401 responses, attempts to refresh the token using the stored refresh token. If refresh succeeds, retries the failed request. If refresh fails, clears tokens and redirects to login.
- **Logout**: Calls `POST /auth/logout` to invalidate the refresh token server-side, then clears all local storage.

---

## 13. Checkpoint 8: Next.js Web App — Dashboard and Content Browsing

Checkpoint 8 builds the pages students use most: their personal dashboard and the content browsing flow (streams → subjects → topics).

### 13.1 Dashboard Page (`/dashboard`)

The dashboard displays a personalized overview:

- **Welcome message**: Uses the user's name from the auth store.
- **Quick stats**: Today's attempts, overall accuracy, and current streak. These come from `GET /users/me/stats`.
- **Continue where you left off**: Shows the last subject and topic the user practiced, enabling one-click resumption.
- **Weak topics**: Surfaces topics where the user's accuracy is below 50%, linking directly to practice mode.
- **Suggestions**: Highlights available mock exams or subjects the user hasn't started.

Data fetching uses TanStack Query hooks (e.g., `useStats()`) that cache results and handle loading/error states automatically.

### 13.2 Stream and Subject Selection

- **Stream selector**: Radio or tab UI for choosing Natural Science or Social Science. Subjects filter based on the selected stream.
- **Subject grid**: Cards showing each subject's name, icon, and the user's progress (attempts and accuracy). Per convention, the component is `SubjectCard` (PascalCase), its props interface is `SubjectCardProps`.
- **Empty states**: If no data exists yet, a clear message with an icon and CTA encourages the user to start practicing.

### 13.3 Topics Page (`/subjects/[id]/topics`)

Displays topics for a selected subject, organized by grade:

- **Grade selector**: Tabs for grades 9–12. Selecting a grade filters topics.
- **Per-topic progress**: Each topic shows the user's attempt count and accuracy percentage.
- **Navigation**: Clicking a topic navigates to `/practice?topicId=X&gradeId=Y`.
- **Breadcrumbs**: `Dashboard > Subjects > [Subject Name] > Grade [N]` — provides spatial context and quick navigation.

### 13.4 Loading and Error States

Every data-fetching page implements three states consistently:

1. **Loading**: Skeleton placeholders (shimmer rectangles) that match the layout of the real content.
2. **Error**: An `ErrorView` component with the error message and a "Retry" button that calls `refetch()`.
3. **Data**: The actual content.

This pattern is enforced by TanStack Query's `{ data, isLoading, error, refetch }` return value.

**Naming conventions applied**:
- Route: `/subjects/[id]/topics` (Next.js dynamic route, kebab-case)
- Components: `SubjectCard.tsx`, `EmptyState.tsx` (PascalCase file naming)
- Hooks: `useSubjects.ts`, `useStats.ts` (camelCase hook naming)
- Query keys: Organized in `queryKeys.ts` with `[domain, ...params]` convention

---

## 14. Checkpoint 9: Next.js Web App — Question Practice Interface

Checkpoint 9 is the core learning experience — the screen where students actually answer questions and receive feedback.

### 14.1 Practice Flow

The practice page (`/practice?topicId=X&difficulty=Y`) implements a sequential question flow:

1. Load questions matching the filters from `GET /questions`
2. Display one question at a time with its four options (A, B, C, D) as selectable cards
3. User selects an option → "Submit" button becomes active
4. On submit → `POST /questions/:id/attempt` records the answer
5. After submission: correct answer highlighted green, wrong selection highlighted red, explanation text shown, time spent displayed
6. "Next Question" advances to the next question in the set
7. After the last question → session summary

### 14.2 Key UI Features

- **Question counter**: "Question 5 of 20" — progress through the set.
- **Difficulty badge**: Each question shows its difficulty (`EASY`, `MEDIUM`, `HARD`) as a colored badge. The difficulty value comes from the `Difficulty` enum in `@exam-prep/shared`.
- **Bookmark toggle**: A button on each question that calls `POST /bookmarks` or `DELETE /bookmarks/:id`.
- **Question images**: If a question has an associated image, it's displayed using Next.js `<Image>` for automatic optimization.
- **Difficulty filter**: Dropdown to filter questions by difficulty level, allowing focused practice.
- **Keyboard shortcuts**: `1-4` to select options, `Enter` to submit, `N` for next question.

### 14.3 Answer Finality

Once an answer is submitted, it cannot be changed. The option cards become non-interactive, the correct/incorrect highlighting is permanent, and the "Submit" button is replaced by "Next Question." This matches the real exam experience and prevents second-guessing.

### 14.4 Practice Session Summary

After completing all questions, a summary screen displays:

- **Score**: X out of Y correct, with accuracy percentage
- **Time**: Total time and average time per question
- **Review**: Option to review incorrect answers, showing the question, the user's answer, and the correct answer with explanation
- **Navigation**: "Continue Practicing" (loads more questions) or "Back to Topics"

**Naming conventions applied**:
- Query parameters: camelCase (`topicId`, `difficulty`) — matches API convention
- Event handlers: `handleAnswer`, `handleSubmit`, `handleNext` (camelCase with `handle` prefix)
- Component: `QuestionCard.tsx` (PascalCase)
- State: `selectedOption`, `isSubmitting`, `isAnswered` (boolean prefix)

---

## 15. Checkpoint 10: Next.js Web App — Mock Exams

Checkpoint 10 implements the timed exam experience that simulates the actual national exam.

### 15.1 Mock Exam Listing (`/mock-exams`)

The listing page shows available exams grouped by subject:

- Each card shows: title, subject, grade, question count, duration
- Past attempts are shown below each exam with the score achieved
- Data comes from `GET /mock-exams` and the user's attempt history

### 15.2 Starting an Exam

Before starting, a confirmation dialog explains the rules:

- Time limit is enforced (countdown timer)
- Questions can be navigated freely before submission
- Auto-submit occurs when the timer reaches zero
- No going back after final submission

"Start Exam" calls `POST /mock-exams/:id/start`, which creates a `MockExamAttempt` and returns the questions (without correct answers).

### 15.3 Exam In-Progress (`/mock-exams/[id]/attempt`)

The exam interface has several coordinated pieces:

- **Countdown timer**: Prominently displayed, counts down from the exam's duration. Uses `useEffect` with `setInterval` for accurate timing. When the timer hits zero, the exam auto-submits.
- **Question navigation panel**: Numbered buttons (1, 2, 3...) showing which questions are answered, unanswered, or flagged for review. Clicking a number jumps to that question.
- **Question display**: One question at a time with selectable options. Unlike practice mode, answers can be changed before final submission.
- **Flag for review**: A toggle on each question that marks it in the navigation panel, helping students identify questions they want to revisit.
- **Submit confirmation**: A dialog showing how many questions are unanswered, requiring explicit confirmation.
- **beforeunload warning**: Prevents accidental page navigation during an active exam.

### 15.4 State Persistence

If the browser refreshes during an exam, the state needs to survive. The approach:

- Answers are saved to `localStorage` as the user progresses (keyed by attempt ID)
- On page load, if an in-progress attempt exists, answers are restored from storage
- The timer is reconstructed from `attempt.startedAt` (server timestamp) minus current time

### 15.5 Results Page (`/mock-exams/attempts/[attemptId]`)

After submission (`POST /mock-exams/attempts/:id/submit`), the results page shows:

- **Score**: Prominently displayed with percentage and fraction (e.g., 35/50 = 70%)
- **Time analysis**: Time taken vs. time allowed
- **Per-question review**: Each question with the user's answer, correct answer, and explanation
- **Filter modes**: View all questions, incorrect only, or flagged only

**Naming conventions applied**:
- File: `mockExamSession.ts` (camelCase utility file)
- Hook: `useMockExams.ts` (camelCase hook file)
- Route: `/mock-exams` (kebab-case URL)
- State: `isSubmitting`, `hasUnanswered`, `isTimerRunning` (boolean prefixes)
- Constants: Timer values use `UPPER_SNAKE_CASE` where module-level

---

## 16. Checkpoint 11: Next.js Web App — Progress, Bookmarks, Leaderboard

Checkpoint 11 turns backend stats APIs into user-facing study workflows:

- `/progress` gives trend visibility (how much, how often, and where performance is weak).
- `/bookmarks` gives focused revision and fast cleanup of saved questions.
- `/leaderboard` gives motivation through rank and score comparison.

### 16.1 Progress Dashboard (`/progress`)

The page uses five endpoints in parallel:

- `GET /users/me/stats` for global counters (attempts, accuracy, streak).
- `GET /users/me/stats/subjects` for per-subject bars.
- `GET /users/me/stats/grades` for grade-level breakdown.
- `GET /users/me/stats/weak-topics` for targeted revision.
- `GET /users/me/stats/trend?days=14` for chart data.

Two backend additions were made for this checkpoint:

1. **Grade stats endpoint**: grouped attempts by question grade.
2. **Daily trend endpoint**: grouped attempts by UTC day, returning attempt count and accuracy.

The line chart overlays:

- Attempt volume (left axis)
- Daily accuracy percentage (right axis)

This makes it easy to spot effort vs performance gaps.

### 16.2 Bookmarks Page (`/bookmarks`)

The bookmarks UI supports:

- Filtering by subject and grade (`subjectId`, `gradeId` query parameters).
- Removing a bookmark directly from the list.
- Launching **Practice Bookmarked** mode.

To implement "practice only bookmarked questions," the practice page now supports:

- `?bookmarked=1` query mode
- Loading question IDs from `GET /bookmarks`
- Fetching each question through `GET /questions/:id`
- Applying difficulty filters on the bookmarked set

This avoids creating a separate practice engine and reuses the existing answer/feedback flow.

### 16.3 Leaderboard Page (`/leaderboard`)

The leaderboard page maps directly to `GET /leaderboard` and adds:

- Period selector: weekly, monthly, all-time
- Subject filter
- Ranked list with score
- "Your Rank" summary card
- "Load more" pagination via increasing `limit`

The current user row is visually highlighted so learners can locate themselves quickly in larger lists.

### 16.4 Naming and Structure Conventions (Applied)

For this checkpoint, naming conventions were kept consistent:

- Route folders are lowercase (`/progress`, `/bookmarks`, `/leaderboard`).
- Interface/type names in PascalCase (`OverallStats`, `LeaderboardResponse`).
- Variables and functions in camelCase (`selectedSubjectId`, `loadData`).
- Files follow existing app-router naming (`page.tsx`) and existing component import style.

This consistency keeps navigation, maintenance, and onboarding simpler across the monorepo.

---

## 17. Checkpoint 12: Next.js Web App — Subscription and Payment UI

Checkpoint 12 adds monetization UX while keeping the free-tier experience clear and respectful.

### 17.1 Subscribe Page (`/subscribe`)

The page pulls:

- `GET /subscriptions/plans` for plan cards
- `GET /subscriptions/status` for active/inactive state

Then starts payment with:

- `POST /payments/initiate`

The UI supports all configured methods:

- Telebirr
- CBE Birr
- Bank transfer

Because provider integrations are currently placeholders in backend, the UI emphasizes status messaging and next steps rather than pretending provider redirects already exist.

### 17.2 Payment Status and Edge Cases

After payment initiation, the frontend polls subscription status:

- Re-checks `GET /subscriptions/status` every few seconds
- Shows "Verifying payment..." state during polling
- Stops polling once subscription becomes active or timeout is reached

Edge-case handling implemented:

- Retry button after failed initiation
- Button disable during in-flight requests (prevents duplicate initiate clicks)
- Clear pending/verification messaging for delayed webhook scenarios

### 17.3 Subscription Account Page (`/account/subscription`)

This page combines:

- Current plan and expiry date (`GET /subscriptions/status`)
- Renewal/upgrade CTA to `/subscribe`
- Payment history (`GET /payments/history`)

This gives learners one place to see what they have paid for and whether access is still active.

### 17.4 Free-Tier Gating UX in Practice

The practice page now checks free-tier limits using:

- `GET /subscriptions/status`
- `GET /subscriptions/free-tier/:subjectId`

Behavior:

- If free quota remains: show a helpful upgrade prompt with remaining question count.
- If free quota is exhausted: show locked state with "Subscribe to access" and navigation back to topics.

Important: the prompt is informative rather than aggressive; free users can still navigate and understand exactly why access is restricted.

### 17.5 Naming and Convention Notes

Naming conventions stayed consistent:

- Route folders in lowercase (`/subscribe`, `/account/subscription`)
- Types and interfaces in PascalCase (`SubscriptionStatus`, `PaymentInitiateResponse`)
- Variables/functions in camelCase (`isVerifying`, `initiatePayment`)
- Reused existing shared UI components and style language from earlier checkpoints

---

## 18. Checkpoint 13: Admin Dashboard

Checkpoint 13 introduces a separate admin application and backend admin CRUD endpoints so content and payment operations no longer require direct database access.

### 18.1 Separate Admin App (`admin/`)

A new Next.js workspace was scaffolded in `admin/` with:

- Dedicated scripts (`dev`, `build`, `start`, `lint`)
- App Router pages (`/login`, `/dashboard`)
- Separate token handling (`admin_access_token`, `admin_refresh_token`)
- Axios client with refresh-token interceptor

This isolation keeps admin-specific flows and risk boundaries away from the student-facing web app.

### 18.2 Admin Authentication and Role Enforcement

Admin login reuses `POST /auth/login` and checks `user.role === 'ADMIN'` before granting dashboard access.

Role enforcement happens in both layers:

- **Frontend**: non-admin login is rejected in the admin app UI.
- **Backend**: all admin controllers use `@Roles('ADMIN')`, so even if someone manipulates the client, the API still blocks unauthorized access.

### 18.3 Content Management Implemented

Question management in admin dashboard now supports:

- Filtered listing (subject, grade, difficulty, status)
- Create question (4 options + correct choice)
- Edit core fields (question text, explanation, difficulty, status)
- Soft delete
- Bulk CSV import
- Draft review queue actions (publish / request changes)

Subject/topic management backend endpoints were added:

- `admin/subjects` (create, list, update, delete)
- `admin/topics` (create, list, update, delete)

Current admin UI now covers create/list/update/delete for both subjects and topics.

### 18.4 Mock Exam and Payment Operations

Mock exam admin operations were expanded:

- Create (existing)
- Update (added)
- Soft delete (added)
- Dedicated post-create question editor route (`/mock-exams/:id/questions` in admin app)

The admin flow now supports creating an empty mock exam first, then adding
mock-exam-only questions in a separate editor page. This keeps operational
intent clear and avoids mixing this workflow with the regular practice-question
authoring screen.

The editor now enforces the selected question target strictly:

- Backend rejects additions once `currentQuestionCount >= targetQuestionCount`
- UI disables add actions at the limit and shows a submit/back-to-list action
- Numbering is displayed from 1 consistently in the question list
- Existing mock exam questions can be edited in place (question text, options, correct answer)

Payment verification dashboard tab uses existing admin payment endpoints:

- View pending queue
- Approve/reject payment
- Approved payments activate subscriptions via backend transaction flow

### 18.5 Stability and Code Quality Pass

After implementing the admin dashboard flows, a cleanup pass was completed to keep the workspace maintainable:

- Added topic-level filtering to question management UI (subject + grade + topic + difficulty)
- Added subject/topic management filters in admin tab (subject-name search and topic filters by name/subject/grade)
- Replaced unsafe `any` usage in admin app with explicit parsing helpers
- Added typed Axios retry config in admin API client interceptor
- Verified `admin` and `backend` production builds pass after formatting + type-safety fixes

This matters because admin panels usually become operationally critical; lint/typing discipline here prevents fragile runtime behavior in content and payment operations.

### 18.6 Checkpoint 13 Completion Summary

Checkpoint 13 admin requirements are now implemented end-to-end:

- Dashboard overview metrics from dedicated `GET /admin/overview`
- Question review workflow from `GET /admin/questions` + `POST /admin/questions/:id/review`
- Full subject/topic CRUD in admin UI using `admin/subjects` and `admin/topics`
- User management tab using `GET /admin/users`, `GET /admin/users/:id`, and `PATCH /admin/users/:id/subscription`

---

## 19. Checkpoint 14: Analytics and Data Governance

Checkpoint 14 adds privacy-aware analytics and user data governance as first-class platform features, instead of treating analytics as ad-hoc logging.

### 19.1 Consent as a Core Domain Model

A new 1:1 `Consent` model is tied to every `User`:

- `analyticsOptIn`
- `personalizationOptIn`
- `marketingOptIn`
- `acceptedTermsAt`
- `acceptedPrivacyAt`

Endpoints:

- `GET /users/me/consent`
- `PUT /users/me/consent`

The key architectural shift is that analytics and personalization behavior is now gated by data in the database, not by frontend-only toggles.

### 19.2 Event Tracking Beyond Attempts

Three analytics entities were added:

- `AppSession` (visit/session lifecycle for web/mobile)
- `FeatureUsageEvent` (named product events with minimal JSON metadata)
- `VideoProgress` (learning continuity signal per user/video)

Raw event ingestion endpoints:

- `POST /analytics/sessions/start`
- `POST /analytics/sessions/:id/end`
- `POST /analytics/events`
- `PUT /analytics/video-progress`

All writes are consent-gated. If analytics consent is off, APIs return non-fatal `tracked: false` responses and skip persistence.

### 19.3 Retention Metrics and Precomputation

To avoid expensive real-time aggregation at scale, daily scheduled jobs now:

- purge raw events older than 90 days (`AppSession`, `FeatureUsageEvent`)
- recompute daily active metrics
- recompute signup retention cohorts (D1/D7/D30)
- recompute topic/question/engagement aggregate tables

This feeds admin analytics views with precomputed rows rather than scanning large raw tables on every request.

### 19.4 Admin Analytics and Privacy Thresholds

New admin analytics endpoints:

- `GET /admin/analytics/retention`
- `GET /admin/analytics/aggregates`

The admin app now has `/analytics` and shows:

- DAU/WAU/MAU split by platform
- total sessions, unique users, avg sessions/user, avg session duration
- cohort retention by signup date
- institutional aggregates (topic accuracy, most missed, engagement by grade/region, completion rates)

Privacy control: aggregate endpoints enforce `cohortSize >= 50` before exposing rows.

### 19.5 User Rights: Export and Deletion

Implemented governance endpoints:

- `GET /admin/analytics/export` for admin-side export of collected platform datasets
  with safe defaults (`includePII=false`, `gzip=true`, default last-30-days range)
- `DELETE /users/me` for account/data deletion workflow

Deletion removes user-linked operational data and revokes token/session artifacts, aligning platform behavior with user-controlled data lifecycle.

### 19.6 Premium Personalization Boundary

`GET /reports/me` now requires:

1. active subscription
2. `personalizationOptIn = true`

If personalization is disabled, the endpoint returns a limited response with explicit enable-personalization guidance. This cleanly separates monetization access control from privacy consent control.

### 19.7 Checkpoint 15 Kickoff: Bilingual UI Foundation

Checkpoint 15 has started with production code in the web app:

- Added translation dictionaries: `web/src/messages/en.json` and `web/src/messages/am.json`
- Added client i18n provider + hook for runtime translation lookups
- Added language switcher UI with persisted locale in localStorage
- Wired translated strings into key learner-facing screens (dashboard and progress) as the initial rollout

Important implementation note:

- Locale persistence is currently local to the browser (localStorage). Profile-backed language persistence is still pending.
- Full-string extraction across every page is also pending; current rollout focuses on core dashboard/progress areas first.

---

## 20. Checkpoint 17: Security Hardening

Checkpoint 17 started with concrete backend hardening changes focused on abuse prevention and safer input handling:

- Added Redis-backed login brute-force lockout in auth flow (`5` failed attempts within `15` minutes triggers temporary lock)
- Tightened global API throttling from `100/min` to `60/min` at the `ThrottlerModule` default policy
- Added HTML-stripping sanitization helpers and applied them to admin content creation/update paths (questions, subjects, topics)
- Added CSV upload hardening for bulk question import (max file size + MIME allowlist)
- Reviewed and tightened API CSP behavior in production Helmet configuration
- Completed security audit evidence for:
  - raw SQL injection posture (no unsafe Prisma raw APIs),
  - sensitive response exposure review,
  - API key/secret scan
  - documented in `SECURITY_AUDIT_CHECKPOINT17.md`

Operational note:

- Login lockout uses Redis keys and gracefully degrades (warn + continue auth flow) if Redis is unavailable.

### 20.1 Checkpoint 17 Completion Update

Checkpoint 17 remaining audit items were completed with documented evidence:

- XSS rendering audit:
  - searched web/admin/backend for `dangerouslySetInnerHTML`
  - no direct HTML injection sink found in current UI code
- CSRF posture review:
  - current authentication uses bearer tokens in `Authorization` headers (not cookie-session auth)
  - CSRF token requirement is deferred unless/when cookie auth is introduced
- Admin action audit logging:
  - added global `AdminAuditInterceptor`
  - logs admin mutation actions with actor ID, route, params, outcome, request ID, and duration
- Dependency scan:
  - runtime security posture verified using `npm audit --omit=dev` (0 vulnerabilities)
- Auth-flow security review:
  - reviewed register/login/refresh/forgot/reset flows and token lifecycle protections

Evidence source:

- `SECURITY_AUDIT_CHECKPOINT17.md`

---

## 21. Checkpoint 18: Performance Optimization

Performance optimization is about making the application feel fast and responsive under real-world conditions. This checkpoint addresses three layers: backend response speed, frontend data management, and asset delivery.

### 21.1 Backend: Redis API Response Caching

**Why cache at the API level?** Some data — like the list of subjects, streams, and grades — changes rarely but is requested on nearly every page load. Without caching, each request hits the database, parses the result, and serializes it to JSON. With Redis caching, subsequent requests skip the database entirely and return a pre-serialized response in under 1ms.

**Implementation pattern:**

We created a `CacheService` (`backend/src/common/cache/cache.service.ts`) that wraps the existing `RedisService` with a simple key-value interface:

```typescript
// The getOrSet pattern: check cache first, fall back to database
async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
  const cached = await this.get<T>(key);
  if (cached !== null) return cached;
  const fresh = await factory();
  await this.set(key, fresh, ttlSeconds);
  return fresh;
}
```

This "read-through" pattern means the service code barely changes — you wrap the existing database call in `getOrSet()` and the cache handles the rest.

**Cache invalidation** happens in the admin mutation methods (create, update, delete). When an admin modifies a subject, we invalidate both the "all subjects" cache key and the specific subject's key. We also invalidate the "all streams" cache because streams embed subject data.

**TTL choices:**

| Endpoint | TTL | Rationale |
|----------|-----|-----------|
| Subjects/Streams | 5 min | Small dataset, admin-edited |
| Grades | 10 min | Almost never changes |

### 21.2 Backend: Response Compression

HTTP response compression (gzip/deflate) reduces the bytes transferred over the network. A typical JSON response shrinks by 60-80%. In production, Nginx typically handles this, but adding it at the application level ensures compression works in all deployment modes.

We added the `compression` middleware in `main.ts` before other middleware, so it compresses all outgoing responses:

```typescript
import compression from 'compression';
app.use(compression());
```

### 21.3 Backend: Pagination Caps

Unbounded list queries are a denial-of-service vector — a client could request all records and overwhelm the server. We audited all list endpoints:

- Question listing already had `@Max(100)` on the `limit` DTO field
- Mock exam attempts had `take: 50`
- Bookmarks, payment history, and pending payments now have `take` limits (200, 100, 100)
- Subjects, streams, and grades return all rows since they're small reference datasets

### 21.4 Frontend: TanStack Query

**The problem with `useEffect` + `useState` for data fetching:**

1. No deduplication — if two components request the same data, two network calls fire
2. No caching — navigating away and back re-fetches everything
3. No stale-while-revalidate — the user sees a loading spinner every time
4. Manual loading/error state management in every component

**TanStack Query** solves all four by managing a client-side cache of server state. Each piece of data gets a **query key** that uniquely identifies it:

```typescript
// Query keys follow [domain, ...params] convention
const queryKeys = {
  subjects: { all: ['subjects'] as const },
  stats: { overall: ['stats', 'overall'] as const },
  leaderboard: {
    list: (period, subjectId, limit) => ['leaderboard', period, subjectId, limit] as const,
  },
};
```

**Query hooks** encapsulate the fetch logic for each domain:

```typescript
export function useSubjects() {
  return useQuery({
    queryKey: queryKeys.subjects.all,
    queryFn: async () => {
      const { data } = await apiClient.get('/subjects');
      return data;
    },
  });
}
```

Pages then consume these hooks instead of managing state manually:

```typescript
// Before: 5 useState declarations, a useEffect, and a loadData function
// After:
const { data: subjects = [], isLoading, error, refetch } = useSubjects();
```

**Configuration choices:**

- `staleTime: 2 min` — data is considered fresh for 2 minutes, so quick navigation between pages doesn't trigger refetches
- `gcTime: 10 min` — unused cache entries are garbage collected after 10 minutes
- `refetchOnWindowFocus: false` — in an exam prep context, refetching when the user switches tabs back would be surprising

**Mutation hooks** for write operations (e.g., `useRemoveBookmark`) automatically invalidate related queries on success, keeping the UI in sync without manual refetching.

### 21.5 Frontend: Bundle Optimization

**Bundle analyzer** (`@next/bundle-analyzer`) generates a visual treemap of your JavaScript bundles when you run `ANALYZE=true npm run build`. This reveals unexpectedly large dependencies.

**Dynamic imports** with `next/dynamic` split heavy components into separate chunks that load on demand:

```typescript
const ProgressChart = dynamic(() => import('./progress-chart'), {
  loading: () => <Skeleton className="h-72 w-full" />,
  ssr: false,
});
```

Recharts (~200KB) is now only loaded when the user visits the progress page, rather than being included in the initial bundle.

### 21.6 Frontend: Image Optimization

Next.js `<Image>` automatically resizes, compresses, and serves images in modern formats (WebP/AVIF). The `unoptimized` flag was previously used as a placeholder during development — removing it enables the full optimization pipeline.

`remotePatterns` in `next.config.ts` whitelists which external domains are allowed to serve images through the optimization proxy.

### 21.7 Frontend: Font Optimization

The Amharic language uses Ge'ez script, which isn't covered by the default Geist font. We added `Noto_Sans_Ethiopic` from Google Fonts with:

- `display: 'swap'` — the browser shows text immediately in a fallback font, then swaps to the custom font when it loads (no invisible text)
- `subsets: ['ethiopic']` — only downloads the Ethiopic character set, not the full font file
- CSS variable (`--font-noto-ethiopic`) — applied as a fallback in the body font stack so it activates automatically for Amharic content

### 21.8 Exit Criteria

- Redis caching active on subjects, streams, and grades endpoints with TTL and invalidation
- TanStack Query replaces manual useEffect fetching on all major pages
- Response compression middleware enabled
- Recharts dynamically imported (not in initial bundle)
- Image optimization enabled with remote patterns configured
- Noto Sans Ethiopic font configured for Amharic text rendering
- Bundle analyzer available via `ANALYZE=true`

---

## 22. Checkpoint 19: Testing

### 22.1 Why Testing Matters

Automated tests catch bugs before they reach users, document expected behaviour, and allow safe refactoring. The testing strategy used here follows a **testing pyramid**: many fast unit tests at the base, fewer integration tests in the middle, and a small number of end-to-end tests at the top.

### 22.2 Backend Unit Tests

Each core service has a dedicated `*.service.spec.ts` file that uses **Jest** with `ts-jest`:

| File | Tests | Covers |
|------|-------|--------|
| `auth.service.spec.ts` | 42 | register, login, refresh, logout, forgotPassword, resetPassword, getProfile |
| `questions.service.spec.ts` | 97 | findAll, findOne, submitAnswer, create, update, softDelete, bulkImport, reviewQuestion |
| `mock-exams.service.spec.ts` | 56 | start, submit, review, create, update, remove, addQuestion, updateQuestion, removeQuestion |
| `leaderboard.service.spec.ts` | 29 | incrementScore, handleQuestionAttempted, getLeaderboard, resetWeekly, resetMonthly |
| `subscriptions.service.spec.ts` | 27 | getPlans, getStatus, hasFreeTierAccess, getFreeTierRemaining |

**Key techniques used:**

- **Mock factories** — Each spec creates lightweight stubs for `PrismaService`, `RedisService`, and other dependencies with `jest.fn()`. This keeps tests fast (no database or network).
- **Isolated `beforeEach`** — Mocks are reset before every test so state never leaks between cases.
- **Anti-enumeration checks** — Auth tests verify that login failures for wrong-email and wrong-password produce the same error message.
- **Token rotation** — Refresh tests confirm the old token is deleted before the new one is created.
- **Rate-limiting** — Login tests verify Redis-based lockout after `MAX_FAILED_LOGIN_ATTEMPTS` (5) failures.
- **Event emission** — `QuestionsService` tests confirm `question.attempted` event fires on answer submission.
- **Boundary cases** — Free-tier tests check 0%, exactly-at-limit, and over-limit counts.

**Naming conventions applied:**
- Test file: `kebab-case.service.spec.ts` (matches the service file name with `.spec` suffix)
- Test constants: `UPPER_SNAKE_CASE` (e.g., `MOCK_USER_ID`, `VALID_PASSWORD`)
- Boolean assertions: `isCorrect`, `isSubscribed`, `shouldAutoGenerateQuestions`
- Describe blocks mirror the method name: `describe('register', () => { ... })`

### 22.3 Backend Integration Tests (E2E)

Integration tests live in `backend/test/` and use **Supertest** to exercise the full HTTP pipeline — controllers, guards, validation pipes, interceptors, and exception filters.

**Test infrastructure (`test/test-setup.ts`):**

```typescript
const { app, prisma, redis } = await createTestApp();
const response = await request(app.getHttpServer())
  .post('/api/v1/auth/register')
  .send({ name: 'Test', email: 'test@example.com', phone: '+251900000000', password: 'Str0ng!Pass' })
  .expect(201);
```

- `createTestApp()` bootstraps the real `AppModule` but overrides `PrismaService` and `RedisService` with mocks.
- Token helpers (`signTestAccessToken`, `signTestRefreshToken`) generate valid JWTs for authenticated requests.
- The `ValidationPipe` is configured identically to `main.ts`, so DTO validation is exercised realistically.

**Covered areas (43 tests in `app.e2e-spec.ts`):**

| Area | What is validated |
|------|-------------------|
| Health check | `/api/v1/health` returns 200 with status and dependency checks |
| Auth register | Field validation (email format, phone format, password strength), conflict detection |
| Auth login/refresh/logout | Token exchange, missing fields, invalid tokens |
| Auth me | 401 without token, 401 with bad token, 200 with valid token |
| Content browsing | Streams, subjects, grades return arrays without authentication |
| Protected routes | 401 for unauthenticated, 200 for authenticated |
| Admin routes | 403 for STUDENT role, 200 for ADMIN role |

**Naming conventions applied:**
- E2E test file: `app.e2e-spec.ts` (standard NestJS convention)
- Jest config: `test/jest-e2e.json`
- Test helper: `test/test-setup.ts` (kebab-case)
- Constants: `STUDENT_ACCESS_TOKEN`, `ADMIN_ACCESS_TOKEN`

### 22.4 Frontend Component Tests

Frontend tests use **Jest** with `@testing-library/react` and `@testing-library/jest-dom`.

**Test infrastructure:**
- `web/jest.config.ts` — Uses `next/jest` for SWC transforms, `jsdom` environment, and `@/` path alias mapping.
- `web/jest.setup.ts` — Imports `@testing-library/jest-dom` for matchers like `toBeInTheDocument()` and `toHaveClass()`.

**Component test files (49 tests across 5 components):**

| Component | File | Tests | Key assertions |
|-----------|------|-------|----------------|
| `Button` | `Button.test.tsx` | 11 | Variant classes, loading spinner, disabled state, onClick, sizes |
| `Badge` | `Badge.test.tsx` | 9 | Difficulty variants (EASY/MEDIUM/HARD), semantic variants |
| `Card` | `Card.test.tsx` | 8 | Children rendering, padding options, hoverable behaviour |
| `EmptyState` | `EmptyState.test.tsx` | 9 | Conditional icon/description/action rendering |
| `ProgressBar` | `ProgressBar.test.tsx` | 12 | Width percentage, 0%/100% clamping, colour variants, sizes |

**Key technique — render + query:**

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from './Button';

it('shows loading spinner when isLoading is true', () => {
  render(<Button isLoading>Save</Button>);
  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.getByTestId('spinner')).toBeInTheDocument();
});
```

**Naming conventions applied:**
- Test file: `PascalCase.test.tsx` (matches the component file name with `.test` suffix)
- Render helpers: `camelCase` functions
- Boolean props: `isLoading`, `isDisabled`, `isHoverable`

### 22.5 Running Tests

```bash
# Backend unit tests
cd backend
npm test              # run all unit tests
npm run test:cov      # run with coverage report
npm run test:watch    # re-run on file changes

# Backend integration tests
npm run test:e2e

# Frontend component tests
cd web
npm test
npm run test:coverage
npm run test:watch
```

### 22.6 What Remains (Future Work)

The following items are planned but not yet implemented:

- **Frontend integration tests** — Testing complete auth flow (login → dashboard redirect), question practice flow, and mock exam flow using mocked API responses.
- **End-to-End tests** — Full browser-based tests (Playwright or Cypress) covering user registration through question practice and mock exams.
- **Load testing** — Simulating 100 concurrent users for question practice and 50 concurrent mock exam submissions to identify bottlenecks.

---

## 23. Common Patterns in This Codebase

### The Module → Controller → Service Pattern

Every feature follows this structure:

```typescript
// 1. Module (wiring)
@Module({
  controllers: [FooController],
  providers: [FooService],
})
export class FooModule {}

// 2. Controller (HTTP layer)
@Controller('foo')
export class FooController {
  constructor(private readonly fooService: FooService) {}

  @Get()
  findAll() {
    return this.fooService.findAll();
  }
}

// 3. Service (business logic)
@Injectable()
export class FooService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.foo.findMany();
  }
}
```

### Dependency Injection

Notice how `FooController` receives `FooService` in its constructor without creating it manually (`new FooService()`). NestJS's **dependency injection** container creates instances and passes them where needed. This makes code easier to test and manage.

### Error Handling

We use NestJS's built-in exception classes:

- `NotFoundException` → 404 response
- `BadRequestException` → 400 response
- `UnauthorizedException` → 401 response
- `ForbiddenException` → 403 response

These are thrown from services and automatically caught by NestJS's `GlobalExceptionFilter`, which formats them into consistent JSON error responses.

### Barrel Files (index.ts)

Files named `index.ts` re-export from multiple files so that importing is cleaner:

```typescript
// Without barrel: three import statements
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

// With barrel: one import statement
import { RegisterDto, LoginDto, RefreshTokenDto } from './dto';
```

### The `@Public()` Decorator Pattern

By default, every route requires authentication (the global `JwtAuthGuard`). To make a route publicly accessible, we mark it with `@Public()`. This is the **secure by default** approach — you have to explicitly opt out of security rather than remembering to opt in.

---

## 24. Naming Conventions Reference

All code in this project follows the rules defined in [NAMING_CONVENTIONS.md](./NAMING_CONVENTIONS.md). Here is a quick cross-reference of how conventions apply to each layer:

### Backend (NestJS/TypeScript)

| Element | Convention | Example |
|---------|-----------|---------|
| Module folders | `kebab-case` | `mock-exams/`, `auth/` |
| Service/Controller files | `{module-name}.service.ts` | `questions.service.ts` |
| DTO files | `{action}-{entity}.dto.ts` | `create-question.dto.ts`, `admin-verify.dto.ts` |
| Class names | `PascalCase` + Suffix | `QuestionsService`, `CreateQuestionDto` |
| Boolean properties | `is/has/should` prefix | `isApproved`, `shouldAutoGenerateQuestions` |
| Module-level constants | `UPPER_SNAKE_CASE` | `FREE_TIER_QUESTIONS_PER_SUBJECT` |
| API route paths | lowercase `kebab-case` | `/api/v1/mock-exams`, `/admin/questions` |
| Barrel files | `index.ts` | Re-export from each `dto/` directory |

### Frontend (Next.js/React)

| Element | Convention | Example |
|---------|-----------|---------|
| Page directories | `kebab-case` | `forgot-password/`, `mock-exams/` |
| Component files | `PascalCase.tsx` | `Button.tsx`, `EmptyState.tsx` |
| Hook files | `use{Name}.ts` | `useSubjects.ts`, `useMockExams.ts` |
| Utility files | `camelCase.ts` | `apiClient.ts`, `tokenStorage.ts` |
| Store files | `{name}Store.ts` | `authStore.ts` |
| Event handler props | `on{Event}` | `onSubmit`, `onAnswer` |
| Event handler functions | `handle{Event}` | `handleSubmit`, `handleAnswer` |
| Boolean state | `is/has/should` prefix | `isSubmitting`, `hasUnanswered` |
| Query keys | `[domain, ...params]` | `['subjects']`, `['leaderboard', period]` |

### Database (Prisma/PostgreSQL)

| Element | Convention | Example |
|---------|-----------|---------|
| Model names | `PascalCase` singular | `QuestionAttempt`, `MockExam` |
| Field names | `camelCase` | `questionText`, `createdAt` |
| DB table names | `plural_snake_case` via `@@map` | `question_attempts`, `mock_exams` |
| DB column names | `snake_case` via `@map` | `question_text`, `created_at` |

### Shared Package

| Element | Convention | Example |
|---------|-----------|---------|
| Interfaces | `PascalCase` (no `I` prefix) | `User`, `Question` |
| Enums | `PascalCase` + `UPPER_SNAKE_CASE` values | `Difficulty.EASY` |
| Zod schemas | `camelCase` + `Schema` | `registerSchema`, `loginSchema` |
| Regex constants | `UPPER_SNAKE_CASE` + `_REGEX` | `ETHIOPIAN_PHONE_REGEX` |

Consult [NAMING_CONVENTIONS.md](./NAMING_CONVENTIONS.md) for the complete reference.

---

## 25. Glossary

| Term | Meaning |
|---|---|
| **API** | Application Programming Interface — a set of endpoints that applications call to communicate. |
| **Endpoint** | A specific URL on the server that performs an action (e.g., `GET /subjects`). |
| **HTTP** | Hypertext Transfer Protocol — the language browsers and servers use to communicate. |
| **REST** | Representational State Transfer — a style of designing APIs around resources (subjects, questions) and HTTP methods (GET, POST, etc.). |
| **JSON** | JavaScript Object Notation — a text format for structured data: `{ "name": "Physics" }`. |
| **DTO** | Data Transfer Object — a class that defines the shape and validation rules for incoming request data. |
| **ORM** | Object-Relational Mapper — a tool that maps database tables to programming language objects (Prisma). |
| **Migration** | A versioned SQL script that changes the database schema (add tables, columns, etc.). |
| **JWT** | JSON Web Token — a signed token used to prove a user's identity. |
| **Hash** | A one-way transformation of data. Used to store passwords securely — you can verify a password against a hash but can't reverse the hash to get the password. |
| **Middleware** | Code that runs between receiving a request and reaching the controller. Used for logging, authentication, etc. |
| **Guard** | A NestJS middleware that decides whether a request should proceed (authentication, role checks). |
| **Decorator** | A `@Something` annotation that adds metadata or behavior to a class, method, or parameter. |
| **Transaction** | A database operation where either all changes succeed or none do. Prevents partial/corrupt data. |
| **Soft Delete** | Marking a record as deleted (with a timestamp) instead of removing it from the database. |
| **Pagination** | Returning data in pages (limit + offset) instead of all at once. |
| **CORS** | Cross-Origin Resource Sharing — browser security that controls which domains can call your API. |
| **Rate Limiting** | Restricting how many requests a client can make in a time window to prevent abuse. |
| **Monorepo** | A single code repository containing multiple related projects. |
| **Environment Variable** | A configuration value set outside the code (in `.env`), so secrets aren't in the source code. |
| **Idempotent** | An operation that produces the same result whether you run it once or many times. |
| **UUID** | Universally Unique Identifier — a 128-bit ID like `550e8400-e29b-41d4-a716-446655440000`. |
| **Token Rotation** | Replacing a refresh token with a new one each time it's used, so stolen tokens become invalid. |
| **Anti-Enumeration** | Returning the same error message whether an email exists or not, so attackers can't discover registered emails. |
| **Aggregate Query** | A database query that computes a summary value (COUNT, SUM, AVG) over many rows rather than returning individual rows. |
| **GROUP BY** | SQL clause that collapses rows sharing the same value(s) into summary rows, used with aggregate functions. |
| **JOIN** | SQL operation that combines rows from two tables based on matching column values (e.g., connecting attempts to their questions). |
| **Raw SQL** | Writing direct SQL queries instead of using the ORM's abstraction layer. Used when the ORM can't express the needed query. |
| **Unique Constraint** | A database rule ensuring no two rows have the same value(s) in specific column(s). Prevents duplicates at the data level. |
| **409 Conflict** | HTTP status code meaning "your request conflicts with existing data" (e.g., bookmarking a question you've already bookmarked). |
| **Grace Buffer** | Extra time added to a deadline to account for network latency or processing delays. |
| **Streak** | A count of consecutive calendar days meeting a condition (e.g., "practiced for 7 days in a row"). |
| **Redis** | An in-memory data store that's much faster than disk-based databases for temporary or frequently accessed data. |
| **Sorted Set** | A Redis data structure where each member has a score. Members are automatically kept sorted by score, enabling instant ranking queries. |
| **Event-Driven** | Architecture where components communicate by emitting and listening for events, reducing direct dependencies between modules. |
| **Observer Pattern** | A design pattern where one component publishes events and multiple others react independently, without knowing about each other. |
| **Cron Job** | A scheduled task that runs automatically at specified times (e.g., "every Monday at midnight"). Named after the Unix `cron` scheduler. |
| **Freemium** | A business model offering basic features for free and charging for premium access. |
| **Webhook** | A URL that a third-party service calls to notify your server of an event (e.g., "payment confirmed"). The reverse of your server calling an API. |
| **Idempotent** | An operation that produces the same result whether you run it once or many times. Critical for webhooks which may be delivered more than once. |
| **Pipeline** | In Redis, a way to batch multiple commands into a single network round-trip for better performance. |
| **Tight Coupling** | When modules depend directly on each other, making changes difficult. The opposite of loose coupling (via events, interfaces). |
| **Frontend** | The part of an application that runs in the user's browser. It displays data, handles user interactions, and communicates with the backend API. |
| **Server-Side Rendering (SSR)** | Generating HTML on the server before sending it to the browser. The browser receives a complete page instead of an empty page that JavaScript fills in later. |
| **Static Generation** | Pre-building pages at deploy time so they're served as plain HTML files — the fastest possible delivery. |
| **Client Component** | A React component marked with `'use client'` that runs in the browser. Required for interactivity (click handlers, state, effects). |
| **Server Component** | A React component that runs only on the server (default in Next.js App Router). Renders to HTML without sending JavaScript to the browser. |
| **Hydration** | The process where the browser takes server-rendered HTML and attaches JavaScript event handlers to make it interactive. |
| **Code Splitting** | Automatically breaking the JavaScript bundle into smaller chunks so only the code needed for the current page is loaded. |
| **State Management** | A pattern for sharing data across components in a frontend application. Zustand, Redux, and React Context are common approaches. |
| **Store (Zustand)** | A central JavaScript object that holds shared application state and provides functions to modify it. Components subscribe to specific state slices. |
| **Interceptor (Axios)** | A function that runs before every request (request interceptor) or after every response (response interceptor). Used for auth tokens and error handling. |
| **Utility-First CSS** | A CSS approach where small, single-purpose classes (like `px-4`, `bg-red-500`) are composed directly in HTML instead of writing custom CSS rules. |
| **Proxy (Next.js)** | Server-side code that runs before every request, used to redirect users based on authentication status. Previously called "middleware" before Next.js 16. |
| **Cookie** | A small piece of data the browser stores and sends with every request to the same domain. Used here to make auth tokens visible to server-side proxy code. |
| **forwardRef** | A React utility that lets a parent component get a reference to the underlying DOM element inside a child component. Needed by some libraries for positioning and focus management. |
| **Props** | Short for "properties." The parameters passed to a React component that configure its appearance and behavior. |

---

*This document will be updated as new checkpoints are completed.*
