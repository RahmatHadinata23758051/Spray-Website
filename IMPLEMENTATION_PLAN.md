# IMPLEMENTATION_PLAN — Spraybot Software MVP

## Initialization summary

This plan is based on the binding project contracts:

1. `docs/PRD.md`
2. `docs/DESIGN.md`
3. `docs/ARCHITECTURE.md`
4. `docs/ANALYSIS_FLOW.md`
5. `docs/UI_FLOW.md`
6. `docs/MOCK_DATA.md`
7. `docs/SKILLS.md`
8. `AGENTS.md`
9. `docs/REFERENCES.md`

Current repository state:

- Documentation-only repository.
- No `package.json` yet.
- No frontend framework yet.
- No backend code yet.
- No build, lint, typecheck, test, or Playwright configuration yet.
- Product mode is software-only: no real machine, no real cameras, no PLC/ESP32 connection, no real CV pipeline.

## Loaded skill set for implementation

Small useful set selected for this project:

- `anti-ui-slop` — final interface audit and product-specific UI discipline.
- `design-taste-frontend` — design craft guidance; project `docs/DESIGN.md` overrides it where conflicts exist.
- `frontend-responsive-design-standards` — responsive behavior and breakpoint discipline.
- `product-ux-expert` — UX states, WCAG 2.2 AA, interaction heuristics.
- `typescript-project` — TypeScript strict-mode project structure and layer boundaries.
- `vercel-react-best-practices` — React performance and bundle hygiene.
- `comprehensive-testing` — test strategy and quality gates.
- `playwright-automation` — browser-based milestone validation.

Project contracts override all generic skill advice.

## Proposed stack

### Frontend

- React
- TypeScript strict mode
- Vite
- React Router
- Tailwind CSS with custom CSS variables from `docs/DESIGN.md`
- Zod for fixture/runtime contract validation
- Vitest + React Testing Library
- Playwright for major workflow validation
- SVG-based analysis overlays for the first version

### Backend, later phase only

- Node.js + TypeScript
- Fastify
- PostgreSQL local
- Drizzle ORM
- Argon2id password hashing
- HttpOnly cookie sessions

### Why this stack

This follows `docs/ARCHITECTURE.md`, stays simple, avoids a monorepo/package maze, supports fast frontend iteration, and leaves clean boundaries for later real hardware/CV integrations.

## Architecture rules to preserve

The codebase must keep three layers:

```text
Presentation / UI
  ↓ uses
Application / Domain
  ↓ uses
Data / Infrastructure
```

Required boundaries:

- UI pages/components must not directly know PostgreSQL, machine protocols, camera SDKs, or CV implementation details.
- Fixture repositories must implement stable interfaces.
- Future real repositories must be able to replace fixture repositories without redesigning the UI.
- Analysis/business backend APIs are not part of the first frontend milestone.

Initial repository shape target:

```text
/
├── docs/
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
│   │   ├── fixtures/
│   │   ├── mocks/
│   │   └── repositories/
│   ├── components/
│   ├── styles/
│   └── assets/
├── tests/
├── e2e/
├── server/        # introduced when auth backend starts
├── db/            # introduced when auth backend starts
├── public/
├── AGENTS.md
├── README.md
└── IMPLEMENTATION_PLAN.md
```

## Design contract

The UI direction is **Technical Editorial / Industrial Instrumentation**.

Must use:

- restrained white/blue technical palette,
- IBM Plex Sans and IBM Plex Mono,
- table-first layouts where appropriate,
- compact left navigation,
- top contextual bar,
- deliberate borders and alignment,
- controlled density,
- measurement overlays with real purpose.

Must avoid:

- gradient-heavy UI,
- gradient text,
- glassmorphism,
- glow,
- giant rounded cards,
- generic SaaS hero layouts,
- decorative icon tiles,
- card soup,
- random pills/badges,
- fake marketing language,
- default Inter/Geist visual language.

## Mock-only boundaries

The following remain mock-only until real hardware/CV exists:

- camera capture,
- synchronized frame streams,
- machine status,
- PLC/ESP32 connection,
- actuator response,
- CV preprocessing,
- segmentation/masks,
- calibrated measurements,
- result thresholds,
- report exports beyond local mock CSV/printable preview.

Required labels:

