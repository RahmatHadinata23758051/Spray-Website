# REDESIGN_PLAN — Spraybot Visual & Interaction Overhaul

**Target Visual Character**: Precision R&D Workstation  
**Design Dials**: DESIGN_VARIANCE 5 / MOTION_INTENSITY 2 / VISUAL_DENSITY 8  
**Key References**: Attio (layout/sidebar/records), Linear (calm hierarchy & subtle states), Figma (Analysis Workspace composition), Grafana (telemetry & metrics).

---

## 1. Audit of Current UI Gaps

| # | Current Defect | Contract Violation | Target Fix |
|---|---|---|---|
| 1 | **Styled Wireframe Look** | `DESIGN.md` §1 (clinical, trustworthy, visually disciplined) | Add real surface depth, subtle borders (`#D5DEE8`), contrast layering, and crisp technical data hierarchy. |
| 2 | **Excessive Empty Space** | `DESIGN.md` §5 & Taste Skill Visual Density 8 | Increase visual density; replace empty white voids with structured telemetry panels, metadata bars, and dense tables. |
| 3 | **Unfinished Vertical Sidebar** | `UI_FLOW.md` §1 & Attio/Linear reference | Redesign sidebar with brand header, grouped navigation sections, icon support, subtle active states (`bg-primary-soft`), and user/system footer. |
| 4 | **Uniform Border Weight Everywhere** | `DESIGN.md` §2 Card rule | Reserve borders for functional boundaries (workspaces, inspectors, timelines). Differentiate background canvas (`#F5F8FC`) from work surface (`#FFFFFF`) and subtle panels (`#EDF3F9`). |
| 5 | **Dashboard Lacks Focal Point** | `DESIGN.md` §8 & `UI_FLOW.md` §4 | Remove flat equal-weight cards. Make "Latest Test / Resume Analysis" the dominant visual anchor, paired with temporal stability graphs and recent tests. |
| 6 | **Monospace Overuse & Flat Type** | `DESIGN.md` §4 Typography rules | Use IBM Plex Sans for headings, labels, and standard values. Restrict IBM Plex Mono strictly to Test IDs, timestamps, raw coordinates, and machine readouts. |
| 7 | **Analysis Workspace SVG Line-Art Placeholders** | `PRD.md` §7.5 & `ANALYSIS_FLOW.md` §9 | Build realistic SVG/Canvas segmentation masks & calibrated technical overlays over high-contrast simulated spray frame canvas (Side, Front, Rear). |
| 8 | **Capture Screen Card Grid** | `PRD.md` §7.4 & `UI_FLOW.md` §6 | Convert into a synchronized 3-camera console with one dominant main view + two secondary streams, frame-rate/phase telemetry, and stable-window scrubber. |
| 9 | **Weak Workflow Continuity** | `UI_FLOW.md` §2 Operator journey | Build clear visual thread (breadcrumbs, status tags, shared fixture IDs, step transitions) connecting Setup → Capture → Analysis → Result. |
| 10 | **Generic SaaS Appearance** | `DESIGN.md` §2 Anti-slop contract | Remove default borders, loose padding, and unstyled inputs. Use 2-8px radius scale, dark navy text (`#10243E`), and Paragon Blue (`#075AA8`) accents. |
| 11 | **Auth Backend Disconnect** | `ARCHITECTURE.md` §5 & User Instruction | Frontend currently signs in through a timer without calling the API. Wire it to `/auth/login`, `/auth/me`, and `/auth/logout`; restore sessions on refresh; protect application routes. |
| 12 | **Authentication verification is mock-only** | `ARCHITECTURE.md` §10 & User Instruction | `MemoryAuthStore` is acceptable only for isolated unit tests, never the normal runtime path or final integration evidence. Add a PostgreSQL integration suite that migrates, seeds, logs in, restores a session, handles disabled users, logs out, and verifies session invalidation. |
| 13 | **Development seed has a known password fallback** | Database secret rule & User Instruction | Remove the default `change-me-local-only`; make `SEED_ADMIN_PASSWORD` mandatory and fail clearly when missing. Add a dedicated `db:seed:dev` command. |
| 14 | **Navigation and routes are component state, not protected routes** | `UI_FLOW.md` §1 and auth route-protection requirement | Replace the single `page` switch with route-aware navigation while preserving labels and workflow. Unauthenticated access redirects to Login; authenticated refresh restores the requested route. |
| 15 | **Required states are mostly absent** | `UI_FLOW.md` §13 | Define screen-specific loading, empty, error, and partial states. Camera fixture missing, analysis missing, DB unavailable, and export failure need explicit recovery copy. |

---

## 2. Visual & Structural Architecture Decisions

