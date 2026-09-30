# UI FLOW — Information Architecture

## 1. Navigation

Recommended primary navigation:

```text
Dashboard
Tests
  ├─ New Test
  └─ History
Analysis
Reports
Products / Presets
Calibration
Users            [admin]
Settings
```

Do not create separate top-level navigation for every small feature.

---

## 2. Main operator journey

```text
Login
  ↓
Dashboard
  ↓
New Test
  ↓
Configure Parameters
  ↓
Start Simulated Test
  ↓
Capture Monitor
  ↓
Mock Processing
  ↓
Analysis Workspace
  ↓
Final Result
  ↓
History / Export
```

This journey must work end-to-end before secondary screens are polished.

---

## 3. Login

### Main action

`Sign in`

### Secondary information

- local system name,
- app version,
- Simulation Mode when applicable.

No promotional copy.

---

## 4. Dashboard

### Primary question

"What should I do or inspect next?"

### Suggested regions

1. System / Simulation status
2. Current or latest test
3. compact test summary
4. recent tests
5. quick `New Test` action

Avoid six identical metric cards.

---

## 5. New Test

Recommended form groups:

### Sample

- product name
- sample/batch ID
- notes

### Test parameters

- force
- press duration
- stroke

### Fixture source

- mock dataset

### Action

`Start simulated test`

Before running, show a compact summary.

---

## 6. Capture Monitor

### Layout

Large central region:
- synchronized camera views.

Bottom:
- capture timeline.

Right or top:
- active phase,
- elapsed time,
- configured force/duration.

### Required label

`Simulation mode — fixture capture`

### Transition

When mock capture completes:
- move to Processing state,
- then enable `Open analysis`.

---

## 7. Analysis Workspace

This is a workspace, not a dashboard.

### Header

- test ID
- product/sample
- operator
- timestamp
- mode
- result state

### Camera switch

- Side
- Front
- Rear

### Main viewport

Large.

### Inspector

Show only metrics relevant to selected camera.

### Display mode

- Original
- Mask
- Overlay

### Timeline

- frame index,
- timestamp,
- stable-window range,
- scrubber.

### Camera-specific inspector

#### Side
- Spray length
- Spray angle
- Vertical spread
- Direction offset

#### Front
- Spray area
- Equivalent diameter
- Circularity
- Centroid offset
- Symmetry

#### Rear
- Bottle alignment
- Nozzle alignment
- Actuator offset
- Tilt
- movement

---

## 8. Result page

The result page summarizes one finalized test.

Recommended structure:

```text
Test identity + status

Mechanical parameters

Side Camera result
Front Camera result
Rear validation

Temporal stability

Representative images

Notes / export
```

The analysis workspace is interactive; the result page is canonical/readable.

---

## 9. History

Table columns:

- Test ID
- Date/time
- Product
- Sample ID
- Operator
- Test state
- Rear validity
- Action

Filters:
- search
- product
- user
- date
- state

---

## 10. Reports

Keep report design quiet.

Use:
- text,
- tables,
- measurement diagrams,
- one representative image per camera when useful.

Avoid dashboard-style decorative cards inside a printable report.

---

## 11. Products / Presets

Table-first.

Fields:
- name,
- default force,
- default duration,
- default stroke,
- updated date.

---

## 12. Calibration

Since hardware does not exist, show future concepts as editable mock configuration.

Sections:

- Side camera scale
- Front reference center
- Rear alignment reference
- ROI preview

Always show `Mock calibration`.

---

## 13. Empty/loading/error states

Every major page must define:

### Empty
Explain what is missing and how to create it.

### Loading
Skeleton only where layout is known.
Avoid pulse animation everywhere.

### Error
Explain:
- what failed,
- whether retry is possible,
- what state is preserved.

### Partial
Example:
- test exists,
- analysis fixture is missing.

---

## 14. Responsive behavior

The app is desktop-first because the real use case is an R&D workstation.

Tablet:
- navigation can collapse,
- metric inspector can move below viewport.

Mobile:
- history/login/basic result can remain readable,
- analysis workspace does not need full feature parity,
- do not crush the analysis viewport into unusable cards.
