# ARCHITECTURE — Software-First MVP

## 1. Architecture objective

The software must be easy to demo today and easy to connect to real machine hardware later.

Do not over-engineer.

Use a **3-layer architecture** with clear dependency direction.

---

## 2. Three development layers

### Layer 1 — Presentation / UI

Responsibilities:

- routes,
- layouts,
- pages,
- design system,
- camera analysis views,
- forms,
- tables,
- charts,
- user interaction.

Must not contain:
- direct PostgreSQL access,
- hardware protocols,
- raw persistence logic.

---

### Layer 2 — Application / Domain

Responsibilities:

- test workflow,
- simulation state machine,
- analysis result contracts,
- transformation from API/mock data into UI models,
- validation rules,
- user/session application logic.

Examples:

- `createTest()`
- `startSimulation()`
- `getAnalysisResult()`
- `getTestHistory()`

Future hardware/CV adapters connect here through stable interfaces.

---

### Layer 3 — Data / Infrastructure

Responsibilities:

- mock fixture provider,
- HTTP client,
- auth API,
- PostgreSQL persistence for authentication,
- future hardware/CV adapters.

Today:
- analysis data = fixture-backed mock provider,
- auth = local API + PostgreSQL.

Later:
- fixture provider can be replaced by real API/hardware/CV services.

---

## 3. Recommended stack

Keep the first implementation conventional and easy for coding agents to maintain.

### Frontend

- React
- TypeScript strict mode
- Vite
- React Router
- Tailwind CSS with custom design tokens
- Radix primitives only where behavior/accessibility helps
- ECharts or equivalent for telemetry
- SVG/canvas overlays for spray analysis
- Zod for runtime contract validation

Important:
- do not use default Tailwind palette as the product design,
- do not paste a default shadcn theme,
- if shadcn/Radix code is used, restyle it fully to `DESIGN.md`.

### Backend

Setup only for MVP authentication:

- Node.js + TypeScript
- Fastify
- PostgreSQL local
- Drizzle ORM or another small typed SQL layer
- Argon2id password hashing
- HttpOnly cookie-based session

No analysis backend is required in this phase.

### Database

PostgreSQL local.

Never hardcode database credentials in source code or committed Markdown.

Expected environment shape:

```env
DATABASE_URL=postgresql://postgres:<LOCAL_PASSWORD>@localhost:5432/spraybot
SESSION_SECRET=<LOCAL_SECRET>
```

The developer supplies real values in a local uncommitted `.env`.

Create `.env.example` with placeholders only.

---

## 4. Repository shape

A simple single repository is enough.

```text
/
├── docs/
│   └── optional generated notes
├── src/
│   ├── app/
│   │   ├── router/
│   │   ├── providers/
│   │   └── shell/
│   ├── pages/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── tests/
│   │   ├── capture/
│   │   ├── analysis/
│   │   ├── history/
│   │   ├── reports/
│   │   ├── products/
│   │   ├── calibration/
│   │   └── users/
│   ├── domain/
│   │   ├── test/
│   │   ├── analysis/
│   │   └── camera/
│   ├── data/
│   │   ├── mocks/
│   │   ├── repositories/
│   │   └── http/
│   ├── components/
│   ├── styles/
│   └── assets/
├── server/
│   └── src/
│       ├── auth/
│       ├── db/
│       ├── middleware/
│       └── app.ts
├── db/
│   ├── schema/
│   └── migrations/
├── public/
├── AGENTS.md
├── README.md
├── docs/
│   ├── PRD.md
│   ├── DESIGN.md
│   ├── ARCHITECTURE.md
│   ├── ANALYSIS_FLOW.md
│   ├── UI_FLOW.md
│   ├── MOCK_DATA.md
│   ├── SKILLS.md
│   └── REFERENCES.md
└── ...
```

Do not create a monorepo/package maze unless the codebase later requires it.

---

## 5. Auth architecture

### MVP auth scope

Required:

- login,
- logout,
- current session,
- role,
- enabled/disabled account,
- seed local admin.

Suggested schema:

```text
users
- id
- email
- display_name
- password_hash
- role
- is_active
- created_at
- updated_at

sessions
- id
- user_id
- token_hash
- expires_at
- created_at
```

Use secure cookies.

Do not store plaintext passwords.

---

## 6. Mock analysis boundary

Define a repository interface:

```ts
interface TestRepository {
  listTests(): Promise<TestSummary[]>
  getTest(id: string): Promise<TestResult>
  createTest(input: CreateTestInput): Promise<Test>
}

interface AnalysisRepository {
  getCapture(testId: string): Promise<CaptureSequence>
  getAnalysis(testId: string): Promise<AnalysisResult>
}
```

Initial implementation:

```text
FixtureTestRepository
FixtureAnalysisRepository
```

Future implementation:

```text
ApiTestRepository
MachineAnalysisRepository
```

The pages should not care which implementation is active.

---

## 7. Simulation state machine

Recommended states:

```text
idle
→ configured
→ pre_capture
→ capturing
→ processing
→ complete
```

Optional failure:

```text
→ failed
```

Sub-phase shown during capture:

```text
pre_spray
build_up
stable
decay
```

Keep timing deterministic for demos.

---

## 8. Future hardware integration contract

Do not implement now.

Reserve interfaces for:

```ts
interface MachineGateway {
  getStatus(): Promise<MachineStatus>
  configureTest(config: MachineTestConfig): Promise<void>
  startTest(): Promise<void>
  abortTest(): Promise<void>
}

interface CameraGateway {
  getCameraStatus(): Promise<CameraStatus[]>
  startSynchronizedCapture(): Promise<CaptureId>
}

interface VisionGateway {
  analyze(captureId: string): Promise<AnalysisResult>
}
```

No UI page should import hardware SDK code directly.

---

## 9. Security rules

- no hardcoded passwords,
- no secrets in Git,
- `.env` ignored,
- secure password hash,
- server validates all auth inputs,
- session expiry,
- role check server-side,
- no trust in frontend role state alone,
- use parameterized queries/ORM,
- basic login rate limiting when backend is enabled.

---

## 10. Testing strategy

Frontend:
- unit tests for calculations/formatters/state,
- component tests for critical screens,
- Playwright for:
  - login,
  - new simulated test,
  - analysis navigation,
  - history/result view.

Backend:
- auth route tests,
- password hashing test,
- session lifecycle test,
- DB schema migration test.

Quality gates:
- lint,
- typecheck,
- tests,
- production build,
- visual design review,
- accessibility review.