### A. Palette & Layers
- **App Canvas**: `#F5F8FC` (cool technical light tint)
- **Work Surface**: `#FFFFFF` (crisp white panels, 1px border `#D5DEE8`)
- **Subtle Containers**: `#EDF3F9` (viewport borders, dark background fills for camera previews `#0B131F`)
- **Primary Accent**: `#075AA8` (Paragon Blue) with `#E6F0FA` soft background
- **Camera Identity Colors**:
  - Side Camera: `#075AA8` (Primary Blue)
  - Front Camera: `#0D747A` (Deep Teal)
  - Rear Camera: `#475569` (Slate/Graphite)

### B. Typography Scale & Fonts
- **Font Stack**: IBM Plex Sans (primary) + IBM Plex Mono (IDs, timestamps, telemetry coords)
- **Hierarchy**:
  - H1 Page Title: 24px / 600 weight / 32px line-height
  - H2 Section Header: 16px / 600 weight / 24px line-height
  - Body: 14px / 400 weight / 20px line-height
  - Table / Dense Label: 12px / 500 weight / 16px line-height
  - Monospace Data: 13px IBM Plex Mono, `tabular-nums`

### C. Radius & Elevation
- Controls / Buttons: `rounded-xs` (2px) or `rounded-sm` (4px)
- Workspace Panels: `rounded-md` (6px)
- Modals / Floating Menus: `rounded-lg` (8px)
- Elevation: No drop-shadows on flat panels. Borders + background color layers only.

---

## 3. Flagship Screen Plans

### A. Analysis Workspace (Hero Screen)
- **Top Bar**: Test ID (`TST-24-0618`), Product Name, Sample ID, Operator, Timestamp, Status Tag, Mode Selectors (Original / Mask / Overlay).
- **Left Camera Selector**: Vertical tab strip with Side, Front, Rear camera buttons featuring identity color dots and active indicator.
- **Center Canvas**: Dominant 16:9 technical viewer with dark backing (`#0B131F`), calibrated coordinate grid, ROI boundary box, segmented spray contour, nozzle origin, centerline, and measurement vectors.
- **Right Inspector**: Sticky technical panel displaying camera-specific metrics (e.g., Side: Spray Length, Angle, Vertical Spread, Direction Offset) formatted with canonical units.
- **Bottom Timeline**: Synchronized frame scrubber (0–60 frames, 50ms interval), phase indicators (pre-spray, build-up, stable, decay), and highlighted stable analysis window (800–2200ms).

### B. Capture Monitor Console
- **Layout**: 2/3 primary viewport (Side Camera stream) + 1/3 stacked secondary viewports (Front & Rear Cameras).
- **Header Telemetry**: FPS readout (60 fps), Frame counter (`#084 / 060`), Active Phase (`STABLE`), Elapsed Time (`1450 ms`).
- **Footer Controls**: Real-time phase timeline bar, simulation progress bar, and "Open Analysis" trigger once mock capture completes.

### C. Operational Dashboard
- **Header**: System Status Banner (`SIMULATION MODE — Local Workstation`), quick actions (`New Test`, `Resume Latest`).
- **Dominant Tile**: "Latest Test Result Overview" featuring Side & Front metrics + mini spray contour.
- **Side Telemetry Tile**: Temporal Stability summary (Mean vs Std Dev for angle & length).
- **Bottom Section**: Table-first Recent Tests listing with status tags and Rear Alignment validity indicators.

---

## 4. Implementation Phasing

1. **Phase 1: Foundations & Tokens** — CSS variables update, Lucide icons integration, base component primitives (Button, Input, Select, Badge, Table, Panel).
2. **Phase 2: App Shell & Navigation** — Collapsible Attio/Linear-inspired sidebar, top header bar, user session badge.
3. **Phase 3: Analysis Workspace Overhaul** — Canvas rendering engine, realistic SVG masks/overlays for 3 cameras, frame scrubber, inspector panel.
4. **Phase 4: Capture Console Overhaul** — 3-camera console layout, live frame stepper, acquisition telemetry bar.
5. **Phase 5: Operational Dashboard Overhaul** — Asymmetric layout, dominant latest-test block, temporal stability card, recent table.
6. **Phase 6: Setup & Parameters Form** — Form groups (Sample, Parameters, Fixture Dataset), scenario prefill, live parameter validation.
7. **Phase 7: Table Pages (History, Products, Users, Calibration)** — High-density tables, filter bars, status indicators, mock calibration controls.
8. **Phase 8: Reports & Printable Views** — Quiet report preview, print stylesheet, CSV export engine.
9. **Phase 9: Real Authentication Wiring** — Connect React frontend to Fastify `/auth/login`, `/auth/me`, and `/auth/logout`; handle HttpOnly cookies, route protection, disabled users, invalid credentials, logout invalidation, and session restoration. No in-memory fallback in the normal application path.
10. **Phase 10: Verification & Quality Gates** — Run lint, typecheck, Vitest, Playwright E2E, accessibility checks, and build verification.

