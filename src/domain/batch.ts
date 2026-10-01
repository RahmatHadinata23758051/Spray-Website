import type { FixtureScenario, SynchronizedAnalysisFrame, Test } from './types';
import type { CalibrationSnapshot, FinalAnalysisReport, FrontPixelGeometry, SidePixelGeometry } from './analysis';

export class BatchNotFoundError extends Error {
  constructor(batchId: string) {
    super(`Batch not found: ${batchId}`);
    this.name = 'BatchNotFoundError';
  }
}

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
  capturedAt?: string; // Populated when frozen at PROCESSING
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
  id: string; // e.g. BAT-260929-0018
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
  operatorId: string;
  operatorName: string;
  fixture: FixtureScenario;
  notes?: string;
  sampleId?: string;
}

export interface BatchRepository {
  getBatch(id: string): Promise<Batch | null>;
  listBatches(): Promise<Batch[]>;
  createBatchDraft(input: CreateBatchDraftInput): Promise<Batch>;
  updateBatchSetupDraft(id: string, patch: Partial<BatchSetupDraft>): Promise<Batch>;
  prepareBatch(id: string): Promise<Batch>;
  startCapture(id: string, scenario?: FixtureScenario): Promise<Batch>;
  updateCaptureSession(id: string, moments: SynchronizedAnalysisFrame[]): Promise<Batch>;
  completeCapture(id: string): Promise<Batch>;
  markReviewRequired(id: string, initialDraft?: BatchAnalysisDraft): Promise<Batch>;
  updateAnalysisDraft(id: string, draft: BatchAnalysisDraft): Promise<Batch>;
  finalizeBatch(id: string, report: FinalAnalysisReport): Promise<Batch>;
  markFailed(id: string, reason: string): Promise<Batch>;
  abortBatch(id: string, reason?: string): Promise<Batch>;
}

// Invariants and domain logic helpers
export function createBatchDraft(input: CreateBatchDraftInput, now = new Date().toISOString()): Batch {
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
  if (batch.status !== 'DRAFT') {
    throw new InvalidLifecycleTransitionError(`Cannot update setup draft: batch ${batch.id} is in status ${batch.status}, expected DRAFT.`);
  }
  if (!batch.setupDraft) {
    throw new BatchValidationError(`Batch ${batch.id} has no setup draft.`);
  }

  const updatedDraft: BatchSetupDraft = {
    ...batch.setupDraft,
    ...patch,
    productSnapshot: patch.productSnapshot ? { ...patch.productSnapshot } : batch.setupDraft.productSnapshot ? { ...batch.setupDraft.productSnapshot } : undefined,
    recipeSnapshot: patch.recipeSnapshot ? { ...patch.recipeSnapshot } : batch.setupDraft.recipeSnapshot ? { ...batch.setupDraft.recipeSnapshot } : undefined,
    setpoints: patch.setpoints ? { ...patch.setpoints } : batch.setupDraft.setpoints ? { ...batch.setupDraft.setpoints } : undefined,
  };

  return {
    ...batch,
    setupDraft: updatedDraft,
    updatedAt: now,
  };
}

export function prepareBatch(batch: Batch, now = new Date().toISOString()): Batch {
  if (batch.status !== 'DRAFT') {
    throw new InvalidLifecycleTransitionError(`Cannot prepare batch: batch ${batch.id} is in status ${batch.status}, expected DRAFT.`);
  }
  if (!batch.setupDraft) {
    throw new BatchValidationError(`Cannot prepare batch ${batch.id}: missing setupDraft.`);
  }
  if (!batch.setupDraft.productSnapshot) {
    throw new BatchValidationError(`Cannot prepare batch ${batch.id}: missing product snapshot.`);
  }
  if (!batch.setupDraft.recipeSnapshot) {
    throw new BatchValidationError(`Cannot prepare batch ${batch.id}: missing recipe snapshot.`);
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
    // retain setupDraft as non-authoritative historical reference or clear
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
    throw new BatchValidationError(`Cannot update capture session for batch ${batch.id}: session does not exist.`);
  }

  return {
    ...batch,
    captureSession: {
      ...batch.captureSession,
      synchronizedMoments: [...moments],
    },
    updatedAt: now,
  };
}

