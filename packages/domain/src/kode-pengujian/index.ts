import type { FixtureScenario } from '../types/index';
import type {
  Batch,
  BatchAnalysisDraft,
  BatchStatus,
  CaptureSession,
} from '../batch/index';
import type { FinalAnalysisReport } from '../analysis/index';

export type SyncState = 'local' | 'pending' | 'synced' | 'failed';

export interface SyncMetadata {
  status: SyncState;
  localUpdatedAt: string;
  serverUpdatedAt?: string;
  lastSyncError?: string;
  retryCount?: number;
}

/**
 * Kode Pengujian — parent context containing shared formula/material context
 * and multiple Samples with their TestRuns.
 */
export type KodePengujianStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface KodePengujian {
  id: string;
  status: KodePengujianStatus;
  productId: string;
  productSnapshot: { productCode: string; productName: string };
  defaultRecipeId?: string;
  defaultRecipeSnapshot?: { name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  productLot?: string;
  testPeriod?: string;
  operatorId: string;
  operatorName: string;
  calculationStandard?: string;
  storageCondition?: string;
  bottlePosition?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  sync?: SyncMetadata;
  samples: Sample[];
  testRuns: TestRun[];
  createdAt: string;
  updatedAt: string;
}

export type SampleStatus = 'CREATED' | 'TESTED' | 'EXCLUDED';

export interface Sample {
  id: string;
  kodePengujianId: string;
  sampleCode?: string;
  positionInRun: number;
  storageCondition?: string;
  bottlePosition?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  status: SampleStatus;
  createdAt: string;
  updatedAt: string;
}

export type TestRunStatus =
  | 'PENDING'
  | 'CAPTURING'
  | 'ANALYZING'
  | 'REVIEW_REQUIRED'
  | 'FINALIZED'
  | 'FAILED'
  | 'ABORTED';

export interface TestRun {
  id: string;
  kodePengujianId: string;
  sampleId: string;
  recipeId: string;
  recipeSnapshot: { name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  setpoints: { forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  fixture: FixtureScenario;
  captureSession?: CaptureSession;
  analysisDraft?: AnalysisDraft;
  finalReport?: FinalAnalysisReport;
  failureReason?: string;
  repetitionIndex?: number;
  operatorId: string;
  operatorName: string;
  status: TestRunStatus;
  notes?: string;
  metadata?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type AnalysisDraft = BatchAnalysisDraft;

export class DomainInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainInvariantError';
  }
}

let kodePengujianCounter = 0;
let sampleCounter = 0;
let testRunCounter = 0;

export function resetIdCounters(): void {
  kodePengujianCounter = 0;
  sampleCounter = 0;
  testRunCounter = 0;
}

export function generateKodePengujianId(customId?: string, date = new Date()): string {
  if (customId) return customId;
  kodePengujianCounter += 1;
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `KP-${yy}${mm}${dd}-${String(kodePengujianCounter).padStart(4, '0')}`;
}

export function generateSampleId(kodePengujianId: string, customId?: string): string {
  if (customId) return customId;
  sampleCounter += 1;
  const suffix = kodePengujianId.replace(/^KP-/, '');
  return `SMP-${suffix}-${String(sampleCounter).padStart(3, '0')}`;
}

export function generateTestRunId(sampleId: string, customId?: string): string {
  if (customId) return customId;
  testRunCounter += 1;
  const suffix = sampleId.replace(/^SMP-/, '');
  return `TR-${suffix}-${String(testRunCounter).padStart(3, '0')}`;
}

export function createKodePengujian(input: {
  productId: string;
  productSnapshot: { productCode: string; productName: string };
  defaultRecipeId?: string;
  defaultRecipeSnapshot?: { name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  productLot?: string;
  testPeriod?: string;
  operatorId: string;
  operatorName: string;
  calculationStandard?: string;
  storageCondition?: string;
  bottlePosition?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  id?: string;
  now?: string;
}): KodePengujian {
  const now = input.now ?? new Date().toISOString();
  return {
    id: generateKodePengujianId(input.id),
    status: 'DRAFT',
    productId: input.productId,
    productSnapshot: input.productSnapshot,
    defaultRecipeId: input.defaultRecipeId,
    defaultRecipeSnapshot: input.defaultRecipeSnapshot,
    productLot: input.productLot,
    testPeriod: input.testPeriod,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    calculationStandard: input.calculationStandard,
    storageCondition: input.storageCondition,
    bottlePosition: input.bottlePosition,
    notes: input.notes,
    metadata: input.metadata,
    sync: {
      status: 'local',
      localUpdatedAt: now,
      retryCount: 0,
    },
    samples: [],
    testRuns: [],
    createdAt: now,
    updatedAt: now,
  };
}

export interface EffectiveSampleContext {
  storageCondition?: string;
  bottlePosition?: string;
}

/**
 * Resolves effective sample context with sample-level value taking precedence
 * over parent-level default. Does not mutate or copy into the sample record.
 */
export function getEffectiveSampleContext(
  sample: Pick<Sample, 'storageCondition' | 'bottlePosition'>,
  parent: Pick<KodePengujian, 'storageCondition' | 'bottlePosition'>,
): EffectiveSampleContext {
  return {
    storageCondition: sample.storageCondition ?? parent.storageCondition,
    bottlePosition: sample.bottlePosition ?? parent.bottlePosition,
  };
}

export function addSample(kp: KodePengujian, input: {
  sampleCode?: string;
  positionInRun?: number;
  storageCondition?: string;
  bottlePosition?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  id?: string;
  now?: string;
}): KodePengujian {
  if (kp.status !== 'DRAFT' && kp.status !== 'ACTIVE') {
    throw new DomainInvariantError(`Cannot add sample: KodePengujian ${kp.id} is in status ${kp.status}, expected DRAFT or ACTIVE.`);
  }
  const now = input.now ?? new Date().toISOString();
  const position = input.positionInRun ?? (kp.samples.length + 1);
  const sample: Sample = {
    id: generateSampleId(kp.id, input.id),
    kodePengujianId: kp.id,
    sampleCode: input.sampleCode,
    positionInRun: position,
    storageCondition: input.storageCondition,
    bottlePosition: input.bottlePosition,
    notes: input.notes,
    metadata: input.metadata,
    status: 'CREATED',
    createdAt: now,
    updatedAt: now,
  };
  return {
    ...kp,
    samples: [...kp.samples, sample],
    updatedAt: now,
  };
}

export function createTestRun(kp: KodePengujian, input: {
  sampleId: string;
  recipeId: string;
  recipeSnapshot: { name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  setpoints: { forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  fixture: FixtureScenario;
  operatorId: string;
  operatorName: string;
  repetitionIndex?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  id?: string;
  now?: string;
}): { kp: KodePengujian; testRun: TestRun } {
  const sample = kp.samples.find(s => s.id === input.sampleId);
  if (!sample) {
    throw new DomainInvariantError(`Sample ${input.sampleId} not found in KodePengujian ${kp.id}.`);
  }
  const repetitionIndex = input.repetitionIndex ?? (kp.testRuns.filter(tr => tr.sampleId === input.sampleId).length + 1);
  const now = input.now ?? new Date().toISOString();
  const testRun: TestRun = {
    id: generateTestRunId(sample.id, input.id),
    kodePengujianId: kp.id,
    sampleId: input.sampleId,
    recipeId: input.recipeId,
    recipeSnapshot: input.recipeSnapshot,
    setpoints: input.setpoints,
    fixture: input.fixture,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    repetitionIndex,
    notes: input.notes,
    metadata: input.metadata,
    status: 'PENDING',
    createdAt: now,
    updatedAt: now,
  };
  const updatedKp: KodePengujian = {
    ...kp,
    status: kp.status === 'DRAFT' ? 'ACTIVE' : kp.status,
    testRuns: [...kp.testRuns, testRun],
    updatedAt: now,
  };
  return { kp: updatedKp, testRun };
}

export function startTestRunCapture(kp: KodePengujian, testRunId: string, captureSession: CaptureSession, now = new Date().toISOString()): KodePengujian {
  const tr = kp.testRuns.find(t => t.id === testRunId);
  if (!tr) throw new DomainInvariantError(`TestRun ${testRunId} not found in KodePengujian ${kp.id}.`);
  if (tr.status !== 'PENDING') {
    throw new DomainInvariantError(`Cannot start capture: TestRun ${testRunId} is in status ${tr.status}, expected PENDING.`);
  }
  return {
    ...kp,
    testRuns: kp.testRuns.map(t =>
      t.id === testRunId
        ? { ...t, captureSession, status: 'CAPTURING', startedAt: now, updatedAt: now }
        : t
    ),
    updatedAt: now,
  };
}

export function updateTestRunAnalysisDraft(kp: KodePengujian, testRunId: string, analysisDraft: AnalysisDraft, now = new Date().toISOString()): KodePengujian {
  const tr = kp.testRuns.find(t => t.id === testRunId);
  if (!tr) throw new DomainInvariantError(`TestRun ${testRunId} not found in KodePengujian ${kp.id}.`);
  if (tr.status !== 'CAPTURING' && tr.status !== 'ANALYZING') {
    throw new DomainInvariantError(`Cannot update analysis: TestRun ${testRunId} is in status ${tr.status}, expected CAPTURING or ANALYZING.`);
  }
  const newStatus: TestRunStatus = tr.status === 'CAPTURING' ? 'ANALYZING' : tr.status;
  return {
    ...kp,
    testRuns: kp.testRuns.map(t =>
      t.id === testRunId
        ? { ...t, analysisDraft, status: newStatus, updatedAt: now }
        : t
    ),
    updatedAt: now,
  };
}

/**
 * Explicitly transitions a TestRun from CAPTURING to ANALYZING.
 * Used when operator clicks "Lanjut ke Analisis" after a successful capture.
 * Does not require analysisDraft to be provided.
 */
export function startTestRunAnalysis(kp: KodePengujian, testRunId: string, now = new Date().toISOString()): KodePengujian {
  const tr = kp.testRuns.find(t => t.id === testRunId);
  if (!tr) throw new DomainInvariantError(`TestRun ${testRunId} not found in KodePengujian ${kp.id}.`);
  if (tr.status !== 'CAPTURING') {
    throw new DomainInvariantError(`Cannot start analysis: TestRun ${testRunId} is in status ${tr.status}, expected CAPTURING.`);
  }
  return {
    ...kp,
    testRuns: kp.testRuns.map(t =>
      t.id === testRunId ? { ...t, status: 'ANALYZING', updatedAt: now } : t
    ),
    updatedAt: now,
  };
}

export function requestTestRunReview(kp: KodePengujian, testRunId: string, now = new Date().toISOString()): KodePengujian {
  const tr = kp.testRuns.find(t => t.id === testRunId);
  if (!tr) throw new DomainInvariantError(`TestRun ${testRunId} not found in KodePengujian ${kp.id}.`);
  if (tr.status !== 'ANALYZING') {
    throw new DomainInvariantError(`Cannot request review: TestRun ${testRunId} is in status ${tr.status}, expected ANALYZING.`);
  }
  return {
    ...kp,
    testRuns: kp.testRuns.map(t =>
      t.id === testRunId ? { ...t, status: 'REVIEW_REQUIRED', updatedAt: now } : t
    ),
    updatedAt: now,
  };
}

export function finalizeTestRun(kp: KodePengujian, testRunId: string, report: FinalAnalysisReport, now = new Date().toISOString()): KodePengujian {
  const tr = kp.testRuns.find(t => t.id === testRunId);
  if (!tr) throw new DomainInvariantError(`TestRun ${testRunId} not found in KodePengujian ${kp.id}.`);
  if (tr.finalReport) {
    throw new DomainInvariantError(`TestRun ${testRunId} already has a final report. Finalized results are immutable.`);
  }
  if (tr.status !== 'REVIEW_REQUIRED' && tr.status !== 'ANALYZING') {
    throw new DomainInvariantError(`Cannot finalize: TestRun ${testRunId} is in status ${tr.status}, expected REVIEW_REQUIRED or ANALYZING.`);
  }

  return {
    ...kp,
    samples: kp.samples.map(s =>
      s.id === tr.sampleId ? { ...s, status: 'TESTED', updatedAt: now } : s
    ),
    testRuns: kp.testRuns.map(t =>
      t.id === testRunId
        ? { ...t, finalReport: report, status: 'FINALIZED', completedAt: now, updatedAt: now }
        : t
    ),
    updatedAt: now,
  };
}

export function markTestRunFailed(kp: KodePengujian, testRunId: string, reason: string, now = new Date().toISOString()): KodePengujian {
  const tr = kp.testRuns.find(t => t.id === testRunId);
  if (!tr) throw new DomainInvariantError(`TestRun ${testRunId} not found in KodePengujian ${kp.id}.`);
  if (tr.status === 'FINALIZED') {
    throw new DomainInvariantError(`Cannot mark failed: TestRun ${testRunId} is already FINALIZED.`);
  }
  return {
    ...kp,
    testRuns: kp.testRuns.map(t =>
      t.id === testRunId ? { ...t, status: 'FAILED', failureReason: reason, updatedAt: now } : t
    ),
    updatedAt: now,
  };
}

/**
 * Validates whether a TestRun can be finalized.
 * Returns { ok: true } when all readiness criteria are met,
 * or { ok: false, reasons: string[] } listing blocking factors.
 *
 * For real captures: Front is not available (hardware has only Side camera).
 *   Requires: Side frames, baseline, primary capture selected, Side measurements/evidence.
 * For simulations: Legacy dual-camera simulation has both Side and Front.
 *   Requires: synchronized moments, generated measurements for available perspectives.
 */
export function canFinalizeTestRun(kp: KodePengujian, testRunId: string): { ok: true } | { ok: false; reasons: string[] } {
  const tr = kp.testRuns.find(t => t.id === testRunId);
  if (!tr) return { ok: false, reasons: [`TestRun ${testRunId} not found in KodePengujian ${kp.id}.`] };

  const sample = kp.samples.find(s => s.id === tr.sampleId);
  if (!sample) return { ok: false, reasons: [`Sample ${tr.sampleId} not found in KodePengujian ${kp.id}.`] };

  if (tr.status === 'FINALIZED') return { ok: false, reasons: ['TestRun is already FINALIZED.'] };
  if (tr.finalReport) return { ok: false, reasons: ['TestRun already has a final report.'] };

  // Hierarchy must be valid
  if (tr.kodePengujianId !== kp.id) {
    return { ok: false, reasons: ['TestRun does not belong to this KodePengujian.'] };
  }

  // Capture session must exist
  if (!tr.captureSession) {
    return { ok: false, reasons: ['Capture session is missing.'] };
  }

  // Analysis draft must exist
  if (!tr.analysisDraft) {
    return { ok: false, reasons: ['Analysis draft is missing. Complete analysis in the workspace first.'] };
  }

  // Primary capture must be selected
  const primaryId = tr.analysisDraft.primaryCaptureMomentId;
  if (!primaryId) {
    return { ok: false, reasons: ['Primary capture moment not selected. Select a primary capture in the analysis workspace.'] };
  }

  // All selected capture references must be valid and have assets
  const allCaptureIds = [primaryId, ...tr.analysisDraft.supportingCaptureMomentIds];
  if (allCaptureIds.length === 0) {
    return { ok: false, reasons: ['No capture moments selected.'] };
  }

  // Validate capture session specifics
  const session = tr.captureSession;
  const isRealCapture = session.captureMode === 'real';

  if (isRealCapture) {
    // Real capture: Side-only workflow (hardware has only Side camera)
    const frames = session.realSideFrames ?? [];
    if (frames.length === 0) {
      return { ok: false, reasons: ['Real capture has no Side frames.'] };
    }
    if (!session.realSideBaseline) {
      return { ok: false, reasons: ['Real capture has no baseline selection.'] };
    }
    // Check all selected frames exist in the capture session
    const frameIds = new Set(frames.map(f => f.id));
    for (const capId of allCaptureIds) {
      if (!frameIds.has(capId)) {
        return { ok: false, reasons: [`Selected capture ${capId} not found in capture session.`] };
      }
    }
    // Side measurements/evidence must exist in analysisDraft for the primary capture
    const primarySideGeometry = tr.analysisDraft.sideCorrections?.[primaryId];
    if (!primarySideGeometry) {
      return { ok: false, reasons: ['Side analysis evidence missing for primary capture. Complete Side measurements in the analysis workspace.'] };
    }
    // REAL BLOCKER: Real Side analysis currently has no CV/segmentation/measurement pipeline.
    // The FinalAnalysisReport schema requires Side measurements (sprayLength, sprayAngle, verticalSpread, etc.)
    // which cannot be produced without external CV integration.
    return {
      ok: false,
      reasons: [
        'Real capture finalization blocked: Side CV analysis pipeline not integrated. Cannot produce required measurements (sprayLength, sprayAngle, verticalSpread, etc.).',
        'This is an explicit blocker until external CV/YOLO/OCR integration provides real measurements.'
      ]
    };
  } else {
    // Simulation capture: legacy dual-camera simulation (both Side and Front available)
    const moments = session.synchronizedMoments ?? [];
    if (moments.length === 0) {
      return { ok: false, reasons: ['Simulation capture has no synchronized moments.'] };
    }
    // Check all selected frames exist
    const momentIds = new Set(moments.map(m => m.id));
    for (const capId of allCaptureIds) {
      if (!momentIds.has(capId)) {
        return { ok: false, reasons: [`Selected capture ${capId} not found in synchronized moments.`] };
      }
    }
    // For simulation, both Side and Front measurements must exist in analysisDraft
    const primarySideGeometry = tr.analysisDraft.sideCorrections?.[primaryId];
    const primaryFrontGeometry = tr.analysisDraft.frontCorrections?.[primaryId];
    if (!primarySideGeometry) {
      return { ok: false, reasons: ['Side analysis evidence missing for primary capture.'] };
    }
    if (!primaryFrontGeometry) {
      return { ok: false, reasons: ['Front analysis evidence missing for primary capture.'] };
    }
    // Simulation has complete deterministic fixture measurement evidence
    return { ok: true };
  }
}

/**
 * Legacy adapter: converts a single Batch into a read-only KodePengujian view
 * with 1 Sample and 1 TestRun.
 * Does not mutate or migrate persisted data.
 */
export function adaptBatchToKodePengujian(batch: Batch): { kodePengujian: KodePengujian; sample: Sample; testRun: TestRun } {
  const setup = batch.setupSnapshot ?? batch.setupDraft;
  if (!setup) {
    throw new DomainInvariantError(`Batch ${batch.id} has no setup draft or snapshot.`);
  }

  const kpId = batch.id.replace(/^BAT-/, 'KP-');
  const sampleId = batch.setupSnapshot?.sampleId ?? `SMP-${batch.id.replace(/^BAT-/, '')}-001`;

  const productSnapshot = setup.productSnapshot
    ? { productCode: setup.productSnapshot.productCode, productName: setup.productSnapshot.productName }
    : { productCode: setup.productId, productName: setup.productId };

  const recipeSnapshot = setup.recipeSnapshot
    ? {
        name: setup.recipeSnapshot.name,
        forceSetpointN: setup.recipeSnapshot.forceSetpointN,
        pressDurationMs: setup.recipeSnapshot.pressDurationMs,
        strokeMm: setup.recipeSnapshot.strokeMm,
      }
    : {
        name: setup.recipeId,
        forceSetpointN: setup.setpoints?.forceSetpointN ?? 0,
        pressDurationMs: setup.setpoints?.pressDurationMs ?? 0,
        strokeMm: setup.setpoints?.strokeMm ?? 0,
      };

  const sample: Sample = {
    id: sampleId,
    kodePengujianId: kpId,
    positionInRun: setup.repetition ?? 1,
    storageCondition: setup.storageCondition,
    bottlePosition: setup.bottlePosition,
    status: batch.finalReport ? 'TESTED' : 'CREATED',
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };

  const testRun: TestRun = {
    id: batch.finalReport?.testId ?? `TR-${batch.id.replace(/^BAT-/, '')}-001`,
    kodePengujianId: kpId,
    sampleId,
    recipeId: setup.recipeId,
    recipeSnapshot,
    setpoints: setup.setpoints ?? {
      forceSetpointN: recipeSnapshot.forceSetpointN,
      pressDurationMs: recipeSnapshot.pressDurationMs,
      strokeMm: recipeSnapshot.strokeMm,
    },
    fixture: setup.fixture,
    captureSession: batch.captureSession,
    analysisDraft: batch.analysisDraft,
    finalReport: batch.finalReport,
    failureReason: batch.failureReason,
    repetitionIndex: setup.repetition ?? 1,
    operatorId: setup.operatorId,
    operatorName: setup.operatorName,
    status: mapBatchStatusToTestRunStatus(batch.status),
    notes: setup.notes,
    startedAt: batch.captureSession?.startedAt,
    completedAt: batch.finalReport?.finalizedAt,
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };

  const kp: KodePengujian = {
    id: kpId,
    status: mapBatchStatusToKodePengujianStatus(batch.status),
    productId: setup.productId,
    productSnapshot,
    defaultRecipeId: setup.recipeId,
    defaultRecipeSnapshot: recipeSnapshot,
    productLot: setup.productLot,
    testPeriod: setup.testPeriod,
    storageCondition: setup.storageCondition,
    bottlePosition: setup.bottlePosition,
    operatorId: setup.operatorId,
    operatorName: setup.operatorName,
    notes: setup.notes,
    samples: [sample],
    testRuns: [testRun],
    createdAt: batch.createdAt,
    updatedAt: batch.updatedAt,
  };

  // Freeze all levels for read-only guarantee.
  // Adapter output represents a read-only projection of legacy Batch data
  // and must never be directly mutated or persisted as a new KodePengujian.
  Object.freeze(sample);
  Object.freeze(testRun);
  Object.freeze(kp.samples);
  Object.freeze(kp.testRuns);
  Object.freeze(kp);

  return {
    kodePengujian: kp,
    sample,
    testRun,
  };
}

function mapBatchStatusToKodePengujianStatus(status: BatchStatus): KodePengujianStatus {
  switch (status) {
    case 'DRAFT': return 'DRAFT';
    case 'FINALIZED': return 'CLOSED';
    case 'FAILED': return 'ARCHIVED';
    case 'ABORTED': return 'ARCHIVED';
    default: return 'ACTIVE';
  }
}

function mapBatchStatusToTestRunStatus(status: BatchStatus): TestRunStatus {
  switch (status) {
    case 'DRAFT': return 'PENDING';
    case 'READY': return 'PENDING';
    case 'CAPTURING': return 'CAPTURING';
    case 'PROCESSING': return 'ANALYZING';
    case 'REVIEW_REQUIRED': return 'REVIEW_REQUIRED';
    case 'FINALIZED': return 'FINALIZED';
    case 'FAILED': return 'FAILED';
    case 'ABORTED': return 'ABORTED';
    default: return 'PENDING';
  }
}