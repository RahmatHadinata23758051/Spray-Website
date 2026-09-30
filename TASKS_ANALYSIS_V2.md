# TASKS_ANALYSIS_V2 — Analysis Workflow V2 Correction

**Created**: 2026-09-29  
**Scope**: Major product-flow correction for two-camera analysis, operator-selected synchronized capture moments, calibration audit, measurement correction, and final report traceability.  
**Design read**: R&D workstation workflow for operators and analysts, with dense industrial-instrumentation UI, preserving the accepted Plus Jakarta Sans shell, fresh-blue palette, dark Analysis canvas, timeline, and right inspector.

## Binding correction summary

The current implementation and several docs still describe a 3-camera, stable-window aggregation workflow. Analysis V2 replaces that with:

```text
Side Camera + Front Camera
        ↓
synchronized fixture capture
        ↓
timestamped synchronized capture moments (#001, #002...)
        ↓
automatic per-frame measurements (Side + Front per moment)
        ↓
operator review (timeline browses synchronized capture moments)
        ↓
operator selects exactly one Primary Capture Moment
        ↓
operator may select up to 9 Supporting Capture Moments
        ↓
operator may adjust calibration and/or measurement geometry per camera
        ↓
operator confirms final analysis
        ↓
final result + report preserve automatic and final values with synchronized moment traceability
```

## Current audit findings

### Rear camera remains in source
- `src/domain/types.ts`: `Camera = 'side' | 'front' | 'rear'`, `analysisSchema.rear`, `Analysis.rear`.
- `src/data/mockSpraybotRepository.ts`: every fixture contains `rear` metrics and temporal aggregate data.
- `src/presentation/App.tsx`: Rear camera copy, tabs, capture cards, overlays, inspector rows, Result panel, Reports CSV, Calibration page, dashboard/history table.
- `src/__tests__/app.test.tsx`: rear assertions.
- `e2e/workflow.spec.ts`: clicks rear camera and checks Bottle alignment.
- `scripts/capture-phase3-refined.ts`: captures rear overlay.

### Documentation conflicts to reconcile
Latest stakeholder decision supersedes these older docs; they should be updated during this correction so future agents do not reintroduce Rear Camera or auto-final semantics.
- `docs/PRD.md`: 3-camera capture, Rear Camera, temporal aggregation final result.
- `docs/ANALYSIS_FLOW.md`: 3-camera pipeline, Rear Camera, temporal aggregation.
- `docs/UI_FLOW.md`: Rear camera switch/inspector/result/history.
- `docs/MOCK_DATA.md`: rear capture and analysis contracts.
- `docs/DESIGN.md`: Rear camera identity/overlay references.
- `PRODUCT.md`, `REDESIGN_PLAN.md`, `IMPLEMENTATION_PLAN.md`, `docs/HANDOVER.md`: older 3-camera statements.

## Execution rules for this plan

After each task:
1. Run `npm run lint`.
2. Run `npm run typecheck`.
3. Run relevant unit tests, usually `npm test -- --run` or targeted Vitest if available.
4. If UI changed, run a browser/Playwright visual check and capture any task-specific screenshot.
5. Apply Taste/design review against `docs/DESIGN.md`: no card soup, no decorative gradients/glow/glass, restrained panels, table-first where relevant, clear technical hierarchy.
6. Report with:

```text
Task:
Implemented:
Domain changes:
UI changes:
Files changed:
Tests:
Visual review:
Known issues:
Next task:
```

Do not proceed to the next task while the current task is failing.

---

## Task A — Remove Rear Camera + update baseline contracts

**Objective**  
Remove Rear Camera from the MVP domain and clean stale three-camera assumptions before adding V2 workflow features.

**Files/domain affected**
- `src/domain/types.ts`
- `src/data/mockSpraybotRepository.ts`
- `src/presentation/App.tsx`
- `src/__tests__/app.test.tsx`
- `e2e/workflow.spec.ts`
- `scripts/capture-phase3-refined.ts`
- `src/styles/index.css` camera tokens if needed
- Docs with 3-camera/rear references listed above