- `Simulation Mode`
- `Mock capture`
- `Fixture data`
- `Mock calibration`

No screen may imply real hardware is online.

---

# Backlogs

## Backlog 0 — Project scaffold and quality tooling

### Goal

Create the minimal working TypeScript/Vite foundation and quality gates without building product screens yet.

### Dependencies

- Node/npm available locally.
- User approval of this implementation plan.

### Tasks

- Initialize React + TypeScript + Vite.
- Configure strict TypeScript.
- Configure Tailwind CSS with project tokens.
- Add Vitest and React Testing Library.
- Add Playwright configuration.
- Add lint/format tooling.
- Add `.gitignore` and `.env.example` with placeholders only.
- Add basic route shell placeholders only where necessary to verify boot.

### Acceptance criteria

- `package.json` exists with scripts for `dev`, `lint`, `typecheck`, `test`, `build`, and `test:e2e`.
- TypeScript strict mode is enabled.
- Tailwind uses custom Spraybot tokens, not the default visual theme.
- `.env` is ignored.
- `.env.example` contains placeholder `DATABASE_URL` and `SESSION_SECRET` only.
- The app boots locally.
- No real product flow is implemented yet.

### Validation

- lint passes.
- typecheck passes.
- unit test command passes.
- production build passes.

### Mock-only notes

All product data remains unimplemented or fixture-planned.

---

## Backlog 1 — Design tokens, primitive components, and app shell

### Goal

Establish the visual foundation and navigation system before building screens.

### Tasks

- Implement global CSS variables from `docs/DESIGN.md`.
- Load IBM Plex Sans and IBM Plex Mono.
- Create primitive components:
  - button,
  - input,
  - select,
  - textarea,
  - status indicator,
  - table primitives,
  - tabs,
  - panel,
  - empty/loading/error state blocks.
- Create application shell:
  - compact left navigation,
  - top contextual bar,
  - visible `Simulation Mode`,
  - main working canvas.
- Add route map matching `docs/UI_FLOW.md`.

### Acceptance criteria

- All primary screen routes are reachable.
- Shell clearly shows `Simulation Mode`.
- Components follow radius scale: 2px, 4px, 6px, 8px.
- No decorative gradients, glow, glass, or giant cards.
- Keyboard focus is visible.
- Tablet layout has collapsed/adapted navigation.

### Validation

- lint, typecheck, tests, build.
- Visual review against `docs/DESIGN.md`.
- Accessibility review for navigation and primitives.

### Mock-only notes

No live system status. Shell status is simulation-only.

---

## Backlog 2 — Domain contracts and deterministic fixtures

### Goal

Create stable typed interfaces and deterministic fixture repositories for the frontend workflow.

### Tasks

- Define domain types for:
  - tests,
  - test configuration,
  - capture sequence,
  - camera identities,
  - analysis result,
  - temporal metrics,
  - fixture scenario IDs.
- Add Zod schemas for fixture validation.
- Implement repository interfaces:
  - `TestRepository`,
  - `AnalysisRepository`.
- Implement fixture repositories:
  - `FixtureTestRepository`,
  - `FixtureAnalysisRepository`.
- Add named scenarios:
  - `nominal-01`,
  - `direction-offset-01`,
  - `pattern-asymmetry-01`,
  - `alignment-review-01`.
- Add shared measurement formatters.

### Acceptance criteria

- No `Math.random()` for stakeholder-facing measurements.
- Fixtures are stable across reloads.
- All core values use canonical units from `docs/MOCK_DATA.md`.
- Repositories can later be replaced by API/hardware-backed implementations.
- Tests cover formatter and fixture validation logic.

### Validation

- lint, typecheck, unit tests, build.

### Mock-only notes

All tests, captures, frames, masks, overlays, and analysis results are fixture data.

---

## Backlog 3 — Login visual and local auth placeholder boundary

### Goal

Build the login screen visually and architect it for later real local authentication.

### Tasks

- Implement login page.
- Include product name, descriptor, email/password fields, sign-in action, local system status.
- Show simulation/local system messaging without marketing copy.
- Add form validation and accessible errors.
- Use placeholder auth provider interface for frontend flow only.

### Acceptance criteria

