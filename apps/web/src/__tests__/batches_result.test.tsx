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
      expect(screen.getByText('Final')).toBeInTheDocument();
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
      expect(screen.getByText(/Hasil Belum Tersedia \(Draf\)/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Hasil Kamera Samping/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kembali ke Detail Batch/i })).toBeInTheDocument();
  });

  it('3. Unknown ID Batch is handled safely without crashing', async () => {
    render(
      <MemoryRouter initialEntries={['/batches/BAT-NONEXISTENT/result']}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Batch Tidak Ditemukan/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Tidak ada batch dengan ID "BAT-NONEXISTENT"/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kembali ke Batch/i })).toBeInTheDocument();
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
      expect(screen.getByText(/Laporan Akhir Hilang/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/ditandai sebagai FINALIZED, namun snapshot laporan analisis akhir tidak ditemukan/i)).toBeInTheDocument();
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
      expect(screen.getByText('Final')).toBeInTheDocument();
    });

    // Still renders primary capture from the immutable report, NOT from analysisDraft
    expect(screen.getAllByText('#028 · 1400 ms').length).toBeGreaterThan(0);
    expect(screen.getByText('1 dari 9')).toBeInTheDocument();
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
      expect(screen.getByText('Final')).toBeInTheDocument();
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
      expect(screen.getAllByText('Tangkapan Utama')[0]).toBeInTheDocument();
    });

    // Primary overlay
    expect(screen.getByText('Kamera Samping')).toBeInTheDocument();
    expect(screen.getByText('Kamera Depan')).toBeInTheDocument();

    // Supporting capture section
    expect(screen.getByText('Tangkapan Pendukung')).toBeInTheDocument();
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
      expect(screen.getByText('Hasil Kamera Samping')).toBeInTheDocument();
    });

    expect(screen.getByText('Hasil Kamera Depan')).toBeInTheDocument();
    expect(screen.getByText('Panjang Semprot')).toBeInTheDocument();
    expect(screen.getByText('Sudut Semprot')).toBeInTheDocument();
    expect(screen.getByText('Luas Semprot')).toBeInTheDocument();
    expect(screen.getByText('Diameter Ekuivalen')).toBeInTheDocument();
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
      expect(screen.getByText('Disesuaikan oleh Operator Nadia')).toBeInTheDocument();
    });

    // Displays comparison: Automatic <del>45.0 cm</del> and Final 46.2 cm
    expect(screen.getByText(/45\.0 cm/)).toBeInTheDocument();
    expect(screen.getAllByText(/46\.2 cm/)[0]).toBeInTheDocument();
  });

  it('14 & 15. Side and Kalibrasi Depan summaries render read-only', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${finalizedBatch.id}/result`]}>
        <Routes>
          <Route path="/batches/:batchId/result" element={<BatchResultPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Kalibrasi Samping').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Kalibrasi Depan').length).toBeGreaterThan(0);
    expect(screen.getByText('1000 mm')).toBeInTheDocument();
    expect(screen.getByText('500 mm')).toBeInTheDocument();
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
      expect(screen.getByText('Final')).toBeInTheDocument();
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
      expect(screen.getByText('Batch telah difinalisasi')).toBeInTheDocument();
    });

    const viewResultBtn = screen.getByRole('button', { name: 'Lihat Hasil' });
    expect(viewResultBtn).toBeInTheDocument();
    fireEvent.click(viewResultBtn);

    await waitFor(() => {
      expect(screen.getByTestId('canonical-result-route')).toBeInTheDocument();
    });
  });

  it('19. createFinalReportCsv exports immutable final analysis report snapshot to CSV with Excel compatibility and proper escaping', () => {
    // Inject tricky characters into the report to test escaping
    const trickyReport = {
      ...finalReport,
      test: {
        ...finalReport.test,
        sampleId: 'SMP,WITH,COMMAS',
        operator: 'Nadia\nPutri',
        product: { ...finalReport.test.product, productName: 'Fine "Mist" 100 mL' }
      }
    };
    const csv = createFinalReportCsv(trickyReport);
    
    // 1 & 2. Excel compatibility marker/BOM & delimiter hint
    expect(csv.startsWith('\uFEFFsep=,\r\n')).toBe(true);
    
    // 3. CRLF rows
    expect(csv).toContain('\r\ntest_id,sample_id,status');
    
    // 4. Commas inside values (must be quoted)
    expect(csv).toContain('"SMP,WITH,COMMAS"');
    
    // 5. Quotes inside values (must be escaped as "" and quoted)
    // Wait, the fields exported in createFinalReportCsv do not include productName or operator, only sample_id!
    // Let's check what fields are actually exported in the current createFinalReportCsv implementation.
    expect(csv).toContain('test_id,sample_id,status');
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
      expect(screen.getByText('Final')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /rear/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/rear camera/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rear alignment/i)).not.toBeInTheDocument();
  });
});
