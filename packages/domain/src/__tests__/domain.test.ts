import { describe, it, expect } from 'vitest';
import {
  createBatchDraft,
  prepareBatch,
  startCapture,
  updateCaptureSession,
  updateRealCaptureSession,
  setRealSideBaselineFromWindow,
  selectRealSideBaselineRange,
  DEFAULT_REAL_SIDE_BASELINE_WINDOW_MS,
  completeCapture,
  markReviewRequired,
  updateAnalysisDraft,
  InvalidLifecycleTransitionError,
} from '../batch/index';
import {
  buildRealSideAnalysisInput,
  setPrimaryAnalysisCapture,
  addSupportingAnalysisCapture,
  setPrimaryCapture,
  addSupportingCapture,
  createCalibrationSnapshot,
} from '../analysis/index';
import type { SelectedCaptureMoment } from '../types/index';

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

  it('rejects invalid repetition values at the domain boundary', () => {
    expect(() => createBatchDraft({
      productId: 'p1',
      productSnapshot: dummyProduct,
      recipeId: 'r1',
      recipeSnapshot: dummyRecipe,
      operatorId: 'op1',
      operatorName: 'Operator Name',
      fixture: 'nominal-01',
      repetition: 0,
    })).toThrow(/positive integer/);
  });

  it('carries test-context metadata from draft into frozen setup snapshot', () => {
    const draft = createBatchDraft({
      productId: 'p1',
      productSnapshot: dummyProduct,
      recipeId: 'r1',
      recipeSnapshot: dummyRecipe,
      operatorId: 'op1',
      operatorName: 'Operator Name',
      fixture: 'nominal-01',
      productLot: 'LOT-42',
      storageCondition: '25C ambient',
      bottlePosition: 'upright',
      testPeriod: 'week-2',
      repetition: 3,
    });

    expect(draft.setupDraft?.storageCondition).toBe('25C ambient');
    expect(draft.setupDraft?.repetition).toBe(3);

    const ready = prepareBatch(draft);
    expect(ready.setupSnapshot?.storageCondition).toBe('25C ambient');
    expect(ready.setupSnapshot?.bottlePosition).toBe('upright');
    expect(ready.setupSnapshot?.testPeriod).toBe('week-2');
    expect(ready.setupSnapshot?.repetition).toBe(3);
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

    it('records ordered real Side capture frames with monotonic timestamps', () => {
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

      const frames = [
        { id: 'f-0', frameIndex: 0, camera: 'side' as const, capturedAt: '2026-10-15T10:00:00.000Z', elapsedMs: 0 },
        { id: 'f-1', frameIndex: 1, camera: 'side' as const, capturedAt: '2026-10-15T10:00:00.100Z', elapsedMs: 100 },
        { id: 'f-2', frameIndex: 2, camera: 'side' as const, capturedAt: '2026-10-15T10:00:00.200Z', elapsedMs: 200 },
      ];

      const updated = updateRealCaptureSession(capturing, frames);
      expect(updated.captureSession?.captureMode).toBe('real');
      expect(updated.captureSession?.synchronizedMoments).toEqual([]);
      expect(updated.captureSession?.realSideFrames).toHaveLength(3);
      expect(updated.captureSession?.realSideFrames?.[1].elapsedMs).toBe(100);

      // Rejects non-monotonic
      expect(() => updateRealCaptureSession(capturing, [
        { id: 'f-0', frameIndex: 0, camera: 'side' as const, capturedAt: '2026-10-15T10:00:00.000Z', elapsedMs: 150 },
        { id: 'f-1', frameIndex: 1, camera: 'side' as const, capturedAt: '2026-10-15T10:00:00.100Z', elapsedMs: 100 },
      ])).toThrow();

      // Rejects front frame in side-only foundation
      expect(() => updateRealCaptureSession(capturing, [
        { id: 'f-0', frameIndex: 0, camera: 'front' as unknown as 'side', capturedAt: '2026-10-15T10:00:00.000Z', elapsedMs: 0 },
      ])).toThrow();

      // Rejects presentation-only references: never store ObjectURLs or data URLs
      expect(() => updateRealCaptureSession(capturing, [
        { id: 'f-0', frameIndex: 0, camera: 'side' as const, capturedAt: '2026-10-15T10:00:00.000Z', elapsedMs: 0, assetId: 'blob:deadbeef' },
      ])).toThrow();

      // Accepts a stable asset key
      const withAsset = updateRealCaptureSession(capturing, [
        { id: 'f-0', frameIndex: 0, camera: 'side' as const, capturedAt: '2026-10-15T10:00:00.000Z', elapsedMs: 0, assetId: 'BAT-1:side:000' },
      ]);
      expect(withAsset.captureSession?.realSideFrames?.[0].assetId).toBe('BAT-1:side:000');
    });
  });

  describe('Phase 5 — real Side pre-spray baseline', () => {
    const dummyProduct = { productCode: 'PRD-01', productName: 'Hydra Mist' };
    const dummyRecipe = { name: 'Standard Spray', forceSetpointN: 15, pressDurationMs: 400, strokeMm: 12 };

    function capturingBatch() {
      const draft = createBatchDraft({
        productId: 'p1',
        productSnapshot: dummyProduct,
        recipeId: 'r1',
        recipeSnapshot: dummyRecipe,
        operatorId: 'op1',
        operatorName: 'Operator Name',
        fixture: 'nominal-01',
      });
      return startCapture(prepareBatch(draft));
    }

    function realFrames(count: number, stepMs = 100, assetId?: (index: number) => string | undefined) {
      return Array.from({ length: count }, (_, index) => ({
        id: `f-${index}`,
        frameIndex: index,
        camera: 'side' as const,
        capturedAt: new Date(Date.UTC(2026, 9, 15, 10, 0, 0, index * stepMs)).toISOString(),
        elapsedMs: index * stepMs,
        assetId: assetId ? assetId(index) : `BAT-1:side:${String(index).padStart(3, '0')}`,
      }));
    }

    it('defaults to the configured initial window over the first 500 ms', () => {
      const batch = updateRealCaptureSession(capturingBatch(), realFrames(10));
      const baseline = batch.captureSession?.realSideBaseline;

      expect(DEFAULT_REAL_SIDE_BASELINE_WINDOW_MS).toBe(500);
      expect(baseline?.selectionMethod).toBe('initial-window');
      expect(baseline?.configuredWindowMs).toBe(500);
      expect(baseline?.startElapsedMs).toBe(0);
      expect(baseline?.endElapsedMs).toBe(500);
      // Frames 0..5 (0,100,200,300,400,500 ms) — endpoint inclusive.
      expect(baseline?.frames.map((frame) => frame.frameIndex)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(baseline?.frames.every((frame) => frame.assetId.startsWith('BAT-1:side:'))).toBe(true);
    });

    it('clamps the configured window to the captured span of a short capture', () => {
      const batch = updateRealCaptureSession(capturingBatch(), realFrames(4));
      const baseline = batch.captureSession?.realSideBaseline;

      expect(baseline?.startElapsedMs).toBe(0);
      expect(baseline?.endElapsedMs).toBe(300);
      expect(baseline?.configuredWindowMs).toBe(500);
      expect(baseline?.frames).toHaveLength(4);
    });

    it('selects frames by elapsedMs on an operator-chosen range', () => {
      const batch = selectRealSideBaselineRange(updateRealCaptureSession(capturingBatch(), realFrames(10)), 200, 450);

      const baseline = batch.captureSession?.realSideBaseline;
      expect(baseline?.selectionMethod).toBe('manual-range');
      expect(baseline?.configuredWindowMs).toBe(250);
      expect(baseline?.startElapsedMs).toBe(200);
      expect(baseline?.endElapsedMs).toBe(450);
      expect(baseline?.frames.map((frame) => frame.elapsedMs)).toEqual([200, 300, 400]);
    });

    it('overwrites the previous baseline when reselected', () => {
      const capture = updateRealCaptureSession(capturingBatch(), realFrames(10));
      const widened = selectRealSideBaselineRange(capture, 0, 900);
      const narrowed = selectRealSideBaselineRange(widened, 0, 100);

      expect(narrowed.captureSession?.realSideBaseline?.frames).toHaveLength(2);
      expect(narrowed.captureSession?.realSideBaseline?.frames.map((frame) => frame.frameIndex)).toEqual([0, 1]);
    });

    it('rejects a simulation session, an empty session, and batches outside CAPTURING', () => {
      const simulation = updateCaptureSession(capturingBatch(), []);
      expect(() => setRealSideBaselineFromWindow(simulation)).toThrow(/real capture session/);

      const empty = updateRealCaptureSession(capturingBatch(), []);
      expect(empty.captureSession?.realSideBaseline).toBeUndefined();
      expect(() => setRealSideBaselineFromWindow(empty)).toThrow(/at least one persisted real Side frame/);

      const processing = completeCapture(updateRealCaptureSession(capturingBatch(), realFrames(4)));
      expect(() => setRealSideBaselineFromWindow(processing)).toThrow(InvalidLifecycleTransitionError);
    });

    it('rejects an invalid range, unknown range, and frames without a persisted asset', () => {
      const capture = updateRealCaptureSession(capturingBatch(), realFrames(6));

      expect(() => selectRealSideBaselineRange(capture, 300, 100)).toThrow(/must not precede/);
      expect(() => selectRealSideBaselineRange(capture, -50, 100)).toThrow(/at or after 0 ms/);
      expect(() => selectRealSideBaselineRange(capture, 0, 5000)).toThrow(/exceeds the captured span/);
      expect(() => selectRealSideBaselineRange(capture, 50, 90)).toThrow(/No real Side frame falls inside/);
      expect(() => setRealSideBaselineFromWindow(capture, 0)).toThrow(/positive number/);

      // Legacy capture without asset references cannot become a baseline.
      expect(() => setRealSideBaselineFromWindow(updateRealCaptureSession(capturingBatch(), realFrames(6, 100, () => undefined)))).toThrow(/persisted asset/);
    });

    it('never tags simulation moments with real baseline metadata', () => {
      const capture = updateRealCaptureSession(capturingBatch(), realFrames(4));
      expect(capture.captureSession?.realSideBaseline).toBeDefined();

      // Switching the same session to simulation clears frame references and the baseline.
      const simulation = updateCaptureSession(capture, []);
      expect(simulation.captureSession?.captureMode).toBe('simulation');
      expect(simulation.captureSession?.realSideBaseline).toBeUndefined();
    });
  });

  describe('Phase 6 — Real Side analysis contract & selection', () => {
    const dummyProduct = { productCode: 'PRD-01', productName: 'Hydra Mist' };
    const dummyRecipe = { name: 'Standard Spray', forceSetpointN: 15, pressDurationMs: 400, strokeMm: 12 };

    function capturingBatch() {
      const draft = createBatchDraft({
        productId: 'p1',
        productSnapshot: dummyProduct,
        recipeId: 'r1',
        recipeSnapshot: dummyRecipe,
        operatorId: 'op1',
        operatorName: 'Operator Name',
        fixture: 'nominal-01',
      });
      return startCapture(prepareBatch(draft));
    }

    function realFrames(count: number, stepMs = 100, assetId?: (index: number) => string | undefined) {
      return Array.from({ length: count }, (_, index) => ({
        id: `f-${index}`,
        frameIndex: index,
        camera: 'side' as const,
        capturedAt: new Date(Date.UTC(2026, 9, 15, 10, 0, 0, index * stepMs)).toISOString(),
        elapsedMs: index * stepMs,
        assetId: assetId ? assetId(index) : `BAT-1:side:${String(index).padStart(3, '0')}`,
      }));
    }

    it('rejects simulation sessions when building real Side analysis input', () => {
      const simulation = capturingBatch();
      const result = buildRealSideAnalysisInput(simulation);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/real capture session/);
      }
    });

    it('rejects real capture without frames or with missing assetId', () => {
      const batchWithNoFrames = updateRealCaptureSession(capturingBatch(), []);
      const result1 = buildRealSideAnalysisInput(batchWithNoFrames);
      expect(result1.ok).toBe(false);
      if (!result1.ok) {
        expect(result1.error).toMatch(/at least one captured Side frame/);
      }

      const batchWithMissingAsset = updateRealCaptureSession(capturingBatch(), realFrames(3, 100, (i) => i === 1 ? undefined : `BAT-1:side:${i}`));
      const result2 = buildRealSideAnalysisInput(batchWithMissingAsset);
      expect(result2.ok).toBe(false);
      if (!result2.ok) {
        expect(result2.error).toMatch(/persisted asset reference/);
      }
    });

    it('rejects missing baseline or baseline referencing unknown frames', () => {
      const batch = updateRealCaptureSession(capturingBatch(), realFrames(4));
      const withNoBaseline = {
        ...batch,
        captureSession: {
          ...batch.captureSession!,
          realSideBaseline: undefined,
        },
      };
      const result1 = buildRealSideAnalysisInput(withNoBaseline);
      expect(result1.ok).toBe(false);
      if (!result1.ok) {
        expect(result1.error).toMatch(/persisted Side baseline selection is required/);
      }

      const withCorruptBaseline = {
        ...batch,
        captureSession: {
          ...batch.captureSession!,
          realSideBaseline: {
            selectionMethod: 'initial-window' as const,
            configuredWindowMs: 500,
            startElapsedMs: 0,
            endElapsedMs: 200,
            selectedAt: new Date().toISOString(),
            frames: [{ frameId: 'f-999', frameIndex: 999, elapsedMs: 999, assetId: 'unknown' }],
          },
        },
      };
      const result2 = buildRealSideAnalysisInput(withCorruptBaseline);
      expect(result2.ok).toBe(false);
      if (!result2.ok) {
        expect(result2.error).toMatch(/does not reference the persisted Side capture/);
      }
    });

    it('builds valid RealSideAnalysisInput with ordered frames, baseline, and default orientation', () => {
      const batch = updateRealCaptureSession(capturingBatch(), realFrames(4));
      const result = buildRealSideAnalysisInput(batch);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.input.batchId).toBe(batch.id);
        expect(result.input.captureMode).toBe('real');
        expect(result.input.frames).toHaveLength(4);
        expect(result.input.frames.map(f => f.frameIndex)).toEqual([0, 1, 2, 3]);
        expect(result.input.frames.map(f => f.elapsedMs)).toEqual([0, 100, 200, 300]);
        expect(result.input.baseline?.frames.map(f => f.frameIndex)).toEqual([0, 1, 2, 3]);
        expect(result.input.sideOrientation).toBe('nozzleLeft');
        expect(result.input.calibration).toBeNull();
      }
    });

    it('propagates sideOrientation and calibration from analysisDraft if present', () => {
      const batch = updateRealCaptureSession(capturingBatch(), realFrames(4));
      const withDraft = {
        ...batch,
        analysisDraft: {
          calibration: {
            side: createCalibrationSnapshot({
              camera: 'side',
              sideOrientation: 'nozzleRight' as const,
              referenceDistanceMm: 1200,
              anchorA: { x: 10, y: 10 },
              anchorB: { x: 100, y: 10 },
            }),
            front: createCalibrationSnapshot({
              camera: 'front',
              referenceDistanceMm: 500,
              anchorA: { x: 0, y: 0 },
              anchorB: { x: 50, y: 0 },
            }),
          },
          primaryCaptureMomentId: null,
          supportingCaptureMomentIds: [],
          sideCorrections: {},
          frontCorrections: {},
          updatedAt: new Date().toISOString(),
        },
      };

      const result = buildRealSideAnalysisInput(withDraft);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.input.sideOrientation).toBe('nozzleRight');
        expect(result.input.calibration?.sideOrientation).toBe('nozzleRight');
        expect(result.input.calibration?.referenceDistanceMm).toBe(1200);
      }
    });

    it('manages real Side primary and supporting capture selection', () => {
      let selected: SelectedCaptureMoment[] = [];

      const set1 = setPrimaryAnalysisCapture(selected, 'f-0', 'Operator', '2026-10-15T10:00:00Z');
      selected = set1.selected;
      expect(selected).toHaveLength(1);
      expect(selected[0]).toEqual({ captureFrameId: 'f-0', role: 'primary', selectedBy: 'Operator', selectedAt: '2026-10-15T10:00:00Z' });

      const supp1 = addSupportingAnalysisCapture(selected, 'f-1', 'Operator', '2026-10-15T10:00:01Z');
      selected = supp1.selected;
      expect(selected).toHaveLength(2);
      expect(selected[1]).toEqual({ captureFrameId: 'f-1', role: 'supporting', selectedBy: 'Operator', selectedAt: '2026-10-15T10:00:01Z' });

      // Demoting primary when a supporting becomes primary
      const set2 = setPrimaryAnalysisCapture(selected, 'f-1', 'Operator', '2026-10-15T10:00:02Z');
      selected = set2.selected;
      expect(selected).toHaveLength(2);
      expect(selected.find(s => s.captureFrameId === 'f-1')?.role).toBe('primary');
      expect(selected.find(s => s.captureFrameId === 'f-0')?.role).toBe('supporting');
    });

    it('preserves synchronized gating in generalized setPrimaryCapture / addSupportingCapture', () => {
      let selected: SelectedCaptureMoment[] = [];

      // Rejects partial moments
      const resPartial = setPrimaryCapture(selected, { id: 'm-partial', syncStatus: 'partial' }, 'Op', '2026-10-15T10:00:00Z');
      expect(resPartial.error).toBe('Only synchronized capture moments may be selected');
      expect(resPartial.selected).toHaveLength(0);

      // Rejects invalid moments
      const resInvalid = addSupportingCapture(selected, { id: 'm-invalid', syncStatus: 'invalid' }, 'Op', '2026-10-15T10:00:00Z');
      expect(resInvalid.error).toBe('Only synchronized capture moments may be selected');
      expect(resInvalid.selected).toHaveLength(0);

      // Accepts synced moments
      const resSynced = setPrimaryCapture(selected, { id: 'm-synced', syncStatus: 'synced' }, 'Op', '2026-10-15T10:00:00Z');
      expect(resSynced.error).toBeUndefined();
      expect(resSynced.selected).toHaveLength(1);

      // Accepts side-only moments without syncStatus property
      const resSide = addSupportingCapture(resSynced.selected, { id: 'f-side-0' }, 'Op', '2026-10-15T10:00:01Z');
      expect(resSide.error).toBeUndefined();
      expect(resSide.selected).toHaveLength(2);
    });
  });
});
