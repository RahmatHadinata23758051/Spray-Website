import type { Camera, RealSideBaselineSelection, SynchronizedAnalysisFrame, Test } from '../types/index';
import type { Batch } from '../batch/index';
import type { KodePengujian } from '../kode-pengujian/index';
import { getEffectiveSampleContext } from '../kode-pengujian/index';

export type MeasurementValue = {
  auto: number;
  final: number;
  adjusted: boolean;
  adjustedBy?: string;
  adjustedAt?: string;
};

export type Point = {
  x: number;
  y: number;
};

/**
 * Physical placement of the spray nozzle as seen by the Side camera.
 * Client data shows the nozzle can sit on either side, so analysis and
 * overlays must not assume nozzle-left -> spray-right.
 */
export type SideOrientation = 'nozzleLeft' | 'nozzleRight';

/** Backward-compatible default: existing fixtures place the nozzle on the left. */
export const DEFAULT_SIDE_ORIENTATION: SideOrientation = 'nozzleLeft';

/** Direction the spray travels away from the nozzle along x: +1 right, -1 left. */
export function sideSprayDirection(orientation: SideOrientation | undefined): 1 | -1 {
  return orientation === 'nozzleRight' ? -1 : 1;
}

export function resolveSideOrientation(source: { sideOrientation?: SideOrientation } | undefined): SideOrientation {
  return source?.sideOrientation ?? DEFAULT_SIDE_ORIENTATION;
}

export type SidePixelGeometry = {
  nozzleOriginPx: Point;
  sprayEndpointPx: Point;
  upperBoundaryPx: Point;
  lowerBoundaryPx: Point;
  verticalSpreadTopPx: Point;
  verticalSpreadBottomPx: Point;
  directionReferencePx: Point;
};

export type FrontPixelGeometry = {
  contourPx: Point[];
  sprayAreaPixels: number;
  centroidPx: Point;
  referenceCenterPx: Point;
  equivalentDiameterPx: number;
  circularity: number;
  horizontalSymmetry: number;
  verticalSymmetry: number;
};

export type SidePixelCorrections = Partial<Record<keyof SideFinalMeasurements, number>> & {
  adjustedBy?: string;
  adjustedAt?: string;
};

export type FrontPixelCorrections = Partial<Record<keyof FrontFinalMeasurements, number>> & {
  adjustedBy?: string;
  adjustedAt?: string;
};

export type SideMeasurementCorrection = {
  geometry: SidePixelGeometry;
  adjustedBy: string;
  adjustedAt: string;
};

export type FrontMeasurementCorrection = {
  geometry: FrontPixelGeometry;
  adjustedBy: string;
  adjustedAt: string;
};

export function cloneSideGeometry(geometry: SidePixelGeometry): SidePixelGeometry {
  return {
    nozzleOriginPx: { ...geometry.nozzleOriginPx },
    sprayEndpointPx: { ...geometry.sprayEndpointPx },
    upperBoundaryPx: { ...geometry.upperBoundaryPx },
    lowerBoundaryPx: { ...geometry.lowerBoundaryPx },
    verticalSpreadTopPx: { ...geometry.verticalSpreadTopPx },
    verticalSpreadBottomPx: { ...geometry.verticalSpreadBottomPx },
    directionReferencePx: { ...geometry.directionReferencePx },
  };
}

/**
 * Horizontally mirrors Side geometry within the frame. Distances, angles and
 * |Δx| measurements are invariant under mirroring, so measurement values are
 * unchanged; only the rendered side of the nozzle moves.
 */
export function mirrorSideGeometry(geometry: SidePixelGeometry, frameWidth = 720): SidePixelGeometry {
  const mirror = (point: Point): Point => ({ x: frameWidth - point.x, y: point.y });
  return {
    nozzleOriginPx: mirror(geometry.nozzleOriginPx),
    sprayEndpointPx: mirror(geometry.sprayEndpointPx),
    upperBoundaryPx: mirror(geometry.upperBoundaryPx),
    lowerBoundaryPx: mirror(geometry.lowerBoundaryPx),
    verticalSpreadTopPx: mirror(geometry.verticalSpreadTopPx),
    verticalSpreadBottomPx: mirror(geometry.verticalSpreadBottomPx),
    directionReferencePx: mirror(geometry.directionReferencePx),
  };
}

export function cloneFrontGeometry(geometry: FrontPixelGeometry): FrontPixelGeometry {
  return {
    ...geometry,
    contourPx: geometry.contourPx.map(point => ({ ...point })),
    centroidPx: { ...geometry.centroidPx },
    referenceCenterPx: { ...geometry.referenceCenterPx },
  };
}

export function getSideDisplayGeometry(autoGeometry: SidePixelGeometry, correction?: SideMeasurementCorrection): SidePixelGeometry {
  return correction?.geometry ?? autoGeometry;
}

export function getFrontDisplayGeometry(autoGeometry: FrontPixelGeometry, correction?: FrontMeasurementCorrection): FrontPixelGeometry {
  return correction?.geometry ?? autoGeometry;
}

export function moveSideMeasurementHandle(
  geometry: SidePixelGeometry,
  handle: 'sprayEndpoint' | 'spreadTop' | 'spreadBottom' | 'upperAngle' | 'lowerAngle' | 'spreadPosition' | 'directionReference',
  target: Point,
  bounds: { width: number; height: number },
  orientation: SideOrientation = DEFAULT_SIDE_ORIENTATION,
): SidePixelGeometry {
  const clamped = clampPoint(target, bounds);
  const cloned = cloneSideGeometry(geometry);
  const direction = sideSprayDirection(orientation);
  const downstreamX = (x: number) => x + direction * 10;
  const constrainDownstreamX = (x: number) => direction === 1
    ? Math.max(downstreamX(cloned.nozzleOriginPx.x), x)
    : Math.min(downstreamX(cloned.nozzleOriginPx.x), x);
  switch (handle) {
    case 'sprayEndpoint': {
      cloned.sprayEndpointPx = {
        x: constrainDownstreamX(clamped.x),
        y: clamped.y,
      };
      break;
    }
    case 'spreadPosition': {
      const downstreamLimit = downstreamX(cloned.nozzleOriginPx.x);
      const newX = direction === 1
        ? Math.min(bounds.width - 10, Math.max(downstreamLimit, clamped.x))
        : Math.max(10, Math.min(downstreamLimit, clamped.x));
      cloned.verticalSpreadTopPx = { x: newX, y: cloned.verticalSpreadTopPx.y };
      cloned.verticalSpreadBottomPx = { x: newX, y: cloned.verticalSpreadBottomPx.y };
      break;
    }
    case 'spreadTop': {
      const maxY = cloned.verticalSpreadBottomPx.y - 10;
      const newY = Math.min(maxY, clamped.y);
      cloned.verticalSpreadTopPx = { x: cloned.verticalSpreadTopPx.x, y: newY };
      break;
    }
    case 'spreadBottom': {
      const minY = cloned.verticalSpreadTopPx.y + 10;
      const newY = Math.max(minY, clamped.y);
      cloned.verticalSpreadBottomPx = { x: cloned.verticalSpreadBottomPx.x, y: newY };
      break;
    }
    case 'upperAngle': {
      cloned.upperBoundaryPx = {
        x: constrainDownstreamX(clamped.x),
        y: Math.min(cloned.nozzleOriginPx.y - 4, clamped.y),
      };
      break;
    }
    case 'lowerAngle': {
      cloned.lowerBoundaryPx = {
        x: constrainDownstreamX(clamped.x),
        y: Math.max(cloned.nozzleOriginPx.y + 4, clamped.y),
      };
      break;
    }
    case 'directionReference': {
      cloned.directionReferencePx = {
        x: constrainDownstreamX(clamped.x),
        y: clamped.y,
      };
      break;
    }
  }
  return cloned;
}

