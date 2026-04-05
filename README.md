# Ethiopian National Exam Prep Platform

A web and mobile platform to help Ethiopian students prepare for the 12th Grade National Exam. Students can practice questions across all subjects (Natural Science and Social Science streams), take timed mock exams, track their progress, and compete on leaderboards.

## What This Project Contains

This is a **monorepo** -- a single repository containing multiple related applications:

```
exam-prep-app/
├── packages/shared/    → Shared TypeScript types, validation, and constants
├── backend/            → NestJS API server (handles all business logic)
├── web/                → Next.js student-facing web app
├── admin/              → Next.js admin dashboard
├── docker-compose.yml  → Database services (PostgreSQL + Redis)
└── ...config files
```

### Why a Monorepo?

All apps (backend, web, admin, future mobile) share the same data types. When you change the definition of a "Question" in the shared package, the backend API and the web app both see the update immediately. No publishing packages, no version mismatches.

---

## Tech Stack Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Language** | TypeScript | Used everywhere -- backend, web, mobile. One language for the whole team. |
| **Backend** | NestJS | API server framework. Handles authentication, data, business logic. |
| **Database** | PostgreSQL | Stores all structured data (users, questions, subscriptions, etc.) |
| **Cache** | Redis | Fast in-memory store for leaderboard rankings and caching. |
| **Web App** | Next.js | React-based framework with server-side rendering for fast page loads. |
| **Styling** | Tailwind CSS | Utility-first CSS framework for rapid UI development. |
| **Mobile** | React Native + Expo | Cross-platform mobile app (Phase 2, not yet built). |
| **Containers** | Docker | Runs PostgreSQL and Redis in isolated containers. |

---

## Prerequisites

Before you can run this project, install the following:

### 1. Node.js (version 20 or higher)

Node.js runs JavaScript/TypeScript code outside a browser. It powers the backend server and builds the web app.

- Download: https://nodejs.org/
- After installing, verify: `node --version` (should show v20.x.x or higher)
- npm (Node Package Manager) comes bundled with Node.js: `npm --version`

### 2. Docker Desktop

Docker runs PostgreSQL and Redis in containers so you don't have to install database software directly on your machine.

- Download: https://www.docker.com/products/docker-desktop/
- After installing, start Docker Desktop and verify: `docker --version`

### 3. Git

Git tracks code changes. You likely already have it.

- Download: https://git-scm.com/
- Verify: `git --version`

---

## Getting Started (First-Time Setup)

Follow these steps in order. Run all commands from the project root directory.

### Step 1: Clone and enter the project

```bash
cd "C:\Users\user\Desktop\Sam Proj\Exam Prep App"
```

### Step 2: Install dependencies

This downloads all libraries the project needs. It also links the workspace packages together so they can import each other.

```bash
npm install
```

### Step 3: Set up environment variables

Copy the example environment file and edit it with your values:

```bash
cp .env.example .env
```

Open `.env` in a text editor and:
- Set `POSTGRES_PASSWORD` to a strong password
- Generate JWT secrets (the file contains instructions)
- Leave other values as defaults for local development

**IMPORTANT**: Never commit the `.env` file. It contains secrets.

### Step 4: Start database services

Make sure Docker Desktop is running, then:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port 5432 (the main database)
- **Redis** on port 6379 (caching and leaderboards)

To check they're running:

```bash
docker compose ps
```

Both should show status "Up" and "(healthy)".

### Step 5: Build the shared package

The shared package must be built before the backend or web app can import from it:

```bash
npm run build:shared
```

This compiles TypeScript in `packages/shared/src/` to JavaScript in `packages/shared/dist/`.

### Step 6: Start development servers

Once the backend and web app are set up (in future checkpoints), you'll run:

```bash
npm run dev:backend    # Starts the API server on http://localhost:3001
npm run dev:web        # Starts the web app on http://localhost:3000
```

---

## Common Commands

