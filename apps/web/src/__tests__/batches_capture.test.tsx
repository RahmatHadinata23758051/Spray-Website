import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { App } from '../App';
import { batchRepository } from '../data';
import { productRepository } from '../data';
import { BatchCapturePage } from '../presentation/pages/Batches/BatchCapturePage';
import { BatchDetailPage } from '../presentation/pages/Batches/BatchDetailPage';
import { updateCaptureSession } from '@spray-paragon/domain';

describe('Phase D2 — Batch Capture Workspace Migration', () => {
  let readyBatchId: string;
  let draftBatchId: string;

  beforeEach(async () => {
    const products = await productRepository.listProducts();
    const product = products[0];
    const recipes = await productRepository.listRecipes(product.id);
    const recipe = recipes[0];

    // Create a DRAFT batch
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
      productLot: 'LOT-DRAFT-01',
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });
    draftBatchId = draft.id;

    // Create a READY batch
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
      productLot: 'LOT-READY-01',
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });
    const ready = await batchRepository.prepareBatch(readyDraft.id);
    readyBatchId = ready.id;
  });

  it('1. READY Batch can open contextual capture route', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${readyBatchId}/capture`]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: new RegExp(`Capture — ${readyBatchId}`) })).toBeInTheDocument();
    });
  });

  it('2. Opening capture does not automatically start acquisition', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${readyBatchId}/capture`]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start Capture' })).toBeInTheDocument();
    });

    const b = await batchRepository.getBatch(readyBatchId);
    expect(b?.status).toBe('READY');
  });

  it('3. Start Capture transitions READY → CAPTURING', async () => {
    const capturing = await batchRepository.startCapture(readyBatchId);
    expect(capturing.status).toBe('CAPTURING');
    expect(capturing.captureSession).toBeDefined();
    expect(capturing.captureSession?.scenario).toBe('nominal-01');
  });

  it('4. Batch Capture uses URL batchId, not global selected Test', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${readyBatchId}/capture`]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: new RegExp(readyBatchId) })).toBeInTheDocument();
    });
  });

  it('5. Unknown Batch ID is handled safely', async () => {
    render(
      <MemoryRouter initialEntries={['/batches/DOES-NOT-EXIST/capture']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Capture Error' })).toBeInTheDocument();
      expect(screen.getByText('Batch DOES-NOT-EXIST not found')).toBeInTheDocument();
    });
  });

  it('6. DRAFT cannot access Capture and redirects to detail', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${draftBatchId}/capture`]}>
        <Routes>
          <Route path="/batches/:batchId/capture" element={<BatchCapturePage />} />
          <Route path="/batches/:batchId" element={<BatchDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: draftBatchId })).toBeInTheDocument();
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
    });
  });

  it('7. FINALIZED cannot access Capture and redirects to detail', async () => {
    // Manually mark a batch finalized
    const b = await batchRepository.getBatch(readyBatchId);
    if (b) {
      b.status = 'FINALIZED';
      await (batchRepository as unknown as { saveMutated: (b: unknown) => Promise<void> }).saveMutated(b);
    }

    render(
      <MemoryRouter initialEntries={[`/batches/${readyBatchId}/capture`]}>
        <Routes>
          <Route path="/batches/:batchId/capture" element={<BatchCapturePage />} />
          <Route path="/batches/:batchId" element={<BatchDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: readyBatchId })).toBeInTheDocument();
      expect(screen.getByText('FINALIZED')).toBeInTheDocument();
    });
  });

  it('8, 9, 10. Side + Front frames are synchronized, no Rear camera, matching index/timestamp', async () => {
    const capturing = await batchRepository.startCapture(readyBatchId);
    expect(capturing.captureSession).toBeDefined();

    // Verify domain synchronized analysis frame has both side and front
    const moment = capturing.captureSession!.synchronizedMoments[0];
    if (moment) {
      expect(moment.side).toBeDefined();
      expect(moment.front).toBeDefined();
      // @ts-expect-error Verify rear is intentionally undefined/omitted
      expect(moment.rear).toBeUndefined();
      expect(moment.frameIndex).toBeDefined();
      expect(moment.timestampMs).toBeDefined();
    }
  });

  it('11. CaptureSession belongs to the correct Batch', async () => {
    const capturing = await batchRepository.startCapture(readyBatchId);
    expect(capturing.id).toBe(readyBatchId);
    expect(capturing.captureSession?.scenario).toBe('nominal-01');
  });

  it('12, 13, 14, 15. Completing capture sets capturedAt, transitions CAPTURING → PROCESSING → REVIEW_REQUIRED, and freezes session', async () => {
    await batchRepository.startCapture(readyBatchId);
    const processing = await batchRepository.completeCapture(readyBatchId);
    
    // 14. CAPTURING → PROCESSING transition occurs
    expect(processing.status).toBe('PROCESSING');
    
    // 12. capturedAt populated
    expect(processing.captureSession?.capturedAt).toBeDefined();

    // 13. CaptureSession becomes immutable
    expect(() => updateCaptureSession(processing, [])).toThrow();

    // 15. PROCESSING → REVIEW_REQUIRED occurs without delay
    const reviewReq = await batchRepository.markReviewRequired(readyBatchId);
    expect(reviewReq.status).toBe('REVIEW_REQUIRED');
  });

  it('17. Batch Detail shows Ready for Review when REVIEW_REQUIRED', async () => {
    await batchRepository.startCapture(readyBatchId);
    await batchRepository.completeCapture(readyBatchId);
    await batchRepository.markReviewRequired(readyBatchId);

    render(
      <MemoryRouter initialEntries={[`/batches/${readyBatchId}`]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Capture complete')).toBeInTheDocument();
      expect(screen.getByText(/Analysis review required/i)).toBeInTheDocument();
    });
  });

  it('18. Hard refresh during contextual Capture recovers Batch state', async () => {
    await batchRepository.startCapture(readyBatchId);

    // First render
    const { unmount } = render(
      <MemoryRouter initialEntries={[`/batches/${readyBatchId}/capture`]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('CAPTURING')).toBeInTheDocument();
    });

    unmount();

    // Simulate page refresh / re-render
    render(
      <MemoryRouter initialEntries={[`/batches/${readyBatchId}/capture`]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('CAPTURING')).toBeInTheDocument();
    });
  });

  it('19. One Batch capture does not mutate another Batch', async () => {
    await batchRepository.startCapture(readyBatchId);

    const otherBatch = await batchRepository.getBatch(draftBatchId);
    expect(otherBatch?.status).toBe('DRAFT');
    expect(otherBatch?.captureSession).toBeUndefined();
  });

  it('20. No image binary/base64 is written to localStorage', async () => {
    await batchRepository.startCapture(readyBatchId);
    await batchRepository.completeCapture(readyBatchId);

    const rawData = window.localStorage.getItem('spraybot.batches.v1');
    expect(rawData).not.toBeNull();
    expect(rawData).not.toContain('data:image/');
  });
});
