import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { batchRepository, productRepository, simulationService } from '../application/services';
import { ReportsPage } from '../presentation/pages/Reports/ReportsPage';
import { createFinalReportCsv } from '../application/reporting/createFinalReportCsv';
import type { Batch } from '@spray-paragon/domain';
import { 
  createBatchFinalAnalysisReport, 
  createSideMeasurements, 
  createFrontMeasurements,
  createCalibrationSnapshot,
} from '@spray-paragon/domain';

const synchronizedFrames = simulationService.getSynchronizedFrames();
const getPixelGeometry = simulationService.getPixelGeometry;

describe('Reports Page - Global Repository of Finalized Reports', () => {
  let finalizedBatch: Batch;
  let draftBatch: Batch;
  let readyBatch: Batch;

  beforeEach(async () => {
    // Clear repository and seed mock data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (batchRepository as any).seed([], true);
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
      productLot: 'LOT-DRAFT',
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });

    // Create READY batch (not finalized)
    readyBatch = await batchRepository.createBatchDraft({
      productId: product.id,
      productSnapshot: { productCode: product.productCode, productName: product.name },
      recipeId: recipe.id,
      recipeSnapshot: {
        name: recipe.name,
        forceSetpointN: recipe.forceSetpointN,
        pressDurationMs: recipe.pressDurationMs,
        strokeMm: recipe.strokeMm,
      },
      productLot: 'LOT-READY',
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });
    readyBatch = await batchRepository.prepareBatch(readyBatch.id);

    // Create FINALIZED batch
    let reviewBatch = await batchRepository.createBatchDraft({
      productId: product.id,
      productSnapshot: { productCode: product.productCode, productName: product.name },
      recipeId: recipe.id,
      recipeSnapshot: {
        name: recipe.name,
        forceSetpointN: recipe.forceSetpointN,
        pressDurationMs: recipe.pressDurationMs,
        strokeMm: recipe.strokeMm,
      },
      productLot: 'LOT-FINAL',
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });
    reviewBatch = await batchRepository.prepareBatch(reviewBatch.id);
    reviewBatch = await batchRepository.startCapture(reviewBatch.id);
    reviewBatch = await batchRepository.updateCaptureSession(reviewBatch.id, synchronizedFrames);
    reviewBatch = await batchRepository.completeCapture(reviewBatch.id);
    reviewBatch = await batchRepository.markReviewRequired(reviewBatch.id);

    const primaryMoment = synchronizedFrames[28];
    const primaryGeometry = getPixelGeometry(primaryMoment.frameIndex, 'nominal-01');

    const sideMeasurements = createSideMeasurements({
      sprayLengthMm: 462,
      sprayAngleDeg: 18.4,
      maxVerticalSpreadMm: 148,
      directionOffsetDeg: 0.8,
    });
    sideMeasurements.sprayLength.auto = 450;
    sideMeasurements.sprayLength.adjusted = true;
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

    const finalReport = createBatchFinalAnalysisReport({
      batch: reviewBatch,
      primaryCaptureMoment: primaryMoment,
      supportingCaptureMoments: [],
      side: sideMeasurements,
      front: frontMeasurements,
      sideCalibration,
      frontCalibration,
      sideAutoGeometry: primaryGeometry.side,
      sideFinalGeometry: primaryGeometry.side,
      frontAutoGeometry: primaryGeometry.front,
      frontFinalGeometry: primaryGeometry.front,
      finalizedBy: 'Nadia Putri',
      finalizedAt: new Date().toISOString(),
    });

    finalizedBatch = await batchRepository.finalizeBatch(reviewBatch.id, finalReport);
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    );
  };

  it('1. Reports lists only FINALIZED Batches', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('1 Laporan')).toBeInTheDocument();
    });
    expect(screen.getByText(finalizedBatch.id)).toBeInTheDocument();
  });

  it('2. non-finalized Batch does not appear', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('1 Laporan')).toBeInTheDocument();
    });
    expect(screen.queryByText(draftBatch.id)).not.toBeInTheDocument();
    expect(screen.queryByText(readyBatch.id)).not.toBeInTheDocument();
  });

  it('3. Batch without FinalAnalysisReport does not appear', async () => {
    // Manually push a finalized batch without a report
    const badBatch = { ...finalizedBatch, id: 'BAT-BAD', finalReport: undefined };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (batchRepository as any).seed([...(await batchRepository.listBatches()), badBatch], true);
    
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('1 Laporan')).toBeInTheDocument();
    });
    expect(screen.queryByText('BAT-BAD')).not.toBeInTheDocument();
  });

  it('4. search by Batch ID', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(finalizedBatch.id)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Cari ID, Produk, Sampel, Operator/i);
    fireEvent.change(input, { target: { value: 'BAT-NONE' } });

    await waitFor(() => {
      expect(screen.getByText('Tidak ada laporan yang sesuai dengan filter.')).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: finalizedBatch.id } });
    await waitFor(() => {
      expect(screen.getByText(finalizedBatch.id)).toBeInTheDocument();
    });
  });

  it('5. search by Product', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(finalizedBatch.id)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Cari ID, Produk, Sampel, Operator/i);
    fireEvent.change(input, { target: { value: 'TidakAdaProdukIni' } });

    await waitFor(() => {
      expect(screen.getByText('Tidak ada laporan yang sesuai dengan filter.')).toBeInTheDocument();
    });

    fireEvent.change(input, { target: { value: finalizedBatch.finalReport!.test.product.productName } });
    await waitFor(() => {
      expect(screen.getByText(finalizedBatch.id)).toBeInTheDocument();
    });
  });

  it('6. empty finalized repository state', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (batchRepository as any).seed([], true);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Tidak ada laporan yang telah difinalisasi.')).toBeInTheDocument();
    });
  });

  it('7. Buka Hasil renders canonical Result link and CSV button exists', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Buka Hasil' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Ekspor CSV' })).toBeInTheDocument();
    });
  });

  describe('CSV Export Format & Escaping', () => {
    it('generates Excel-compatible CSV with UTF-8 BOM, CRLF, and proper escaping', () => {
      // We will mutate the finalizedBatch's finalReport for testing tricky strings
      const trickyReport = {
        ...finalizedBatch.finalReport!,
        test: {
          ...finalizedBatch.finalReport!.test,
          // Contains comma, quote, and newline
          sampleId: 'SMP,WITH"QUOTES"\r\nAND NEWLINES',
        }
      };

      const csv = createFinalReportCsv(trickyReport);

      // 1. generated CSV uses intended delimiter strategy & Excel compatibility marker/BOM
      expect(csv.startsWith('\uFEFFsep=,\r\n')).toBe(true);

      // 2. CRLF rows
      expect(csv).toContain('\r\n');
      expect(csv).not.toContain('\n"'); // unless preceded by \r

      // 3. Proper escaping of quotes and commas and newlines
      // The sample_id field should be quoted and internal quotes escaped as ""
      expect(csv).toContain('"SMP,WITH""QUOTES""\r\nAND NEWLINES"');

      // 4. automatic, final, adjusted flags exist
      expect(csv).toContain('side_spray-length_auto');
      expect(csv).toContain('side_spray-length_final');
      expect(csv).toContain('side_spray-length_adjusted');
      expect(csv).toContain('462');
      expect(csv).toContain('450');
      expect(csv).toContain('true');

      // 5. Side + Front data exist
      expect(csv).toContain('front_spray-area_auto');
      expect(csv).toContain('front_spray-area_final');

      // 6. primary capture metadata
      expect(csv).toContain('primary_capture_id');
      expect(csv).toContain(trickyReport.primaryCaptureMomentId);
    });
  });
});
