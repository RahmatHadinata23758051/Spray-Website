# AGENTS.md — Repository Rules for OpenCode

## Mission

Build the software-first MVP for the Spraybot / Mesin Uji Spray Botol interface.

Hardware does not exist yet.

The repository must produce a credible, polished, deterministic mock application that can later accept real machine, camera, and CV integrations.

---

## Mandatory reading order

Before changing code, read:

1. `docs/PRD.md`
2. `docs/DESIGN.md`
3. `docs/ARCHITECTURE.md`
4. `docs/ANALYSIS_FLOW.md`
5. `docs/UI_FLOW.md`
6. `docs/MOCK_DATA.md`
7. `docs/SKILLS.md`

Treat these as the product contract.

Do not invent requirements that conflict with them.

---

## First action in a fresh repository

Do not immediately code.

1. Inspect repository state.
2. Inspect available OpenCode skills.
3. Load the relevant frontend/UX/accessibility/review skills.
4. Produce an implementation plan divided into small backlogs.
5. Map each backlog to acceptance criteria.
6. Identify blocking questions only.
7. Wait for user approval before large implementation work.

---

## Architecture rule

Respect three layers:

1. Presentation / UI
2. Application / Domain
3. Data / Infrastructure

UI components must not directly know PostgreSQL, hardware protocol, or future CV implementation details.

Mock repositories must implement stable interfaces that real repositories can later replace.

---

## Hardware rule

No hardware exists.

Never fabricate:
- real camera connection,
- PLC online status,
- actuator response,
- real CV inference.

Use explicit labels:
- Simulation Mode
- Mock capture
- Fixture data

---

## Frontend-first rule

Frontend quality is the primary objective of the first milestone.

Build the screen and flow architecture before expanding backend scope.

The backend is only required to establish final authentication architecture using local PostgreSQL.

Do not build analysis/business backend APIs yet.

---

## Database secret rule

The developer uses local PostgreSQL.

Never hardcode or commit local passwords.

Generate:
- `.env.example` with placeholders,
- `.gitignore` covering real env files.

Read credentials only from environment variables.

---

## Design rule

`docs/DESIGN.md` is binding.

Reject generic AI aesthetics.

Specifically avoid:
- gradients as decoration,
- glassmorphism,
- giant radius,
- card soup,
- generic SaaS hero layouts,
- decorative icon tiles,
- glow,
- random badges,
- oversized headings,
- Inter/Geist default styling,
- gratuitous animation.

Prefer:
- clear alignment,
- table-first data,
- restrained panels,
- visible hierarchy,
- deliberate typography,
- white/blue technical palette,
- useful measurement overlays.

---

## UI implementation rule

Do not implement a screen as a pile of placeholder cards.

Before coding each page:

1. state the page's job,
2. identify the primary action,
3. identify critical data,
4. define empty/loading/error/partial states,
5. define responsive behavior,
6. implement.

Use realistic labels and deterministic fixture content.

No lorem ipsum.

---

## Analysis Workspace rule

This is the flagship screen.

It must clearly separate:

- Side Camera analysis,
- Front Camera analysis,
- Rear Camera validation.

It must support:

- Original,
- Mask,
- Overlay,
- frame timeline,
- stable analysis window,
- camera-specific metrics.

Do not use one generic metrics panel for all cameras.

---

## Mock data rule

Core values must be deterministic.

Do not generate stakeholder-facing test results with `Math.random()`.

Create named fixture scenarios.

---

## Quality gates

After each backlog:

1. lint,
2. typecheck,
3. tests,
4. production build,
5. visual review against `DESIGN.md`,
6. accessibility review for changed UI.

For major workflow milestones, run Playwright.

Do not report a backlog as complete when these checks fail.

---

## Reporting format

After each backlog, report:

```text
Backlog:
Implemented:
Files changed:
Validation:
Design review:
Known limitations:
Next:
```

Be concise but concrete.

---

## Change discipline

- prefer small cohesive diffs,
- do not refactor unrelated code,
- do not add libraries without purpose,
- do not create abstractions before they are needed,
- keep components feature-oriented,
- preserve type safety,
- remove dead placeholder UI once a real screen exists.

---

## Decision priority

When guidance conflicts, follow:

1. explicit user instruction,
2. project Markdown contracts,
3. established repository patterns,
4. loaded skill guidance,
5. framework defaults.

Never let a generic skill override the project design system.
