# MOCK DATA — Simulation Contracts

## 1. Goal

Mock data must behave like a future real backend response.

It must not behave like a random UI demo.

Rules:

- deterministic,
- typed,
- realistic,
- reusable,
- stable across reloads,
- explicitly labelled mock.

---

## 2. Test fixture

```ts
type TestStatus =
  | "draft"
  | "configured"
  | "capturing"
  | "processing"
  | "complete"
  | "failed"

type SprayTest = {
  id: string
  productName: string
  sampleId: string
  operatorName: string
  createdAt: string

  config: {
    forceSetpointN: number
    pressDurationMs: number
    strokeMm: number
  }

  status: TestStatus
  source: "fixture"
}
```

---

## 3. Capture fixture

```ts
type CapturePhase =
  | "pre_spray"
  | "build_up"
  | "stable"
  | "decay"

type CaptureFrame = {
  frameIndex: number
  timestampMs: number
  phase: CapturePhase
  originalUrl: string
  maskUrl: string
  overlayUrl: string
}

type CameraCapture = {
  camera: "side" | "front"
  fps: number
  frames: CaptureFrame[]
}
```

Do not create hundreds of image assets initially.

For frontend MVP:
- use a small representative frame set,
- interpolate the timeline,
- reuse frames carefully.

---

## 4. Analysis result

```ts
type AnalysisResult = {
  testId: string

  analysisWindow: {
    startMs: number
    endMs: number
  }

  side: {
    sprayLengthMm: number
    sprayAngleDeg: number
    maxVerticalSpreadMm: number
    directionOffsetDeg: number
  }

  front: {
    sprayAreaMm2: number
    equivalentDiameterMm: number
    circularity: number
    centroidOffsetXmm: number
    centroidOffsetYmm: number
    horizontalSymmetry: number
    verticalSymmetry: number
  }

  temporal: {
    sprayLengthMeanMm: number
    sprayLengthStdDevMm: number
    sprayAngleMeanDeg: number
    sprayAngleStdDevDeg: number
  }

  source: "fixture"
}
```

---

## 5. Recommended fixture scenarios

Create at least these fixtures:

### `nominal-01`
- aligned setup,
- stable spray,
- all status pass.

### `direction-offset-01`
- side camera shows downward/upward offset.

### `pattern-asymmetry-01`
- front pattern centroid/symmetry differs from nominal.

### `alignment-review-01`
- simulated alignment anomaly requires review.

These scenarios make the interface credible without inventing real product acceptance thresholds.

---

## 6. Data realism

Use a fixed seed or static fixture file.

Do not run:

```ts
Math.random()
```

for core test measurements at render time.

Stakeholders should see the same result when the same fixture is selected.

---

## 7. Units

Canonical storage in mock contracts:

- length: mm
- angle: degrees
- area: mm²
- force: N
- time: ms

The UI may format to cm where that improves comprehension.

Do conversion in one shared formatter layer.

---

## 8. No fake thresholds

Do not invent statements such as:

- "spray angle must be 42°",
- "circularity above 0.90 is good",
- "3 mm actuator offset is fail".

Until validated acceptance thresholds exist, show:
- measurement,
- deviation,
- review state only where the fixture intentionally represents alignment status.

Document future threshold configuration separately.