| Command | What It Does |
|---------|-------------|
| `npm install` | Install/update all dependencies across all workspaces |
| `npm run build:shared` | Compile the shared TypeScript package |
| `npm run dev:backend` | Start the backend API in development mode |
| `npm run dev:web` | Start the web app in development mode |
| `npm run lint` | Check code for quality issues (ESLint) |
| `npm run format` | Auto-format all code (Prettier) |
| `npm run format:check` | Check if code is formatted (CI use) |
| `docker compose up -d` | Start PostgreSQL and Redis |
| `docker compose down` | Stop PostgreSQL and Redis |
| `docker compose down -v` | Stop and DELETE all database data |
| `docker compose logs -f` | Watch database logs in real time |

---

## Project Structure Explained

### `packages/shared/` -- Shared Code

This is the most important structural piece. It contains:

- **`src/types/`** -- TypeScript interfaces that define the shape of every data object (User, Question, Subject, etc.). These are the "contract" between backend and frontend.
- **`src/constants/`** -- Enums (fixed value lists) like difficulty levels, user roles, subscription plans. Also contains Ethiopian curriculum-specific data like subject-stream mappings.
- **`src/validation/`** -- Zod validation schemas that define rules like "password must be 8+ characters" or "a question must have exactly 4 options with one correct." These same rules run on both backend and frontend.

When you change something here, run `npm run build:shared` to recompile.

### `backend/` -- NestJS API Server

The API server handles all business logic:
- User registration and authentication
- Serving questions, subjects, topics
- Recording answers and calculating scores
- Mock exam management
- Leaderboard calculations
- Subscription and payment processing

### `web/` -- Next.js Web App

The student-facing web application. Students use this to:
- Browse subjects and topics
- Practice questions
- Take timed mock exams
- View their progress and leaderboard ranking
- Subscribe and make payments

### `admin/` -- Admin Dashboard

Used by the team to:
- Add, edit, and import questions
- Create mock exams
- Verify bank transfer payments
- View user analytics

---

## Configuration Files Explained

| File | Purpose |
|------|---------|
| `package.json` | Root project config. Defines workspaces and shared scripts. |
| `tsconfig.base.json` | Base TypeScript settings inherited by all sub-projects. |
| `.env.example` | Template for environment variables. Copy to `.env` and fill in. |
| `.env` | Actual environment variables (secrets). NEVER commit this. |
| `docker-compose.yml` | Defines PostgreSQL and Redis containers. |
| `eslint.config.mjs` | Code quality rules (catches bugs and bad patterns). |
| `.prettierrc` | Code formatting rules (consistent style). |
| `.gitignore` | Files Git should not track (node_modules, .env, etc.). |

---

## How the Pieces Connect

```
                    ┌──────────────┐
                    │  Student     │
                    │  (browser)   │
                    └──────┬───────┘
                           │ HTTPS
                    ┌──────▼───────┐
                    │  Next.js     │
                    │  Web App     │
                    │  (port 3000) │
                    └──────┬───────┘
                           │ API calls
                    ┌──────▼───────┐
                    │  NestJS      │
                    │  Backend     │
                    │  (port 3001) │
                    └──┬───────┬───┘
                       │       │
              ┌────────▼─┐  ┌──▼────────┐
              │PostgreSQL │  │  Redis    │
              │(port 5432)│  │(port 6379)│
              │  Data     │  │  Cache +  │
              │  storage  │  │  Rankings │
              └───────────┘  └───────────┘
```

1. The student opens the web app in their browser
2. The web app makes API calls to the backend
3. The backend reads/writes data to PostgreSQL
4. The backend uses Redis for fast leaderboard lookups and caching
5. The shared package provides type definitions used by both web and backend

---

## Troubleshooting

### "docker compose up" fails
- Make sure Docker Desktop is running (check system tray)
- On Windows, Docker Desktop needs WSL 2 enabled
- If ports are in use: `docker compose down` first, then retry

### "npm install" fails
- Check Node.js version: `node --version` (need v20+)
- Delete `node_modules` and `package-lock.json`, then retry: `rm -rf node_modules package-lock.json && npm install`

### Shared package import errors
- Rebuild the shared package: `npm run build:shared`
- Make sure you ran `npm install` from the project root (not from a sub-folder)

### Database connection refused
- Check Docker containers are running: `docker compose ps`
- Verify `.env` values match `docker-compose.yml` settings
- Default PostgreSQL URL: `postgresql://exam_prep_user:change_this_to_a_strong_password@localhost:5432/exam_prep_db`