**Acceptance criteria**
- Final camera type is exactly `type Camera = 'side' | 'front'`.
- No `rear` field remains in current analysis domain, schemas, fixture data, UI, report/export, tests, screenshot scripts, dashboard, history, or calibration UI.
- Removed copy/labels: Rear Camera, Rear Validity, Rear validation, Bottle alignment, Nozzle alignment, Actuator offset, Bottle tilt, Movement during test.
- Capture shows Side and Front only.
- Analysis tabs show Side and Front only.
- Result and Reports show Side and Front only.
- History table contains no Rear Validity column.
- Docs are aligned enough to prevent reintroducing Rear Camera during this phase.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- `npm test -- --run`
- `npx playwright test`
- `grep -rE "rear|Rear|Bottle alignment|Nozzle alignment|Rear Validity" src e2e scripts docs PRODUCT.md REDESIGN_PLAN.md IMPLEMENTATION_PLAN.md` and review expected historical exclusions only if intentionally preserved.
- UI smoke: Capture, Analysis, Result, History, Reports, Calibration.

**Dependencies**
- None.

**Completion status**
- [x] Complete — 2026-09-29

---

## Task B — Synchronized capture-moment domain + deterministic fixtures

**Objective**  
Replace generic timeline frames and aggregate-oriented analysis with deterministic synchronized capture moments. Each moment owns one Side frame and one Front frame from the same index and timestamp.

**Files/domain affected**
- `src/domain/types.ts`
- possible new `src/domain/analysis.ts` if keeping types readable
- `src/data/mockSpraybotRepository.ts`
- `src/__tests__/app.test.tsx`

**Acceptance criteria**
- Adds/updates models:

```ts
type AnalysisFrame = {
  id: string
  camera: 'side' | 'front'
  frameIndex: number
  timestampMs: number
  phase: 'pre_spray' | 'build_up' | 'stable' | 'decay'
  assets: {
    original: string
    mask: string
    overlay: string
  }
}

type SynchronizedAnalysisFrame = {
  id: string
  frameIndex: number
  timestampMs: number
  phase: 'pre_spray' | 'build_up' | 'stable' | 'decay'
  side: AnalysisFrame
  front: AnalysisFrame
  syncStatus: 'synced' | 'partial' | 'invalid'
  timestampDeltaMs: number
  recommended?: boolean
}
```

- A synchronized capture moment is the timeline and selection unit.
- Its `side` and `front` frames share the capture moment's `frameIndex`, `timestampMs`, and phase.
- Each moment carries `syncStatus: 'synced' | 'partial' | 'invalid'` and `timestampDeltaMs`.
- Only moments with `syncStatus: 'synced'` may become Primary or Supporting captures.
- Current mock fixtures may all use `syncStatus: 'synced'` and deterministic `timestampDeltaMs` values.
- Side and Front retain independent assets, masks, overlays, metrics, calibration, and corrections.
- Phases use underscore names in domain; UI may render friendly labels.
- Fixture capture moments are deterministic and stable across reloads.
- Recommended capture moments are fixture metadata, not auto-final decisions.
- No `Math.random()` is introduced.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- Relevant unit tests covering moment count, Side/Front pairing, matching indexes/timestamps, camera set, phase values, recommended metadata, and no rear frames.

**Dependencies**
- Task A.

**Completion status**
- [x] Complete — 2026-09-29

---

## Task C — MeasurementValue, calibration, and report domain helpers

**Objective**  
Add the traceability primitives before building UI interactions: automatic vs final measurements, per-camera calibration snapshots, selected synchronized capture moments, and final reports.

**Files/domain affected**
- `src/domain/types.ts` or new `src/domain/analysis.ts`
- `src/data/mockSpraybotRepository.ts`
- `src/__tests__/app.test.tsx`

**Acceptance criteria**
- Adds `MeasurementValue` with `auto`, `final`, `adjusted`, optional `adjustedBy`, `adjustedAt`.
- Adds `CalibrationSnapshot` with anchors, reference distance, scale calculation, audit fields.
- Adds synchronized selection contract:

```ts
type SelectedCaptureMoment = {
  captureFrameId: string
  role: 'primary' | 'supporting'
  selectedBy: string
  selectedAt: string
}
```

