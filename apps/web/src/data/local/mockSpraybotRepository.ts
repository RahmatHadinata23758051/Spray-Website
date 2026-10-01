import type { Test, Frame, Analysis, FixtureScenario, Camera, CapturePhaseV2, SynchronizedAnalysisFrame } from '@spray-paragon/domain';
import type { SidePixelGeometry, FrontPixelGeometry } from '@spray-paragon/domain';
import { testSchema, analysisSchema, synchronizedAnalysisFrameSchema } from '@spray-paragon/domain';

export interface TestRepository {
  getAll(): Promise<Test[]>;
  getById(id: string): Promise<Test | null>;
}

export interface AnalysisRepository {
  getByFixture(fixture: FixtureScenario): Promise<Analysis>;
}

export class FixtureTestRepository implements TestRepository {
  async getAll(): Promise<Test[]> {
    return tests.map(t => testSchema.parse(t));
  }
  async getById(id: string): Promise<Test | null> {
    const found = tests.find(t => t.id === id);
    return found ? testSchema.parse(found) : null;
  }
}

export class FixtureAnalysisRepository implements AnalysisRepository {
  async getByFixture(fixture: FixtureScenario): Promise<Analysis> {
    const raw = analyses[fixture];
    if (!raw) throw new Error(`Unknown scenario ${fixture}`);
    return analysisSchema.parse(raw);
  }
}

export const tests: Test[] = [
  { id: 'TST-24-0618', fixture: 'nominal-01', productId: 'prd-fm100', productSnapshot: { productCode: 'PRD-FM100', productName: 'Fine Mist 100 mL' }, productName: 'Fine Mist 100 mL', sampleId: 'SMP-24-0618', recipeId: 'rcp-fm-standard', recipeSnapshot: { name: 'Standard Spray Test', forceSetpointN: 34, pressDurationMs: 850, strokeMm: 8.5 }, operatorId: 'usr-np', operatorName: 'Nadia Putri', config: { forceSetpointN: 34, pressDurationMs: 850, strokeMm: 8.5 }, status: 'complete', source: 'fixture', createdAt: '2024-09-29T08:45:00Z' },
  { id: 'TST-24-0617', fixture: 'direction-offset-01', productId: 'prd-ts250', productSnapshot: { productCode: 'PRD-TS250', productName: 'Trigger Spray 250 mL' }, productName: 'Trigger Spray 250 mL', sampleId: 'SMP-24-0617', recipeId: 'rcp-ts-standard', recipeSnapshot: { name: 'Standard Trigger Test', forceSetpointN: 42, pressDurationMs: 920, strokeMm: 11 }, operatorId: 'usr-ar', operatorName: 'Ahmad Rizki', config: { forceSetpointN: 42, pressDurationMs: 920, strokeMm: 11 }, status: 'complete', source: 'fixture', createdAt: '2024-09-28T14:20:00Z' },
  { id: 'TST-24-0616', fixture: 'pattern-asymmetry-01', productId: 'prd-fm100', productSnapshot: { productCode: 'PRD-FM100', productName: 'Fine Mist 100 mL' }, productName: 'Fine Mist 100 mL', sampleId: 'SMP-24-0616', recipeId: 'rcp-fm-stability', recipeSnapshot: { name: 'Stability Spray Test', forceSetpointN: 34, pressDurationMs: 1000, strokeMm: 8.5 }, operatorId: 'usr-np', operatorName: 'Nadia Putri', config: { forceSetpointN: 34, pressDurationMs: 1000, strokeMm: 8.5 }, status: 'complete', source: 'fixture', createdAt: '2024-09-28T10:12:00Z' },
  { id: 'TST-24-0615', fixture: 'alignment-review-01', productId: 'prd-cs150', productSnapshot: { productCode: 'PRD-CS150', productName: 'Continuous Spray 150 mL' }, productName: 'Continuous Spray 150 mL', sampleId: 'SMP-24-0615', recipeId: 'rcp-cs-standard', recipeSnapshot: { name: 'Continuous Spray Test', forceSetpointN: 38, pressDurationMs: 780, strokeMm: 9.2 }, operatorId: 'usr-ar', operatorName: 'Ahmad Rizki', config: { forceSetpointN: 38, pressDurationMs: 780, strokeMm: 9.2 }, status: 'complete', source: 'fixture', createdAt: '2024-09-27T16:48:00Z' },
];

