import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { batchRepository, productRepository, simulationService } from '../application/services';
import { BatchResultPage } from '../presentation/pages/Batches/BatchResultPage';
import { BatchDetailPage } from '../presentation/pages/Batches/BatchDetailPage';
import type { Batch, FinalAnalysisReport } from '@spray-paragon/domain';
import { 
  createBatchFinalAnalysisReport, 
  createSideMeasurements, 
  createFrontMeasurements,
  createCalibrationSnapshot,
} from '@spray-paragon/domain';
import { createFinalReportCsv } from '../application/reporting/createFinalReportCsv';

const synchronizedFrames = simulationService.getSynchronizedFrames();
const getPixelGeometry = simulationService.getPixelGeometry;

describe('Phase D4 — Contextual Batch Result Unit & Integration Tests', () => {
  let finalizedBatch: Batch;
  let reviewBatch: Batch;
  let draftBatch: Batch;
  let finalReport: FinalAnalysisReport;

  beforeEach(async () => {
    const products = await productRepository.listProducts();
    const product = products[0];
    const recipes = await productRepository.listRecipes(product.id);
    const recipe = recipes[0];

    // Create DRAFT batch
    draftBatch = await batchRepository.createBatchDraft({
      productId: product.id,
      productSnapshot: { productCode: product.productCode, productName: product.name },
      recipeId: recipe.id,
      recipeSnapshot: {
        name: recipe.name,
        forceSetpointN: recipe.forceSetpointN,
        pressDurationMs: recipe.pressDurationMs,
        strokeMm: recipe.strokeMm,
      },
      productLot: 'LOT-D4-DRAFT',
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });

    // Create REVIEW_REQUIRED batch
    const readyDraft = await batchRepository.createBatchDraft({
      productId: product.id,
      productSnapshot: { productCode: product.productCode, productName: product.name },
      recipeId: recipe.id,
      recipeSnapshot: {
        name: recipe.name,
        forceSetpointN: recipe.forceSetpointN,
        pressDurationMs: recipe.pressDurationMs,
        strokeMm: recipe.strokeMm,
      },
      productLot: 'LOT-D4-FINAL',
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });
    const ready = await batchRepository.prepareBatch(readyDraft.id);
    const capturing = await batchRepository.startCapture(ready.id);
    const withMoments = await batchRepository.updateCaptureSession(capturing.id, synchronizedFrames);
    const processing = await batchRepository.completeCapture(withMoments.id);
    reviewBatch = await batchRepository.markReviewRequired(processing.id);

    // Finalize batch with report
    const primaryMoment = synchronizedFrames[28];
    const supportingMoments = [synchronizedFrames[26]];
    const primaryGeometry = getPixelGeometry(primaryMoment.frameIndex, 'nominal-01');

    const sideMeasurements = createSideMeasurements({
      sprayLengthMm: 462,
      sprayAngleDeg: 18.4,
      maxVerticalSpreadMm: 148,
      directionOffsetDeg: 0.8,
    });
    // Mark one measurement as adjusted by operator
    sideMeasurements.sprayLength.auto = 450;
    sideMeasurements.sprayLength.final = 462;
    sideMeasurements.sprayLength.adjusted = true;
    sideMeasurements.sprayLength.adjustedBy = 'Operator Nadia';
    sideMeasurements.sprayLength.adjustedAt = new Date().toISOString();

    const frontMeasurements = createFrontMeasurements({
      sprayAreaMm2: 19240,
      equivalentDiameterMm: 156,
      circularity: 0.86,
      centroidOffsetXmm: 2.1,
      centroidOffsetYmm: -1.4,
      horizontalSymmetry: 0.94,
      verticalSymmetry: 0.91,
    });

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

    finalReport = createBatchFinalAnalysisReport({
      batch: reviewBatch,
      primaryCaptureMoment: primaryMoment,
      supportingCaptureMoments: supportingMoments,
      side: sideMeasurements,
      front: frontMeasurements,
      sideCalibration,
      frontCalibration,
      sideAutoGeometry: primaryGeometry.side,
      sideFinalGeometry: primaryGeometry.side,
      frontAutoGeometry: primaryGeometry.front,
      frontFinalGeometry: primaryGeometry.front,
      finalizedBy: 'Operator Nadia',
      finalizedAt: new Date().toISOString(),
    });

    finalizedBatch = await batchRepository.finalizeBatch(reviewBatch.id, finalReport);
  });

  it('1. FINALIZED Batch opens contextual Result and renders core hero information', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${finalizedBatch.id}/result`]}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Finalized')).toBeInTheDocument();
    });

    expect(screen.getAllByText(finalizedBatch.id).length).toBeGreaterThan(0);
    expect(screen.getByText('Fine Mist 100 mL')).toBeInTheDocument();
    expect(screen.getByText('LOT-D4-FINAL')).toBeInTheDocument();
    expect(screen.getByText('Operator Nadia')).toBeInTheDocument();
    expect(screen.getAllByText('#028 · 1400 ms').length).toBeGreaterThan(0);
  });

  it('2. Non-FINALIZED Batch cannot expose valid Result and displays warning', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${draftBatch.id}/result`]}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Result Unavailable \(DRAFT\)/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Side Camera Result/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to Batch Detail/i })).toBeInTheDocument();
  });

  it('3. Unknown Batch ID is handled safely without crashing', async () => {
    render(
      <MemoryRouter initialEntries={['/batches/BAT-NONEXISTENT/result']}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Batch Not Found/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/No batch found with ID "BAT-NONEXISTENT"/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to Batches/i })).toBeInTheDocument();
  });

  it('4. Data integrity error when FINALIZED batch is missing finalReport snapshot', async () => {
    // Corrupt batch in repository: status is FINALIZED but finalReport is undefined
    const corrupted = { ...finalizedBatch, finalReport: undefined };
    // @ts-expect-error test corruption scenario
    await batchRepository.saveMutated?.(corrupted);

    render(
      <MemoryRouter initialEntries={[`/batches/${finalizedBatch.id}/result`]}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Missing Final Report/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/marked as FINALIZED, but no immutable final analysis report/i)).toBeInTheDocument();
  });

  it('5 & 6. Result uses FinalAnalysisReport and does not depend on mutable AnalysisDraft', async () => {
    // Mutate draft state on the finalized batch
    const mutated = {
      ...finalizedBatch,
      analysisDraft: {
        ...finalizedBatch.analysisDraft!,
        primaryCaptureMomentId: 'mutated-moment-id',
        supportingCaptureMomentIds: [],
      },
    };
    // @ts-expect-error test draft mutation scenario
    await batchRepository.saveMutated?.(mutated);

    render(
      <MemoryRouter initialEntries={[`/batches/${finalizedBatch.id}/result`]}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Finalized')).toBeInTheDocument();
    });

    // Still renders primary capture from the immutable report, NOT from analysisDraft
    expect(screen.getAllByText('#028 · 1400 ms').length).toBeGreaterThan(0);
    expect(screen.getByText('1 of 9')).toBeInTheDocument();
  });

  it('7 & 16. Result does not call runtime getPixelGeometry reconstruction and uses stable frozen geometry', async () => {
    const getGeometrySpy = vi.spyOn(simulationService, 'getPixelGeometry');

    render(
      <MemoryRouter initialEntries={[`/batches/${finalizedBatch.id}/result`]}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Finalized')).toBeInTheDocument();
    });

    // Ensure we don't reconstruct geometry but use finalReport.side.finalGeometry
    expect(getGeometrySpy).not.toHaveBeenCalled();
    getGeometrySpy.mockRestore();
  });

  it('8 & 9. Primary and Supporting captures render correctly', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${finalizedBatch.id}/result`]}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Primary Capture Moment')).toBeInTheDocument();
    });

    // Primary overlay
    expect(screen.getByText('Side Camera Overlay')).toBeInTheDocument();
    expect(screen.getByText('Front Camera Overlay')).toBeInTheDocument();

    // Supporting capture section
    expect(screen.getByText('Supporting Captures')).toBeInTheDocument();
    expect(screen.getByText('#026 · 1300 ms')).toBeInTheDocument();
  });

  it('11 & 12. Side and Front final measurements render from immutable snapshot', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${finalizedBatch.id}/result`]}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Side Camera Result')).toBeInTheDocument();
    });

    expect(screen.getByText('Front Camera Result')).toBeInTheDocument();
    expect(screen.getByText('Spray Length')).toBeInTheDocument();
    expect(screen.getByText('Spray Angle')).toBeInTheDocument();
    expect(screen.getByText('Spray Area')).toBeInTheDocument();
    expect(screen.getByText('Equivalent Diameter')).toBeInTheDocument();
  });

  it('13. Automatic vs final measurements remain distinguishable when adjusted', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${finalizedBatch.id}/result`]}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Adjusted by Operator Nadia')).toBeInTheDocument();
    });

    // Displays comparison: Automatic <del>45.0 cm</del> and Final 46.2 cm
    expect(screen.getByText(/45\.0 cm/)).toBeInTheDocument();
    expect(screen.getByText(/Final 46\.2 cm/)).toBeInTheDocument();
  });

  it('14 & 15. Side and Front calibration summaries render read-only', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${finalizedBatch.id}/result`]}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Side calibration').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Front calibration').length).toBeGreaterThan(0);
    expect(screen.getByText('1000 mm reference')).toBeInTheDocument();
    expect(screen.getByText('500 mm reference')).toBeInTheDocument();
  });

  it('17. Result contains no edit, calibration, or correction interactive controls', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${finalizedBatch.id}/result`]}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Finalized')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /confirm final analysis/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /set as primary/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add supporting/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit calibration/i })).not.toBeInTheDocument();
  });

  it('18. BatchDetailPage FINALIZED action routes to canonical Result', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${finalizedBatch.id}`]}>
        <Routes>
          <Route path="/batches/:batchId" element={<BatchDetailPage />} />
          <Route path="/batches/:batchId/result" element={<div data-testid="canonical-result-route">Canonical Result Route</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Batch is finalized')).toBeInTheDocument();
    });

    const viewResultBtn = screen.getByRole('button', { name: 'View Result' });
    expect(viewResultBtn).toBeInTheDocument();
    fireEvent.click(viewResultBtn);

    await waitFor(() => {
      expect(screen.getByTestId('canonical-result-route')).toBeInTheDocument();
    });
  });

  it('19. createFinalReportCsv exports immutable final analysis report snapshot to CSV', () => {
    const csv = createFinalReportCsv(finalReport);
    expect(csv).toContain('test_id,sample_id,status');
    expect(csv).toContain(finalReport.test.testId);
    expect(csv).toContain(finalReport.test.sampleId);
    expect(csv).toContain('side_spray-length_final');
    expect(csv).toContain('462');
    expect(csv).toContain('side_spray-length_auto');
    expect(csv).toContain('450');
    expect(csv).toContain('side_spray-length_adjusted');
    expect(csv).toContain('true');
    expect(csv).toContain('front_spray-area_final');
    expect(csv).toContain('19240');
  });

  it('20. No Rear Camera regression in Result view', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${finalizedBatch.id}/result`]}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Finalized')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /rear/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/rear camera/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rear alignment/i)).not.toBeInTheDocument();
  });
});
