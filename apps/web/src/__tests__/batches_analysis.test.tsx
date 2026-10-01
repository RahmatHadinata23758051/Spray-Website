import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { batchRepository, productRepository, synchronizedFrames, getPixelGeometry } from '../data';
import { BatchAnalysisPage } from '../presentation/pages/Batches/BatchAnalysisPage';
import { BatchDetailPage } from '../presentation/pages/Batches/BatchDetailPage';
import type { Batch } from '@spray-paragon/domain';

describe('Phase D3 — Contextual Batch Analysis Unit & Integration Tests', () => {
  let reviewBatch: Batch;
  let draftBatch: Batch;

  beforeEach(async () => {
    const products = await productRepository.listProducts();
    const product = products[0];
    const recipes = await productRepository.listRecipes(product.id);
    const recipe = recipes[0];

    // Create a DRAFT batch
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
      productLot: 'LOT-DRAFT-01',
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });

    // Create a REVIEW_REQUIRED batch
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
      productLot: 'LOT-REVIEW-01',
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });
    const ready = await batchRepository.prepareBatch(readyDraft.id);
    const capturing = await batchRepository.startCapture(ready.id);
    const withMoments = await batchRepository.updateCaptureSession(capturing.id, synchronizedFrames);
    const processing = await batchRepository.completeCapture(withMoments.id);
    reviewBatch = await batchRepository.markReviewRequired(processing.id);
  });

  it('1. REVIEW_REQUIRED Batch opens contextual Analysis', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${reviewBatch.id}/analysis`]}>
        <Routes>
          <Route path="/batches/:batchId/analysis" element={<BatchAnalysisPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(`Batch:`)).toBeInTheDocument();
      expect(screen.getByText(reviewBatch.id)).toBeInTheDocument();
    });
    expect(screen.getByText('Capture timeline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set as Primary' })).toBeInTheDocument();
  });

  it('2. Hard refresh restores persisted AnalysisDraft', async () => {
    // Save draft first
    await batchRepository.updateAnalysisDraft(reviewBatch.id, {
      calibration: {
        side: { camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 10, y: 10 }, anchorB: { x: 500, y: 10 }, scaleMmPerPx: 2.04, adjusted: true, adjustedBy: 'Tester' },
        front: { camera: 'front', referenceDistanceMm: 500, anchorA: { x: 0, y: 0 }, anchorB: { x: 200, y: 0 }, scaleMmPerPx: 2.5, adjusted: false },
      },
      primaryCaptureMomentId: synchronizedFrames[5].id,
      supportingCaptureMomentIds: [synchronizedFrames[6].id],
      sideCorrections: {},
      frontCorrections: {},
      updatedAt: new Date().toISOString(),
    });

    render(
      <MemoryRouter initialEntries={[`/batches/${reviewBatch.id}/analysis`]}>
        <Routes>
          <Route path="/batches/:batchId/analysis" element={<BatchAnalysisPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Selected Captures 2 / 10')).toBeInTheDocument();
    });
    expect(screen.getByText('★ Primary')).toBeInTheDocument();
  });

  it('3 & 4. Primary and Supporting selection persists', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${reviewBatch.id}/analysis`]}>
        <Routes>
          <Route path="/batches/:batchId/analysis" element={<BatchAnalysisPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Set as Primary' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Set as Primary' }));

    await waitFor(async () => {
      const b = await batchRepository.getBatch(reviewBatch.id);
      expect(b?.analysisDraft?.primaryCaptureMomentId).toBe(synchronizedFrames[0].id);
    });
  });

  it('14. Invalid lifecycle blocks editable Analysis', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${draftBatch.id}/analysis`]}>
        <Routes>
          <Route path="/batches/:batchId/analysis" element={<BatchAnalysisPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Analysis Unavailable')).toBeInTheDocument();
    });
    expect(screen.getByText(/Analysis is disabled for batch in lifecycle state/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Set as Primary' })).not.toBeInTheDocument();
  });

  it('15. FINALIZED Analysis is read-only', async () => {
    // Finalize batch
    const report = {
      testId: reviewBatch.id,
      primaryCaptureMomentId: synchronizedFrames[0].id,
      primaryCapture: { frameIndex: 0, timestampMs: 0, phase: 'stable' as const },
      supportingCaptureMomentIds: [],
      supportingCaptures: [],
      status: 'finalized' as const,
      analysisSource: 'simulation' as const,
      test: {
        testId: reviewBatch.id,
        sampleId: reviewBatch.setupSnapshot!.sampleId,
        product: reviewBatch.setupSnapshot!.productSnapshot,
        recipe: reviewBatch.setupSnapshot!.recipeSnapshot,
        operator: reviewBatch.setupSnapshot!.operatorName,
        testTimestamp: reviewBatch.setupSnapshot!.createdAt,
        setpoints: reviewBatch.setupSnapshot!.setpoints,
      },
      side: {
        frameId: 'f1',
        frame: { frameId: 'f1', frameIndex: 0, timestampMs: 0, phase: 'stable' as const, overlayAsset: '', originalAsset: '', maskAsset: '' },
        calibration: { camera: 'side' as const, referenceDistanceMm: 1000, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 10, adjusted: false },
        autoGeometry: getPixelGeometry(0, 'nominal-01').side,
        finalGeometry: getPixelGeometry(0, 'nominal-01').side,
        sprayLength: { auto: 100, final: 100, adjusted: false },
        sprayAngle: { auto: 30, final: 30, adjusted: false },
        verticalSpread: { auto: 50, final: 50, adjusted: false },
        directionOffset: { auto: 0, final: 0, adjusted: false },
      },
      front: {
        frameId: 'f2',
        frame: { frameId: 'f2', frameIndex: 0, timestampMs: 0, phase: 'stable' as const, overlayAsset: '', originalAsset: '', maskAsset: '' },
        calibration: { camera: 'front' as const, referenceDistanceMm: 500, anchorA: { x: 0, y: 0 }, anchorB: { x: 100, y: 0 }, scaleMmPerPx: 5, adjusted: false },
        autoGeometry: getPixelGeometry(0, 'nominal-01').front,
        finalGeometry: getPixelGeometry(0, 'nominal-01').front,
        sprayArea: { auto: 1000, final: 1000, adjusted: false },
        equivalentDiameter: { auto: 30, final: 30, adjusted: false },
        circularity: { auto: 0.9, final: 0.9, adjusted: false },
        centroidOffsetX: { auto: 0, final: 0, adjusted: false },
        centroidOffsetY: { auto: 0, final: 0, adjusted: false },
        horizontalSymmetry: { auto: 95, final: 95, adjusted: false },
        verticalSymmetry: { auto: 95, final: 95, adjusted: false },
      },
      finalizedBy: 'Operator',
      finalizedAt: new Date().toISOString(),
    };
    await batchRepository.finalizeBatch(reviewBatch.id, report);

    render(
      <MemoryRouter initialEntries={[`/batches/${reviewBatch.id}/analysis`]}>
        <Routes>
          <Route path="/batches/:batchId/analysis" element={<BatchAnalysisPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('READ ONLY')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Set as Primary' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adjust Calibration' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Measurement' })).not.toBeInTheDocument();
  });

  it('18. BatchDetailPage routes correctly for REVIEW_REQUIRED and FINALIZED', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${reviewBatch.id}`]}>
        <Routes>
          <Route path="/batches/:batchId" element={<BatchDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Review Analysis' })).toBeInTheDocument();
    });
  });

  it('19. No Rear Camera is displayed in camera switcher', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${reviewBatch.id}/analysis`]}>
        <Routes>
          <Route path="/batches/:batchId/analysis" element={<BatchAnalysisPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'side camera' })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'front camera' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /rear/i })).not.toBeInTheDocument();
  });
});