export const frames: Frame[] = Array.from({ length: 60 }, (_, i) => ({
  frameIndex: i,
  timestampMs: i * 50,
  phase: i < 8 ? 'pre-spray' : i < 16 ? 'build-up' : i < 44 ? 'stable' : i < 52 ? 'decay' : 'complete',
}));

const toAnalysisPhase = (phase: Frame['phase']): CapturePhaseV2 => {
  if (phase === 'pre-spray') return 'pre_spray';
  if (phase === 'build-up') return 'build_up';
  if (phase === 'complete') return 'decay';
  return phase;
};

const frameAsset = (camera: Camera, frameIndex: number, mode: 'original' | 'mask' | 'overlay') => `/fixtures/${camera}-${mode}.png?frame=${String(frameIndex).padStart(3, '0')}`;

export const synchronizedFrames: SynchronizedAnalysisFrame[] = frames.map(frame => {
  const phase = toAnalysisPhase(frame.phase);
  return synchronizedAnalysisFrameSchema.parse({
    id: `cap-${String(frame.frameIndex).padStart(3, '0')}`,
    frameIndex: frame.frameIndex,
    timestampMs: frame.timestampMs,
    phase,
    side: {
      id: `side-${String(frame.frameIndex).padStart(3, '0')}`,
      camera: 'side',
      frameIndex: frame.frameIndex,
      timestampMs: frame.timestampMs,
      phase,
      assets: {
        original: frameAsset('side', frame.frameIndex, 'original'),
        mask: frameAsset('side', frame.frameIndex, 'mask'),
        overlay: frameAsset('side', frame.frameIndex, 'overlay'),
      },
    },
    front: {
      id: `front-${String(frame.frameIndex).padStart(3, '0')}`,
      camera: 'front',
      frameIndex: frame.frameIndex,
      timestampMs: frame.timestampMs,
      phase,
      assets: {
        original: frameAsset('front', frame.frameIndex, 'original'),
        mask: frameAsset('front', frame.frameIndex, 'mask'),
        overlay: frameAsset('front', frame.frameIndex, 'overlay'),
      },
    },
    syncStatus: 'synced',
    timestampDeltaMs: 0,
    recommended: frame.frameIndex === 28,
  });
});

export const analyses: Record<FixtureScenario, Analysis> = {
  'nominal-01': {
    fixture: 'nominal-01',
    analysisWindow: { startMs: 800, endMs: 2200 },
    side: { sprayLengthMm: 462, sprayAngleDeg: 18.4, maxVerticalSpreadMm: 148, directionOffsetDeg: 0.8 },
    front: { sprayAreaMm2: 19240, equivalentDiameterMm: 156, circularity: 0.86, centroidOffsetXmm: 2.1, centroidOffsetYmm: -1.4, horizontalSymmetry: 0.94, verticalSymmetry: 0.91 },
    temporal: { sprayLengthMeanMm: 464, sprayLengthStdDevMm: 8, sprayAngleMeanDeg: 18.6, sprayAngleStdDevDeg: 1.2 },
  },
  'direction-offset-01': {
    fixture: 'direction-offset-01',
    analysisWindow: { startMs: 800, endMs: 2200 },
    side: { sprayLengthMm: 448, sprayAngleDeg: 22.1, maxVerticalSpreadMm: 168, directionOffsetDeg: 4.8 },
    front: { sprayAreaMm2: 21800, equivalentDiameterMm: 167, circularity: 0.78, centroidOffsetXmm: 14.2, centroidOffsetYmm: -2.8, horizontalSymmetry: 0.82, verticalSymmetry: 0.88 },
    temporal: { sprayLengthMeanMm: 451, sprayLengthStdDevMm: 14, sprayAngleMeanDeg: 22.4, sprayAngleStdDevDeg: 2.1 },
  },
  'pattern-asymmetry-01': {
    fixture: 'pattern-asymmetry-01',
    analysisWindow: { startMs: 800, endMs: 2200 },
    side: { sprayLengthMm: 432, sprayAngleDeg: 16.2, maxVerticalSpreadMm: 126, directionOffsetDeg: 1.2 },
    front: { sprayAreaMm2: 16400, equivalentDiameterMm: 144, circularity: 0.68, centroidOffsetXmm: 8.4, centroidOffsetYmm: 6.2, horizontalSymmetry: 0.74, verticalSymmetry: 0.81 },
    temporal: { sprayLengthMeanMm: 436, sprayLengthStdDevMm: 18, sprayAngleMeanDeg: 16.8, sprayAngleStdDevDeg: 2.8 },
  },
  'alignment-review-01': {
    fixture: 'alignment-review-01',
    analysisWindow: { startMs: 800, endMs: 2200 },
    side: { sprayLengthMm: 456, sprayAngleDeg: 19.8, maxVerticalSpreadMm: 154, directionOffsetDeg: 2.4 },
    front: { sprayAreaMm2: 18600, equivalentDiameterMm: 154, circularity: 0.84, centroidOffsetXmm: 4.8, centroidOffsetYmm: -3.2, horizontalSymmetry: 0.88, verticalSymmetry: 0.86 },
    temporal: { sprayLengthMeanMm: 459, sprayLengthStdDevMm: 12, sprayAngleMeanDeg: 20.1, sprayAngleStdDevDeg: 1.8 },
  },
};