export function completeCapture(batch: Batch, now = new Date().toISOString()): Batch {
  if (batch.status !== 'CAPTURING') {
    throw new InvalidLifecycleTransitionError(`Cannot complete capture: batch ${batch.id} is in status ${batch.status}, expected CAPTURING.`);
  }
  if (!batch.captureSession) {
    throw new BatchValidationError(`Cannot complete capture: batch ${batch.id} has no capture session.`);
  }

  const frozenSession: CaptureSession = {
    ...batch.captureSession,
    capturedAt: now,
    synchronizedMoments: [...batch.captureSession.synchronizedMoments],
  };

  return {
    ...batch,
    status: 'PROCESSING',
    captureSession: frozenSession,
    updatedAt: now,
  };
}

export function markReviewRequired(batch: Batch, initialDraft?: BatchAnalysisDraft, now = new Date().toISOString()): Batch {
  if (batch.status !== 'PROCESSING') {
    throw new InvalidLifecycleTransitionError(`Cannot transition to REVIEW_REQUIRED: batch ${batch.id} is in status ${batch.status}, expected PROCESSING.`);
  }
  if (!batch.captureSession || !batch.captureSession.capturedAt) {
    throw new BatchValidationError(`Cannot transition to REVIEW_REQUIRED: batch ${batch.id} requires a frozen capture session.`);
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

  return {
    ...batch,
    status: 'FINALIZED',
    finalReport: Object.freeze({ ...report }),
    updatedAt: now,
  };
}

export function markFailed(batch: Batch, reason: string, now = new Date().toISOString()): Batch {
  if (batch.status === 'FINALIZED') {
    throw new InvalidLifecycleTransitionError(`Cannot mark finalized batch ${batch.id} as failed.`);
  }

  return {
    ...batch,
    status: 'FAILED',
    failureReason: reason,
    updatedAt: now,
  };
}

export function abortBatch(batch: Batch, reason?: string, now = new Date().toISOString()): Batch {
  if (batch.status === 'FINALIZED') {
    throw new InvalidLifecycleTransitionError(`Cannot abort finalized batch ${batch.id}.`);
  }

  return {
    ...batch,
    status: 'ABORTED',
    failureReason: reason,
    updatedAt: now,
  };
}

// Adapters to preserve backward-compatibility with Test interface
export function batchToTest(batch: Batch): Test {
  const snapshot = batch.setupSnapshot;
  const draft = batch.setupDraft;
  const productId = snapshot?.productId || draft?.productId || 'prd-default';
  const productName = snapshot?.productSnapshot.productName || draft?.productSnapshot?.productName || 'Unknown Product';
  const recipeId = snapshot?.recipeId || draft?.recipeId;
  const sampleId = snapshot?.sampleId || `SMP-${batch.id}`;
  const operatorName = snapshot?.operatorName || draft?.operatorName || 'Unknown Operator';
  const operatorId = snapshot?.operatorId || draft?.operatorId;
  const setpoints = snapshot?.setpoints || draft?.setpoints || { forceSetpointN: 30, pressDurationMs: 800, strokeMm: 8 };
  const fixture = snapshot?.fixture || draft?.fixture || 'nominal-01';

  let status: Test['status'] = 'running';
  if (batch.status === 'FINALIZED' || batch.status === 'REVIEW_REQUIRED') {
    status = 'complete';
  } else if (batch.status === 'FAILED' || batch.status === 'ABORTED') {
    status = 'failed';
  }

  return {
    id: batch.id,
    sampleId,
    productId,
    productSnapshot: snapshot?.productSnapshot || draft?.productSnapshot,
    productName,
    recipeId,
    recipeSnapshot: snapshot?.recipeSnapshot || draft?.recipeSnapshot,
    productionBatch: snapshot?.productLot || draft?.productLot,
    operatorId,
    operatorName,
    createdAt: batch.createdAt,
    source: 'fixture',
    fixture,
    config: {
      forceSetpointN: setpoints.forceSetpointN,
      pressDurationMs: setpoints.pressDurationMs,
      strokeMm: setpoints.strokeMm,
    },
    status,
  };
}
