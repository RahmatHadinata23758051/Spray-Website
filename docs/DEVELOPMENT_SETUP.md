# DEVELOPMENT SETUP — Local Onboarding, Environment & Runbook

```text
Status: Current Handover Reference
Last verified against: 29ad46a
Repository: C:\Users\user\Nata\Project\Spray-paragon\website
GitHub: RahmatHadinata23758051/Spray-Website
```

This runbook guides an incoming developer through setting up a complete local development environment for **Spraybot**, configuring PostgreSQL, executing database migrations, seeding laboratory accounts, and running automated tests.

---

## 1. System Prerequisites

Before starting, ensure your workstation meets the following requirements:

| Dependency | Minimum Version | Recommended | Notes |
|------------|-----------------|-------------|-------|
| **Node.js** | `>= 20.10.0` | `22.x LTS` | Requires modern ESM and native `process.loadEnvFile`. |
| **npm** | `>= 10.0.0` | `10.8+` | Workspace support required. |
| **PostgreSQL** | `>= 14.0` | `16.x` | Local instance for database synchronization. |
| **Git** | `>= 2.30.0` | Latest | Standard version control. |
| **Python** *(Optional)* | `>= 3.10.0` | `3.10.x` | Only required if running local YOLO inference scripts (`infer.py`). |

---

## 2. Step-by-Step Installation

### Step 1: Clone the Repository
```bash
git clone https://github.com/RahmatHadinata23758051/Spray-Website.git
cd Spray-Website
```

### Step 2: Install Monorepo Dependencies
From the repository root, install dependencies across all workspaces:
```bash
npm install
```

---

## 3. Environment Configuration

The repository uses environment variables to configure database connections, session secrets, and port bindings.

Create a root `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

### Required Variables in `.env`

```ini
# Node Environment
NODE_ENV=development

# Database Connection (Local PostgreSQL)
# Format: postgres://<user>:<password>@<host>:<port>/<database>
DATABASE_URL=postgres://postgres:postgres@localhost:5432/spraybot_dev

# Session Cookie Encryption Secret (Must be >= 32 characters)
SESSION_SECRET=spraybot-paragon-local-development-secret-key-32chars

# Backend Fastify Port
API_PORT=3001

# Frontend Vite API Proxy
VITE_API_URL=http://localhost:3001

# Optional Seed Password
SEED_ADMIN_PASSWORD=change-me-local-only
```

> [!WARNING]
> **Never commit your `.env` file to Git.** It is listed in `.gitignore`. Ensure `SESSION_SECRET` is at least 32 characters long; Fastify will refuse to boot if it is shorter.

---

## 4. Database Initialization & Seeding

Ensure your local PostgreSQL server is running and you have created the target database (e.g. `spraybot_dev`):

```sql
-- In psql or pgAdmin:
CREATE DATABASE spraybot_dev;
```

From the repository root, run the migration and seeding scripts:

```bash
# 1. Generate SQL migration files from Drizzle schema (if schema was modified)
npm run db:generate

# 2. Apply migrations to create PostgreSQL tables
npm run db:migrate

# 3. Seed initial administrative and operator accounts
npm run db:seed
```

### Seed Accounts Created by `db:seed`

| Email | Default Password | Role | Purpose |
|-------|------------------|------|---------|
| `admin@local.test` | `change-me-local-only` | `admin` | Full administrative access, user management, audit review. |

---

## 5. Running the Application

Spraybot can be run in two modes:

### Mode A: Full-Stack Mode (Frontend + Fastify API + PostgreSQL)
Runs both the React Vite frontend and the Fastify backend concurrently:

```bash
npm run dev
```
- **Web Application**: Accessible at `http://localhost:5173`
- **Fastify REST API**: Accessible at `http://localhost:3001`
- **Health Check**: `http://localhost:3001/health`

### Mode B: Frontend-Only Standalone Mode
If you do not have PostgreSQL installed locally, you can run only the web frontend:

```bash
npm run dev:web
```
- The frontend operates with local mock authentication and LocalStorage/IndexedDB persistence.
- Pre-filled mock login credentials on the login page: `operator@local.test` / `spraybot123`.

---

## 6. Verification & Quality Gates

Before submitting pull requests or pushing code, verify that all quality gates pass:

```bash
# 1. Typecheck all workspaces (apps/web, apps/api, packages/domain, packages/contracts)
npm run typecheck

# 2. Run ESLint across the codebase
npm run lint

# 3. Execute unit and domain tests via Vitest
npm run test

# 4. Test production Vite and Fastify bundle builds
npm run build

# 5. (Optional) Run Playwright browser end-to-end tests
npx playwright test
```

---

## 7. Troubleshooting Common Issues

### Issue 1: `SESSION_SECRET must be at least 32 characters`
- **Cause**: The `SESSION_SECRET` variable in `.env` is either missing or too short.
- **Fix**: Open `.env` and set `SESSION_SECRET` to a string of at least 32 characters (e.g. `spraybot-paragon-local-development-secret-key-32chars`).

### Issue 2: `ECONNREFUSED 127.0.0.1:5432`
- **Cause**: PostgreSQL is not running or `DATABASE_URL` is pointing to an incorrect port/credentials.
- **Fix**: Verify PostgreSQL service status (`Get-Service postgresql*` in PowerShell) and verify the credentials in `.env`.

### Issue 3: Video / Frame Capture Fails in Browser Private Mode
- **Cause**: Some browsers disable or severely restrict `IndexedDB` in Incognito/Private mode.
- **Behavior**: Spraybot will log a warning and fall back to in-memory frame storage. Captured frames will persist during the session but will be purged when the tab closes.
- **Fix**: Use a standard (non-private) browser window for physical camera capture sessions.

### Issue 4: Python Inference Subprocess Error in `/uji-model`
- **Cause**: Python is not installed or `torch`/`ultralytics` packages are missing.
- **Behavior**: The Fastify backend logs an error and automatically activates the browser heuristic fallback engine, ensuring the UI remains 100% testable.
- **Fix**: To enable real PyTorch inference, run `pip install ultralytics torch` in your Python 3.10+ environment.
