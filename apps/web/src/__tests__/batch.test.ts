import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CreateBatchDraftInput,
  Batch,
  batchToTest,
  InvalidLifecycleTransitionError,
  BatchValidationError
} from '@spray-paragon/domain';
import { BatchNotFoundError } from '../application/errors/batchErrors';
import { LocalStorageBatchRepository, BATCH_STORAGE_KEY } from '../data';
import { synchronizedFrames } from '../data';
import type { FinalAnalysisReport } from '@spray-paragon/domain';

describe('Phase A - Canonical Batch Domain & Persistence', () => {
  const dummyDraftInput: CreateBatchDraftInput = {
    productId: 'prod-123',
    productSnapshot: { productCode: 'P-123', productName: 'Perfume' },
    recipeId: 'rec-123',
    recipeSnapshot: { name: 'Standard', forceSetpointN: 30, pressDurationMs: 800, strokeMm: 8 },
    operatorId: 'usr-001',
    operatorName: 'Alice',
    fixture: 'nominal-01',
    productLot: 'LOT-XYZ'
  };

  let repo: LocalStorageBatchRepository;

  beforeEach(() => {
    // Clear localStorage for tests
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    repo = new LocalStorageBatchRepository();
  });

  afterEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('1. Batch draft creation sets initial state properly', async () => {
    const batch = await repo.createBatchDraft(dummyDraftInput);
    expect(batch.status).toBe('DRAFT');
    expect(batch.setupDraft?.productId).toBe('prod-123');
    expect(batch.setupDraft?.productLot).toBe('LOT-XYZ');
    expect(batch.setupSnapshot).toBeUndefined();
  });

  it('2. Setup draft mutation while DRAFT is permitted', async () => {
    let batch = await repo.createBatchDraft(dummyDraftInput);
    batch = await repo.updateBatchSetupDraft(batch.id, { productLot: 'NEW-LOT' });
    expect(batch.setupDraft?.productLot).toBe('NEW-LOT');
  });

  it('3. DRAFT → READY creates frozen setup snapshot', async () => {
    let batch = await repo.createBatchDraft(dummyDraftInput);
    batch = await repo.prepareBatch(batch.id);
    expect(batch.status).toBe('READY');
    expect(batch.setupSnapshot).toBeDefined();
    expect(batch.setupSnapshot?.productLot).toBe('LOT-XYZ');
  });

  it('4. Setup snapshot does not change when Product/Recipe source objects mutate', async () => {
    const mutableInput = {
      ...dummyDraftInput,
      productSnapshot: { productCode: 'P-MUT', productName: 'Mutable' },
    };
    let batch = await repo.createBatchDraft(mutableInput);
    batch = await repo.prepareBatch(batch.id);
    
    // Mutate the original source (simulating external update)
    mutableInput.productSnapshot.productName = 'Hacked';
    
    // The snapshot should remain unmutated
    expect(batch.setupSnapshot?.productSnapshot.productName).toBe('Mutable');
  });

  it('5. READY setup cannot be silently edited', async () => {
    let batch = await repo.createBatchDraft(dummyDraftInput);
    batch = await repo.prepareBatch(batch.id);
    
    await expect(repo.updateBatchSetupDraft(batch.id, { productLot: 'ILLEGAL' }))
      .rejects.toThrowError(InvalidLifecycleTransitionError);
  });

  it('6. Capture session can be built during CAPTURING', async () => {
    let batch = await repo.createBatchDraft(dummyDraftInput);
    batch = await repo.prepareBatch(batch.id);
    batch = await repo.startCapture(batch.id);
    
    expect(batch.status).toBe('CAPTURING');
    expect(batch.captureSession).toBeDefined();
    expect(batch.captureSession?.synchronizedMoments).toHaveLength(0);

    // Simulate appending frames
    batch = await repo.updateCaptureSession(batch.id, [synchronizedFrames[0], synchronizedFrames[1]]);
    expect(batch.captureSession?.synchronizedMoments).toHaveLength(2);
  });

  it('7. Completing capture freezes CaptureSession', async () => {
    let batch = await repo.createBatchDraft(dummyDraftInput);
    batch = await repo.prepareBatch(batch.id);
    batch = await repo.startCapture(batch.id);
    batch = await repo.completeCapture(batch.id);

    expect(batch.status).toBe('PROCESSING');
    expect(batch.captureSession?.capturedAt).toBeDefined();

    // Updating capture session in PROCESSING should throw
    await expect(repo.updateCaptureSession(batch.id, []))
      .rejects.toThrowError(InvalidLifecycleTransitionError);
  });

  it('8. Side and Front calibrations persist independently', async () => {
    let batch = await repo.createBatchDraft(dummyDraftInput);
    batch = await repo.prepareBatch(batch.id);
    batch = await repo.startCapture(batch.id);
    batch = await repo.completeCapture(batch.id);
    batch = await repo.markReviewRequired(batch.id, {
      calibration: {
        side: { camera: 'side', referenceDistanceMm: 100, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 1, adjusted: false },
        front: { camera: 'front', referenceDistanceMm: 100, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 1, adjusted: false },
      },
      primaryCaptureMomentId: null,
      supportingCaptureMomentIds: [],
      sideCorrections: {},
      frontCorrections: {},
      updatedAt: new Date().toISOString(),
    });

    expect(batch.analysisDraft?.calibration.side.referenceDistanceMm).toBe(100);
    expect(batch.analysisDraft?.calibration.front.referenceDistanceMm).toBe(100);
  });

  it('9 & 14. localStorage persistence survives repository re-instantiation', async () => {
    let batch = await repo.createBatchDraft(dummyDraftInput);
    await repo.updateBatchSetupDraft(batch.id, { notes: 'Persistence check' });

    // Simulate page reload
    const newRepo = new LocalStorageBatchRepository();
    const loadedBatch = await newRepo.getBatch(batch.id);
    
    expect(loadedBatch).toBeDefined();
    expect(loadedBatch?.setupDraft?.notes).toBe('Persistence check');
  });

  it('10. Maximum 9 Supporting Captures is enforced', async () => {
    let batch = await repo.createBatchDraft(dummyDraftInput);
    batch = await repo.prepareBatch(batch.id);
    batch = await repo.startCapture(batch.id);
    batch = await repo.completeCapture(batch.id);
    batch = await repo.markReviewRequired(batch.id, {
      calibration: {
        side: { camera: 'side', referenceDistanceMm: 100, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 1, adjusted: false },
        front: { camera: 'front', referenceDistanceMm: 100, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 1, adjusted: false },
      },
      primaryCaptureMomentId: null,
      supportingCaptureMomentIds: ['1','2','3','4','5','6','7','8','9','10'],
      sideCorrections: {},
      frontCorrections: {},
      updatedAt: new Date().toISOString(),
    });

    const draft = { ...batch.analysisDraft! };

    await expect(repo.updateAnalysisDraft(batch.id, draft))
      .rejects.toThrowError(BatchValidationError);
  });

  it('11. Finalization requires valid Primary Capture', async () => {
    let batch = await repo.createBatchDraft(dummyDraftInput);
    batch = await repo.prepareBatch(batch.id);
    batch = await repo.startCapture(batch.id);
    batch = await repo.completeCapture(batch.id);
    batch = await repo.markReviewRequired(batch.id);

    const fakeReport = {
      testId: batch.id,
      primaryCaptureMomentId: null as unknown as string, // Invalid
      primaryCapture: null as unknown as FinalAnalysisReport['primaryCapture'],
      supportingCaptures: [],
      finalCalibration: null as unknown as FinalAnalysisReport['side']['calibration'],
      status: 'finalized',
      finalizedBy: 'Alice',
      finalizedAt: new Date().toISOString(),
    } as unknown as FinalAnalysisReport;

    await expect(repo.finalizeBatch(batch.id, fakeReport))
      .rejects.toThrowError(BatchValidationError);
  });

  it('12. FINALIZED AnalysisDraft cannot be mutated', async () => {
    let batch = await repo.createBatchDraft(dummyDraftInput);
    batch = await repo.prepareBatch(batch.id);
    batch = await repo.startCapture(batch.id);
    batch = await repo.completeCapture(batch.id);
    batch = await repo.markReviewRequired(batch.id, {
      calibration: {
        side: { camera: 'side', referenceDistanceMm: 100, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 1, adjusted: false },
        front: { camera: 'front', referenceDistanceMm: 100, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 1, adjusted: false },
      },
      primaryCaptureMomentId: 'P1',
      supportingCaptureMomentIds: [],
      sideCorrections: {},
      frontCorrections: {},
      updatedAt: new Date().toISOString(),
    });

    const fakeReport = {
      testId: batch.id,
      primaryCaptureMomentId: 'P1',
      primaryCapture: null as unknown as FinalAnalysisReport['primaryCapture'],
      supportingCaptures: [],
      finalCalibration: null as unknown as FinalAnalysisReport['side']['calibration'],
      status: 'finalized',
      finalizedBy: 'Alice',
      finalizedAt: new Date().toISOString(),
    } as unknown as FinalAnalysisReport;

    batch = await repo.finalizeBatch(batch.id, fakeReport);
    expect(batch.status).toBe('FINALIZED');

    // Attempting to update analysis draft should fail
    await expect(repo.updateAnalysisDraft(batch.id, batch.analysisDraft!))
      .rejects.toThrowError(InvalidLifecycleTransitionError);
  });

  it('13. Finalized report is immutable', async () => {
    let batch = await repo.createBatchDraft(dummyDraftInput);
    batch = await repo.prepareBatch(batch.id);
    batch = await repo.startCapture(batch.id);
    batch = await repo.completeCapture(batch.id);
    batch = await repo.markReviewRequired(batch.id, {
      calibration: {
        side: { camera: 'side', referenceDistanceMm: 100, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 1, adjusted: false },
        front: { camera: 'front', referenceDistanceMm: 100, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 1, adjusted: false },
      },
      primaryCaptureMomentId: 'P1',
      supportingCaptureMomentIds: [],
      sideCorrections: {},
      frontCorrections: {},
      updatedAt: new Date().toISOString(),
    });

    const fakeReport = {
      testId: batch.id,
      primaryCaptureMomentId: 'P1',
      primaryCapture: { frameIndex: 1, timestampMs: 50 } as unknown as FinalAnalysisReport['primaryCapture'],
      supportingCaptures: [],
      finalCalibration: { side: {}, front: {} } as unknown as FinalAnalysisReport['side']['calibration'],
      status: 'finalized',
      finalizedBy: 'Alice',
      finalizedAt: new Date().toISOString(),
    } as unknown as FinalAnalysisReport;

    batch = await repo.finalizeBatch(batch.id, fakeReport);
    
    // Check if the report is frozen
    expect(Object.isFrozen(batch.finalReport)).toBe(true);
  });

  it('15. Deterministic seed does not overwrite existing data', async () => {
    let batch = await repo.createBatchDraft(dummyDraftInput);
    
    // Seed without force
    const seedBatch: Batch = { ...batch, id: 'BAT-SEED' };
    repo.seed([seedBatch]);

    const batches = await repo.listBatches();
    // Because it wasn't empty, it shouldn't seed
    expect(batches.length).toBe(1);
    expect(batches[0].id).toBe(batch.id);

    // Seed with force
    repo.seed([seedBatch], true);
    const forcedBatches = await repo.listBatches();
    expect(forcedBatches.length).toBe(1);
    expect(forcedBatches[0].id).toBe('BAT-SEED');
  });

  it('16. Invalid/corrupted storage is handled safely', async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(BATCH_STORAGE_KEY, '{invalid_json');
    }
    
    // It should handle gracefully, warn, and start empty
    const safeRepo = new LocalStorageBatchRepository();
    const batches = await safeRepo.listBatches();
    expect(batches).toEqual([]);
    
    // Write should still work
    const batch = await safeRepo.createBatchDraft(dummyDraftInput);
    expect(batch).toBeDefined();
  });

  it('17. Batch adapter correctly converts Batch to legacy Test interface', async () => {
    let batch = await repo.createBatchDraft(dummyDraftInput);
    batch = await repo.prepareBatch(batch.id);
    const legacyTest = batchToTest(batch);

    expect(legacyTest.id).toBe(batch.id);
    expect(legacyTest.productName).toBe('Perfume');
    expect(legacyTest.productionBatch).toBe('LOT-XYZ');
    expect(legacyTest.status).toBe('running');
  });

  it('18. Non-existent batch operations reject with BatchNotFoundError', async () => {
    await expect(repo.prepareBatch('BAT-NONEXISTENT'))
      .rejects.toThrowError(BatchNotFoundError);
  });
});
