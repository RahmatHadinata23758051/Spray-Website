# PRD — Spraybot Software MVP

## 1. Product summary

Spraybot is the software interface for an automated spray-bottle testing machine used in an R&D environment.

The long-term system will combine:

- controlled mechanical actuation,
- load/force measurement,
- synchronized 3-camera capture,
- computer-vision analysis,
- test history and reporting.

For the current development phase, **hardware does not exist yet**. The MVP is intentionally software-first.

The software MVP must demonstrate the complete expected operator experience using realistic mock data while keeping future hardware/CV integration paths explicit.

---

## 2. Problem

Manual spray evaluation creates inconsistent and subjective results because force, press duration, spray geometry observation, and recording can vary between operators.

The future machine will standardize test execution and analysis.

The immediate software problem is different:

> We need a credible frontend prototype that clearly shows how an operator will configure a test, observe a capture, inspect 3-camera analysis, review metrics, and access test history before the physical system is available.

The prototype is also a communication artifact for internal review, client discussion, and software planning.

---

## 3. Product goals

### Primary goals

1. Create a realistic end-to-end testing workflow without requiring hardware.
2. Make the function of each camera explicit.
3. Visualize the future analysis pipeline in a way non-CV stakeholders can understand.
4. Establish stable UI and data contracts for later integration.
5. Provide a polished R&D-grade interface with strong information hierarchy.
6. Prepare local authentication architecture using PostgreSQL, without building unrelated backend features.

### Secondary goals

- Allow stakeholders to inspect mock spray results.
- Demonstrate reports/history.
- Validate information architecture early.
- Provide a reusable design system for future machine-control pages.

---

## 4. Non-goals for this MVP

Do **not** claim or implement real:

- hardware connectivity,
- actuator control,
- camera streaming from actual devices,
- computer-vision inference,
- particle-size measurement,
- droplet-size measurement,
- absolute spray-density measurement,
- turbulent/laminar classification,
- hollow/full cone automatic classification,
- 3D spray reconstruction,
- production-grade machine safety control.

These can appear only as documented future integration points, never as working features.

---

## 5. User roles

### Operator

Primary user.

Can:

- log in,
- create/select a test,
- configure test parameters,
- start a simulated test,
- inspect capture/analysis,
- review history,
- export a result.

### R&D Analyst

Can do everything an Operator can, plus:

- inspect analysis detail,
- compare measurements,
- view advanced overlays,
- review temporal metrics.

### Admin

For the MVP:

- user management architecture,
- account status,
- roles.

Keep role management simple.

---

## 6. MVP product mode

The application must expose an explicit status:

`SIMULATION MODE`

The status must be visible in:

- application shell,
- test setup,
- capture monitor,
- analysis screen.

Do not show fake "camera online", "PLC connected", or "machine ready" states as if they are real.

Allowed simulated states:

- Mock capture loaded
- Simulated test running
- Mock analysis complete
- Fixture dataset selected

---

## 7. Core screens

### 7.1 Login

Purpose:
- authenticate the local user,
- establish the final visual tone.

No marketing hero.

Content:
- product name,
- short descriptor,
- username/email,
- password,
- login action,
- local system status.

---

### 7.2 Operational Dashboard

Purpose:
- answer "what is happening in the system?"

MVP content:
- Simulation Mode status,
- latest test,
- total mock tests,
- latest analysis status,
- short force/press-duration summary,
- recent tests table,
- quick action: New Test.

Avoid a wall of KPI cards.

---

### 7.3 New Test / Test Setup

Inputs:

- Product / sample name
- Batch / sample ID
- Operator
- Press force setpoint
- Press duration
- Stroke
- test notes
- mock fixture dataset

Actions:
- Save draft
- Start simulated test

The interface must distinguish:
- operator-entered parameters,
- values that will eventually come from hardware.

---

### 7.4 Capture Monitor

Purpose:
- represent the future synchronized acquisition sequence.

Layout:
- Side Camera preview
- Front Camera preview
- capture timeline
- current simulated phase:
  - pre-spray,
  - build-up,
  - stable,
  - decay,
  - complete.

The page must explain that frames are mock fixtures.

---

### 7.5 Analysis Workspace

This is the flagship screen.

It must support two camera views (Side and Front).