/* ---------- Pixel geometry fixtures ---------- */
/* These fixtures provide pixel-space primitives.
   Physical measurements must be DERIVED from pixel geometry × calibration.
   Side default calibration: 1000 mm / 522 px ≈ 1.9157 mm / px
   Front default calibration: 500 mm / 200 px = 2.5 mm / px */

function sideGeometry(frameIndex: number, scenario: FixtureScenario): SidePixelGeometry {
  const delta = (frameIndex % 7) - 3;
  const base: Record<FixtureScenario, SidePixelGeometry> = {
    'nominal-01': {
      nozzleOriginPx: { x: 112, y: 204 },
      sprayEndpointPx: { x: 353, y: 196 },
      upperBoundaryPx: { x: 594, y: 151 },
      lowerBoundaryPx: { x: 574, y: 226 },
      verticalSpreadTopPx: { x: 594, y: 151 },
      verticalSpreadBottomPx: { x: 594, y: 228 },
      directionReferencePx: { x: 353, y: 204 },
    },
    'direction-offset-01': {
      nozzleOriginPx: { x: 112, y: 204 },
      sprayEndpointPx: { x: 346, y: 184 },
      upperBoundaryPx: { x: 570, y: 132 },
      lowerBoundaryPx: { x: 570, y: 241 },
      verticalSpreadTopPx: { x: 570, y: 132 },
      verticalSpreadBottomPx: { x: 570, y: 220 },
      directionReferencePx: { x: 346, y: 204 },
    },
    'pattern-asymmetry-01': {
      nozzleOriginPx: { x: 112, y: 204 },
      sprayEndpointPx: { x: 338, y: 200 },
      upperBoundaryPx: { x: 560, y: 160 },
      lowerBoundaryPx: { x: 556, y: 222 },
      verticalSpreadTopPx: { x: 560, y: 160 },
      verticalSpreadBottomPx: { x: 560, y: 226 },
      directionReferencePx: { x: 338, y: 204 },
    },
    'alignment-review-01': {
      nozzleOriginPx: { x: 112, y: 204 },
      sprayEndpointPx: { x: 350, y: 194 },
      upperBoundaryPx: { x: 582, y: 142 },
      lowerBoundaryPx: { x: 578, y: 232 },
      verticalSpreadTopPx: { x: 582, y: 142 },
      verticalSpreadBottomPx: { x: 582, y: 222 },
      directionReferencePx: { x: 350, y: 204 },
    },
  };
  const b = base[scenario];
  return {
    nozzleOriginPx: b.nozzleOriginPx,
    sprayEndpointPx: { x: b.sprayEndpointPx.x + delta * 0.8, y: b.sprayEndpointPx.y },
    upperBoundaryPx: { x: b.upperBoundaryPx.x, y: b.upperBoundaryPx.y - delta * 0.12 },
    lowerBoundaryPx: { x: b.lowerBoundaryPx.x, y: b.lowerBoundaryPx.y + delta * 0.12 },
    verticalSpreadTopPx: { x: b.verticalSpreadTopPx.x, y: b.verticalSpreadTopPx.y - delta * 0.18 },
    verticalSpreadBottomPx: { x: b.verticalSpreadBottomPx.x, y: b.verticalSpreadBottomPx.y + delta * 0.18 },
    directionReferencePx: b.directionReferencePx,
  };
}