export function moveFrontMeasurementHandle(
  geometry: FrontPixelGeometry,
  handle: 'centroid' | 'diameterLeft' | 'diameterRight',
  target: Point,
  bounds: { width: number; height: number },
): FrontPixelGeometry {
  const clamped = clampPoint(target, bounds);
  const cloned = cloneFrontGeometry(geometry);
  switch (handle) {
    case 'centroid': {
      cloned.centroidPx = clamped;
      break;
    }
    case 'diameterLeft':
    case 'diameterRight': {
      const centerX = cloned.referenceCenterPx.x;
      const radius = Math.max(10, Math.abs(clamped.x - centerX));
      const newDiameter = radius * 2;
      const oldDiameter = cloned.equivalentDiameterPx;
      const ratio = oldDiameter > 0 ? newDiameter / oldDiameter : 1;
      cloned.equivalentDiameterPx = newDiameter;
      cloned.sprayAreaPixels = Math.round(cloned.sprayAreaPixels * ratio * ratio);
      break;
    }
  }
  return cloned;
}

export type CalibrationSnapshot = {
  camera: Camera;
  /** Side-camera-only physical orientation; omitted legacy records resolve to nozzleLeft. */
  sideOrientation?: SideOrientation;
  referenceDistanceMm: number;
  anchorA: Point;
  anchorB: Point;
  scaleMmPerPx: number;
  adjusted: boolean;
  adjustedBy?: string;
  adjustedAt?: string;
};

export type SelectedCaptureMoment = {
  captureFrameId: string;
  role: 'primary' | 'supporting';
  selectedBy: string;
  selectedAt: string;
};

export const MAX_SELECTED_CAPTURE_MOMENTS = 10;

export type SelectionResult = {
  selected: SelectedCaptureMoment[];
  error?: string;
};

/** A future external analysis result may reference derived assets without embedding binary data. */
export type ExternalSideAnalysisResult = {
  sourceFrame: { frameId: string; frameIndex: number; elapsedMs: number; assetId: string };
  maskAssetId?: string;
  measurements?: SideFinalMeasurements;
  quality?: { confidence?: number; qcStatus?: 'pending' | 'passed' | 'failed'; issues?: string[] };
  analysisMethod: string;
  analysisVersion: string;
};

/**
 * Real Side analysis input. This replaces the synchronized-moment assumption
 * for real captures: there is no Front frame and no fabricated sync metadata.
 * It references persisted binaries by assetId only; no Blob or ObjectURL.
 */
export type RealSideAnalysisFrameRef = {
  frameId: string;
  frameIndex: number;
  elapsedMs: number;
  assetId: string;
};

export type RealSideAnalysisInput = {
  batchId: string;
  captureMode: 'real';
  frames: RealSideAnalysisFrameRef[];
  baseline: RealSideBaselineSelection | null;
  sideOrientation: SideOrientation;
  /** Side calibration copied from the analysis draft when one exists. */
  calibration: CalibrationSnapshot | null;
};

/**
 * TestRun-native real Side analysis input.
 * Does NOT reference Batch; uses KodePengujian / Sample / TestRun hierarchy.
 */
