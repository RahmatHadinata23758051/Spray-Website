import { describe, it, expect, beforeEach } from 'vitest';
import {
  createKodePengujian,
  addSample,
  createTestRun,
  startTestRunCapture,
  updateTestRunAnalysisDraft,
  requestTestRunReview,
  finalizeTestRun,
  canFinalizeTestRun,
  adaptBatchToKodePengujian,
  getEffectiveSampleContext,
  resetIdCounters,
  DomainInvariantError,
} from '../kode-pengujian/index';
import {
  createBatchDraft,
  prepareBatch,
  startCapture,
  completeCapture,
  markReviewRequired,
  finalizeBatch,
} from '../batch/index';
import {
  createCalibrationSnapshot,
  createSideMeasurements,
  createFrontMeasurements,
  createFinalAnalysisReport,
} from '../analysis/index';
import type { CaptureSession, FinalAnalysisReport, FixtureScenario } from '../index';

describe('Kode Pengujian Domain Foundation (P1B)', () => {
  beforeEach(() => {
    resetIdCounters();
  });

  const dummyProduct = {
    productCode: 'PRD-MIST-01',
    productName: 'Hydra Mist 50ml',
  };

  const dummyRecipeA = {
    name: 'Standard Methodology A',
    forceSetpointN: 15,
    pressDurationMs: 400,
    strokeMm: 12,
  };

  const dummyRecipeB = {
    name: 'High-Force Methodology B',
    forceSetpointN: 25,
    pressDurationMs: 600,
    strokeMm: 14,
  };

  const dummySetpointsA = {
    forceSetpointN: 15,
    pressDurationMs: 400,
    strokeMm: 12,
  };

  const dummySetpointsB = {
    forceSetpointN: 25,
    pressDurationMs: 600,
    strokeMm: 14,
  };

  function createDummyReport(testId: string, sampleId: string): FinalAnalysisReport {
    const cal = createCalibrationSnapshot({
      camera: 'side',
      referenceDistanceMm: 100,
      anchorA: { x: 100, y: 100 },
      anchorB: { x: 200, y: 100 },
    });
    const sideGeom = {
      nozzleOriginPx: { x: 50, y: 150 },
      sprayEndpointPx: { x: 400, y: 150 },
      upperBoundaryPx: { x: 400, y: 80 },
      lowerBoundaryPx: { x: 400, y: 220 },
      verticalSpreadTopPx: { x: 250, y: 90 },
      verticalSpreadBottomPx: { x: 250, y: 210 },
      directionReferencePx: { x: 400, y: 150 },
    };
    const frontGeom = {
      contourPx: [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }, { x: 100, y: 200 }],
      sprayAreaPixels: 10000,
      centroidPx: { x: 150, y: 150 },
      referenceCenterPx: { x: 150, y: 150 },
      equivalentDiameterPx: 112.8,
      circularity: 0.88,
      horizontalSymmetry: 0.92,
      verticalSymmetry: 0.91,
    };
    const frameSnapshot = {
      frameId: 'f1',
      frameIndex: 12,
      timestampMs: 240,
      phase: 'stable' as const,
      overlayAsset: 'asset-overlay.png',
      originalAsset: 'asset-orig.png',
      maskAsset: 'asset-mask.png',
    };

    return {
      status: 'finalized',
      analysisSource: 'simulation',
      test: {
        testId,
        sampleId,
        product: dummyProduct,
        recipe: dummyRecipeA,
        operator: 'QC Lead',
        testTimestamp: '2026-10-20T10:00:00Z',
        setpoints: dummySetpointsA,
      },
      testId,
      primaryCaptureMomentId: 'm-1',
      supportingCaptureMomentIds: [],
      primaryCapture: { frameIndex: 12, timestampMs: 240, phase: 'stable' },
      side: {
        ...createSideMeasurements(sideGeom, cal),
        frameId: 'f1',
        frame: frameSnapshot,
        calibration: cal,
        autoGeometry: sideGeom,
        finalGeometry: sideGeom,
      },
      front: {
        ...createFrontMeasurements(frontGeom, cal),
        frameId: 'f1',
        frame: frameSnapshot,
        calibration: cal,
        autoGeometry: frontGeom,
        finalGeometry: frontGeom,
      },
      supportingCaptures: [],
      finalizedBy: 'QC Lead',
      finalizedAt: '2026-10-20T11:00:00Z',
    } as FinalAnalysisReport;
  }

  it('1. creates KodePengujian with initial DRAFT status and shared formula/context', () => {
    const kp = createKodePengujian({
      productId: 'p-hydra',
      productSnapshot: dummyProduct,
      productLot: 'LOT-2026-X1',
      testPeriod: 'Week 42 - Stability',
      operatorId: 'op-alpha',
      operatorName: 'Dr. Nata',
      calculationStandard: 'ISO-SPRAY-2026',
      notes: 'Initial lot release testing',
      defaultRecipeId: 'r-std',
      defaultRecipeSnapshot: dummyRecipeA,
    });

    expect(kp.id).toMatch(/^KP-\d{6}-\d{4}$/);
    expect(kp.status).toBe('DRAFT');
    expect(kp.productId).toBe('p-hydra');
    expect(kp.productSnapshot.productName).toBe('Hydra Mist 50ml');
    expect(kp.productLot).toBe('LOT-2026-X1');
    expect(kp.testPeriod).toBe('Week 42 - Stability');
    expect(kp.calculationStandard).toBe('ISO-SPRAY-2026');
    expect(kp.defaultRecipeId).toBe('r-std');
    expect(kp.samples).toHaveLength(0);
    expect(kp.testRuns).toHaveLength(0);
  });

  it('2. adds multiple Samples to a KodePengujian', () => {
    let kp = createKodePengujian({
      productId: 'p-hydra',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Operator',
    });

    kp = addSample(kp, { sampleCode: 'BOTTLE-001', storageCondition: 'Room Temp 25C', bottlePosition: 'Upright' });
    kp = addSample(kp, { sampleCode: 'BOTTLE-002', storageCondition: 'Chamber 40C', bottlePosition: 'Inverted' });
    kp = addSample(kp, { sampleCode: 'BOTTLE-003', storageCondition: 'Room Temp 25C', bottlePosition: 'Upright' });

    expect(kp.samples).toHaveLength(3);
    expect(kp.samples[0].sampleCode).toBe('BOTTLE-001');
    expect(kp.samples[0].positionInRun).toBe(1);
    expect(kp.samples[0].storageCondition).toBe('Room Temp 25C');
    expect(kp.samples[1].sampleCode).toBe('BOTTLE-002');
    expect(kp.samples[1].positionInRun).toBe(2);
    expect(kp.samples[1].storageCondition).toBe('Chamber 40C');
    expect(kp.samples[2].sampleCode).toBe('BOTTLE-003');
    expect(kp.samples[2].positionInRun).toBe(3);

    // Each sample is linked to the parent KodePengujian
    kp.samples.forEach(s => {
      expect(s.kodePengujianId).toBe(kp.id);
      expect(s.status).toBe('CREATED');
    });
  });

  it('3. creates TestRun for a specific Sample within the KodePengujian', () => {
    let kp = createKodePengujian({
      productId: 'p-hydra',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Operator',
    });

    kp = addSample(kp, { sampleCode: 'BOTTLE-01' });
    const sampleId = kp.samples[0].id;

    const { kp: updatedKp, testRun } = createTestRun(kp, {
      sampleId,
      recipeId: 'rec-std',
      recipeSnapshot: dummyRecipeA,
      setpoints: dummySetpointsA,
      fixture: 'nominal-01',
      operatorId: 'op-1',
      operatorName: 'Operator',
    });

    expect(updatedKp.testRuns).toHaveLength(1);
    expect(testRun.id).toMatch(/^TR-/);
    expect(testRun.kodePengujianId).toBe(kp.id);
    expect(testRun.sampleId).toBe(sampleId);
    expect(testRun.recipeSnapshot.name).toBe('Standard Methodology A');
    expect(testRun.status).toBe('PENDING');
    expect(testRun.repetitionIndex).toBe(1);
    expect(updatedKp.status).toBe('ACTIVE');
  });

  it('4. supports different methodologies / recipes across different TestRuns in the same KodePengujian', () => {
    let kp = createKodePengujian({
      productId: 'p-hydra',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Operator',
    });

    kp = addSample(kp, { sampleCode: 'BOTTLE-01' });
    kp = addSample(kp, { sampleCode: 'BOTTLE-02' });

    const sample1 = kp.samples[0].id;
    const sample2 = kp.samples[1].id;

    // TestRun 1 on Sample 1 uses Recipe A (15N, 400ms)
    const res1 = createTestRun(kp, {
      sampleId: sample1,
      recipeId: 'rec-A',
      recipeSnapshot: dummyRecipeA,
      setpoints: dummySetpointsA,
      fixture: 'nominal-01',
      operatorId: 'op-1',
      operatorName: 'Operator',
    });
    kp = res1.kp;

    // TestRun 2 on Sample 2 uses Recipe B (25N, 600ms)
    const res2 = createTestRun(kp, {
      sampleId: sample2,
      recipeId: 'rec-B',
      recipeSnapshot: dummyRecipeB,
      setpoints: dummySetpointsB,
      fixture: 'direction-offset-01',
      operatorId: 'op-2',
      operatorName: 'Operator 2',
    });
    kp = res2.kp;

    expect(kp.testRuns).toHaveLength(2);
    expect(kp.testRuns[0].recipeSnapshot.forceSetpointN).toBe(15);
    expect(kp.testRuns[0].fixture).toBe('nominal-01');
    expect(kp.testRuns[1].recipeSnapshot.forceSetpointN).toBe(25);
    expect(kp.testRuns[1].fixture).toBe('direction-offset-01');
  });

  it('5. rejects invalid cross-parent Sample/TestRun references', () => {
    const kpA = createKodePengujian({
      productId: 'prod-A',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Op',
    });
    const kpB = createKodePengujian({
      productId: 'prod-B',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Op',
    });

    const kpAWithSample = addSample(kpA, { sampleCode: 'BOTTLE-A' });
    const foreignSampleId = kpAWithSample.samples[0].id;

    // Attempting to create a TestRun in kpB with a sample from kpA must throw
    expect(() => {
      createTestRun(kpB, {
        sampleId: foreignSampleId,
        recipeId: 'rec-1',
        recipeSnapshot: dummyRecipeA,
        setpoints: dummySetpointsA,
        fixture: 'nominal-01',
        operatorId: 'op-1',
        operatorName: 'Op',
      });
    }).toThrow(DomainInvariantError);
  });

  it('6. ensures one TestRun result does not mutate or affect another TestRun', () => {
    let kp = createKodePengujian({
      productId: 'prod-1',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Op',
    });

    kp = addSample(kp, { sampleCode: 'BOTTLE-01' });
    const sampleId = kp.samples[0].id;

    // Create 2 test runs on the same sample
    const r1 = createTestRun(kp, {
      sampleId,
      recipeId: 'rec-A',
      recipeSnapshot: dummyRecipeA,
      setpoints: dummySetpointsA,
      fixture: 'nominal-01',
      operatorId: 'op-1',
      operatorName: 'Op',
    });
    kp = r1.kp;

    const r2 = createTestRun(kp, {
      sampleId,
      recipeId: 'rec-B',
      recipeSnapshot: dummyRecipeB,
      setpoints: dummySetpointsB,
      fixture: 'nominal-01',
      operatorId: 'op-1',
      operatorName: 'Op',
    });
    kp = r2.kp;

    const run1Id = r1.testRun.id;
    const run2Id = r2.testRun.id;

    const dummyCapture: CaptureSession = {
      scenario: 'nominal-01' as FixtureScenario,
      synchronizedMoments: [],
      startedAt: '2026-10-20T10:00:00Z',
    };

    // Progress Run 1 through full lifecycle to FINALIZED
    kp = startTestRunCapture(kp, run1Id, dummyCapture);
    const cal = createCalibrationSnapshot({
      camera: 'side',
      referenceDistanceMm: 100,
      anchorA: { x: 100, y: 100 },
      anchorB: { x: 200, y: 100 },
    });
    kp = updateTestRunAnalysisDraft(kp, run1Id, {
      calibration: {
        side: cal,
        front: cal,
      },
      primaryCaptureMomentId: 'm-1',
      supportingCaptureMomentIds: [],
      sideCorrections: {},
      frontCorrections: {},
      updatedAt: '2026-10-20T10:15:00Z',
    });
    kp = requestTestRunReview(kp, run1Id);

    const report1 = createDummyReport(run1Id, sampleId);
    kp = finalizeTestRun(kp, run1Id, report1);

    // Verify Run 1 is finalized
    const run1 = kp.testRuns.find(t => t.id === run1Id)!;
    expect(run1.status).toBe('FINALIZED');
    expect(run1.finalReport).toBeDefined();

    // Verify Run 2 is completely unaffected and still PENDING without report
    const run2 = kp.testRuns.find(t => t.id === run2Id)!;
    expect(run2.status).toBe('PENDING');
    expect(run2.captureSession).toBeUndefined();
    expect(run2.analysisDraft).toBeUndefined();
    expect(run2.finalReport).toBeUndefined();

    // Invariant: finalizing Run 1 a second time must throw (immutability)
    expect(() => finalizeTestRun(kp, run1Id, report1)).toThrow(DomainInvariantError);
  });

  it('7. legacy Batch adapter creates read-only 1 KP + 1 Sample + 1 TestRun view without mutating Batch', () => {
    // Create and advance a legacy Batch to ready and completed
    const draft = createBatchDraft({
      productId: 'p-legacy',
      productSnapshot: dummyProduct,
      recipeId: 'rec-legacy',
      recipeSnapshot: dummyRecipeA,
      operatorId: 'op-legacy',
      operatorName: 'Legacy Operator',
      fixture: 'nominal-01',
      productLot: 'LOT-LEGACY-99',
      storageCondition: 'Ambient',
      bottlePosition: 'Upright',
      testPeriod: 'Release',
      repetition: 2,
      notes: 'Legacy batch note',
    });

    const ready = prepareBatch(draft);
    const capturing = startCapture(ready, 'nominal-01');
    const captured = completeCapture(capturing);
    const reviewed = markReviewRequired(captured);

    const report = createDummyReport(ready.id, ready.setupSnapshot!.sampleId);
    const finalized = finalizeBatch(reviewed, report);

    // Adapt the finalized Batch
    const adapted = adaptBatchToKodePengujian(finalized);

    // 1. Validates KodePengujian view
    expect(adapted.kodePengujian.id).toBe(finalized.id.replace(/^BAT-/, 'KP-'));
    expect(adapted.kodePengujian.productId).toBe('p-legacy');
    expect(adapted.kodePengujian.productLot).toBe('LOT-LEGACY-99');
    expect(adapted.kodePengujian.status).toBe('CLOSED'); // FINALIZED maps to CLOSED
    expect(adapted.kodePengujian.samples).toHaveLength(1);
    expect(adapted.kodePengujian.testRuns).toHaveLength(1);

    // 2. Validates Sample view
    expect(adapted.sample.id).toBe(finalized.setupSnapshot!.sampleId);
    expect(adapted.sample.kodePengujianId).toBe(adapted.kodePengujian.id);
    expect(adapted.sample.status).toBe('TESTED');
    expect(adapted.sample.storageCondition).toBe('Ambient');
    expect(adapted.sample.positionInRun).toBe(2);

    // 3. Validates TestRun view
    expect(adapted.testRun.id).toBe(finalized.id);
    expect(adapted.testRun.kodePengujianId).toBe(adapted.kodePengujian.id);
    expect(adapted.testRun.sampleId).toBe(adapted.sample.id);
    expect(adapted.testRun.status).toBe('FINALIZED');
    expect(adapted.testRun.recipeSnapshot.name).toBe('Standard Methodology A');
    expect(adapted.testRun.finalReport).toBeDefined();

    // 4. Invariant: Objects are frozen (read-only guarantee)
    expect(Object.isFrozen(adapted.kodePengujian)).toBe(true);
    expect(Object.isFrozen(adapted.sample)).toBe(true);
    expect(Object.isFrozen(adapted.testRun)).toBe(true);

    // Original batch is not mutated
    expect(finalized.status).toBe('FINALIZED');
  });

  it('8. preserves flexible/optional uncertain fields at appropriate levels', () => {
    const kp = createKodePengujian({
      productId: 'p-1',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Op',
      // Uncertain fields optional at parent level
      storageCondition: 'Warehouse ambient',
      bottlePosition: 'Standing',
      calculationStandard: 'ISO-2026-CALC',
      metadata: { customAuditRef: 'AUD-77' },
    });

    expect(kp.storageCondition).toBe('Warehouse ambient');
    expect(kp.bottlePosition).toBe('Standing');
    expect(kp.calculationStandard).toBe('ISO-2026-CALC');
    expect(kp.metadata?.customAuditRef).toBe('AUD-77');

    // Sample inherits or overrides - parent values NOT copied into sample record
    const kpWithSample = addSample(kp, {
      sampleCode: 'SMP-OVERRIDE',
      storageCondition: 'Oven 50C', // Sample-level override
      metadata: { bottleWeightGrams: 42.5 },
    });

    const sample = kpWithSample.samples[0];
    expect(sample.storageCondition).toBe('Oven 50C'); // overridden
    expect(sample.bottlePosition).toBeUndefined(); // NOT copied from parent; use getEffectiveSampleContext
    expect(sample.metadata?.bottleWeightGrams).toBe(42.5);

    // Effective context resolver: sample value → parent default fallback
    const effective = getEffectiveSampleContext(sample, kpWithSample);
    expect(effective.storageCondition).toBe('Oven 50C');
    expect(effective.bottlePosition).toBe('Standing');
  });

  describe('Phase P3C — Result Ownership, Immutability & Finalization Readiness', () => {
    it('9. canFinalizeTestRun blocks non-existent run or wrong hierarchy', () => {
      const kp = createKodePengujian({
        productId: 'prod-1',
        productSnapshot: dummyProduct,
        operatorId: 'op-1',
        operatorName: 'Op',
      });
      const res = canFinalizeTestRun(kp, 'TR-DOES-NOT-EXIST');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reasons[0]).toContain('not found');
      }
    });

    it('10. canFinalizeTestRun blocks when capture session is missing', () => {
      let kp = createKodePengujian({
        productId: 'prod-1',
        productSnapshot: dummyProduct,
        operatorId: 'op-1',
        operatorName: 'Op',
      });
      kp = addSample(kp, { sampleCode: 'SMP-01' });
      const { kp: updatedKp, testRun } = createTestRun(kp, {
        sampleId: kp.samples[0].id,
        recipeId: 'rec-A',
        recipeSnapshot: dummyRecipeA,
        setpoints: dummySetpointsA,
        fixture: 'nominal-01',
        operatorId: 'op-1',
        operatorName: 'Op',
      });

      const res = canFinalizeTestRun(updatedKp, testRun.id);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reasons).toContain('Capture session is missing.');
      }
    });

    it('11. canFinalizeTestRun blocks when analysis draft or primary capture is missing', () => {
      let kp = createKodePengujian({
        productId: 'prod-1',
        productSnapshot: dummyProduct,
        operatorId: 'op-1',
        operatorName: 'Op',
      });
      kp = addSample(kp, { sampleCode: 'SMP-01' });
      const { kp: kpWithRun, testRun } = createTestRun(kp, {
        sampleId: kp.samples[0].id,
        recipeId: 'rec-A',
        recipeSnapshot: dummyRecipeA,
        setpoints: dummySetpointsA,
        fixture: 'nominal-01',
        operatorId: 'op-1',
        operatorName: 'Op',
      });

      const dummyCapture: CaptureSession = {
        scenario: 'nominal-01' as FixtureScenario,
        synchronizedMoments: [],
        startedAt: '2026-10-20T10:00:00Z',
      };
      const kpWithCapture = startTestRunCapture(kpWithRun, testRun.id, dummyCapture);

      // Missing analysis draft
      const resNoDraft = canFinalizeTestRun(kpWithCapture, testRun.id);
      expect(resNoDraft.ok).toBe(false);
      if (!resNoDraft.ok) {
        expect(resNoDraft.reasons[0]).toContain('Analysis draft is missing');
      }

      // Draft exists but no primary capture selected
      const cal = createCalibrationSnapshot({
        camera: 'side',
        referenceDistanceMm: 100,
        anchorA: { x: 100, y: 100 },
        anchorB: { x: 200, y: 100 },
      });
      const kpWithDraft = updateTestRunAnalysisDraft(kpWithCapture, testRun.id, {
        calibration: { side: cal, front: cal },
        primaryCaptureMomentId: null,
        supportingCaptureMomentIds: [],
        sideCorrections: {},
        frontCorrections: {},
        updatedAt: '2026-10-20T10:15:00Z',
      });
      const resNoPrimary = canFinalizeTestRun(kpWithDraft, testRun.id);
      expect(resNoPrimary.ok).toBe(false);
      if (!resNoPrimary.ok) {
        expect(resNoPrimary.reasons[0]).toContain('Primary capture moment not selected');
      }
    });

    it('12. canFinalizeTestRun blocks real capture without CV measurements', () => {
      let kp = createKodePengujian({
        productId: 'prod-1',
        productSnapshot: dummyProduct,
        operatorId: 'op-1',
        operatorName: 'Op',
      });
      kp = addSample(kp, { sampleCode: 'SMP-01' });
      const { kp: kpWithRun, testRun } = createTestRun(kp, {
        sampleId: kp.samples[0].id,
        recipeId: 'rec-A',
        recipeSnapshot: dummyRecipeA,
        setpoints: dummySetpointsA,
        fixture: 'nominal-01',
        operatorId: 'op-1',
        operatorName: 'Op',
      });

      const realCapture: CaptureSession = {
        captureMode: 'real',
        realSideFrames: [
          {
            id: 'real-f1',
            assetKey: 'kp:1:sample:1:run:1:side:0',
            camera: 'side',
            frameIndex: 0,
            elapsedMs: 0,
            capturedAt: '2026-10-20T10:00:00Z',
          },
          {
            id: 'real-f2',
            assetKey: 'kp:1:sample:1:run:1:side:1',
            camera: 'side',
            frameIndex: 1,
            elapsedMs: 33,
            capturedAt: '2026-10-20T10:00:01Z',
          },
        ],
        realSideBaseline: {
          frameId: 'real-f1',
          frameIndex: 0,
          elapsedMs: 0,
          selectedAt: '2026-10-20T10:00:02Z',
          source: 'auto',
        },
        startedAt: '2026-10-20T10:00:00Z',
        completedAt: '2026-10-20T10:00:05Z',
      };

      const kpWithCapture = startTestRunCapture(kpWithRun, testRun.id, realCapture);
      const cal = createCalibrationSnapshot({
        camera: 'side',
        referenceDistanceMm: 100,
        anchorA: { x: 100, y: 100 },
        anchorB: { x: 200, y: 100 },
      });
      const kpWithDraft = updateTestRunAnalysisDraft(kpWithCapture, testRun.id, {
        calibration: { side: cal, front: cal },
        primaryCaptureMomentId: 'real-f2',
        supportingCaptureMomentIds: [],
        sideCorrections: {
          'real-f2': {
            nozzleOriginPx: { x: 50, y: 150 },
            sprayEndpointPx: { x: 400, y: 150 },
            upperBoundaryPx: { x: 400, y: 80 },
            lowerBoundaryPx: { x: 400, y: 220 },
            verticalSpreadTopPx: { x: 250, y: 90 },
            verticalSpreadBottomPx: { x: 250, y: 210 },
            directionReferencePx: { x: 400, y: 150 },
          },
        },
        frontCorrections: {},
        updatedAt: '2026-10-20T10:15:00Z',
      });

      const res = canFinalizeTestRun(kpWithDraft, testRun.id);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.reasons.some(r => r.includes('Side CV analysis pipeline not integrated'))).toBe(true);
      }
    });

    it('13. Sample becomes TESTED only after actual FINALIZED run, and KP does not auto-close', () => {
      let kp = createKodePengujian({
        productId: 'prod-1',
        productSnapshot: dummyProduct,
        operatorId: 'op-1',
        operatorName: 'Op',
      });
      kp = addSample(kp, { sampleCode: 'SMP-01' });
      const sampleId = kp.samples[0].id;
      expect(kp.samples[0].status).toBe('CREATED');
      expect(kp.status).toBe('DRAFT');

      const { kp: kpWithRun, testRun } = createTestRun(kp, {
        sampleId,
        recipeId: 'rec-A',
        recipeSnapshot: dummyRecipeA,
        setpoints: dummySetpointsA,
        fixture: 'nominal-01',
        operatorId: 'op-1',
        operatorName: 'Op',
      });
      expect(kpWithRun.status).toBe('ACTIVE');
      expect(kpWithRun.samples[0].status).toBe('CREATED'); // Still CREATED

      const dummyCapture: CaptureSession = {
        scenario: 'nominal-01' as FixtureScenario,
        synchronizedMoments: [],
        startedAt: '2026-10-20T10:00:00Z',
      };
      let currentKp = startTestRunCapture(kpWithRun, testRun.id, dummyCapture);
      expect(currentKp.samples[0].status).toBe('CREATED'); // Still CREATED during capture

      const cal = createCalibrationSnapshot({
        camera: 'side',
        referenceDistanceMm: 100,
        anchorA: { x: 100, y: 100 },
        anchorB: { x: 200, y: 100 },
      });
      currentKp = updateTestRunAnalysisDraft(currentKp, testRun.id, {
        calibration: { side: cal, front: cal },
        primaryCaptureMomentId: 'm-1',
        supportingCaptureMomentIds: [],
        sideCorrections: {},
        frontCorrections: {},
        updatedAt: '2026-10-20T10:15:00Z',
      });
      expect(currentKp.samples[0].status).toBe('CREATED'); // Still CREATED during analysis

      currentKp = requestTestRunReview(currentKp, testRun.id);
      expect(currentKp.samples[0].status).toBe('CREATED'); // Still CREATED during review

      // Finalize the TestRun
      const report = createDummyReport(testRun.id, sampleId);
      currentKp = finalizeTestRun(currentKp, testRun.id, report);

      // Now sample is TESTED
      const finalizedSample = currentKp.samples.find(s => s.id === sampleId)!;
      expect(finalizedSample.status).toBe('TESTED');

      // KP itself must NOT auto-close; stays ACTIVE
      expect(currentKp.status).toBe('ACTIVE');

      // Finalized TestRun result is immutable
      expect(() => finalizeTestRun(currentKp, testRun.id, report)).toThrow(DomainInvariantError);
    });

    describe('Phase P3D — Side-Only Capability Awareness', () => {
      it('14. canFinalizeTestRun allows Side-only readiness when Side evidence exists and no Front capture', () => {
        let kp = createKodePengujian({
          productId: 'prod-1',
          productSnapshot: dummyProduct,
          operatorId: 'op-1',
          operatorName: 'Op',
        });
        kp = addSample(kp, { sampleCode: 'SMP-01' });
        const { kp: kpWithRun, testRun } = createTestRun(kp, {
          sampleId: kp.samples[0].id,
          recipeId: 'rec-A',
          recipeSnapshot: dummyRecipeA,
          setpoints: dummySetpointsA,
          fixture: 'nominal-01',
          operatorId: 'op-1',
          operatorName: 'Op',
        });

        // Real capture: Side-only (no Front camera)
        const realCapture: CaptureSession = {
          captureMode: 'real',
          realSideFrames: [
            {
              id: 'real-f1',
              assetKey: 'kp:1:sample:1:run:1:side:0',
              camera: 'side',
              frameIndex: 0,
              elapsedMs: 0,
              capturedAt: '2026-10-20T10:00:00Z',
            },
            {
              id: 'real-f2',
              assetKey: 'kp:1:sample:1:run:1:side:1',
              camera: 'side',
              frameIndex: 1,
              elapsedMs: 33,
              capturedAt: '2026-10-20T10:00:01Z',
            },
          ],
          realSideBaseline: {
            frameId: 'real-f1',
            frameIndex: 0,
            elapsedMs: 0,
            selectedAt: '2026-10-20T10:00:02Z',
            source: 'auto',
          },
          startedAt: '2026-10-20T10:00:00Z',
          completedAt: '2026-10-20T10:00:05Z',
        };

        const kpWithCapture = startTestRunCapture(kpWithRun, testRun.id, realCapture);
        const cal = createCalibrationSnapshot({
          camera: 'side',
          referenceDistanceMm: 100,
          anchorA: { x: 100, y: 100 },
          anchorB: { x: 200, y: 100 },
        });
        // Side corrections exist for primary capture = Side evidence available
        const kpWithDraft = updateTestRunAnalysisDraft(kpWithCapture, testRun.id, {
          calibration: { side: cal, front: cal },
          primaryCaptureMomentId: 'real-f2',
          supportingCaptureMomentIds: [],
          sideCorrections: {
            'real-f2': {
              nozzleOriginPx: { x: 50, y: 150 },
              sprayEndpointPx: { x: 400, y: 150 },
              upperBoundaryPx: { x: 400, y: 80 },
              lowerBoundaryPx: { x: 400, y: 220 },
              verticalSpreadTopPx: { x: 250, y: 90 },
              verticalSpreadBottomPx: { x: 250, y: 210 },
              directionReferencePx: { x: 400, y: 150 },
            },
          },
          frontCorrections: {},
          updatedAt: '2026-10-20T10:15:00Z',
        });

        const res = canFinalizeTestRun(kpWithDraft, testRun.id);
        // Should NOT be blocked by missing Front - blocked only by CV pipeline
        expect(res.ok).toBe(false);
        if (!res.ok) {
          // Blocked by CV, not by missing Front
          expect(res.reasons.some(r => r.includes('Side CV analysis pipeline not integrated'))).toBe(true);
          expect(res.reasons.some(r => r.includes('Front'))).toBe(false);
        }
      });

      it('15. canFinalizeTestRun blocks Side-only real capture when Side evidence is missing', () => {
        let kp = createKodePengujian({
          productId: 'prod-1',
          productSnapshot: dummyProduct,
          operatorId: 'op-1',
          operatorName: 'Op',
        });
        kp = addSample(kp, { sampleCode: 'SMP-01' });
        const { kp: kpWithRun, testRun } = createTestRun(kp, {
          sampleId: kp.samples[0].id,
          recipeId: 'rec-A',
          recipeSnapshot: dummyRecipeA,
          setpoints: dummySetpointsA,
          fixture: 'nominal-01',
          operatorId: 'op-1',
          operatorName: 'Op',
        });

        const realCapture: CaptureSession = {
          captureMode: 'real',
          realSideFrames: [
            {
              id: 'real-f1',
              assetKey: 'kp:1:sample:1:run:1:side:0',
              camera: 'side',
              frameIndex: 0,
              elapsedMs: 0,
              capturedAt: '2026-10-20T10:00:00Z',
            },
          ],
          realSideBaseline: {
            frameId: 'real-f1',
            frameIndex: 0,
            elapsedMs: 0,
            selectedAt: '2026-10-20T10:00:02Z',
            source: 'auto',
          },
          startedAt: '2026-10-20T10:00:00Z',
          completedAt: '2026-10-20T10:00:05Z',
        };

        const kpWithCapture = startTestRunCapture(kpWithRun, testRun.id, realCapture);
        const cal = createCalibrationSnapshot({
          camera: 'side',
          referenceDistanceMm: 100,
          anchorA: { x: 100, y: 100 },
          anchorB: { x: 200, y: 100 },
        });
        // No sideCorrections = no Side evidence
        const kpWithDraft = updateTestRunAnalysisDraft(kpWithCapture, testRun.id, {
          calibration: { side: cal, front: cal },
          primaryCaptureMomentId: 'real-f1',
          supportingCaptureMomentIds: [],
          sideCorrections: {},
          frontCorrections: {},
          updatedAt: '2026-10-20T10:15:00Z',
        });

        const res = canFinalizeTestRun(kpWithDraft, testRun.id);
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.reasons.some(r => r.includes('Side analysis evidence missing'))).toBe(true);
        }
      });

      it('16. Simulation capture with dual cameras still requires both Side and Front evidence', () => {
        let kp = createKodePengujian({
          productId: 'prod-1',
          productSnapshot: dummyProduct,
          operatorId: 'op-1',
          operatorName: 'Op',
        });
        kp = addSample(kp, { sampleCode: 'SMP-01' });
        const { kp: kpWithRun, testRun } = createTestRun(kp, {
          sampleId: kp.samples[0].id,
          recipeId: 'rec-A',
          recipeSnapshot: dummyRecipeA,
          setpoints: dummySetpointsA,
          fixture: 'nominal-01',
          operatorId: 'op-1',
          operatorName: 'Op',
        });

        const dummyCapture: CaptureSession = {
          scenario: 'nominal-01' as FixtureScenario,
          synchronizedMoments: [
            { id: 'm-1', frameIndex: 10, timestampMs: 200, phase: 'stable', side: { id: 'm-1-side' }, front: { id: 'm-1-front' } },
          ],
          startedAt: '2026-10-20T10:00:00Z',
        };

        const kpWithCapture = startTestRunCapture(kpWithRun, testRun.id, dummyCapture);
        const cal = createCalibrationSnapshot({
          camera: 'side',
          referenceDistanceMm: 100,
          anchorA: { x: 100, y: 100 },
          anchorB: { x: 200, y: 100 },
        });
        // Only Side corrections, no Front corrections
        const kpWithDraft = updateTestRunAnalysisDraft(kpWithCapture, testRun.id, {
          calibration: { side: cal, front: cal },
          primaryCaptureMomentId: 'm-1',
          supportingCaptureMomentIds: [],
          sideCorrections: {
            'm-1': {
              nozzleOriginPx: { x: 50, y: 150 },
              sprayEndpointPx: { x: 400, y: 150 },
              upperBoundaryPx: { x: 400, y: 80 },
              lowerBoundaryPx: { x: 400, y: 220 },
              verticalSpreadTopPx: { x: 250, y: 90 },
              verticalSpreadBottomPx: { x: 250, y: 210 },
              directionReferencePx: { x: 400, y: 150 },
            },
          },
          frontCorrections: {},
          updatedAt: '2026-10-20T10:15:00Z',
        });

        const res = canFinalizeTestRun(kpWithDraft, testRun.id);
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.reasons.some(r => r.includes('Front analysis evidence missing'))).toBe(true);
        }
      });

      it('17. FinalAnalysisReport schema supports Side-only perspective', () => {
        const cal = createCalibrationSnapshot({
          camera: 'side',
          referenceDistanceMm: 100,
          anchorA: { x: 100, y: 100 },
          anchorB: { x: 200, y: 100 },
        });
        const sideGeom = {
          nozzleOriginPx: { x: 50, y: 150 },
          sprayEndpointPx: { x: 400, y: 150 },
          upperBoundaryPx: { x: 400, y: 80 },
          lowerBoundaryPx: { x: 400, y: 220 },
          verticalSpreadTopPx: { x: 250, y: 90 },
          verticalSpreadBottomPx: { x: 250, y: 210 },
          directionReferencePx: { x: 400, y: 150 },
        };
        const sideFinal = createSideMeasurements({
          sprayLengthMm: 350,
          sprayAngleDeg: 0,
          maxVerticalSpreadMm: 140,
          directionOffsetDeg: 0,
          spreadPositionMm: 0,
        });

        // Create a Side-only FinalAnalysisReport (no Front)
        const report = createFinalAnalysisReport({
          test: {
            id: 'TR-TEST',
            sampleId: 'SMP-TEST',
            productId: 'p-1',
            productName: 'Test Product',
            config: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
            operatorName: 'Test Op',
            createdAt: '2026-10-20T10:00:00Z',
            productSnapshot: dummyProduct,
            recipeSnapshot: dummyRecipeA,
          },
          primaryCaptureMoment: { id: 'm-1', frameIndex: 12, timestampMs: 240, phase: 'stable', side: { id: 'f1', assets: { overlay: 'overlay.png', original: 'original.png', mask: 'mask.png' } }, syncStatus: 'synced' },
          supportingCaptureMoments: [],
          side: sideFinal,
          sideCalibration: cal,
          sideAutoGeometry: sideGeom,
          sideFinalGeometry: sideGeom,
          finalizedBy: 'Test Op',
          finalizedAt: '2026-10-20T11:00:00Z',
        });

        expect(report.perspectives).toEqual(['side']);
        expect(report.side).toBeDefined();
        expect(report.front).toBeUndefined();
        expect(report.analysisSource).toBe('simulation');
      });
    });
  });
});