#### Side Camera

Primary metrics:

- Spray Length
- Spray Angle
- Maximum Vertical Spread
- Centerline Direction / Direction Offset

Visual overlays:

- nozzle origin,
- segmented spray boundary,
- upper/lower angle lines,
- centerline,
- calibrated distance scale,
- vertical spread marker.

#### Front Camera

Primary metrics:

- Spray Area
- Equivalent Diameter
- Circularity
- Centroid Offset
- Pattern Symmetry

Visual overlays:

- spray contour,
- equivalent circle,
- centroid,
- horizontal/vertical symmetry axes.

#### Shared analysis controls

- frame scrubber,
- stable analysis window indicator,
- original / mask / overlay view,
- selected frame timestamp,
- metric summary,
- confidence/quality placeholder only if clearly marked as simulated.

---

### 7.6 Test Result Detail

Purpose:
- provide one canonical final result per test.

Sections:

- test metadata,
- mechanical parameters,
- Side Camera results,
- Front Camera results,
- temporal summary,
- representative images,
- notes,
- export.

---

### 7.7 Test History

Needs:

- table-first layout,
- search,
- filters,
- date,
- product/sample,
- operator,
- status,
- result view action.

Avoid turning every test into a card.

---

### 7.8 Reports

MVP:

- choose existing test,
- preview report layout,
- export mock CSV,
- printable report view.

PDF can be a later backlog if implementation time is limited.

---

### 7.9 Products / Presets

MVP lightweight page for:

- product/sample presets,
- default press force,
- default duration,
- stroke,
- optional notes.

---

### 7.10 Calibration / System

In software-only MVP this is a **mock configuration page**, not actual calibration.

Represent future concepts:

- pixel-to-mm scale,
- camera ROI,
- nozzle origin,
- front-camera center reference.

Every value must be labelled mock/demo.

---

### 7.11 Users

Admin-only.

MVP:
- user list,
- create account,
- role,
- enabled/disabled status.

---

## 8. Analysis lifecycle represented in UI

The product should visually communicate this sequence:

1. Test created.
2. Capture trigger starts.
3. Side and Front cameras capture synchronized sequences.
4. Video/frame buffer is created.
5. Frames receive timestamps.
6. Spray event is detected.
7. Stable analysis window is selected.
8. Frames are preprocessed.
9. Spray/object segmentation produces masks.
10. Camera calibration converts pixel coordinates into physical units.
11. Metrics are calculated per camera and per frame.
12. Stable-window results are temporally aggregated.
13. Final metrics are stored and presented.

For MVP, steps 3-12 are simulated using fixture data.

---

## 9. MVP output data

### Side Camera

- sprayLengthMm
- sprayAngleDeg
- maxVerticalSpreadMm
- directionOffsetDeg

### Front Camera

- sprayAreaMm2
- equivalentDiameterMm
- circularity
- centroidOffsetXmm
- centroidOffsetYmm
- horizontalSymmetry
- verticalSymmetry

### Temporal

- stableWindowStartMs
- stableWindowEndMs
- lengthMean
- lengthStdDev
- angleMean
- angleStdDev

---

## 10. Acceptance criteria

The frontend MVP is acceptable when:

1. A user can log in locally.
2. All primary screens are reachable through one coherent navigation system.
3. A user can run a fully simulated test from setup to result.
4. The analysis workspace clearly explains both Side and Front cameras.
5. Each camera has distinct, meaningful metrics and overlays.
6. Analysis uses realistic fixture data rather than random numbers on every render.
7. Simulation state is clearly labelled.
8. Test history is usable and table-first.
9. The UI follows `DESIGN.md`.
10. No obvious AI-generated design patterns remain after visual review.
11. Desktop layout works at 1366×768 and 1920×1080.
12. Core pages remain usable at tablet width.
13. Keyboard focus and contrast meet WCAG 2.2 AA targets.
14. Lint, typecheck, tests, and production build pass.

---

## 11. Future integration

The UI must be built around interfaces/contracts so future implementations can replace mocks with:

- PLC/ESP32 status,
- actuator commands,
- load-cell telemetry,
- actual camera streams,
- CV segmentation,
- calibration matrices,
- real analysis results.

The frontend should not need a visual rewrite when this occurs.