export type TestRunRealSideAnalysisInput = {
  kodePengujianId: string;
  sampleId: string;
  testRunId: string;
  productCode: string;
  productName: string;
  recipeName: string;
  setpoints: { forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  effectiveStorage: string;
  effectiveBottlePosition: string;
  operatorId: string;
  operatorName: string;
  captureMode: 'real';
  frames: RealSideAnalysisFrameRef[];
  baseline: RealSideBaselineSelection | null;
  sideOrientation: SideOrientation;
  /** Side calibration copied from the analysis draft when one exists. */
  calibration: CalibrationSnapshot | null;
};

export type BuildTestRunRealSideAnalysisInputResult =
  | { ok: true; input: TestRunRealSideAnalysisInput }
  | { ok: false; error: string };

export type BuildRealSideAnalysisInputResult =
  | { ok: true; input: RealSideAnalysisInput }
  | { ok: false; error: string };

/**
 * Builds the real Side analysis contract from a batch. Fails loudly for
 * simulation sessions, missing metadata, or frames without persisted assets.
 */
export function buildRealSideAnalysisInput(batch: Batch): BuildRealSideAnalysisInputResult {
  const session = batch.captureSession;
  if (!session) return { ok: false, error: `Batch ${batch.id} has no capture session.` };
  if (session.captureMode !== 'real') return { ok: false, error: 'Real Side analysis requires a real capture session; simulation uses synchronized moments.' };

  const frames = session.realSideFrames ?? [];
  if (frames.length === 0) return { ok: false, error: 'Real Side analysis requires at least one captured Side frame.' };
  if (frames.some((frame, index) => frame.frameIndex !== index || !frame.id || !frame.assetId)) {
    return { ok: false, error: 'Real Side frames must have contiguous indexes, frame IDs, and persisted asset references.' };
  }
  if (frames.some((frame, index) => index > 0 && frame.elapsedMs < frames[index - 1].elapsedMs)) {
    return { ok: false, error: 'Real Side frame timestamps must be ordered by elapsed time.' };
  }

  const baseline = session.realSideBaseline;
  if (!baseline) return { ok: false, error: 'A persisted Side baseline selection is required before analysis preparation.' };
  const frameById = new Map(frames.map((frame) => [frame.id, frame]));
  for (const baselineFrame of baseline.frames) {
    const capturedFrame = frameById.get(baselineFrame.frameId);
    if (!capturedFrame || capturedFrame.frameIndex !== baselineFrame.frameIndex || capturedFrame.assetId !== baselineFrame.assetId) {
      return { ok: false, error: `Baseline frame ${baselineFrame.frameId} does not reference the persisted Side capture.` };
    }
  }

  const sideOrientation = resolveSideOrientation(batch.analysisDraft?.calibration.side);

  return {
    ok: true,
    input: {
      batchId: batch.id,
      captureMode: 'real',
      frames: frames.map((frame) => ({ frameId: frame.id, frameIndex: frame.frameIndex, elapsedMs: frame.elapsedMs, assetId: frame.assetId as string })),
      baseline: session.realSideBaseline ? structuredClone(session.realSideBaseline) : null,
      sideOrientation,
      calibration: batch.analysisDraft ? { ...batch.analysisDraft.calibration.side } : null,
    },
  };
}

/**
 * Builds the real Side analysis contract from a TestRun within a KodePengujian.
 * Does NOT adapt back to Batch. Fails loudly for simulation sessions, missing
 * metadata, or frames without persisted assets.
 */
export function buildTestRunRealSideAnalysisInput(
  kp: KodePengujian,
  testRunId: string
): BuildTestRunRealSideAnalysisInputResult {
  const tr = kp.testRuns.find((t) => t.id === testRunId);
  if (!tr) return { ok: false, error: `TestRun ${testRunId} not found in KodePengujian ${kp.id}.` };
  if (!tr.captureSession) return { ok: false, error: `TestRun ${testRunId} has no capture session.` };
  if (tr.captureSession.captureMode !== 'real') {
    return { ok: false, error: 'Real Side analysis requires a real capture session; simulation uses synchronized moments.' };
  }

  const sample = kp.samples.find((s) => s.id === tr.sampleId);
  if (!sample) return { ok: false, error: `Sample ${tr.sampleId} not found in KodePengujian ${kp.id}.` };

  const effective = getEffectiveSampleContext(sample, kp);
  const session = tr.captureSession;

  const frames = session.realSideFrames ?? [];
  if (frames.length === 0) return { ok: false, error: 'Real Side analysis requires at least one captured Side frame.' };
  if (frames.some((frame, index) => frame.frameIndex !== index || !frame.id || !frame.assetId)) {
    return { ok: false, error: 'Real Side frames must have contiguous indexes, frame IDs, and persisted asset references.' };
  }
  if (frames.some((frame, index) => index > 0 && frame.elapsedMs < frames[index - 1].elapsedMs)) {
    return { ok: false, error: 'Real Side frame timestamps must be ordered by elapsed time.' };
  }

  const baseline = session.realSideBaseline;
  if (!baseline) return { ok: false, error: 'A persisted Side baseline selection is required before analysis preparation.' };
  const frameById = new Map(frames.map((frame) => [frame.id, frame]));
  for (const baselineFrame of baseline.frames) {
    const capturedFrame = frameById.get(baselineFrame.frameId);
    if (!capturedFrame || capturedFrame.frameIndex !== baselineFrame.frameIndex || capturedFrame.assetId !== baselineFrame.assetId) {
      return { ok: false, error: `Baseline frame ${baselineFrame.frameId} does not reference the persisted Side capture.` };
    }
  }

  const sideOrientation = resolveSideOrientation(tr.analysisDraft?.calibration.side);

  return {
    ok: true,
    input: {
      kodePengujianId: kp.id,
      sampleId: tr.sampleId,
      testRunId: tr.id,
      productCode: kp.productSnapshot.productCode,
      productName: kp.productSnapshot.productName,
      recipeName: tr.recipeSnapshot.name,
      setpoints: tr.setpoints,
      effectiveStorage: effective.storageCondition ?? '—',
      effectiveBottlePosition: effective.bottlePosition ?? '—',
      operatorId: tr.operatorId,
      operatorName: tr.operatorName,
      captureMode: 'real',
      frames: frames.map((frame) => ({ frameId: frame.id, frameIndex: frame.frameIndex, elapsedMs: frame.elapsedMs, assetId: frame.assetId as string })),
      baseline: session.realSideBaseline ? structuredClone(session.realSideBaseline) : null,
      sideOrientation,
      calibration: tr.analysisDraft ? { ...tr.analysisDraft.calibration.side } : null,
    },
  };
}

/**
 * Real Side captures do not have synchronized moments. They still use the
 * same primary/supporting selection semantics without inventing a Front frame.
 */
export function setPrimaryAnalysisCapture(
  current: SelectedCaptureMoment[],
  captureFrameId: string,
  selectedBy: string,
  selectedAt: string,
): SelectionResult {
  const existingSelection = current.find(selection => selection.captureFrameId === captureFrameId);
  const oldPrimary = current.find(selection => selection.role === 'primary');
  if (existingSelection?.role === 'primary') return { selected: current };
  if (existingSelection?.role === 'supporting') {
    return {
      selected: current.map(selection => {
        if (selection.captureFrameId === captureFrameId) return { ...selection, role: 'primary' as const, selectedBy, selectedAt };
        if (selection.captureFrameId === oldPrimary?.captureFrameId) return { ...selection, role: 'supporting' as const };
        return selection;
      }),
    };
  }
  if (current.length >= MAX_SELECTED_CAPTURE_MOMENTS) return { selected: current, error: 'Maximum 10 captures selected. Remove a supporting capture first.' };
  return {
    selected: [
      ...current.map(selection => selection.captureFrameId === oldPrimary?.captureFrameId ? { ...selection, role: 'supporting' as const } : selection),
      { captureFrameId, role: 'primary', selectedBy, selectedAt },
    ],
  };
}

export function addSupportingAnalysisCapture(
  current: SelectedCaptureMoment[],
  captureFrameId: string,
  selectedBy: string,
  selectedAt: string,
): SelectionResult {
  if (current.some(selection => selection.captureFrameId === captureFrameId)) return { selected: current, error: 'Capture frame already selected' };
  if (current.length >= MAX_SELECTED_CAPTURE_MOMENTS) return { selected: current, error: 'Maximum 10 capture moments already selected' };
  return { selected: [...current, { captureFrameId, role: 'supporting', selectedBy, selectedAt }] };
}

export type SideFinalMeasurements = {
  sprayLength: MeasurementValue;
  sprayAngle: MeasurementValue;
  verticalSpread: MeasurementValue;
  directionOffset: MeasurementValue;
  spreadPosition?: MeasurementValue;
};

export type FrontFinalMeasurements = {
  sprayArea: MeasurementValue;
  equivalentDiameter: MeasurementValue;
  circularity: MeasurementValue;
  centroidOffsetX: MeasurementValue;
  centroidOffsetY: MeasurementValue;
  horizontalSymmetry: MeasurementValue;
  verticalSymmetry: MeasurementValue;
};

export type ReportFrameSnapshot = {
  frameId: string;
  frameIndex: number;
  timestampMs: number;
  phase: SynchronizedAnalysisFrame['phase'];
  overlayAsset: string;
  originalAsset: string;
  maskAsset: string;
};

export type AnalysisPerspective = 'side' | 'front';

export type DualPerspectiveFinalAnalysisReport = FinalAnalysisReport & {
  front: NonNullable<FinalAnalysisReport['front']>;
  supportingCaptures: Array<{
    captureMomentId: string;
    frameIndex: number;
    timestampMs: number;
    phase: SynchronizedAnalysisFrame['phase'];
    side: ReportFrameSnapshot;
    front: ReportFrameSnapshot;
  }>;
};

export type FinalAnalysisReport = {
  status: 'finalized';
  analysisSource: 'simulation' | 'real';
  perspectives: AnalysisPerspective[];
  test: {
    testId: string;
    sampleId: string;
    product: NonNullable<Test['productSnapshot']>;
    recipe: NonNullable<Test['recipeSnapshot']>;
    productionBatch?: string;
    operator: string;
    testTimestamp: string;
    setpoints: Test['config'];
  };
  testId: string;
  primaryCaptureMomentId: string;
  supportingCaptureMomentIds: string[];
  primaryCapture: {
    frameIndex: number;
    timestampMs: number;
    phase: SynchronizedAnalysisFrame['phase'];
  };
  side: SideFinalMeasurements & {
    frameId: string;
    frame: ReportFrameSnapshot;
    calibration: CalibrationSnapshot;
    autoGeometry: SidePixelGeometry;
    finalGeometry: SidePixelGeometry;
  };
  front?: FrontFinalMeasurements & {
    frameId: string;
    frame: ReportFrameSnapshot;
    calibration: CalibrationSnapshot;
    autoGeometry: FrontPixelGeometry;
    finalGeometry: FrontPixelGeometry;
  };
  supportingCaptures: Array<{
    captureMomentId: string;
    frameIndex: number;
    timestampMs: number;
    phase: SynchronizedAnalysisFrame['phase'];
    side: ReportFrameSnapshot;
    front?: ReportFrameSnapshot;
  }>;
  finalizedBy: string;
  finalizedAt: string;
};

export function createMeasurementValue(auto: number): MeasurementValue {
  return { auto, final: auto, adjusted: false };
}

export function selectMeasurementValue(value: MeasurementValue): number {
  return value.final;
}

export function createSideMeasurements(side: {
  sprayLengthMm: number;
  sprayAngleDeg: number;
  maxVerticalSpreadMm: number;
  directionOffsetDeg: number;
  spreadPositionMm?: number;
}): SideFinalMeasurements {
  return {
    sprayLength: createMeasurementValue(side.sprayLengthMm),
    sprayAngle: createMeasurementValue(side.sprayAngleDeg),
    verticalSpread: createMeasurementValue(side.maxVerticalSpreadMm),
    directionOffset: createMeasurementValue(side.directionOffsetDeg),
    ...(side.spreadPositionMm !== undefined ? { spreadPosition: createMeasurementValue(side.spreadPositionMm) } : {}),
  };
}

export function createFrontMeasurements(front: {
  sprayAreaMm2: number;
  equivalentDiameterMm: number;
  circularity: number;
  centroidOffsetXmm: number;
  centroidOffsetYmm: number;
  horizontalSymmetry: number;
  verticalSymmetry: number;
}): FrontFinalMeasurements {
  return {
    sprayArea: createMeasurementValue(front.sprayAreaMm2),
    equivalentDiameter: createMeasurementValue(front.equivalentDiameterMm),
    circularity: createMeasurementValue(front.circularity),
    centroidOffsetX: createMeasurementValue(front.centroidOffsetXmm),
    centroidOffsetY: createMeasurementValue(front.centroidOffsetYmm),
    horizontalSymmetry: createMeasurementValue(front.horizontalSymmetry),
    verticalSymmetry: createMeasurementValue(front.verticalSymmetry),
  };
}

export function pixelDistanceToMm(pixelDistance: number, scaleMmPerPx: number): number {
  return pixelDistance * scaleMmPerPx;
}

export function pointDistanceToMm(pointA: Point, pointB: Point, calibration: CalibrationSnapshot): number {
  return pixelDistanceToMm(Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y), calibration.scaleMmPerPx);
}