- Adds `FinalAnalysisReport` with side/front measurement values, per-camera calibration snapshots, `primaryCaptureMomentId`, `supportingCaptureMomentIds`, `finalizedBy`, `finalizedAt`.
- Report model never allows independent Side and Front primary frame IDs; Side and Front final analysis derive from the same primary capture moment timestamp.
- Adds pure helper for `scaleMmPerPx = referenceDistanceMm / distance(anchorA, anchorB)`.
- Adds pure helper for measurement correction that preserves `auto` and changes only `final` plus audit fields.
- Adds pure helper for final report creation that snapshots measurements and calibration.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- Unit tests for scale calculation, correction preserving auto values, final report snapshot immutability.

**Dependencies**
- Task B.

**Completion status**
- [x] Complete — 2026-09-29

---

## Task D — Synchronized capture moment selection state model

**Objective**  
Implement business rules for Primary and Supporting capture moment selection without UI complexity.

**Files/domain affected**
- `src/domain/analysis.ts` or `src/domain/types.ts`
- `src/__tests__/app.test.tsx`

**Acceptance criteria**
- Selection applies to whole synchronized capture moments (Side + Front at time T), never camera-independent frames.
- Only synchronized valid capture moments (`syncStatus: 'synced'`) may become Primary or Supporting captures.
- Maximum selected capture moments: 10 (1 Primary + up to 9 Supporting).
- Exactly 1 Primary Capture Moment is required when finalizing.
- Primary is explicitly selected by operator; no silent auto-primary.
- Supporting capture moments can be added and removed.
- Setting a new Primary Capture Moment uses the simplest consistent behavior: old Primary becomes Supporting if under the 10-moment limit, otherwise is unselected.
- Selecting an 11th capture moment is prevented by helper return value or clear error state.
- Side and Front final analysis always reference the same Primary timestamp.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- Unit tests for one-primary capture moment rule, max-10 synchronized moments rule, remove supporting moment, finalization requires primary moment, synchronized Side+Front timestamp match, and rejection of `partial` / `invalid` moments.

**Dependencies**
- Task C.

**Completion status**
- [x] Complete — 2026-09-29

---

## Task E — Synchronized capture-moment browser UI foundation

**Objective**  
Enhance the existing Analysis timeline into a synchronized capture-moment browser while preserving approved shell, canvas, inspector placement, dark viewport, and visual tone.

**Files/domain affected**
- `src/presentation/App.tsx`
- `src/styles/index.css`
- `src/data/mockSpraybotRepository.ts`
- `e2e/workflow.spec.ts`

**Acceptance criteria**
- Timeline/browser supports viewing all synchronized capture moments and changing the current moment.
- UI shows capture frame index, timestamp, phase, stable/recommended markers.
- Choosing Capture Moment #056 simultaneously loads Side Frame #056 and Front Frame #056.
- Switching between Side and Front tabs preserves the selected capture index/timestamp.
- Current timeline state belongs to the synchronized capture, not to either camera tab.
- Copy uses `Recommended capture`, not `Final frame selected automatically`.
- Capture-moment browser remains visible and usable at 1366×768.
- No Primary Capture Moment is automatically selected.
- Existing Original / Mask / Overlay modes remain per camera.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- Relevant unit tests if helper logic changed.
- Playwright smoke verifies changing capture moment updates both cameras and switching camera tabs preserves the selected timestamp.
- Visual screenshot: `artifacts/redesign/analysis-v2/side-overlay-normal-1366x768.png`.

**Dependencies**
- Tasks A–D.

**Completion status**
- [x] Complete — 2026-09-29

---

## Task F — Primary/Supporting capture selection UI

**Objective**  
Expose synchronized capture-moment selection actions in Analysis and make selection state understandable.

**Files/domain affected**
- `src/presentation/App.tsx`
- `src/styles/index.css`
- `e2e/workflow.spec.ts`
- `src/__tests__/app.test.tsx` if domain helper coverage expands

**Acceptance criteria**
- Inspector or adjacent selection panel shows `Selected Captures n / 10`.
- Current synchronized capture moment can be set as Primary.
- Current synchronized capture moment can be added to report as Supporting.
- Selected supporting capture moments can be removed.
- Selected list renders Primary with clear text/icon, displaying timestamp and frame index (e.g. `★ Frame #056 · 2800 ms`).
- Recommended capture marker remains informational.
- UI prevents more than 10 selected capture moments.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- Unit tests for helper logic if not already complete.
- Playwright: select Primary Capture Moment, add/remove Supporting Capture Moment, verify both camera tabs share selection, and verify max rule if practical.
- Visual screenshots:
  - `side-primary-selected-1366x768.png`
  - `side-multiple-report-frames-1366x768.png`

