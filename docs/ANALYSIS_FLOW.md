# ANALYSIS FLOW — 3-Camera Mock Pipeline

## 1. Purpose

This document defines the analysis process the frontend must represent.

It is not a claim that the current software performs real computer vision.

The MVP simulates these stages using deterministic fixtures.

---

## 2. End-to-end flow

```text
Test configuration
        ↓
Trigger / synchronization
        ↓
3-camera capture
        ↓
Video / frame buffer
        ↓
Frame extraction + timestamp
        ↓
Spray-event detection
        ↓
Analysis-window selection
        ↓
Preprocessing
        ↓
Segmentation / object mask
        ↓
Camera calibration
        ↓
Per-camera measurement
        ↓
Per-frame metrics
        ↓
Temporal aggregation
        ↓
Final test result
        ↓
History / export / report
```

---

## 3. Why we do not use one "best frame"

The main measurement should not be based on one aesthetically clean frame.

The intended approach is:

1. identify the stable spray window,
2. calculate metrics across frames in that window,
3. aggregate them using mean/median/std-dev/min/max as appropriate,
4. select one representative frame only for visualization/reporting.

This reduces sensitivity to a single noisy frame or stray droplet.

---

## 4. Capture phases

The UI should represent:

### Pre-spray
- background reference,
- no active spray.

### Build-up
- spray begins forming,
- geometry changes rapidly.

### Stable
- main analysis window.

### Decay
- pressure/spray falls after release.

### Complete
- processing/result state.

---

## 5. Preprocessing stages

Represent the future CV pipeline as:

```text
Raw frame
→ ROI crop
→ background subtraction
→ contrast normalization
→ denoise
→ threshold / segmentation
→ morphological cleanup
→ spray/object mask
```

Do not imply neural-network segmentation is mandatory.

For a controlled machine environment, classical CV is a valid first implementation candidate.

---

## 6. Calibration concept

The grid shown in UI is not the primary measurement algorithm.

Correct concept:

```text
pixel coordinate
→ camera calibration
→ physical coordinate (mm/cm)
```

The UI may overlay a calibrated grid after the transform.

Possible future calibration:
- fixed scale,
- calibration target,
- homography/perspective correction,
- lens distortion correction.

---

# 7. Camera responsibilities

## 7.1 Side Camera

### Purpose

Characterize spray geometry from the side.

### MVP metrics

- Spray Length
- Spray Angle
- Maximum Vertical Spread
- Centerline Direction / Direction Offset

### Suggested derived data

```ts
type SideCameraMetrics = {
  sprayLengthMm: number
  sprayAngleDeg: number
  maxVerticalSpreadMm: number
  directionOffsetDeg: number
}
```

### Visual overlay

- nozzle origin,
- upper boundary,
- lower boundary,
- centerline,
- angle rays,
- length line,
- vertical spread line,
- distance scale.

### Measurement warning

Do not define spray length using one furthest noisy pixel.

Future real algorithm should use a valid contour/density threshold or robust percentile.

---

## 7.2 Front Camera

### Purpose

Characterize the cross-sectional/pattern shape of spray at the selected distance.

The camera is physically positioned beyond the expected spray reach in the proposed machine layout.

### MVP metrics

- Spray Area
- Equivalent Diameter
- Circularity
- Centroid Offset
- Pattern Symmetry

### Suggested derived data

```ts
type FrontCameraMetrics = {
  sprayAreaMm2: number
  equivalentDiameterMm: number
  circularity: number
  centroidOffsetXmm: number
  centroidOffsetYmm: number
  horizontalSymmetry: number
  verticalSymmetry: number
}
```

### Visual overlay

- segmented spray contour,
- equivalent circle,
- centroid,
- reference center,
- horizontal axis,
- vertical axis.

### Future metrics — not MVP promise

- radial density profile,
- hollow/full cone classification,
- distribution density,
- droplet analysis.

---

## 7.3 Rear Camera

### Purpose

Validate whether the physical setup is mechanically trustworthy.

This camera should not be forced into spray-characterization metrics.

### MVP metrics

- Bottle Alignment
- Nozzle Alignment
- Actuator Offset
- Bottle Tilt
- Movement During Test

### Suggested derived data

```ts
type RearCameraMetrics = {
  bottleAlignmentStatus: "pass" | "review" | "fail"
  nozzleAlignmentStatus: "pass" | "review" | "fail"
  actuatorOffsetXmm: number
  actuatorOffsetYmm: number
  bottleTiltDeg: number
  movementDuringTestMm: number
}
```

### Visual overlay

- reference machine axis,
- bottle axis,
- nozzle center,
- actuator center,
- tilt line,
- offset vector.

### Validity concept

Future rule:

```text
mechanical validation fails
→ spray result marked invalid / retest required
```

The threshold values are **not defined yet** and must not be invented in the MVP.

---

## 8. Temporal aggregation

Example representation:

```text
Frame 081 → angle 41.4°
Frame 082 → angle 41.8°
Frame 083 → angle 42.1°
...
```

Final mock result can expose:

- mean,
- median,
- std-dev,
- minimum,
- maximum.

Use deterministic fixture values.

---

## 9. Analysis Workspace states

Each camera should support:

### Original
Raw mock frame.

### Mask
Segmentation result.

### Overlay
Raw frame + measurement geometry.

The front-end should make it visually obvious which representation is active.

---

## 10. Mock limitation copy

Use copy such as:

> Analysis shown here is generated from fixture data for interface validation. No machine or camera hardware is connected.

Do not use:

> AI analyzed your spray in real time.

unless that capability actually exists later.