export function calculateScaleMmPerPx(referenceDistanceMm: number, anchorA: Point, anchorB: Point): number {
  const pixelDistance = Math.hypot(anchorB.x - anchorA.x, anchorB.y - anchorA.y);
  if (pixelDistance <= 0) throw new Error('Calibration anchors must not overlap');
  return referenceDistanceMm / pixelDistance;
}

export function calculateAngleDeg(origin: Point, pointA: Point, pointB: Point): number {
  const angleA = Math.atan2(pointA.y - origin.y, pointA.x - origin.x);
  const angleB = Math.atan2(pointB.y - origin.y, pointB.x - origin.x);
  const diff = Math.abs((angleA - angleB) * 180 / Math.PI);
  return diff > 180 ? 360 - diff : diff;
}

export function calibratedGridSpacingPx(desiredGridSpacingMm: number, calibration: CalibrationSnapshot): number {
  return desiredGridSpacingMm / calibration.scaleMmPerPx;
}

export function calculateSpreadPositionMm(nozzleOriginPx: Point, spreadTopPx: Point, calibration: CalibrationSnapshot): number {
  return Math.abs(spreadTopPx.x - nozzleOriginPx.x) * calibration.scaleMmPerPx;
}

function correctedMeasurement(auto: number, final: number, adjustedBy?: string, adjustedAt?: string): MeasurementValue {
  return final === auto ? createMeasurementValue(auto) : { auto, final, adjusted: true, adjustedBy, adjustedAt };
}

