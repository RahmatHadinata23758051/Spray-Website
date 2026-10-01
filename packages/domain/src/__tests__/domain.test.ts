import { describe, it, expect } from 'vitest';
import {
  createBatchDraft,
  prepareBatch,
  startCapture,
  completeCapture,
  markReviewRequired,
  updateAnalysisDraft,
  InvalidLifecycleTransitionError,
} from '../batch/index';

describe('@spray-paragon/domain: Pure Domain Invariants', () => {
  const dummyProduct = {
    productCode: 'PRD-01',
    productName: 'Hydra Mist',
  };

  const dummyRecipe = {
    name: 'Standard Spray',
    forceSetpointN: 15,
    pressDurationMs: 400,
    strokeMm: 12,
  };

  it('creates batch draft with initial DRAFT status', () => {
    const batch = createBatchDraft({
      productId: 'p1',
      productSnapshot: dummyProduct,
      recipeId: 'r1',
      recipeSnapshot: dummyRecipe,
      operatorId: 'op1',
      operatorName: 'Operator Name',
      fixture: 'nominal-01',
    });

    expect(batch.status).toBe('DRAFT');
    expect(batch.setupDraft?.productId).toBe('p1');
    expect(batch.setupSnapshot).toBeUndefined();
  });

  it('prepares batch and freezes setup snapshot (DRAFT -> READY)', () => {
    const draft = createBatchDraft({
      productId: 'p1',
      productSnapshot: dummyProduct,
      recipeId: 'r1',
      recipeSnapshot: dummyRecipe,
      operatorId: 'op1',
      operatorName: 'Operator Name',
      fixture: 'nominal-01',
    });

    const ready = prepareBatch(draft);
    expect(ready.status).toBe('READY');
    expect(ready.setupSnapshot).toBeDefined();
    expect(ready.setupSnapshot?.sampleId).toBe(`SMP-${ready.id.replace(/^BAT-/, '')}`);
  });

  it('disallows preparation on non-DRAFT batch', () => {
    const draft = createBatchDraft({
      productId: 'p1',
      productSnapshot: dummyProduct,
      recipeId: 'r1',
      recipeSnapshot: dummyRecipe,
      operatorId: 'op1',
      operatorName: 'Operator Name',
      fixture: 'nominal-01',
    });
    const ready = prepareBatch(draft);

    expect(() => prepareBatch(ready)).toThrow(InvalidLifecycleTransitionError);
  });

  it('transitions READY -> CAPTURING -> PROCESSING -> REVIEW_REQUIRED', () => {
    const draft = createBatchDraft({
      productId: 'p1',
      productSnapshot: dummyProduct,
      recipeId: 'r1',
      recipeSnapshot: dummyRecipe,
      operatorId: 'op1',
      operatorName: 'Operator Name',
      fixture: 'nominal-01',
    });
    const ready = prepareBatch(draft);

    const capturing = startCapture(ready);
    expect(capturing.status).toBe('CAPTURING');
    expect(capturing.captureSession?.scenario).toBe('nominal-01');

    const processing = completeCapture(capturing);
    expect(processing.status).toBe('PROCESSING');
    expect(processing.captureSession?.capturedAt).toBeDefined();

    const reviewRequired = markReviewRequired(processing);
    expect(reviewRequired.status).toBe('REVIEW_REQUIRED');
  });

  it('disallows starting capture directly from DRAFT', () => {
    const draft = createBatchDraft({
      productId: 'p1',
      productSnapshot: dummyProduct,
      recipeId: 'r1',
      recipeSnapshot: dummyRecipe,
      operatorId: 'op1',
      operatorName: 'Operator Name',
      fixture: 'nominal-01',
    });

    expect(() => startCapture(draft)).toThrow(InvalidLifecycleTransitionError);
  });

  describe('D3 Contextual Analysis Domain Invariants', () => {
    const synchronizedMoments = [
      {
        id: 'mom-1',
        frameIndex: 0,
        timestampMs: 100,
        timestampDeltaMs: 0,
        syncStatus: 'synced' as const,
        phase: 'stable' as const,
        recommended: true,
        side: { id: 's1', frameIndex: 0, timestampMs: 100, phase: 'stable' as const, assets: { original: '', mask: '', overlay: '' } },
        front: { id: 'f1', frameIndex: 0, timestampMs: 100, phase: 'stable' as const, assets: { original: '', mask: '', overlay: '' } },
      },
      {
        id: 'mom-2',
        frameIndex: 1,
        timestampMs: 200,
        timestampDeltaMs: 0,
        syncStatus: 'synced' as const,
        phase: 'stable' as const,
        recommended: false,
        side: { id: 's2', frameIndex: 1, timestampMs: 200, phase: 'stable' as const, assets: { original: '', mask: '', overlay: '' } },
        front: { id: 'f2', frameIndex: 1, timestampMs: 200, phase: 'stable' as const, assets: { original: '', mask: '', overlay: '' } },
      },
      {
        id: 'mom-unsynced',
        frameIndex: 2,
        timestampMs: 300,
        timestampDeltaMs: 20,
        syncStatus: 'unsynced' as const,
        phase: 'stable' as const,
        recommended: false,
        side: { id: 's3', frameIndex: 2, timestampMs: 300, phase: 'stable' as const, assets: { original: '', mask: '', overlay: '' } },
        front: { id: 'f3', frameIndex: 2, timestampMs: 320, phase: 'stable' as const, assets: { original: '', mask: '', overlay: '' } },
      },
    ];

    function setupReviewRequiredBatch() {
      const draft = createBatchDraft({
        productId: 'p1',
        productSnapshot: dummyProduct,
        recipeId: 'r1',
        recipeSnapshot: dummyRecipe,
        operatorId: 'op1',
        operatorName: 'Operator Name',
        fixture: 'nominal-01',
      });
      const ready = prepareBatch(draft);
      const capturing = startCapture(ready);
      const withSession = {
        ...capturing,
        captureSession: {
          ...capturing.captureSession!,
          synchronizedMoments,
        },
      };
      const processing = completeCapture(withSession);
      return markReviewRequired(processing);
    }

    it('allows updating analysis draft in REVIEW_REQUIRED state', () => {
      const batch = setupReviewRequiredBatch();
      const updated = updateAnalysisDraft(batch, {
        calibration: {
          side: { camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 10, adjusted: false },
          front: { camera: 'front', referenceDistanceMm: 500, anchorA: { x: 0, y: 0 }, anchorB: { x: 50, y: 0 }, scaleMmPerPx: 10, adjusted: false },
        },
        primaryCaptureMomentId: 'mom-1',
        supportingCaptureMomentIds: ['mom-2'],
        sideCorrections: {},
        frontCorrections: {},
        updatedAt: new Date().toISOString(),
      });

      expect(updated.analysisDraft?.primaryCaptureMomentId).toBe('mom-1');
      expect(updated.analysisDraft?.supportingCaptureMomentIds).toEqual(['mom-2']);
    });

    it('rejects analysis draft update when status is not REVIEW_REQUIRED', () => {
      const batch = setupReviewRequiredBatch();
      const finalized = { ...batch, status: 'FINALIZED' as const };

      expect(() =>
        updateAnalysisDraft(finalized, {
          calibration: batch.analysisDraft?.calibration || {
            side: { camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 10, adjusted: false },
            front: { camera: 'front', referenceDistanceMm: 500, anchorA: { x: 0, y: 0 }, anchorB: { x: 50, y: 0 }, scaleMmPerPx: 10, adjusted: false },
          },
          primaryCaptureMomentId: 'mom-1',
          supportingCaptureMomentIds: [],
          sideCorrections: {},
          frontCorrections: {},
          updatedAt: new Date().toISOString(),
        })
      ).toThrow(InvalidLifecycleTransitionError);
    });

    it('rejects unsynced primary capture moment', () => {
      const batch = setupReviewRequiredBatch();
      expect(() =>
        updateAnalysisDraft(batch, {
          calibration: {
            side: { camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 10, adjusted: false },
            front: { camera: 'front', referenceDistanceMm: 500, anchorA: { x: 0, y: 0 }, anchorB: { x: 50, y: 0 }, scaleMmPerPx: 10, adjusted: false },
          },
          primaryCaptureMomentId: 'mom-unsynced',
          supportingCaptureMomentIds: [],
          sideCorrections: {},
          frontCorrections: {},
          updatedAt: new Date().toISOString(),
        })
      ).toThrow();
    });

    it('rejects primary capture appearing in supporting captures', () => {
      const batch = setupReviewRequiredBatch();
      expect(() =>
        updateAnalysisDraft(batch, {
          calibration: {
            side: { camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 10, adjusted: false },
            front: { camera: 'front', referenceDistanceMm: 500, anchorA: { x: 0, y: 0 }, anchorB: { x: 50, y: 0 }, scaleMmPerPx: 10, adjusted: false },
          },
          primaryCaptureMomentId: 'mom-1',
          supportingCaptureMomentIds: ['mom-1'],
          sideCorrections: {},
          frontCorrections: {},
          updatedAt: new Date().toISOString(),
        })
      ).toThrow();
    });

    it('rejects supporting count > 9', () => {
      const batch = setupReviewRequiredBatch();
      expect(() =>
        updateAnalysisDraft(batch, {
          calibration: {
            side: { camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 10, adjusted: false },
            front: { camera: 'front', referenceDistanceMm: 500, anchorA: { x: 0, y: 0 }, anchorB: { x: 50, y: 0 }, scaleMmPerPx: 10, adjusted: false },
          },
          primaryCaptureMomentId: 'mom-1',
          supportingCaptureMomentIds: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10'],
          sideCorrections: {},
          frontCorrections: {},
          updatedAt: new Date().toISOString(),
        })
      ).toThrow();
    });
  });
});