**Dependencies**
- Task E.

**Completion status**
- [x] Complete — 2026-09-29

---

## Task G — Calibration adjustment mode

**Objective**  
Add calibration as a distinct workflow from measurement correction.

**Files/domain affected**
- `src/domain/analysis.ts` or `src/domain/types.ts`
- `src/presentation/App.tsx`
- `src/styles/index.css`
- `src/__tests__/app.test.tsx`

**Acceptance criteria**
- Analysis inspector includes Calibration section:
  - reference distance, e.g. `1000 mm`
  - anchor A and anchor B coordinates
  - recalculated scale, e.g. `1.145 mm / px`
  - `Adjust Calibration` action
- Calibration mode visually shows anchor A/B and reference line.
- Adjusting calibration changes `scaleMmPerPx` using known reference distance.
- Calibration adjustment does not directly change measurement geometry handles.
- UI copy clearly says calibration answers: “How many physical millimeters does this image represent?”
- Stores `adjusted`, `adjustedBy`, `adjustedAt` when changed.

**MVP simplification**
- Use deterministic button-based anchor adjustment or simple handle controls first; drag can be added only if it stays small and accessible.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- Unit test: anchor adjustment recalculates scale.
- Unit test: calibration adjustment does not mutate measurement correction state.
- Visual screenshot: `side-adjust-calibration-1366x768.png`.

**Dependencies**
- Tasks C–F.

**Completion status**
- [x] Complete — 2026-09-29

---

## Task G2 — Direct Manipulation Grid Calibration

**Objective**  
Replace the MVP's primary button-based anchor adjustment with direct pointer and keyboard manipulation on the Analysis viewport while retaining the approved calibration mathematics.

**Acceptance criteria**
- Calibration uses camera-specific working state cloned from the saved snapshot.
- Anchor A, Anchor B, and the physical ruler body support constrained Pointer Events.
- Moving A or B updates geometry and scale live; translating the ruler preserves scale.
- Live calibration drives grid spacing, measurements, viewport labels, and inspector values.
- Focused anchors support Arrow keys at 1 px and Shift + Arrow at 10 px.
- Cancel discards working changes; Apply records audit metadata and saves the camera-specific snapshot.
- Calibration and measurement correction remain mutually exclusive.
- Side and Front calibration remain independent.
- Button nudges are retained only as an accessibility fallback.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- `npm test -- --run`
- `npm run build`
- `npx playwright test`
- Visual screenshots:
  - `calibration-grid-default-1366x768.png`
  - `calibration-grid-dragging-1366x768.png`
  - `calibration-grid-applied-1366x768.png`
  - `calibration-grid-translated-1366x768.png`

**Completion status**
- [x] Complete — 2026-09-29

---

## Task H — Measurement correction mode

**Objective**  
Add measurement correction as a separate mode from calibration, preserving automatic values.

**Files/domain affected**
- `src/domain/analysis.ts` or `src/domain/types.ts`
- `src/presentation/App.tsx`
- `src/styles/index.css`
- `src/__tests__/app.test.tsx`

**Acceptance criteria**
- Adds clear `Edit Measurement` action.
- Side Camera exposes understandable MVP controls for endpoint/spread/angle correction.
- Front Camera exposes manageable MVP controls for centroid/reference or contour correction.
- Correcting measurement updates `final`, not `auto`.
- Stores `adjusted`, `adjustedBy`, `adjustedAt`.
- Measurement correction does not change calibration scale.
- Inspector shows Automatic vs Final where adjusted; otherwise shows automatic accepted.
- Calibration and measurement edit modes are visually distinct and cannot be confused.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- Unit tests for automatic preserved, final updated, audit fields stored, calibration scale unchanged.
- Visual screenshots:
  - `side-edit-measurement-1366x768.png`
  - `front-edit-measurement-1366x768.png`

**Dependencies**
- Task G.

**Completion status**
- [x] Complete — 2026-09-29

---

## Task H2 — Direct Measurement Manipulation + Corrected Overlay Persistence

**Objective**  
Replace primary button-based measurement correction with direct pointer/keyboard manipulation of Side and Front measurement geometry in the Analysis viewport.