export function getSideAutomaticMeasurements(geometry: SidePixelGeometry, calibration: CalibrationSnapshot): SideFinalMeasurements {
  const sprayLength = pointDistanceToMm(geometry.nozzleOriginPx, geometry.sprayEndpointPx, calibration);
  const verticalSpread = pointDistanceToMm(geometry.verticalSpreadTopPx, geometry.verticalSpreadBottomPx, calibration);
  const sprayAngle = calculateAngleDeg(geometry.nozzleOriginPx, geometry.upperBoundaryPx, geometry.lowerBoundaryPx);
  const directionOffset = calculateAngleDeg(geometry.nozzleOriginPx, geometry.sprayEndpointPx, geometry.directionReferencePx);
  const spreadPosition = calculateSpreadPositionMm(geometry.nozzleOriginPx, geometry.verticalSpreadTopPx, calibration);
  return createSideMeasurements({ sprayLengthMm: sprayLength, sprayAngleDeg: sprayAngle, maxVerticalSpreadMm: verticalSpread, directionOffsetDeg: directionOffset, spreadPositionMm: spreadPosition });
}

export function getSideFinalMeasurements(
  autoGeometry: SidePixelGeometry,
  finalGeometry: SidePixelGeometry,
  calibration: CalibrationSnapshot,
  audit?: { adjustedBy?: string; adjustedAt?: string },
): SideFinalMeasurements {
  const auto = getSideAutomaticMeasurements(autoGeometry, calibration);
  const final = getSideAutomaticMeasurements(finalGeometry, calibration);
  return {
    sprayLength: correctedMeasurement(auto.sprayLength.auto, final.sprayLength.auto, audit?.adjustedBy, audit?.adjustedAt),
    sprayAngle: correctedMeasurement(auto.sprayAngle.auto, final.sprayAngle.auto, audit?.adjustedBy, audit?.adjustedAt),
    verticalSpread: correctedMeasurement(auto.verticalSpread.auto, final.verticalSpread.auto, audit?.adjustedBy, audit?.adjustedAt),
    directionOffset: correctedMeasurement(auto.directionOffset.auto, final.directionOffset.auto, audit?.adjustedBy, audit?.adjustedAt),
    spreadPosition: correctedMeasurement(auto.spreadPosition?.auto ?? 0, final.spreadPosition?.auto ?? 0, audit?.adjustedBy, audit?.adjustedAt),
  };
}

export function deriveSideMeasurementsFromGeometry(
  geometry: SidePixelGeometry,
  calibration: CalibrationSnapshot,
  correction?: SideMeasurementCorrection | SidePixelCorrections,
): SideFinalMeasurements {
  if (correction && 'geometry' in correction) {
    return getSideFinalMeasurements(geometry, correction.geometry, calibration, correction);
  }
  const legacyCorrections = correction ?? {};
  const sprayLengthAuto = pointDistanceToMm(geometry.nozzleOriginPx, geometry.sprayEndpointPx, calibration);
  const verticalSpreadAuto = pointDistanceToMm(geometry.verticalSpreadTopPx, geometry.verticalSpreadBottomPx, calibration);
  const sprayAngleAuto = calculateAngleDeg(geometry.nozzleOriginPx, geometry.upperBoundaryPx, geometry.lowerBoundaryPx);
  const directionOffsetAuto = calculateAngleDeg(geometry.nozzleOriginPx, geometry.sprayEndpointPx, geometry.directionReferencePx);
  const spreadPositionAuto = calculateSpreadPositionMm(geometry.nozzleOriginPx, geometry.verticalSpreadTopPx, calibration);
  const adjustedBy = legacyCorrections.adjustedBy;
  const adjustedAt = legacyCorrections.adjustedAt;
  return {
    sprayLength: correctedMeasurement(sprayLengthAuto, sprayLengthAuto + pixelDistanceToMm(legacyCorrections.sprayLength ?? 0, calibration.scaleMmPerPx), adjustedBy, adjustedAt),
    sprayAngle: correctedMeasurement(sprayAngleAuto, sprayAngleAuto + (legacyCorrections.sprayAngle ?? 0), adjustedBy, adjustedAt),
    verticalSpread: correctedMeasurement(verticalSpreadAuto, verticalSpreadAuto + pixelDistanceToMm(legacyCorrections.verticalSpread ?? 0, calibration.scaleMmPerPx), adjustedBy, adjustedAt),
    directionOffset: correctedMeasurement(directionOffsetAuto, directionOffsetAuto + (legacyCorrections.directionOffset ?? 0), adjustedBy, adjustedAt),
    spreadPosition: correctedMeasurement(spreadPositionAuto, spreadPositionAuto, adjustedBy, adjustedAt),
  };
}

export function getFrontAutomaticMeasurements(geometry: FrontPixelGeometry, calibration: CalibrationSnapshot): FrontFinalMeasurements {
  const scale = calibration.scaleMmPerPx;
  return createFrontMeasurements({
    sprayAreaMm2: geometry.sprayAreaPixels * scale * scale,
    equivalentDiameterMm: pixelDistanceToMm(geometry.equivalentDiameterPx, scale),
    circularity: geometry.circularity,
    centroidOffsetXmm: pixelDistanceToMm(geometry.centroidPx.x - geometry.referenceCenterPx.x, scale),
    centroidOffsetYmm: pixelDistanceToMm(geometry.centroidPx.y - geometry.referenceCenterPx.y, scale),
    horizontalSymmetry: geometry.horizontalSymmetry,
    verticalSymmetry: geometry.verticalSymmetry,
  });
}

export function getFrontFinalMeasurements(
  autoGeometry: FrontPixelGeometry,
  finalGeometry: FrontPixelGeometry,
  calibration: CalibrationSnapshot,
  audit?: { adjustedBy?: string; adjustedAt?: string },
): FrontFinalMeasurements {
  const auto = getFrontAutomaticMeasurements(autoGeometry, calibration);
  const final = getFrontAutomaticMeasurements(finalGeometry, calibration);
  return {
    sprayArea: correctedMeasurement(auto.sprayArea.auto, final.sprayArea.auto, audit?.adjustedBy, audit?.adjustedAt),
    equivalentDiameter: correctedMeasurement(auto.equivalentDiameter.auto, final.equivalentDiameter.auto, audit?.adjustedBy, audit?.adjustedAt),
    circularity: correctedMeasurement(auto.circularity.auto, final.circularity.auto, audit?.adjustedBy, audit?.adjustedAt),
    centroidOffsetX: correctedMeasurement(auto.centroidOffsetX.auto, final.centroidOffsetX.auto, audit?.adjustedBy, audit?.adjustedAt),
    centroidOffsetY: correctedMeasurement(auto.centroidOffsetY.auto, final.centroidOffsetY.auto, audit?.adjustedBy, audit?.adjustedAt),
    horizontalSymmetry: correctedMeasurement(auto.horizontalSymmetry.auto, final.horizontalSymmetry.auto, audit?.adjustedBy, audit?.adjustedAt),
    verticalSymmetry: correctedMeasurement(auto.verticalSymmetry.auto, final.verticalSymmetry.auto, audit?.adjustedBy, audit?.adjustedAt),
  };
}

