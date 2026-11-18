# Spraybot Frontend Foundation
  
Working documentation package for the **Mesin Uji Spray Botol / Spraybot** software-first MVP.

## Current project reality

Hardware is **not available yet**. The first development target is therefore a frontend-first, software-only prototype that:

- makes the future test workflow visible and understandable,
- gives management/client stakeholders a realistic picture of how analysis will work,
- establishes the UI structure before hardware and computer-vision integration,
- defines stable data contracts so hardware/CV can be plugged in later without redesigning the whole product.

The application must never pretend that real hardware is connected. During this phase the UI runs in **Simulation / Mock Mode**.

## Developer Handover Documentation

A complete, production-grade developer handover documentation set is available in the [`docs/`](./docs/README.md) directory:

1. [docs/README.md](./docs/README.md) — Documentation index & recommended reading order
2. [docs/HANDOVER.md](./docs/HANDOVER.md) — Primary executive handover & "Do Not Break" rules
3. [docs/SYSTEM_ARCHITECTURE.md](./docs/SYSTEM_ARCHITECTURE.md) — System layers & monorepo boundaries
4. [docs/DOMAIN_MODEL.md](./docs/DOMAIN_MODEL.md) — Canonical domain entities & immutability invariants
5. [docs/OPERATOR_WORKFLOW.md](./docs/OPERATOR_WORKFLOW.md) — 5-step operational wizard & sub-workspaces
6. [docs/CODEBASE_GUIDE.md](./docs/CODEBASE_GUIDE.md) — Directory map, file modification guide & routes
7. [docs/DATA_PERSISTENCE_AND_SYNC.md](./docs/DATA_PERSISTENCE_AND_SYNC.md) — Hybrid local-first & sync architecture
8. [docs/API_AND_DATABASE.md](./docs/API_AND_DATABASE.md) — Fastify routes, auth & PostgreSQL schema
9. [docs/CAPTURE_AND_ANALYSIS.md](./docs/CAPTURE_AND_ANALYSIS.md) — Real camera, baseline subtraction & CV engine
10. [docs/DEVELOPMENT_SETUP.md](./docs/DEVELOPMENT_SETUP.md) — Local environment setup & runbook
11. [docs/TESTING_AND_QA.md](./docs/TESTING_AND_QA.md) — Testing strategy, critical suites & regression guards
12. [docs/OPEN_ITEMS_AND_ROADMAP.md](./docs/OPEN_ITEMS_AND_ROADMAP.md) — Unresolved client items, hardware & roadmap

Older planning documentation (e.g. `docs/ARCHITECTURE.md`, `docs/ANALYSIS_FLOW.md`, `docs/UI_FLOW.md`) is maintained for historical context but is superseded by the new handover documentation.

## Product principle

This is an **industrial R&D analysis application**, not a SaaS marketing website.

The design should feel:

- precise,
- controlled,
- technical,
- clean,
- trustworthy,
- data-first,
- restrained.

It must not look like a generic AI-generated dashboard.

## Quick start

```bash
# Install dependencies
npm install

# Start dev servers (frontend + auth backend)
npm run dev
# or run separately:
# npm run dev          # Vite on :5173
# npm run dev:server   # Fastify on :3000
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server |
| `npm run dev:server` | Start Fastify auth backend (tsx watch) |
| `npm run build` | Production build (tsc + vite) |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint on src/ |
| `npm run typecheck` | TypeScript noEmit |
| `npm run test` | Vitest unit/integration tests |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run db:generate` | Drizzle generate migrations |
| `npm run db:migrate` | Run migrations (requires live Postgres) |
| `npm run db:seed` | Seed admin user (requires live Postgres) |

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI Font | IBM Plex Sans, IBM Plex Mono |
| Testing | Vitest (unit), Playwright (E2E), Testing Library |
| Auth Backend | Fastify, @fastify/cookie, @fastify/rate-limit, Argon2id, Drizzle ORM, PostgreSQL |
| Database | PostgreSQL (local), Drizzle Kit |
| Icons | Lucide React |

## Architecture

```
src/
├── presentation/     # UI components, pages, routing (App.tsx)
├── domain/           # Types, interfaces, formatters
├── data/             # Fixture repositories, mock data
├── __tests__/        # Frontend unit tests
└── main.tsx          # Entry point

server/
├── src/
│   ├── app.ts        # Fastify app with injected AuthStore
│   ├── db.ts         # Drizzle client
│   └── __tests__/    # Auth backend tests
└── package.json      # (shared)

db/
├── schema.ts         # Drizzle schema (users, sessions)
├── migrate.ts        # Migration runner
├── seed.ts           # Admin seed (admin@local.test / change-me-local-only)
└── migrations/       # Generated SQL
```

## Three-layer rule

1. **Presentation/UI** — `src/presentation/` — never knows PostgreSQL, hardware protocols, or CV implementation.
2. **Application/Domain** — `src/domain/` — stable interfaces, formatters, validation.
3. **Data/Infrastructure** — `src/data/` + `server/` + `db/` — mock repositories, real repositories, database.

Mock repositories implement interfaces that real repositories can later replace.

## Mock data

All stakeholder-facing values are deterministic fixtures. No `Math.random()` for test results.

Named scenarios:

| Scenario ID | Description |
|-------------|-------------|
| `nominal-01` | Baseline passing test |
| `direction-offset-01` | Spray angle offset from centerline |
| `pattern-asymmetry-01` | Left/right asymmetry in spray pattern |
| `alignment-review-01` | Bottle/nozzle alignment issues |

All fixtures labeled **Simulation Mode**, **Mock capture**, **Fixture data** throughout UI.

## Auth backend (local)

- Fastify server with HttpOnly cookie sessions
- Argon2id password hashing
- Drizzle ORM + PostgreSQL
- Injected `AuthStore` interface; `MemoryAuthStore` for unit tests
- Seed: `admin@local.test` / `change-me-local-only` — **never commit or deploy this**

```bash
# Requires running local PostgreSQL
cp .env.example .env
# edit .env with your DATABASE_URL and SESSION_SECRET
npm run db:migrate
npm run db:seed
npm run dev:server
```

Frontend login remains fixture-only in this MVP; production will connect to `/api/auth`.

## Design system

- White/blue technical palette (`--primary: #075AA8`)
- Radius scale: `sm` (4px), `md` (6px), `lg` (8px) — **no `rounded-2xl`**
- Borders for real boundaries only (tools, metric clusters, camera viewports, reports, dialogs)
- Table-first data layouts, not card grids
- Measurement overlays with real purpose
- Focus-visible ring: 2px primary, 2px offset
- Print styles hide nav/controls

## Known limitations / Next steps

See `docs/HANDOVER.md` for detailed backlog completion status, acceptance criteria gaps, and prioritized next work.