---

## 5. Verification Plan

- `npm run lint` (ESLint)
- `npm run typecheck` (tsc)
- `npm test -- --run` (Vitest unit tests)
- Postgres integration test: migrate temporary DB, seed admin, start Fastify against real Postgres, test `/auth/login`, `/auth/me`, disabled user blocking, `/auth/logout`, session invalidation.
- `npm run test:e2e` (Playwright E2E workflow tests)
- `npm run build` (Production Vite bundle)
- Manual UX audit against `REDESIGN_PLAN.md` & `DESIGN.md` guidelines.

### Per-group finish gate

Every phase must pass before the next begins:

1. Run the development application and inspect the changed screens at 1366×768, 1440×900, 1920×1080, and tablet width.
2. Verify no clipping, accidental overflow, crushed camera canvases, dead controls, or unreadable long labels.
3. Run the applicable Taste pre-flight checks: one light theme, one blue accent, 2/4/6/8px radius system, visible focus, button/form contrast, semantic status labels, restrained motion, explicit responsive collapse, and no decorative AI styling.
4. Run lint, typecheck, unit/integration tests, production build, and relevant Playwright workflow.
5. Record failures and corrections before marking the phase complete.

---

## 6. Acceptance Criteria by Phase

| Phase | Acceptance criteria |
|---|---|
| 1. Foundation | Semantic tokens cover navigation, canvas, work surface, inspector, border strengths, camera colors, type roles, spacing, radius, and focus. Normal metrics use Plex Sans; only IDs/timestamps/machine readouts use Plex Mono. |
| 2. Shell | Grouped navigation matches `UI_FLOW.md`; all existing destinations remain reachable; active state is subtle; footer exposes signed-in user, Settings, and Logout; tablet navigation collapses without horizontal text-strip navigation. |
| 3. Analysis | Canvas dominates the available workspace; Side/Front/Rear have distinct credible Original, Mask, and Overlay outputs; inspector changes by camera; selected frame/timestamp and stable window are interactive and accessible; no generic placeholder line-art remains. |
| 4. Capture | One dominant view plus two synchronized secondary views; timestamp, phase, FPS, frame, timeline, stable window, and test configuration are visible; transition to Analysis is clearly tied to completed mock processing. |
| 5. Dashboard | Latest test and Resume Analysis form the focal point; temporal visualization communicates stability; recent tests remain table-first; status summary is secondary; no KPI-card wall. |
| 6. New Test | Sample, parameters, and fixture source are visually grouped; units are attached to controls; compact review summary appears before starting; errors preserve user input. |
| 7. Records | History, Products, Users, and Calibration use dense aligned tables/tool surfaces; filters work; Users supports create account and enabled/disabled state; calibration values remain explicitly mock. |
| 8. Result/Reports | Result is canonical and scan-friendly; temporal summary and representative camera outputs are present; report preview is quiet and print-safe; CSV remains explicitly local/mock. |
| 9. Authentication | No timer/fixture login; API unavailable or PostgreSQL unavailable yields a clear failure; real PostgreSQL covers login, `/auth/me`, refresh restoration, disabled users, logout, and invalidated session; seed requires an environment password. |
| 10. Finish | WCAG 2.2 AA keyboard/focus/contrast review passes; reduced-motion behavior is defined; desktop and tablet visual reviews pass; all automated gates pass. |

---

## 7. Preserved Contracts and Explicit Non-goals

### Preserved

- Existing product requirements and navigation labels unless grouping is required by `UI_FLOW.md`.
- Deterministic fixture scenario IDs and canonical units.
- Side, Front, and Rear analysis responsibilities and temporal aggregation semantics.
- Presentation, Domain, and Data/Infrastructure dependency direction.
- Explicit Simulation Mode, Mock capture, Fixture data, and Mock calibration language.
- Current light technical palette and IBM Plex type family.

### Not introduced

- No real camera, PLC, actuator, or CV connection.
- No invented quality thresholds or pass/fail criteria.
- No decorative gradients, glass, glow, large radii, marketing hero, scroll effects, dark mode requirement, or new animation library.
- No broad framework migration or unrelated backend APIs.
- No silent fallback account when PostgreSQL is unavailable.

---

## 8. Blocking Inputs and Environment Checks

- Real PostgreSQL integration cannot be declared verified until `DATABASE_URL` points to a reachable local PostgreSQL database and a test database can be created or supplied.
- `SEED_ADMIN_PASSWORD` must be provided locally for the development seed command; it will not be committed.
- Rendered visual review requires a connected desktop browser in OpenCode or Playwright screenshot inspection. Source-only review is insufficient for phase completion.

