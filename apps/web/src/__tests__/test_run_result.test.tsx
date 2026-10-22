import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { kodePengujianRepository, productRepository, simulationService } from '../application/services';
import type { KodePengujian, TestRun, Sample, FinalAnalysisReport } from '@spray-paragon/domain';
import { createCalibrationSnapshot, createSideMeasurements, createFrontMeasurements } from '@spray-paragon/domain';

describe('Phase P3C — TestRun Result Ownership & Finalization', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  const dummyProduct = { productCode: 'PRD-MIST', productName: 'Hydra Mist' };
  const dummyRecipe = { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 };
  const dummySetpoints = { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 };

  function createDummyFinalReport(testId: string, sampleId: string): FinalAnalysisReport {
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

    const sideFinal = createSideMeasurements({
      sprayLengthMm: 350,
      sprayAngleDeg: 0,
      maxVerticalSpreadMm: 140,
      directionOffsetDeg: 0,
      spreadPositionMm: 0,
    });
    const frontFinal = createFrontMeasurements({
      sprayAreaMm2: 10000,
      equivalentDiameterMm: 112.8,
      circularity: 0.88,
      centroidOffsetXmm: 0,
      centroidOffsetYmm: 0,
      horizontalSymmetry: 0.92,
      verticalSymmetry: 0.91,
    });

    return {
      status: 'finalized',
      analysisSource: 'simulation',
      perspectives: ['side', 'front'],
      test: {
        testId,
        sampleId,
        product: dummyProduct,
        recipe: dummyRecipe,
        operator: 'QC Lead',
        testTimestamp: '2026-10-20T10:00:00Z',
        setpoints: dummySetpoints,
      },
      testId,
      primaryCaptureMomentId: 'm-1',
      supportingCaptureMomentIds: [],
      primaryCapture: { frameIndex: 12, timestampMs: 240, phase: 'stable' },
      side: {
        ...sideFinal,
        frameId: 'f1',
        frame: frameSnapshot,
        calibration: cal,
        autoGeometry: sideGeom,
        finalGeometry: sideGeom,
      },
      front: {
        ...frontFinal,
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

  async function createTestSetup(): Promise<{ kp: KodePengujian; sample: Sample; testRun: TestRun }> {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: dummyProduct,
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-A' });
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: dummyRecipe,
      setpoints: dummySetpoints,
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    return { kp, sample, testRun };
  }

  async function progressToFinalized(
    testRunId: string,
    kpId: string,
    sampleId: string
  ): Promise<KodePengujian> {
    const dummyCapture = {
      scenario: 'nominal-01' as const,
      synchronizedMoments: [],
      startedAt: '2026-10-20T10:00:00Z',
    };

    // Start capture
    await kodePengujianRepository.updateTestRun(kpId, testRunId, {
      captureSession: dummyCapture,
      status: 'CAPTURING',
      startedAt: new Date().toISOString(),
    });

    // Update analysis draft
    const cal = createCalibrationSnapshot({
      camera: 'side',
      referenceDistanceMm: 100,
      anchorA: { x: 100, y: 100 },
      anchorB: { x: 200, y: 100 },
    });
    await kodePengujianRepository.updateTestRun(kpId, testRunId, {
      analysisDraft: {
        calibration: { side: cal, front: cal },
        primaryCaptureMomentId: 'm-1',
        supportingCaptureMomentIds: [],
        sideCorrections: {},
        frontCorrections: {},
        updatedAt: new Date().toISOString(),
      },
      status: 'ANALYZING',
    });

    // Request review
    await kodePengujianRepository.updateTestRun(kpId, testRunId, {
      status: 'REVIEW_REQUIRED',
    });

    // Finalize
    const report = createDummyFinalReport(testRunId, sampleId);
    await kodePengujianRepository.updateTestRun(kpId, testRunId, {
      finalReport: report,
      status: 'FINALIZED',
      completedAt: new Date().toISOString(),
    });

    const finalizedKp = await kodePengujianRepository.get(kpId);
    if (!finalizedKp) throw new Error('KP not found');
    return finalizedKp;
  }

  it('1. FINALIZED TestRun result route renders immutable report using frozen snapshots', async () => {
    const { kp, sample, testRun } = await createTestSetup();
    const finalizedKp = await progressToFinalized(testRun.id, kp.id, sample.id);

    const finalizedTestRun = finalizedKp.testRuns.find(t => t.id === testRun.id)!;
    expect(finalizedTestRun.finalReport).toBeDefined();

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/result`]}>
        <App />
      </MemoryRouter>
    );

    // Wait for result page to load
    await waitFor(() => {
      expect(screen.getByText('Hasil Pengujian')).toBeInTheDocument();
    });

    // Should show the frozen report
    expect(screen.getByText(testRun.id)).toBeInTheDocument();
    expect(screen.getAllByText(dummyRecipe.name).length).toBeGreaterThan(0);
    expect(screen.getByText('Finalized')).toBeInTheDocument();
    expect(screen.getByText('QC Lead')).toBeInTheDocument();

    // Kode Pengujian identity
    expect(screen.getAllByText(kp.id).length).toBeGreaterThan(0);
    // Sample identity
    expect(screen.getAllByText(sample.sampleCode || sample.id).length).toBeGreaterThan(0);

    // Download CSV button exists
    expect(screen.getByRole('button', { name: /Unduh CSV/i })).toBeInTheDocument();
  });

  it('2. Non-finalized TestRun shows "Hasil belum tersedia" with current status/reason', async () => {
    const { kp, sample, testRun } = await createTestSetup();
    // Do NOT finalize - keep as PENDING

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/result`]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hasil Pengujian Belum Tersedia')).toBeInTheDocument();
    });

    expect(screen.getByText(/Hasil Belum Tersedia.*PENDING/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kembali ke Kode Pengujian/i })).toBeInTheDocument();
  });

  it('3. ANALYZING TestRun shows "Buka Ruang Kerja Analisis" action', async () => {
    const { kp, sample, testRun } = await createTestSetup();

    const dummyCapture = {
      scenario: 'nominal-01' as const,
      synchronizedMoments: [],
      startedAt: '2026-10-20T10:00:00Z',
    };

    await kodePengujianRepository.updateTestRun(kp.id, testRun.id, {
      captureSession: dummyCapture,
      status: 'CAPTURING',
      startedAt: new Date().toISOString(),
    });

    const cal = createCalibrationSnapshot({
      camera: 'side',
      referenceDistanceMm: 100,
      anchorA: { x: 100, y: 100 },
      anchorB: { x: 200, y: 100 },
    });
    await kodePengujianRepository.updateTestRun(kp.id, testRun.id, {
      analysisDraft: {
        calibration: { side: cal, front: cal },
        primaryCaptureMomentId: 'm-1',
        supportingCaptureMomentIds: [],
        sideCorrections: {},
        frontCorrections: {},
        updatedAt: new Date().toISOString(),
      },
      status: 'ANALYZING',
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/result`]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hasil Pengujian Belum Tersedia')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Buka Ruang Kerja Analisis/i })).toBeInTheDocument();
  });

  it('4. Result route validates KP → Sample → TestRun hierarchy', async () => {
    const { kp, sample, testRun } = await createTestSetup();
    await progressToFinalized(testRun.id, kp.id, sample.id);

    // Wrong sample ID
    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/WRONG-SAMPLE/runs/${testRun.id}/result`]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hasil Pengujian Tidak Tersedia')).toBeInTheDocument();
    });

    expect(screen.getByText(/Sampel WRONG-SAMPLE tidak ditemukan/i)).toBeInTheDocument();
  });

  it('5. Sample status becomes TESTED only after actual FINALIZED run', async () => {
    const { kp, sample, testRun } = await createTestSetup();

    // Before finalization
    expect(sample.status).toBe('CREATED');

    // Progress to FINALIZED
    const finalizedKp = await progressToFinalized(testRun.id, kp.id, sample.id);
    const finalizedSample = finalizedKp.samples.find(s => s.id === sample.id)!;
    expect(finalizedSample.status).toBe('TESTED');
  });

  it('6. One finalized TestRun does not alter another TestRun result', async () => {
    const { kp, sample, testRun } = await createTestSetup();

    // Create second TestRun on same sample
    const { testRun: testRun2 } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-2',
      recipeSnapshot: { name: 'Alt Method', forceSetpointN: 25, pressDurationMs: 500, strokeMm: 14 },
      setpoints: { forceSetpointN: 25, pressDurationMs: 500, strokeMm: 14 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    // Finalize first run
    const finalizedKp = await progressToFinalized(testRun.id, kp.id, sample.id);
    const run1Finalized = finalizedKp.testRuns.find(t => t.id === testRun.id)!;
    const run2Pending = finalizedKp.testRuns.find(t => t.id === testRun2.id)!;

    expect(run1Finalized.status).toBe('FINALIZED');
    expect(run1Finalized.finalReport).toBeDefined();
    expect(run2Pending.status).toBe('PENDING');
    expect(run2Pending.finalReport).toBeUndefined();
  });

  it('7. KP does not auto-close when one TestRun finalizes', async () => {
    const { kp, sample, testRun } = await createTestSetup();
    expect(kp.status).toBe('DRAFT');

    const finalizedKp = await progressToFinalized(testRun.id, kp.id, sample.id);
    expect(finalizedKp.status).toBe('ACTIVE'); // Not CLOSED
  });

  it('8. Legacy Batch result route still works (regression)', async () => {
    // Create a legacy batch and finalize it
    const { batchRepository } = await import('../application/services');
    const products = await productRepository.listProducts();
    const product = products[0];
    const recipes = await productRepository.listRecipes(product.id);
    const recipe = recipes[0];

    const draft = await batchRepository.createBatchDraft({
      productId: product.id,
      productSnapshot: { productCode: product.productCode, productName: product.name },
      recipeId: recipe.id,
      recipeSnapshot: {
        name: recipe.name,
        forceSetpointN: recipe.forceSetpointN,
        pressDurationMs: recipe.pressDurationMs,
        strokeMm: recipe.strokeMm,
      },
      productLot: 'LOT-LEGACY',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
      fixture: 'nominal-01',
    });

    const ready = await batchRepository.prepareBatch(draft.id);
    const capturing = await batchRepository.startCapture(ready.id);
    const synchronizedFrames = simulationService.getSynchronizedFrames();
    const withMoments = await batchRepository.updateCaptureSession(capturing.id, synchronizedFrames);
    const processing = await batchRepository.completeCapture(withMoments.id);
    const reviewed = await batchRepository.markReviewRequired(processing.id);

    const primaryMoment = synchronizedFrames[28];
    const primaryGeometry = simulationService.getPixelGeometry(primaryMoment.frameIndex, 'nominal-01');

    const sideCalibration = createCalibrationSnapshot({
      camera: 'side',
      referenceDistanceMm: 1000,
      anchorA: { x: 112, y: 296 },
      anchorB: { x: 634, y: 296 },
    });
    const frontCalibration = createCalibrationSnapshot({
      camera: 'front',
      referenceDistanceMm: 500,
      anchorA: { x: 265, y: 85 },
      anchorB: { x: 465, y: 85 },
    });

    const sideMeasurements = createSideMeasurements({
      sprayLengthMm: 462,
      sprayAngleDeg: 18.4,
      maxVerticalSpreadMm: 148,
      directionOffsetDeg: 0.8,
    });
    const frontMeasurements = createFrontMeasurements({
      sprayAreaMm2: 19240,
      equivalentDiameterMm: 156,
      circularity: 0.86,
      centroidOffsetXmm: 2.1,
      centroidOffsetYmm: -1.4,
      horizontalSymmetry: 0.94,
      verticalSymmetry: 0.91,
    });

    const { createBatchFinalAnalysisReport } = await import('@spray-paragon/domain');
    const batchReport = createBatchFinalAnalysisReport({
      batch: reviewed,
      primaryCaptureMoment: primaryMoment,
      supportingCaptureMoments: [synchronizedFrames[26]],
      side: sideMeasurements,
      front: frontMeasurements,
      sideCalibration,
      frontCalibration,
      sideAutoGeometry: primaryGeometry.side,
      sideFinalGeometry: primaryGeometry.side,
      frontAutoGeometry: primaryGeometry.front,
      frontFinalGeometry: primaryGeometry.front,
      finalizedBy: 'QC Lead',
      finalizedAt: new Date().toISOString(),
    });

    const finalized = await batchRepository.finalizeBatch(reviewed.id, batchReport);

    // Now test the legacy result route
    render(
      <MemoryRouter initialEntries={[`/batches/${finalized.id}/result`]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Hasil Kamera Samping')).toBeInTheDocument();
    });

    expect(screen.getByText('Hasil Kamera Depan')).toBeInTheDocument();
  });
});