**Acceptance criteria**
- Corrections store durable pixel geometry and audit metadata per camera and synchronized capture moment.
- Side supports endpoint, spread top/bottom, and upper/lower angle handles.
- Front supports centroid and equivalent-diameter handles.
- Pointer coordinates map into the 720 × 360 viewBox and handles remain constrained.
- Live working geometry drives viewport and inspector Final values.
- Apply saves corrected geometry; Cancel restores saved correction or automatic geometry.
- Normal Overlay after Apply persists the corrected geometry.
- Measurement edits preserve calibration scale; recalibration updates physical values from corrected pixels.
- Handles support Arrow and Shift + Arrow keyboard adjustment.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- `npm test -- --run`
- `npm run build`
- `npx playwright test`
- Six required visual screenshots under `artifacts/redesign/analysis-v2/`.

**Completion status**
- [x] Complete — 2026-09-29

---

## Task I — Side Camera V2 integration

**Objective**  
Wire Side Camera to frame-specific measurements, selected-frame state, calibration mode, and measurement correction while retaining the current realistic raster fixture approach.

**Files/domain affected**
- `src/presentation/App.tsx`
- `src/data/mockSpraybotRepository.ts`
- `public/fixtures/side-original.png`
- `public/fixtures/side-mask.png`
- `scripts/generate-side-fixtures.ts` if fixture regeneration is needed
- `src/styles/index.css`

**Acceptance criteria**
- Side Original still uses deterministic camera-like raster fixture.
- Side Mask still resembles threshold segmentation.
- Side Overlay shows nozzle origin, plume, boundary, upper/lower guides, centerline, length, vertical spread, angle.
- Frame changes update Side measurements deterministically.
- Recommended Side frame is marked but not selected automatically.
- Edit Measurement and Adjust Calibration modes both work and look distinct.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- Relevant unit tests.
- Visual screenshots:
  - `side-overlay-normal-1366x768.png`
  - `side-edit-measurement-1366x768.png`
  - `side-adjust-calibration-1366x768.png`

**Dependencies**
- Tasks E–H.

**Completion status**
- [x] Complete — 2026-09-29

---

## Task J — Front Camera V2 integration

**Objective**  
Wire Front Camera to frame-specific pattern measurements, selected-frame state, calibration mode, and measurement correction with visuals that differ from Side Camera.

**Files/domain affected**
- `src/presentation/App.tsx`
- `src/data/mockSpraybotRepository.ts`
- `src/styles/index.css`

**Acceptance criteria**
- Front metrics: Spray Area, Equivalent Diameter, Circularity, Centroid Offset, Horizontal Symmetry, Vertical Symmetry.
- Front modes: Original, Mask, Overlay.
- Front overlay shows detected footprint, contour, equivalent diameter, centroid, reference center, horizontal axis, vertical axis, centroid offset.
- Front visuals are clearly not Side Camera geometry.
- Frame changes update Front measurements deterministically.
- Edit Measurement and Adjust Calibration are available and distinct.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- Relevant unit tests.
- Visual screenshots:
  - `front-overlay-1366x768.png`
  - `front-edit-measurement-1366x768.png`

**Dependencies**
- Tasks E–H.

**Completion status**
- [x] Complete — 2026-09-29

---

## Task K — Final analysis confirmation workflow

**Objective**  
Add explicit operator confirmation before a result becomes final.

**Files/domain affected**
- `src/presentation/App.tsx`
- `src/domain/analysis.ts` or `src/domain/types.ts`
- `src/data/mockSpraybotRepository.ts`
- `src/styles/index.css`
- `e2e/workflow.spec.ts`

**Acceptance criteria**
- Analysis supports statuses: `captured`, `review_required`, `finalized` for MVP UI language.
- CTA: `Confirm Final Analysis`.
- Confirmation requires exactly one Primary Capture Moment.
- Side and Front final values in confirmation come from that same capture moment index and timestamp.
- Confirmation summary includes:
  - Primary Capture: frame index and timestamp
  - Side Camera final values and calibration status
  - Front Camera final values and calibration status
  - Selected Captures count
  - Calibration default/adjusted per camera
  - Measurement automatic/adjusted per camera