export function deriveFrontMeasurementsFromGeometry(
  geometry: FrontPixelGeometry,
  calibration: CalibrationSnapshot,
  correction?: FrontMeasurementCorrection | FrontPixelCorrections,
): FrontFinalMeasurements {
  if (correction && 'geometry' in correction) {
    return getFrontFinalMeasurements(geometry, correction.geometry, calibration, correction);
  }
  const legacyCorrections = correction ?? {};
  const scale = calibration.scaleMmPerPx;
  const sprayAreaAuto = geometry.sprayAreaPixels * scale * scale;
  const equivalentDiameterAuto = pixelDistanceToMm(geometry.equivalentDiameterPx, scale);
  const centroidOffsetXAuto = pixelDistanceToMm(geometry.centroidPx.x - geometry.referenceCenterPx.x, scale);
  const centroidOffsetYAuto = pixelDistanceToMm(geometry.centroidPx.y - geometry.referenceCenterPx.y, scale);
  const adjustedBy = legacyCorrections.adjustedBy;
  const adjustedAt = legacyCorrections.adjustedAt;
  return {
    sprayArea: correctedMeasurement(sprayAreaAuto, sprayAreaAuto + ((legacyCorrections.sprayArea ?? 0) * scale * scale), adjustedBy, adjustedAt),
    equivalentDiameter: correctedMeasurement(equivalentDiameterAuto, equivalentDiameterAuto + pixelDistanceToMm(legacyCorrections.equivalentDiameter ?? 0, scale), adjustedBy, adjustedAt),
    circularity: correctedMeasurement(geometry.circularity, geometry.circularity + (legacyCorrections.circularity ?? 0), adjustedBy, adjustedAt),
    centroidOffsetX: correctedMeasurement(centroidOffsetXAuto, centroidOffsetXAuto + pixelDistanceToMm(legacyCorrections.centroidOffsetX ?? 0, scale), adjustedBy, adjustedAt),
    centroidOffsetY: correctedMeasurement(centroidOffsetYAuto, centroidOffsetYAuto + pixelDistanceToMm(legacyCorrections.centroidOffsetY ?? 0, scale), adjustedBy, adjustedAt),
    horizontalSymmetry: correctedMeasurement(geometry.horizontalSymmetry, geometry.horizontalSymmetry + (legacyCorrections.horizontalSymmetry ?? 0), adjustedBy, adjustedAt),
    verticalSymmetry: correctedMeasurement(geometry.verticalSymmetry, geometry.verticalSymmetry + (legacyCorrections.verticalSymmetry ?? 0), adjustedBy, adjustedAt),
  };
}

export function createCalibrationSnapshot(input: {
  camera: Camera;
  sideOrientation?: SideOrientation;
  referenceDistanceMm: number;
  anchorA: Point;
  anchorB: Point;
  adjusted?: boolean;
  adjustedBy?: string;
  adjustedAt?: string;
}): CalibrationSnapshot {
  return {
    camera: input.camera,
    sideOrientation: input.sideOrientation,
    referenceDistanceMm: input.referenceDistanceMm,
    anchorA: { ...input.anchorA },
    anchorB: { ...input.anchorB },
    scaleMmPerPx: calculateScaleMmPerPx(input.referenceDistanceMm, input.anchorA, input.anchorB),
    adjusted: input.adjusted ?? false,
    adjustedBy: input.adjustedBy,
    adjustedAt: input.adjustedAt,
  };
}

export function correctMeasurement(value: MeasurementValue, final: number, adjustedBy: string, adjustedAt: string): MeasurementValue {
  return {
    auto: value.auto,
    final,
    adjusted: true,
    adjustedBy,
    adjustedAt,
  };
}

export function updateCalibrationGeometry(
  calibration: CalibrationSnapshot,
  updates: { anchorA?: Point; anchorB?: Point; referenceDistanceMm?: number },
): CalibrationSnapshot {
  const anchorA = updates.anchorA ?? calibration.anchorA;
  const anchorB = updates.anchorB ?? calibration.anchorB;
  const referenceDistanceMm = updates.referenceDistanceMm ?? calibration.referenceDistanceMm;
  return createCalibrationSnapshot({
    camera: calibration.camera,
    sideOrientation: calibration.sideOrientation,
    anchorA,
    anchorB,
    referenceDistanceMm,
    adjusted: calibration.adjusted,
    adjustedBy: calibration.adjustedBy,
    adjustedAt: calibration.adjustedAt,
  });
}

export function clampPoint(point: Point, bounds: { width: number; height: number }): Point {
  return {
    x: Math.min(bounds.width, Math.max(0, point.x)),
    y: Math.min(bounds.height, Math.max(0, point.y)),
  };
}

export function translateCalibrationWithinBounds(
  calibration: CalibrationSnapshot,
  delta: Point,
  bounds: { width: number; height: number },
): CalibrationSnapshot {
  const minDeltaX = Math.max(-calibration.anchorA.x, -calibration.anchorB.x);
  const maxDeltaX = Math.min(bounds.width - calibration.anchorA.x, bounds.width - calibration.anchorB.x);
  const minDeltaY = Math.max(-calibration.anchorA.y, -calibration.anchorB.y);
  const maxDeltaY = Math.min(bounds.height - calibration.anchorA.y, bounds.height - calibration.anchorB.y);
  const constrainedDelta = {
    x: Math.min(maxDeltaX, Math.max(minDeltaX, delta.x)),
    y: Math.min(maxDeltaY, Math.max(minDeltaY, delta.y)),
  };
  return updateCalibrationGeometry(calibration, {
    anchorA: { x: calibration.anchorA.x + constrainedDelta.x, y: calibration.anchorA.y + constrainedDelta.y },
    anchorB: { x: calibration.anchorB.x + constrainedDelta.x, y: calibration.anchorB.y + constrainedDelta.y },
  });
}

export function moveCalibrationAnchor(
  calibration: CalibrationSnapshot,
  anchor: 'anchorA' | 'anchorB',
  target: Point,
  bounds: { width: number; height: number },
  minDistancePx = 10,
): CalibrationSnapshot {
  const clamped = clampPoint(target, bounds);
  const other = anchor === 'anchorA' ? calibration.anchorB : calibration.anchorA;
  const distance = Math.hypot(clamped.x - other.x, clamped.y - other.y);
  if (distance < minDistancePx) return calibration;
  return updateCalibrationGeometry(calibration, {
    [anchor]: clamped,
  });
}