- Login page has no marketing hero.
- Form labels are visible; placeholders are not labels.
- Password visibility control is accessible if included.
- Error, loading, and disabled states exist.
- Auth implementation is clearly mock/frontend-only until backend backlog.

### Validation

- lint, typecheck, tests, build.
- Accessibility review of form labels, errors, tab order, and focus.

### Mock-only notes

No real PostgreSQL login until auth backend backlog.

---

## Backlog 4 — Dashboard

### Goal

Build the operational overview that answers “what should I inspect or do next?”

### Tasks

- Implement dashboard layout:
  - narrow system/simulation status strip,
  - latest test summary,
  - compact mechanical/analysis summary,
  - recent tests table,
  - primary `New Test` action.
- Use fixtures from repositories.
- Avoid KPI card wall.
- Add empty/loading/error/partial states.

### Acceptance criteria

- Dashboard is not a generic card grid.
- Recent tests are table-first.
- `Simulation Mode` is visible.
- One clear primary action: `New Test`.
- No fake hardware-online indicators.

### Validation

- lint, typecheck, tests, build.
- Visual review against `docs/DESIGN.md`.
- Accessibility review.

### Mock-only notes

Dashboard data comes from fixture repositories.

---

## Backlog 5 — New Test / Test Setup

### Goal

Allow the operator to configure a simulated test with a deterministic fixture scenario.

### Tasks

- Implement test setup form groups:
  - sample,
  - test parameters,
  - fixture source,
  - notes.
- Include compact pre-run summary.
- Distinguish operator-entered values from future hardware-sourced values.
- Add save draft and `Start simulated test` actions.
- Add validation and error states.

### Acceptance criteria

- Required fields are validated.
- Fixture dataset selection is explicit.
- Copy says `Start simulated test`, not real machine start.
- The next step routes to Capture Monitor.
- No fake hardware state is shown.

### Validation

- lint, typecheck, tests, build.
- Form accessibility review.

### Mock-only notes

Starting a test only starts the deterministic simulation state machine.

---

## Backlog 6 — Capture Monitor

### Goal

Represent the future synchronized acquisition sequence using mock camera fixtures.

### Tasks

- Implement synchronized Side, Front, and Rear camera preview regions.
- Implement capture timeline and phase display:
  - pre-spray,
  - build-up,
  - stable,
  - decay,
  - complete.
- Implement deterministic simulated phase progression.
- Add `Open analysis` once capture is complete.
- Label all frames as mock fixtures.

### Acceptance criteria

- Required label: `Simulation mode — fixture capture`.
- All three camera roles are visible.
- Timeline communicates capture progress.
- Completion enables analysis route.
- No fake camera online/PLC connected state.

### Validation

- lint, typecheck, tests, build.
- Visual and accessibility review.

### Mock-only notes

Camera previews are representative fixture visuals/SVGs, not real streams.

---

## Backlog 7 — Analysis Workspace foundation

### Goal

Build the flagship analysis workspace shell with camera switching, viewport modes, inspector region, and timeline.

### Tasks

- Implement analysis header:
  - test ID,
  - product/sample,
  - operator,
  - timestamp,
  - mode,
  - result state.
- Implement camera switch:
  - Side,
  - Front,
  - Rear.
- Implement display mode switch:
  - Original,
  - Mask,
  - Overlay.
- Implement main viewport, right inspector, bottom frame timeline.
- Implement stable analysis window indicator.
- Add mock limitation copy.

### Acceptance criteria

- Workspace is not a dashboard.
- It has large central analysis viewport.
- Inspector is camera-specific, not generic.
- Timeline shows frame index, timestamp, and stable-window range.
- Simulation/fixture status is obvious.

### Validation

- lint, typecheck, tests, build.
- Visual review against `docs/DESIGN.md`.
- Accessibility review of tabs and controls.

### Mock-only notes

All frames and overlays are fixture representations.

---

## Backlog 8 — Analysis Workspace camera overlays and metrics

### Goal

Complete camera-specific analysis presentations.

### Tasks

- Side Camera:
  - spray length,
  - spray angle,
  - maximum vertical spread,
  - direction offset,
  - nozzle origin,
  - calibrated axis,
  - boundary,
  - angle rays,
  - centerline,
  - length marker,
  - vertical spread marker.
