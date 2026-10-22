import type { FixtureScenario, SynchronizedAnalysisFrame, RealSideCaptureFrameMetadata, RealSideBaselineSelection, RealSideBaselineSelectionMethod, CaptureVideoMetadata } from '../types';
import type { CalibrationSnapshot, FinalAnalysisReport, FrontPixelGeometry, SidePixelGeometry } from '../analysis';

export class InvalidLifecycleTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLifecycleTransitionError';
  }
}

export class BatchValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BatchValidationError';
  }
}

export type BatchStatus =
  | 'DRAFT'
  | 'READY'
  | 'CAPTURING'
  | 'PROCESSING'
  | 'REVIEW_REQUIRED'
  | 'FINALIZED'
  | 'FAILED'
  | 'ABORTED';

export interface BatchSetupDraft {
  productId: string;
  productSnapshot?: { productCode: string; productName: string };
  recipeId: string;
  recipeSnapshot?: { name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  setpoints?: { forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  productLot?: string;
  storageCondition?: string;
  bottlePosition?: string;
  testPeriod?: string;
  repetition?: number;
  operatorId: string;
  operatorName: string;
  fixture: FixtureScenario;
  notes?: string;
}

export interface BatchSetupSnapshot {
  batchId: string;
  sampleId: string;
  productId: string;
  productSnapshot: { productCode: string; productName: string };
  recipeId: string;
  recipeSnapshot: { name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  setpoints: { forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  productLot?: string;
  storageCondition?: string;
  bottlePosition?: string;
  testPeriod?: string;
  repetition?: number;
  operatorId: string;
  operatorName: string;
  fixture: FixtureScenario;
  createdAt: string;
  preparedAt: string;
  notes?: string;
}

export interface CaptureSession {
  scenario: FixtureScenario;
  synchronizedMoments: SynchronizedAnalysisFrame[];
  startedAt: string;
  capturedAt?: string;
  captureMode?: 'simulation' | 'real';
  realSideFrames?: RealSideCaptureFrameMetadata[];
  realSideBaseline?: RealSideBaselineSelection;
  /** Full video recording of the side camera capture event, if available. */
  video?: CaptureVideoMetadata;
  realSideVideo?: CaptureVideoMetadata;
}

export interface BatchAnalysisDraft {
  calibration: {
    side: CalibrationSnapshot;
    front: CalibrationSnapshot;
  };
  primaryCaptureMomentId: string | null;
  supportingCaptureMomentIds: string[];
  sideCorrections: Record<string, SidePixelGeometry>;
  frontCorrections: Record<string, FrontPixelGeometry>;
  updatedAt: string;
}

export interface Batch {
  id: string;
  status: BatchStatus;
  setupDraft?: BatchSetupDraft;
  setupSnapshot?: BatchSetupSnapshot;
  captureSession?: CaptureSession;
  analysisDraft?: BatchAnalysisDraft;
  finalReport?: FinalAnalysisReport;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBatchDraftInput {
  id?: string;
  productId: string;
  productSnapshot: { productCode: string; productName: string };
  recipeId: string;
  recipeSnapshot: { name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  setpoints?: { forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  productLot?: string;
  storageCondition?: string;
  bottlePosition?: string;
  testPeriod?: string;
  repetition?: number;
  operatorId: string;
  operatorName: string;
  fixture: FixtureScenario;
  notes?: string;
}

function validateRepetition(repetition: number | undefined): void {
  if (repetition !== undefined && (!Number.isInteger(repetition) || repetition < 1)) {
    throw new BatchValidationError('Repetition must be a positive integer when provided.');
  }
}

export function createBatchDraft(input: CreateBatchDraftInput, now = new Date().toISOString()): Batch {
  validateRepetition(input.repetition);
  const id = input.id || `BAT-${now.slice(2, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const setupDraft: BatchSetupDraft = {
    productId: input.productId,
    productSnapshot: { ...input.productSnapshot },
    recipeId: input.recipeId,
    recipeSnapshot: { ...input.recipeSnapshot },
    setpoints: input.setpoints
      ? { ...input.setpoints }
      : {
          forceSetpointN: input.recipeSnapshot.forceSetpointN,
          pressDurationMs: input.recipeSnapshot.pressDurationMs,
          strokeMm: input.recipeSnapshot.strokeMm,
        },
    productLot: input.productLot,
    storageCondition: input.storageCondition,
    bottlePosition: input.bottlePosition,
    testPeriod: input.testPeriod,
    repetition: input.repetition,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    fixture: input.fixture,
    notes: input.notes,
  };

  return {
    id,
    status: 'DRAFT',
    setupDraft,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateBatchSetupDraft(batch: Batch, patch: Partial<BatchSetupDraft>, now = new Date().toISOString()): Batch {
  validateRepetition(patch.repetition);
  if (batch.status !== 'DRAFT') {
    throw new InvalidLifecycleTransitionError(`Cannot update setup draft: batch ${batch.id} is in status ${batch.status}, expected DRAFT.`);
  }
  if (!batch.setupDraft) {
    throw new BatchValidationError(`Batch ${batch.id} has no setupDraft to update.`);
  }

  const updatedSetup: BatchSetupDraft = {
    ...batch.setupDraft,
    ...patch,
    productSnapshot: patch.productSnapshot || batch.setupDraft.productSnapshot,
    recipeSnapshot: patch.recipeSnapshot || batch.setupDraft.recipeSnapshot,
  };

  return {
    ...batch,
    setupDraft: updatedSetup,
    updatedAt: now,
  };
}

export function prepareBatch(batch: Batch, now = new Date().toISOString()): Batch {
  if (batch.status !== 'DRAFT') {
    throw new InvalidLifecycleTransitionError(`Cannot prepare batch: batch ${batch.id} is in status ${batch.status}, expected DRAFT.`);
  }
  if (!batch.setupDraft) {
    throw new BatchValidationError(`Cannot prepare batch ${batch.id}: setup draft is missing.`);
  }
  if (!batch.setupDraft.productSnapshot || !batch.setupDraft.recipeSnapshot) {
    throw new BatchValidationError(`Cannot prepare batch ${batch.id}: product or recipe snapshot missing.`);
  }

  const setpoints = batch.setupDraft.setpoints || {
    forceSetpointN: batch.setupDraft.recipeSnapshot.forceSetpointN,
    pressDurationMs: batch.setupDraft.recipeSnapshot.pressDurationMs,
    strokeMm: batch.setupDraft.recipeSnapshot.strokeMm,
  };

  const sampleId = `SMP-${batch.id.replace(/^BAT-/, '')}`;

  const setupSnapshot: BatchSetupSnapshot = {
    batchId: batch.id,
    sampleId,
    productId: batch.setupDraft.productId,
    productSnapshot: { ...batch.setupDraft.productSnapshot },
    recipeId: batch.setupDraft.recipeId,
    recipeSnapshot: { ...batch.setupDraft.recipeSnapshot },
    setpoints: { ...setpoints },
    productLot: batch.setupDraft.productLot,
    storageCondition: batch.setupDraft.storageCondition,
    bottlePosition: batch.setupDraft.bottlePosition,
    testPeriod: batch.setupDraft.testPeriod,
    repetition: batch.setupDraft.repetition,
    operatorId: batch.setupDraft.operatorId,
    operatorName: batch.setupDraft.operatorName,
    fixture: batch.setupDraft.fixture,
    createdAt: batch.createdAt,
    preparedAt: now,
    notes: batch.setupDraft.notes,
  };

  return {
    ...batch,
    status: 'READY',
    setupSnapshot,
    updatedAt: now,
  };
}

export function startCapture(batch: Batch, scenario?: FixtureScenario, now = new Date().toISOString()): Batch {
  if (batch.status !== 'READY') {
    throw new InvalidLifecycleTransitionError(`Cannot start capture: batch ${batch.id} is in status ${batch.status}, expected READY.`);
  }
  if (!batch.setupSnapshot) {
    throw new BatchValidationError(`Cannot start capture for batch ${batch.id}: setup snapshot is required.`);
  }

  const chosenScenario = scenario || batch.setupSnapshot.fixture;

  const captureSession: CaptureSession = {
    scenario: chosenScenario,
    synchronizedMoments: [],
    startedAt: now,
  };

  return {
    ...batch,
    status: 'CAPTURING',
    captureSession,
    updatedAt: now,
  };
}

export function updateCaptureSession(batch: Batch, moments: SynchronizedAnalysisFrame[], now = new Date().toISOString()): Batch {
  if (batch.status !== 'CAPTURING') {
    throw new InvalidLifecycleTransitionError(`Cannot update capture session: batch ${batch.id} is in status ${batch.status}, expected CAPTURING.`);
  }
  if (!batch.captureSession) {
    throw new BatchValidationError(`Batch ${batch.id} has no capture session to update.`);
  }

  return {
    ...batch,
    captureSession: {
      ...batch.captureSession,
      synchronizedMoments: moments,
      captureMode: 'simulation',
      realSideFrames: undefined,
      realSideBaseline: undefined,
    },
    updatedAt: now,
  };
}

export function updateRealCaptureSession(batch: Batch, frames: RealSideCaptureFrameMetadata[], now = new Date().toISOString()): Batch {
  if (batch.status !== 'CAPTURING') {
    throw new InvalidLifecycleTransitionError(`Cannot update real capture session: batch ${batch.id} is in status ${batch.status}, expected CAPTURING.`);
  }
  if (!batch.captureSession) {
    throw new BatchValidationError(`Batch ${batch.id} has no capture session to update.`);
  }
  if (frames.some((frame, index) => frame.camera !== 'side' || frame.frameIndex !== index || frame.elapsedMs < 0)) {
    throw new BatchValidationError('Real capture frames must be Side frames with contiguous indexes and non-negative elapsed times.');
  }
  if (frames.some((frame) => frame.assetId?.startsWith('blob:') || frame.assetId?.startsWith('data:'))) {
    throw new BatchValidationError('Real capture asset references must be stable asset keys, not ObjectURLs or data URLs.');
  }
  if (frames.some((frame, index) => index > 0 && frame.elapsedMs < frames[index - 1].elapsedMs)) {
    throw new BatchValidationError('Real capture frame timestamps must be monotonic.');
  }

  const updated: Batch = {
    ...batch,
    captureSession: {
      ...batch.captureSession,
      synchronizedMoments: [],
      captureMode: 'real',
      realSideFrames: frames.map((frame) => ({ ...frame })),
      // Frame identities changed, so any previous baseline reference is stale.
      realSideBaseline: undefined,
    },
    updatedAt: now,
  };

  // New Phase 5 captures receive an initial baseline atomically with their
  // metadata. Legacy Phase 3 metadata without asset references remains valid.
  return frames.length > 0 && frames.every((frame) => Boolean(frame.assetId))
    ? setRealSideBaselineFromWindow(updated, undefined, now)
    : updated;
}

/**
 * Initial software-MVP baseline window. This is a configuration default, not a
 * claim about the physical spray event: no actuator trigger exists yet.
 */
export const DEFAULT_REAL_SIDE_BASELINE_WINDOW_MS = 500;

function readRealSideFramesForBaseline(batch: Batch): RealSideCaptureFrameMetadata[] {
  if (batch.status !== 'CAPTURING') {
    throw new InvalidLifecycleTransitionError(`Cannot select a Side baseline: batch ${batch.id} is in status ${batch.status}, expected CAPTURING.`);
  }
  if (!batch.captureSession) {
    throw new BatchValidationError(`Batch ${batch.id} has no capture session.`);
  }
  if (batch.captureSession.captureMode !== 'real') {
    throw new BatchValidationError('A Side baseline can only be selected for a real capture session; simulation phases are unrelated.');
  }
  const frames = batch.captureSession.realSideFrames ?? [];
  if (frames.length === 0) {
    throw new BatchValidationError('A Side baseline requires at least one persisted real Side frame.');
  }
  return frames;
}

export function buildRealSideBaseline(
  frames: RealSideCaptureFrameMetadata[],
  startElapsedMs: number,
  endElapsedMs: number,
  selectionMethod: RealSideBaselineSelectionMethod,
  configuredWindowMs: number,
  now: string,
): RealSideBaselineSelection {
  const selected = frames.filter((frame) => frame.elapsedMs >= startElapsedMs && frame.elapsedMs <= endElapsedMs);
  if (selected.length === 0) {
    throw new BatchValidationError(`No real Side frame falls inside ${startElapsedMs}–${endElapsedMs} ms.`);
  }
  if (selected.some((frame) => !frame.assetId)) {
    throw new BatchValidationError('Baseline frames must reference a persisted asset. Re-capture before selecting a baseline.');
  }
  return {
    selectionMethod,
    configuredWindowMs,
    startElapsedMs,
    endElapsedMs,
    frames: selected.map((frame) => ({
      frameId: frame.id,
      frameIndex: frame.frameIndex,
      elapsedMs: frame.elapsedMs,
      assetId: frame.assetId as string,
    })),
    selectedAt: now,
  };
}

/**
 * Designates the configured initial capture window as the baseline, clamped to
 * the captured span so a short capture still yields a valid selection.
 * Overwrites any previous selection for the same capture.
 */
export function setRealSideBaselineFromWindow(
  batch: Batch,
  windowMs: number = DEFAULT_REAL_SIDE_BASELINE_WINDOW_MS,
  now = new Date().toISOString(),
): Batch {
  const frames = readRealSideFramesForBaseline(batch);
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new BatchValidationError('Baseline window must be a positive number of milliseconds.');
  }
  const capturedSpanMs = frames[frames.length - 1].elapsedMs;
  const appliedWindowMs = Math.min(windowMs, capturedSpanMs);

  return {
    ...batch,
    captureSession: {
      ...batch.captureSession!,
      realSideBaseline: buildRealSideBaseline(frames, 0, appliedWindowMs, 'initial-window', windowMs, now),
    },
    updatedAt: now,
  };
}

/**
 * Replaces the baseline with an operator-chosen range. Unlike the configured
 * window this is exact: an out-of-range request is rejected, not clamped.
 */
export function selectRealSideBaselineRange(
  batch: Batch,
  startElapsedMs: number,
  endElapsedMs: number,
  now = new Date().toISOString(),
): Batch {
  const frames = readRealSideFramesForBaseline(batch);
  if (!Number.isFinite(startElapsedMs) || !Number.isFinite(endElapsedMs) || startElapsedMs < 0) {
    throw new BatchValidationError('Baseline range must be finite and start at or after 0 ms.');
  }
  if (endElapsedMs < startElapsedMs) {
    throw new BatchValidationError('Baseline range end must not precede its start.');
  }
  const capturedSpanMs = frames[frames.length - 1].elapsedMs;
  if (endElapsedMs > capturedSpanMs) {
    throw new BatchValidationError(`Baseline range ${startElapsedMs}–${endElapsedMs} ms exceeds the captured span of ${capturedSpanMs} ms.`);
  }

  return {
    ...batch,
    captureSession: {
      ...batch.captureSession!,
      realSideBaseline: buildRealSideBaseline(frames, startElapsedMs, endElapsedMs, 'manual-range', endElapsedMs - startElapsedMs, now),
    },
    updatedAt: now,
  };
}

export function completeCapture(batch: Batch, now = new Date().toISOString()): Batch {
  if (batch.status !== 'CAPTURING') {
    throw new InvalidLifecycleTransitionError(`Cannot complete capture: batch ${batch.id} is in status ${batch.status}, expected CAPTURING.`);
  }
  if (!batch.captureSession) {
    throw new BatchValidationError(`Batch ${batch.id} has no capture session to complete.`);
  }

  return {
    ...batch,
    status: 'PROCESSING',
    captureSession: {
      ...batch.captureSession,
      capturedAt: now,
    },
    updatedAt: now,
  };
}

export function markReviewRequired(batch: Batch, initialDraft?: BatchAnalysisDraft, now = new Date().toISOString()): Batch {
  if (batch.status !== 'PROCESSING') {
    throw new InvalidLifecycleTransitionError(`Cannot mark review required: batch ${batch.id} is in status ${batch.status}, expected PROCESSING.`);
  }
  if (!batch.captureSession) {
    throw new BatchValidationError(`Batch ${batch.id} has no capture session to review.`);
  }

  return {
    ...batch,
    status: 'REVIEW_REQUIRED',
    analysisDraft: initialDraft ? { ...initialDraft } : batch.analysisDraft,
    updatedAt: now,
  };
}

export function updateAnalysisDraft(batch: Batch, draft: BatchAnalysisDraft, now = new Date().toISOString()): Batch {
  if (batch.status !== 'REVIEW_REQUIRED') {
    throw new InvalidLifecycleTransitionError(`Cannot update analysis draft: batch ${batch.id} is in status ${batch.status}, expected REVIEW_REQUIRED.`);
  }

  if (draft.supportingCaptureMomentIds.length > 9) {
    throw new BatchValidationError(`Analysis draft exceeds maximum of 9 supporting captures (got ${draft.supportingCaptureMomentIds.length}).`);
  }

  if (draft.primaryCaptureMomentId && draft.supportingCaptureMomentIds.includes(draft.primaryCaptureMomentId)) {
    throw new BatchValidationError('Primary capture cannot also be a supporting capture.');
  }

  const moments = batch.captureSession?.synchronizedMoments || [];
  
  if (moments.length > 0) {
    if (draft.primaryCaptureMomentId) {
      const pm = moments.find(m => m.id === draft.primaryCaptureMomentId);
      if (!pm) {
        throw new BatchValidationError(`Primary capture moment ${draft.primaryCaptureMomentId} not found in capture session.`);
      }
      if (pm.syncStatus !== 'synced') {
        throw new BatchValidationError(`Primary capture moment must be synchronized.`);
      }
    }

    for (const id of draft.supportingCaptureMomentIds) {
      const sm = moments.find(m => m.id === id);
      if (!sm) {
        throw new BatchValidationError(`Supporting capture moment ${id} not found in capture session.`);
      }
      if (sm.syncStatus !== 'synced') {
        throw new BatchValidationError(`Supporting capture moment ${id} must be synchronized.`);
      }
    }
  }
  
  if (draft.primaryCaptureMomentId ? draft.supportingCaptureMomentIds.length > 9 : draft.supportingCaptureMomentIds.length > 10) {
    throw new BatchValidationError('Maximum of 10 selected captures exceeded.');
  }

  return {
    ...batch,
    analysisDraft: {
      ...draft,
      supportingCaptureMomentIds: [...draft.supportingCaptureMomentIds],
      sideCorrections: { ...draft.sideCorrections },
      frontCorrections: { ...draft.frontCorrections },
      calibration: {
        side: { ...draft.calibration.side },
        front: { ...draft.calibration.front },
      },
      updatedAt: now,
    },
    updatedAt: now,
  };
}

export function finalizeBatch(batch: Batch, report: FinalAnalysisReport, now = new Date().toISOString()): Batch {
  if (batch.status !== 'REVIEW_REQUIRED') {
    throw new InvalidLifecycleTransitionError(`Cannot finalize batch: batch ${batch.id} is in status ${batch.status}, expected REVIEW_REQUIRED.`);
  }
  if (report.testId !== batch.id) {
    throw new BatchValidationError(`Final report test ID "${report.testId}" does not match batch ID "${batch.id}".`);
  }
  if (!report.primaryCaptureMomentId) {
    throw new BatchValidationError(`Final report must have a primary capture moment ID.`);
  }
  if (report.supportingCaptures.length > 9) {
    throw new BatchValidationError(`Final report exceeds maximum of 9 supporting captures.`);
  }

  const moments = batch.captureSession?.synchronizedMoments || [];
  if (moments.length > 0) {
    const primaryMom = moments.find(m => m.id === report.primaryCaptureMomentId);
    if (!primaryMom || primaryMom.syncStatus !== 'synced') {
      throw new BatchValidationError('Final report primary capture must exist and be synchronized.');
    }

    for (const supp of report.supportingCaptures) {
      const suppMom = moments.find(m => m.id === supp.captureMomentId);
      if (!suppMom || suppMom.syncStatus !== 'synced') {
        throw new BatchValidationError(`Supporting capture ${supp.captureMomentId} must exist and be synchronized.`);
      }
    }
  }

  const frozenReport = Object.freeze({ ...report });

  return {
    ...batch,
    status: 'FINALIZED',
    finalReport: frozenReport,
    updatedAt: now,
  };
}

export function markFailed(batch: Batch, reason: string, now = new Date().toISOString()): Batch {
  if (batch.status !== 'CAPTURING' && batch.status !== 'PROCESSING') {
    throw new InvalidLifecycleTransitionError(`Cannot mark failed: batch ${batch.id} is in status ${batch.status}, expected CAPTURING or PROCESSING.`);
  }

  return {
    ...batch,
    status: 'FAILED',
    failureReason: reason,
    updatedAt: now,
  };
}

export function abortBatch(batch: Batch, reason?: string, now = new Date().toISOString()): Batch {
  if (batch.status !== 'DRAFT' && batch.status !== 'READY' && batch.status !== 'CAPTURING') {
    throw new InvalidLifecycleTransitionError(`Cannot abort batch: batch ${batch.id} is in status ${batch.status}, expected DRAFT, READY, or CAPTURING.`);
  }

  return {
    ...batch,
    status: 'ABORTED',
    failureReason: reason,
    updatedAt: now,
  };
}