function frontGeometry(frameIndex: number, scenario: FixtureScenario): FrontPixelGeometry {
  const delta = (frameIndex % 7) - 3;
  const base: Record<FixtureScenario, FrontPixelGeometry> = {
    'nominal-01': {
      contourPx: [],
      sprayAreaPixels: 3078,
      centroidPx: { x: 360.84, y: 189.44 },
      referenceCenterPx: { x: 360, y: 190 },
      equivalentDiameterPx: 62.4,
      circularity: 0.86,
      horizontalSymmetry: 0.94,
      verticalSymmetry: 0.91,
    },
    'direction-offset-01': {
      contourPx: [],
      sprayAreaPixels: 3488,
      centroidPx: { x: 365.68, y: 188.88 },
      referenceCenterPx: { x: 360, y: 190 },
      equivalentDiameterPx: 66.8,
      circularity: 0.78,
      horizontalSymmetry: 0.82,
      verticalSymmetry: 0.88,
    },
    'pattern-asymmetry-01': {
      contourPx: [],
      sprayAreaPixels: 2624,
      centroidPx: { x: 363.36, y: 192.48 },
      referenceCenterPx: { x: 360, y: 190 },
      equivalentDiameterPx: 57.6,
      circularity: 0.68,
      horizontalSymmetry: 0.74,
      verticalSymmetry: 0.81,
    },
    'alignment-review-01': {
      contourPx: [],
      sprayAreaPixels: 2976,
      centroidPx: { x: 361.92, y: 188.72 },
      referenceCenterPx: { x: 360, y: 190 },
      equivalentDiameterPx: 61.6,
      circularity: 0.84,
      horizontalSymmetry: 0.88,
      verticalSymmetry: 0.86,
    },
  };
  const b = base[scenario];
  return {
    contourPx: b.contourPx,
    sprayAreaPixels: b.sprayAreaPixels + delta * 6.72,
    centroidPx: { x: b.centroidPx.x + delta * 0.016, y: b.centroidPx.y - delta * 0.012 },
    referenceCenterPx: b.referenceCenterPx,
    equivalentDiameterPx: b.equivalentDiameterPx + delta * 0.08,
    circularity: b.circularity,
    horizontalSymmetry: b.horizontalSymmetry,
    verticalSymmetry: b.verticalSymmetry,
  };
}

export function getPixelGeometry(frameIndex: number, scenario: FixtureScenario): { side: SidePixelGeometry; front: FrontPixelGeometry } {
  return { side: sideGeometry(frameIndex, scenario), front: frontGeometry(frameIndex, scenario) };
}

export const fmt = {
  mm: (v: number) => `${v.toFixed(1)} mm`,
  cm: (v: number) => `${(v / 10).toFixed(1)} cm`,
  deg: (v: number) => `${v.toFixed(1)}°`,
  area: (v: number) => `${v.toFixed(0)} mm²`,
  pct: (v: number) => `${(v * 100).toFixed(0)}%`,
  date: (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
};

export const fixtureLabels: Record<FixtureScenario, string> = {
  'nominal-01': 'Nominal performance baseline',
  'direction-offset-01': 'Direction offset scenario',
  'pattern-asymmetry-01': 'Pattern asymmetry scenario',
  'alignment-review-01': 'Alignment review scenario',
};