- Front Camera:
  - spray area,
  - equivalent diameter,
  - circularity,
  - centroid offset,
  - horizontal/vertical symmetry,
  - contour,
  - equivalent circle,
  - centroid,
  - axes.
- Rear Camera:
  - bottle alignment,
  - nozzle alignment,
  - actuator offset,
  - bottle tilt,
  - movement during test,
  - reference axis,
  - bottle axis,
  - nozzle center,
  - actuator center,
  - tilt line,
  - offset vector.

### Acceptance criteria

- Each camera has distinct metrics and overlays.
- Rear camera is presented as mechanical validation, not spray characterization.
- No threshold claims are invented.
- Measurement precision is reasonable.
- Overlay colors are restrained and camera-specific.

### Validation

- lint, typecheck, tests, build.
- Visual review.
- Accessibility text alternatives for analysis graphics.

### Mock-only notes

Metrics are deterministic fixture outputs, not CV results.

---

## Backlog 9 — Final Result detail

### Goal

Create one canonical readable result page per simulated test.

### Tasks

- Implement result identity/status section.
- Show mechanical parameters.
- Show Side Camera results.
- Show Front Camera results.
- Show Rear validation.
- Show temporal stability summary.
- Show representative images/diagrams.
- Add notes/export area.

### Acceptance criteria

- Page summarizes one finalized test clearly.
- It is readable without operating the interactive workspace.
- Report/export actions are marked mock where needed.
- No decorative dashboard cards.

### Validation

- lint, typecheck, tests, build.
- Visual/accessibility review.

### Mock-only notes

Export is mock/local until reporting backlog expands it.

---

## Backlog 10 — History

### Goal

Build table-first test history with usable search and filters.

### Tasks

- Implement history table with columns:
  - Test ID,
  - date/time,
  - product,
  - sample ID,
  - operator,
  - test state,
  - rear validity,
  - action.
- Add filters:
  - search,
  - product,
  - user,
  - date,
  - state.
- Add empty/loading/error states.

### Acceptance criteria

- History is table-first, not card-based.
- Filters are keyboard accessible.
- Result view action routes to result page.
- Long labels do not break layout.

### Validation

- lint, typecheck, tests, build.
- Accessibility review of table and filters.

### Mock-only notes

History comes from fixture repository.

---

## Backlog 11 — Reports

### Goal

Provide a quiet report preview and mock export workflow.

### Tasks

- Choose existing test.
- Preview report layout.
- Include measurement tables and representative diagrams/images.
- Add mock CSV export.
- Add printable report view.

### Acceptance criteria

- Report is quiet and print-oriented.
- It avoids decorative dashboard cards.
- CSV export is clearly mock/local.
- PDF is deferred unless time allows.

### Validation

- lint, typecheck, tests, build.
- Print layout smoke review.

### Mock-only notes

Reports use deterministic fixture data.

---

## Backlog 12 — Products / Presets

### Goal

Build lightweight product/sample preset management UI.

### Tasks

- Table-first presets page.
- Fields:
  - name,
  - default force,
  - default duration,
  - default stroke,
  - updated date,
  - notes.
- Add create/edit mock modal or inline form.

### Acceptance criteria

- Table-first layout.
- Presets can be selected in New Test later.
- Empty/loading/error states exist.
- No backend persistence claim.

### Validation

- lint, typecheck, tests, build.
- Accessibility review.

### Mock-only notes

Presets are in-memory/fixture until persistence is added.

---

## Backlog 13 — Mock Calibration / System

### Goal

Represent future calibration concepts without claiming real calibration.

### Tasks

- Implement mock calibration page sections:
  - side camera scale,
  - front reference center,
  - rear alignment reference,
  - ROI preview.
- Label every value as mock/demo.
- Add explanatory future-integration copy.

### Acceptance criteria

- Page always shows `Mock calibration`.
- It does not imply calibration is connected to hardware.
- Concepts match `docs/ANALYSIS_FLOW.md`.
- No invented thresholds.

### Validation

- lint, typecheck, tests, build.
- Visual/accessibility review.

### Mock-only notes

All calibration values are demo fixture values.

---

## Backlog 14 — Users frontend

### Goal

Build the admin users UI that will later connect to real auth backend.

### Tasks

- Implement user list table.
- Include create account form shell.
- Include role and enabled/disabled status.
- Add frontend validation and states.

### Acceptance criteria

