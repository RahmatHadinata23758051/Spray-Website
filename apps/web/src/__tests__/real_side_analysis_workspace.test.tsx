import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Batch } from '@spray-paragon/domain';
import { batchRepository, productRepository } from '../data';
import { captureAssetStore } from '../application/services';
import { BatchAnalysisPage } from '../presentation/pages/Batches/BatchAnalysisPage';

describe('Phase 6 — Real Side-only Analysis Workspace', () => {
  let realBatch: Batch;
  const frameCount = 4;
  const frameIntervalMs = 100;

  beforeEach(async () => {
    window.localStorage.clear();

    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: vi.fn((blob: Blob) => `blob:stub-${blob.size}`),
      });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: vi.fn(),
      });
    }

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
      productLot: 'LOT-REAL-SIDE-01',
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });

    const prepared = await batchRepository.prepareBatch(draft.id);
    const capturing = await batchRepository.startCapture(prepared.id);

    const frames = Array.from({ length: frameCount }, (_, index) => ({
      id: `f-${index}`,
      frameIndex: index,
      camera: 'side' as const,
      capturedAt: new Date(Date.UTC(2026, 9, 15, 10, 0, 0, index * frameIntervalMs)).toISOString(),
      elapsedMs: index * frameIntervalMs,
      assetId: `${capturing.id}:side:${String(index).padStart(3, '0')}`,
    }));

    // Seed binary assets into IndexedDb store
    for (const frame of frames) {
      await captureAssetStore.save(
        frame.assetId,
        capturing.id,
        new Blob([`jpeg-frame-bytes-${frame.frameIndex}`], { type: 'image/jpeg' }),
      );
    }

    // Persist real capture session with automatic initial baseline
    realBatch = await batchRepository.updateRealCaptureSession!(capturing.id, frames);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the Side-only workspace with real frame index, elapsedMs, and baseline indicators', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${realBatch.id}/analysis`]}>
        <Routes>
          <Route path="/batches/:batchId/analysis" element={<BatchAnalysisPage />} />
          <Route path="/batches/:batchId" element={<div>Detail Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // Wait until the workspace finishes preparing assets (longer timeout under full-suite load)
    const frame0 = await screen.findByTestId('real-timeline-frame-0', undefined, { timeout: 10000 });

    expect(screen.getByText(`Batch: ${realBatch.id}`)).toBeInTheDocument();

    // Explicit Side-only mode badge
    expect(screen.getByText('SAMPING SAJA')).toBeInTheDocument();

    // Side timeline header with actual elapsed time and frame count
    expect(screen.getByText('Linimasa akuisisi Samping')).toBeInTheDocument();
    expect(screen.getAllByText(/4 frame Samping nyata/).length).toBeGreaterThan(0);

    // Verify timeline frames have actual elapsed times in aria-label, not phase names
    expect(frame0).toHaveAttribute('aria-label', expect.stringContaining('0 milidetik'));
    expect(frame0).toHaveAttribute('aria-label', expect.stringContaining('Baseline'));
    expect(frame0).toHaveClass('timeline-stable'); // Baseline style indicator

    // Real timeline does NOT use automated phase classes
    expect(frame0).not.toHaveClass('phase-buildup');
    expect(frame0).not.toHaveClass('phase-decay');

    // Click another frame in the timeline
    const frame2 = screen.getByTestId('real-timeline-frame-2');
    expect(frame2).toHaveAttribute('aria-label', expect.stringContaining('200 milidetik'));
    fireEvent.click(frame2);

    // Header updates to selected frame
    await waitFor(() => {
      expect(screen.getAllByText('200 ms').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('marks Front camera explicitly unavailable without fabricated front frames', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${realBatch.id}/analysis`]}>
        <Routes>
          <Route path="/batches/:batchId/analysis" element={<BatchAnalysisPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('real-timeline-frame-0', undefined, { timeout: 10000 });

    // Switch to Front camera tab
    const frontBtn = screen.getByRole('button', { name: /kamera depan/i });
    fireEvent.click(frontBtn);

    // Front unavailable message is shown
    const unavailableAlert = screen.getByTestId('front-unavailable');
    expect(unavailableAlert).toBeInTheDocument();
    expect(screen.getByText('Kamera Depan tidak tersedia')).toBeInTheDocument();
    expect(screen.getByText(/Tidak ada frame Depan yang dibuat/)).toBeInTheDocument();

    // Inspector section also specifies front camera was not captured
    expect(screen.getByText(/Tidak ditangkap pada sesi ini/)).toBeInTheDocument();
  });

  it('marks Mask and Overlay views as analysis result not available', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${realBatch.id}/analysis`]}>
        <Routes>
          <Route path="/batches/:batchId/analysis" element={<BatchAnalysisPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('real-timeline-frame-0', undefined, { timeout: 10000 });

    // Switch to Mask view
    const maskBtn = screen.getByRole('button', { name: 'Mask' });
    fireEvent.click(maskBtn);

    const maskUnavailable = screen.getByTestId('analysis-result-unavailable');
    expect(maskUnavailable).toBeInTheDocument();
    expect(screen.getByText('Hasil analisis belum tersedia')).toBeInTheDocument();
    expect(screen.getByText(/Mode Mask menunggu integrasi pipeline CV Samping/)).toBeInTheDocument();

    // Switch to Overlay view
    const overlayBtn = screen.getByRole('button', { name: 'Overlay' });
    fireEvent.click(overlayBtn);

    const overlayUnavailable = screen.getByTestId('analysis-result-unavailable');
    expect(overlayUnavailable).toBeInTheDocument();
    expect(screen.getByText(/Mode Overlay menunggu integrasi pipeline CV Samping/)).toBeInTheDocument();
  });

  it('supports in-memory primary and supporting capture selection', async () => {
    render(
      <MemoryRouter initialEntries={[`/batches/${realBatch.id}/analysis`]}>
        <Routes>
          <Route path="/batches/:batchId/analysis" element={<BatchAnalysisPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByTestId('real-timeline-frame-0', undefined, { timeout: 10000 });

    // Current frame is 0: set as primary
    const primaryBtn = screen.getByRole('button', { name: 'Jadikan Utama' });
    fireEvent.click(primaryBtn);

    expect(screen.getByText('Tangkapan Utama')).toBeInTheDocument();
    expect(screen.getByText('★ Utama')).toBeInTheDocument();
    expect(screen.getByText(/Tangkapan #000 · 0 ms/)).toBeInTheDocument();

    // Select frame 1 in timeline
    const frame1 = screen.getByTestId('real-timeline-frame-1');
    fireEvent.click(frame1);

    // Add frame 1 as supporting
    const suppBtn = screen.getByRole('button', { name: 'Tambah Pendukung' });
    fireEvent.click(suppBtn);

    expect(screen.getByText('Tangkapan Pendukung')).toBeInTheDocument();
    expect(screen.getByText(/Tangkapan #001 · 100 ms/)).toBeInTheDocument();
    expect(screen.getByText('Tangkapan Dipilih 2 / 10')).toBeInTheDocument();

    // Remove supporting capture
    const removeBtn = screen.getByRole('button', { name: /Hapus Tangkapan Pendukung 1/ });
    fireEvent.click(removeBtn);

    expect(screen.getByText('Tangkapan Dipilih 1 / 10')).toBeInTheDocument();
    expect(screen.queryByText(/Tangkapan #001 · 100 ms/)).not.toBeInTheDocument();
  });

  it('blocks analysis and presents missing asset IDs when a required frame is missing from store', async () => {
    // Delete one of the persisted frame assets
    await captureAssetStore.delete(`${realBatch.id}:side:002`);

    render(
      <MemoryRouter initialEntries={[`/batches/${realBatch.id}/analysis`]}>
        <Routes>
          <Route path="/batches/:batchId/analysis" element={<BatchAnalysisPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(screen.getByText('Persiapan analisis diblokir')).toBeInTheDocument();
    const missingElements = screen.getAllByText(new RegExp(`${realBatch.id}:side:002`));
    expect(missingElements.length).toBeGreaterThan(0);
  });
});