export function adjustCalibration(
  calibration: CalibrationSnapshot,
  updates: { anchorA?: Point; anchorB?: Point; referenceDistanceMm?: number },
  adjustedBy: string,
  adjustedAt: string,
): CalibrationSnapshot {
  const updated = updateCalibrationGeometry(calibration, updates);
  return createCalibrationSnapshot({
    camera: updated.camera,
    sideOrientation: updated.sideOrientation,
    anchorA: updated.anchorA,
    anchorB: updated.anchorB,
    referenceDistanceMm: updated.referenceDistanceMm,
    adjusted: true,
    adjustedBy,
    adjustedAt,
  });
}

export function setPrimaryCapture(
  current: SelectedCaptureMoment[],
  moment: SynchronizedAnalysisFrame | { id: string; syncStatus?: 'synced' | 'partial' | 'invalid' },
  selectedBy: string,
  selectedAt: string,
): SelectionResult {
  if ('syncStatus' in moment && moment.syncStatus && moment.syncStatus !== 'synced') {
    return { selected: current, error: 'Only synchronized capture moments may be selected' };
  }
  return setPrimaryAnalysisCapture(current, moment.id, selectedBy, selectedAt);
}

export function addSupportingCapture(
  current: SelectedCaptureMoment[],
  moment: SynchronizedAnalysisFrame | { id: string; syncStatus?: 'synced' | 'partial' | 'invalid' },
  selectedBy: string,
  selectedAt: string,
): SelectionResult {
  if ('syncStatus' in moment && moment.syncStatus && moment.syncStatus !== 'synced') {
    return { selected: current, error: 'Only synchronized capture moments may be selected' };
  }
  return addSupportingAnalysisCapture(current, moment.id, selectedBy, selectedAt);
}

export function removeSupportingCapture(
  current: SelectedCaptureMoment[],
  captureFrameId: string,
): SelectionResult {
  const target = current.find(s => s.captureFrameId === captureFrameId);
  if (!target) return { selected: current };
  if (target.role === 'primary') {
    return { selected: current, error: 'Cannot remove the Primary capture. Set another Primary first.' };
  }
  return { selected: current.filter(s => s.captureFrameId !== captureFrameId) };
}

export function getPrimary(selected: SelectedCaptureMoment[]): SelectedCaptureMoment | undefined {
  return selected.find(s => s.role === 'primary');
}

export function canFinalize(selected: SelectedCaptureMoment[]): boolean {
  return selected.some(s => s.role === 'primary');
}

function frameSnapshot(frame: SynchronizedAnalysisFrame['side']): ReportFrameSnapshot {
  return {
    frameId: frame.id,
    frameIndex: frame.frameIndex,
    timestampMs: frame.timestampMs,
    phase: frame.phase,
    overlayAsset: frame.assets.overlay,
    originalAsset: frame.assets.original,
    maskAsset: frame.assets.mask,
  };
}