- Users page is admin-oriented and table-first.
- Disabled status is text + visual indicator, not color alone.
- It does not claim real user persistence until backend is integrated.

### Validation

- lint, typecheck, tests, build.
- Accessibility review.

### Mock-only notes

Users are fixtures until auth backend is implemented.

---

## Backlog 15 — Auth backend and PostgreSQL wiring

### Goal

Add real local authentication architecture only after frontend flow is established.

### Tasks

- Add Fastify server structure.
- Add Drizzle and PostgreSQL schema for:
  - users,
  - sessions.
- Add `.env.example` placeholders.
- Read real credentials only from local `.env`.
- Implement:
  - login,
  - logout,
  - current session,
  - role,
  - enabled/disabled account,
  - seed local admin.
- Use Argon2id password hashing.
- Use HttpOnly secure cookie session.
- Add server-side validation and basic login rate limiting.

### Acceptance criteria

- No database passwords are hardcoded or committed.
- Passwords are never stored plaintext.
- Session cookie is HttpOnly.
- Disabled accounts cannot log in.
- Frontend auth provider uses backend endpoints.
- No analysis/business backend APIs are added.

### Validation

- lint, typecheck, backend tests, frontend tests, build.
- Auth route tests.
- Password hashing test.
- Session lifecycle test.
- DB migration test if migration tooling is introduced.

### Mock-only notes

Only authentication becomes real. Analysis/test data remains fixture-backed.

---

## Backlog 16 — Cross-screen workflow validation

### Goal

Validate the main end-to-end operator journey.

### Tasks

- Ensure route continuity:
  - login,
  - dashboard,
  - new test,
  - capture monitor,
  - analysis workspace,
  - final result,
  - history/export.
- Add Playwright tests for critical paths.
- Test desktop targets:
  - 1366×768,
  - 1440×900,
  - 1920×1080.
- Smoke test tablet width.

### Acceptance criteria

- A user can complete a fully simulated test flow.
- Simulation labels are visible on required screens.
- Analysis workspace remains usable at desktop sizes.
- Tablet does not crush analysis viewport into unusable cards.

### Validation

- lint, typecheck, tests, build.
- Playwright.
- Browser visual review.
- Accessibility review.

### Mock-only notes

Workflow is end-to-end simulated; no real hardware/CV claims.

---

## Backlog 17 — Final UI anti-slop and accessibility gate

### Goal

Run final design, UX, accessibility, and production readiness review.

### Tasks

- Audit against `docs/DESIGN.md` checklist.
- Audit for forbidden AI-slop patterns.
- Audit information hierarchy and page purpose.
- Audit focus order and keyboard access.
- Audit contrast and non-color-only status.
- Audit empty/loading/error/partial states.
- Fix visible clipping, overflow, broken states, or generic placeholder UI.

### Acceptance criteria

- No obvious AI-generated design patterns remain.
- Every major screen has a clear job and primary action.
- Tables are used where specified.
- Cards/panels represent real boundaries only.
- WCAG 2.2 AA target is respected as far as automated/manual review can verify.
- Production build passes.

### Validation

- lint.
- typecheck.
- tests.
- production build.
- Playwright critical workflows.
- Visual review against `docs/DESIGN.md`.
- Accessibility review.

### Mock-only notes

Final review must verify all mock-only areas are explicitly labelled.

---

# Cross-cutting acceptance criteria

The MVP is acceptable when:

- local login works after backend auth backlog,
- all primary screens are reachable,
- a user can run a fully simulated test from setup to result,
- the analysis workspace clearly separates Side, Front, and Rear Camera responsibilities,
- deterministic fixture data is used instead of render-time random values,
- simulation state is clearly labelled,
- history is table-first and usable,
- desktop layouts work at 1366×768 and 1920×1080,
- tablet layouts remain usable,
- keyboard focus and contrast meet WCAG 2.2 AA targets,
- lint, typecheck, tests, and production build pass,
- no major AI-slop design patterns remain.

# Blocking questions

No genuinely blocking product question was found for planning.

Before Backlog 0 implementation, only one operational confirmation is needed:

1. Should dependency installation use `npm` as the default package manager, or do you prefer `pnpm`/`bun`?

If no preference is given, use `npm` for lowest-friction local setup on Windows.