- Confirmation produces/saves a deterministic in-memory final report object using `primaryCaptureMomentId`.
- No automatic finalization occurs when opening Analysis.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- Unit test: final analysis requires Primary Capture Moment.
- Playwright: selecting primary capture enables confirmation; no primary capture blocks confirmation; Side/Front final summary shares the same timestamp.
- Visual screenshot: `final-analysis-confirmation-1366x768.png`.

**Dependencies**
- Tasks F–J.

**Completion status**
- [x] Complete — 2026-09-29

---

## Task L — Result page and report model/UI update

**Objective**  
Replace old canonical result/report with Analysis V2 traceability: selected synchronized capture moments, Automatic vs Final, per-camera calibration snapshot, side/front only.

**Files/domain affected**
- `src/presentation/App.tsx`
- `src/data/mockSpraybotRepository.ts`
- `src/domain/analysis.ts` or `src/domain/types.ts`
- `src/styles/index.css`
- `src/__tests__/app.test.tsx`

**Acceptance criteria**
- Result page no longer implies automatic final result.
- Result page shows finalized/readable V2 result if finalized; otherwise shows review-required state and action to return to Analysis.
- Report UI shows:
  - Test information: Product, Recipe, Operator, Test timestamp
  - Primary Capture Moment: Frame # and timestamp (e.g. `Frame #056 · 2800 ms`)
  - Side Camera representative image (#056) and measurements with Auto / Final / adjustment status
  - Front Camera representative image (#056) and measurements with Auto / Final / adjustment status
  - Calibration status & snapshot per camera
  - Supporting Captures section showing thumbnails of both Side + Front imagery per supporting capture (max 9)
- Report does not show all raw captured frames.
- Report export CSV includes Automatic and Final values for Side and Front with primary capture timestamp and no rear fields.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- Unit tests: finalized report snapshots calibration and measurement values.
- Visual screenshot: `final-report-1366x768.png`.

**Dependencies**
- Task K.

**Completion status**
- [x] Completed — Result V2 and Report V2 consume immutable `FinalAnalysisReport`; validation passed without screenshot per explicit Task L instruction.

---

## Task M — History and Dashboard cleanup for V2 statuses

**Objective**  
Update summary surfaces so they reflect two-camera, review-required/finalized workflow without inventing filler metrics.

**Files/domain affected**
- `src/presentation/App.tsx`
- `src/styles/index.css` if needed
- `src/__tests__/app.test.tsx`
- `e2e/workflow.spec.ts`

**Acceptance criteria**
- History table columns become:
  - Test ID
  - Date
  - Product
  - Operator
  - Result Status
  - Primary Capture
  - Action
- History contains no Rear Validity.
- Dashboard contains no Rear Camera or Rear status.
- Dashboard status language reflects Captured → Ready for Review → Finalized.
- No replacement metric is invented just to fill old rear space.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- Unit test or E2E assertion: History contains no Rear Validity.
- Playwright smoke for History and Dashboard.

**Dependencies**
- Tasks A, K, L.

**Completion status**
- [ ] Not started

---

## Task N — Documentation alignment

**Objective**  
Update project Markdown contracts to reflect Analysis V2 so future implementation and review do not regress to Rear Camera or auto-final semantics.

**Files/domain affected**
- `docs/PRD.md`
- `docs/ANALYSIS_FLOW.md`
- `docs/UI_FLOW.md`
- `docs/MOCK_DATA.md`
- `docs/DESIGN.md`
- `PRODUCT.md`
- `REDESIGN_PLAN.md`
- `IMPLEMENTATION_PLAN.md`
- `docs/HANDOVER.md`

**Acceptance criteria**
- Documentation states MVP uses only Side and Front cameras.
- Documentation describes operator-selected Primary Capture Moment and optional Supporting Capture Moments.
- Documentation states Side and Front are synchronized pairs: one shared selected timestamp, with per-camera assets, calibration, metrics, and corrections.
- Documentation distinguishes calibration from measurement correction.
- Documentation preserves automatic vs final measurement traceability.
- Documentation no longer lists Rear Camera as current MVP screen/data/metric.
- Historical docs may note superseded state only if clearly marked as historical; current contracts must be unambiguous.

**Validation required**
- Markdown grep audit for stale current-state rear/3-camera language.
- No code validation unless only docs changed; still run `npm run typecheck` if touching examples that may be copied later.

**Dependencies**
- Can run after Task A, but final pass should happen after Task L.

**Completion status**
- [ ] Not started

---

## Task O — Analysis V2 screenshots and final QA gate

**Objective**  
Create the required screenshot capture script and run final automated + visual validation for Analysis V2.

**Files/domain affected**
- new or updated `scripts/capture-analysis-v2.ts`
- `artifacts/redesign/analysis-v2/`
- `e2e/workflow.spec.ts`
- possibly `README.md` or `docs/HANDOVER.md` for final status note

**Acceptance criteria**
- Captures 1366×768 screenshots:
  1. Side — normal Overlay
  2. Side — Edit Measurement mode
  3. Side — Adjust Calibration mode
  4. Side — capture moment selected as Primary
  5. Side — multiple report captures selected
  6. Front — Overlay
  7. Front — Edit Measurement
  8. Final Analysis confirmation
  9. Final Report
- Captures one Analysis screenshot at 1440×900.
- Screenshots stored under `artifacts/redesign/analysis-v2/`.
- Visual review confirms calibration and measurement correction are not visually conflated.
- Visual review confirms accepted shell and Analysis canvas direction are preserved.

**Validation required**
- `npm run lint`
- `npm run typecheck`
- `npm test -- --run`
- `npm run build`
- `npx playwright test`
- Run screenshot script against local preview/dev server.
- Manual/Taste visual review of screenshots.

**Dependencies**
- Tasks A–N.

**Completion status**
- [ ] Not started

---

## Test checklist mapped to stakeholder requirements

- [ ] Application supports only Side + Front Camera.
- [ ] Rear Camera does not exist in current analysis domain.
- [ ] Changing synchronized capture moment updates both Side and Front analysis data.
- [ ] Switching Side/Front tabs preserves the selected capture timestamp.
- [ ] Operator can select Primary Capture Moment.
- [ ] Only one Primary Capture Moment allowed.
- [ ] Maximum 10 report capture moments allowed (1 Primary + up to 9 Supporting).
- [ ] Supporting Capture Moments can be removed.
- [ ] Side and Front final analysis use the exact same Primary timestamp.
- [ ] Capture moments expose `syncStatus` and `timestampDeltaMs`.
- [ ] `partial` and `invalid` capture moments cannot become Primary or Supporting.
- [ ] Calibration anchor adjustment recalculates scale per camera.
- [ ] Measurement correction does not change calibration scale.
- [ ] Automatic value is preserved after correction.
- [ ] Final value updates after correction.
- [ ] Operator + adjustment timestamp stored.
- [ ] Finalized report snapshots per-camera calibration.
- [ ] Finalized report snapshots measurement values.
- [ ] History contains no Rear Validity.
- [ ] Final analysis requires Primary Capture Moment.

## Planned visual artifacts

Target directory: `artifacts/redesign/analysis-v2/`

- `side-overlay-normal-1366x768.png`
- `side-edit-measurement-1366x768.png`
- `side-adjust-calibration-1366x768.png`
- `side-primary-selected-1366x768.png`
- `side-multiple-report-frames-1366x768.png`
- `front-overlay-1366x768.png`
- `front-edit-measurement-1366x768.png`
- `final-analysis-confirmation-1366x768.png`
- `final-report-1366x768.png`
- `analysis-v2-1440x900.png`

## Non-goals for this phase

- No real firmware integration.
- No real camera SDK.
- No real computer vision.
- No PostgreSQL analysis persistence.
- No unrelated Dashboard redesign.
- No unrelated frontend refactor or component extraction.
- No new dependency unless a tiny existing dependency cannot solve the problem.

## Implementation notes

- Keep changes task-sized. The existing `src/presentation/App.tsx` is large; split only when it reduces immediate risk for Analysis V2, not as a broad architecture rewrite.
- Prefer pure domain helpers for synchronized capture-moment selection, calibration, measurement correction, and report finalization so tests stay simple.
- Keep timeline/current-selection state at capture-moment level; camera tabs only change the view of the shared moment.
- Keep calibration and measurement correction per camera inside the shared selected moment.
- Keep all fixture values deterministic and named.
- Preserve existing Side raster assets unless a specific V2 fixture requirement demands regeneration.
- Keep Plus Jakarta Sans primary and IBM Plex Mono only for IDs, timestamps, frame numbers, coordinates, scale, and measurement readouts.