// Overloads for createBatchFinalAnalysisReport
export function createBatchFinalAnalysisReport(input: {
  batch: Batch;
  primaryCaptureMoment: SynchronizedAnalysisFrame;
  supportingCaptureMoments: SynchronizedAnalysisFrame[];
  side: SideFinalMeasurements;
  front: FrontFinalMeasurements;
  sideCalibration: CalibrationSnapshot;
  frontCalibration: CalibrationSnapshot;
  sideAutoGeometry: SidePixelGeometry;
  sideFinalGeometry: SidePixelGeometry;
  frontAutoGeometry: FrontPixelGeometry;
  frontFinalGeometry: FrontPixelGeometry;
  finalizedBy: string;
  finalizedAt: string;
}): DualPerspectiveFinalAnalysisReport;
export function createBatchFinalAnalysisReport(input: {
  batch: Batch;
  primaryCaptureMoment: SynchronizedAnalysisFrame;
  supportingCaptureMoments: SynchronizedAnalysisFrame[];
  side: SideFinalMeasurements;
  front?: FrontFinalMeasurements;
  sideCalibration: CalibrationSnapshot;
  frontCalibration?: CalibrationSnapshot;
  sideAutoGeometry: SidePixelGeometry;
  sideFinalGeometry: SidePixelGeometry;
  frontAutoGeometry?: FrontPixelGeometry;
  frontFinalGeometry?: FrontPixelGeometry;
  finalizedBy: string;
  finalizedAt: string;
}): FinalAnalysisReport {
  if (input.supportingCaptureMoments.length > 9) {
    throw new Error('Maximum 9 supporting captures allowed.');
  }
  if (!input.primaryCaptureMoment) {
    throw new Error('Primary capture moment is required.');
  }
  if (input.primaryCaptureMoment.syncStatus !== 'synced') {
    throw new Error('Primary capture must be synchronized.');
  }
  if (!input.primaryCaptureMoment.side) {
    throw new Error('Primary capture must contain Side frame.');
  }
  const hasFront = !!input.front;
  if (hasFront) {
    if (!input.primaryCaptureMoment.front) {
      throw new Error('Primary capture must contain Front frame when Front measurements are provided.');
    }
    if (input.primaryCaptureMoment.side.frameIndex !== input.primaryCaptureMoment.front.frameIndex) {
      throw new Error('Side and Front frames must share the same frame index.');
    }
    if (input.primaryCaptureMoment.side.timestampMs !== input.primaryCaptureMoment.front.timestampMs) {
      throw new Error('Side and Front frames must share the same timestamp.');
    }
  }

  const setup = input.batch.setupSnapshot;
  if (!setup) {
    throw new Error('Batch setup snapshot is required to finalize analysis.');
  }

  const supportingCaptureMoments = input.supportingCaptureMoments;
  const perspectives: AnalysisPerspective[] = ['side'];
  if (hasFront) perspectives.push('front');

  return structuredClone({
    status: 'finalized',
    analysisSource: 'simulation',
    perspectives,
    test: {
      testId: input.batch.id,
      sampleId: setup.sampleId,
      product: setup.productSnapshot,
      recipe: setup.recipeSnapshot,
      productionBatch: setup.productLot,
      operator: setup.operatorName,
      testTimestamp: setup.createdAt,
      setpoints: setup.setpoints,
    },
    testId: input.batch.id,
    primaryCaptureMomentId: input.primaryCaptureMoment.id,
    supportingCaptureMomentIds: supportingCaptureMoments.map(moment => moment.id),
    primaryCapture: {
      frameIndex: input.primaryCaptureMoment.frameIndex,
      timestampMs: input.primaryCaptureMoment.timestampMs,
      phase: input.primaryCaptureMoment.phase,
    },
    side: {
      ...input.side,
      frameId: input.primaryCaptureMoment.side.id,
      frame: frameSnapshot(input.primaryCaptureMoment.side),
      calibration: input.sideCalibration,
      autoGeometry: input.sideAutoGeometry,
      finalGeometry: input.sideFinalGeometry,
    },
    front: hasFront
      ? {
          ...input.front!,
          frameId: input.primaryCaptureMoment.front!.id,
          frame: frameSnapshot(input.primaryCaptureMoment.front!),
          calibration: input.frontCalibration!,
          autoGeometry: input.frontAutoGeometry!,
          finalGeometry: input.frontFinalGeometry!,
        }
      : undefined,
    supportingCaptures: supportingCaptureMoments.map(moment => ({
      captureMomentId: moment.id,
      frameIndex: moment.frameIndex,
      timestampMs: moment.timestampMs,
      phase: moment.phase,
      side: frameSnapshot(moment.side),
      front: hasFront && moment.front ? frameSnapshot(moment.front) : undefined,
    })),
    finalizedBy: input.finalizedBy,
    finalizedAt: input.finalizedAt,
  });
}
// Overloads for createFinalAnalysisReport
export function createFinalAnalysisReport(input: {
  test: Test;
  primaryCaptureMoment: SynchronizedAnalysisFrame;
  supportingCaptureMoments: SynchronizedAnalysisFrame[];
  side: SideFinalMeasurements;
  front: FrontFinalMeasurements;
  sideCalibration: CalibrationSnapshot;
  frontCalibration: CalibrationSnapshot;
  sideAutoGeometry: SidePixelGeometry;
  sideFinalGeometry: SidePixelGeometry;
  frontAutoGeometry: FrontPixelGeometry;
  frontFinalGeometry: FrontPixelGeometry;
  finalizedBy: string;
  finalizedAt: string;
}): DualPerspectiveFinalAnalysisReport;
export function createFinalAnalysisReport(input: {
  test: Test;
  primaryCaptureMoment: SynchronizedAnalysisFrame;
  supportingCaptureMoments: SynchronizedAnalysisFrame[];
  side: SideFinalMeasurements;
  front?: FrontFinalMeasurements;
  sideCalibration: CalibrationSnapshot;
  frontCalibration?: CalibrationSnapshot;
  sideAutoGeometry: SidePixelGeometry;
  sideFinalGeometry: SidePixelGeometry;
  frontAutoGeometry?: FrontPixelGeometry;
  frontFinalGeometry?: FrontPixelGeometry;
  finalizedBy: string;
  finalizedAt: string;
}): FinalAnalysisReport {
  if (input.supportingCaptureMoments.length > 9) {
    throw new Error('Maximum 9 supporting captures allowed.');
  }
  if (!input.primaryCaptureMoment) {
    throw new Error('Primary capture moment is required.');
  }
  if (input.primaryCaptureMoment.syncStatus !== 'synced') {
    throw new Error('Primary capture must be synchronized.');
  }
  if (!input.primaryCaptureMoment.side) {
    throw new Error('Primary capture must contain Side frame.');
  }
  const hasFront = !!input.front;
  if (hasFront) {
    if (!input.primaryCaptureMoment.front) {
      throw new Error('Primary capture must contain Front frame when Front measurements are provided.');
    }
    if (input.primaryCaptureMoment.side.frameIndex !== input.primaryCaptureMoment.front.frameIndex) {
      throw new Error('Side and Front frames must share the same frame index.');
    }
    if (input.primaryCaptureMoment.side.timestampMs !== input.primaryCaptureMoment.front.timestampMs) {
      throw new Error('Side and Front frames must share the same timestamp.');
    }
  }

  const supportingCaptureMoments = input.supportingCaptureMoments;
  const productSnapshot = input.test.productSnapshot ?? { productCode: input.test.productId ?? 'SIM-PRODUCT', productName: input.test.productName };
  const recipeSnapshot = input.test.recipeSnapshot ?? { name: 'Simulation recipe', ...input.test.config };
  const perspectives: AnalysisPerspective[] = ['side'];
  if (hasFront) perspectives.push('front');

  return structuredClone({
    status: 'finalized',
    analysisSource: 'simulation',
    perspectives,
    test: {
      testId: input.test.id,
      sampleId: input.test.sampleId,
      product: productSnapshot,
      recipe: recipeSnapshot,
      productionBatch: input.test.productionBatch,
      operator: input.test.operatorName,
      testTimestamp: input.test.createdAt,
      setpoints: input.test.config,
    },
    testId: input.test.id,
    primaryCaptureMomentId: input.primaryCaptureMoment.id,
    supportingCaptureMomentIds: supportingCaptureMoments.map(moment => moment.id),
    primaryCapture: {
      frameIndex: input.primaryCaptureMoment.frameIndex,
      timestampMs: input.primaryCaptureMoment.timestampMs,
      phase: input.primaryCaptureMoment.phase,
    },
    side: {
      ...input.side,
      frameId: input.primaryCaptureMoment.side.id,
      frame: frameSnapshot(input.primaryCaptureMoment.side),
      calibration: input.sideCalibration,
      autoGeometry: input.sideAutoGeometry,
      finalGeometry: input.sideFinalGeometry,
    },
    front: hasFront
      ? {
          ...input.front!,
          frameId: input.primaryCaptureMoment.front!.id,
          frame: frameSnapshot(input.primaryCaptureMoment.front!),
          calibration: input.frontCalibration!,
          autoGeometry: input.frontAutoGeometry!,
          finalGeometry: input.frontFinalGeometry!,
        }
      : undefined,
    supportingCaptures: supportingCaptureMoments.map(moment => ({
      captureMomentId: moment.id,
      frameIndex: moment.frameIndex,
      timestampMs: moment.timestampMs,
      phase: moment.phase,
      side: frameSnapshot(moment.side),
      front: hasFront && moment.front ? frameSnapshot(moment.front) : undefined,
    })),
    finalizedBy: input.finalizedBy,
    finalizedAt: input.finalizedAt,
  });
}

export type UserFacingTestStatus = 'Draft' | 'Captured' | 'Ready for Review' | 'Finalized' | 'Failed';

export function getUserFacingTestStatus(test: Test, finalReport?: FinalAnalysisReport | null): UserFacingTestStatus {
  if (finalReport && finalReport.testId === test.id) return 'Finalized';
  if (test.status === 'failed') return 'Failed';
  if (test.status === 'running') return 'Draft';
  if (test.status === 'complete') return 'Ready for Review';
  return 'Captured';
}

