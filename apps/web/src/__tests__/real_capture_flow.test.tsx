import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { batchRepository } from '../data';
import { productRepository } from '../data';
import { BatchCapturePage } from '../presentation/pages/Batches/BatchCapturePage';

function makeVideoStream() {
  const stop = vi.fn();
  const stream = {
    getTracks: () => [{ stop }],
  } as unknown as MediaStream;
  return { stream, stop };
}

describe('Phase 3 — Real Side capture flow', () => {
  let readyBatchId: string;

  beforeEach(async () => {
    window.localStorage.clear();
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
      productLot: 'LOT-REAL-01',
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });
    const ready = await batchRepository.prepareBatch(draft.id);
    readyBatchId = ready.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('captures an ordered Side-only sequence, persists metadata, and cleans up on unmount', async () => {
    const { stream, stop } = makeVideoStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia },
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, value: 640 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, value: 480 });

    const revoked: string[] = [];
    let urlSeq = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => `blob:real-${urlSeq++}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn((url: string) => revoked.push(url)),
    });

    const canvas = document.createElement('canvas');
    const nativeCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas;
      return nativeCreateElement(tag);
    });
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback: BlobCallback) => {
      callback(new Blob(['frame']));
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={[`/batches/${readyBatchId}/capture`]}>
        <Routes>
          <Route path="/batches/:batchId/capture" element={<BatchCapturePage />} />
          <Route path="/batches/:batchId" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const startButton = await screen.findByRole('button', { name: 'Mulai Pengambilan' });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: false });
      expect(screen.getByLabelText('Preview kamera Side nyata')).toBeInTheDocument();
    });

    // Side frames accumulate; Front never gets a real capture source.
    await waitFor(() => {
      const persisted = window.localStorage.getItem('spraybot.batches.v1');
      expect(persisted).not.toContain('data:image/');
    });

    const stopButton = await screen.findByRole('button', { name: 'Selesaikan Capture' });
    fireEvent.click(stopButton);

    await waitFor(async () => {
      const stored = await batchRepository.getBatch(readyBatchId);
      const session = stored?.captureSession;
      expect(session?.captureMode).toBe('real');
      expect(session?.synchronizedMoments).toEqual([]);
      const frames = session?.realSideFrames ?? [];
      frames.forEach((frame, index) => {
        expect(frame.camera).toBe('side');
        expect(frame.frameIndex).toBe(index);
        expect(frame.elapsedMs).toBeGreaterThanOrEqual(0);
      });
      for (let i = 1; i < frames.length; i += 1) {
        expect(frames[i].elapsedMs).toBeGreaterThanOrEqual(frames[i - 1].elapsedMs);
      }
    });

    // Successful completion keeps previews usable: no ObjectURL is revoked yet.
    expect(revoked).toHaveLength(0);
    // Real Side-only capture must not advance the batch to Analysis-ready states.
    const afterFinish = await batchRepository.getBatch(readyBatchId);
    expect(afterFinish?.status).toBe('CAPTURING');

    expect(stop).toHaveBeenCalled();
    expect(screen.queryByText(/Kamera Depan.*nyata/)).toBeNull();

    unmount();
    expect(revoked.length).toBeGreaterThan(0);
  });

  it('does not fabricate moments or advance status when reopening a persisted real session', async () => {
    const { stream, stop } = makeVideoStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, value: 640 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, value: 480 });

    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:reopen-1') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });

    const canvas = document.createElement('canvas');
    const nativeCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => (tag === 'canvas' ? canvas : nativeCreateElement(tag)));
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback: BlobCallback) => callback(new Blob(['frame'])));

    // Persist a real, Side-only capture session with metadata already stored.
    await batchRepository.startCapture(readyBatchId);
    await batchRepository.updateRealCaptureSession!(readyBatchId, [
      { id: 'real-side-000', frameIndex: 0, capturedAt: new Date().toISOString(), elapsedMs: 0, camera: 'side' },
      { id: 'real-side-001', frameIndex: 1, capturedAt: new Date().toISOString(), elapsedMs: 100, camera: 'side' },
    ]);

    render(
      <MemoryRouter initialEntries={[`/batches/${readyBatchId}/capture`]}>
        <Routes>
          <Route path="/batches/:batchId/capture" element={<BatchCapturePage />} />
          <Route path="/batches/:batchId" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    // Restored real session: timeline reads persisted metadata, simulation loop stays off.
    await waitFor(() => {
      expect(screen.getByText('2 frame Side · metadata tersimpan')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Mulai Simulasi' })).toBeNull();

    // Give the simulation interval a chance to (incorrectly) run before asserting nothing changed.
    await new Promise((resolve) => setTimeout(resolve, 120));
    const stored = await batchRepository.getBatch(readyBatchId);
    expect(stored?.status).toBe('CAPTURING');
    expect(stored?.captureSession?.captureMode).toBe('real');
    expect(stored?.captureSession?.synchronizedMoments).toEqual([]);
    expect(stop).not.toHaveBeenCalled();
  });

  it('stops media stream and releases URLs when user aborts real capture', async () => {
    const { stream, stop } = makeVideoStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, value: 640 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, value: 480 });

    const revoked: string[] = [];
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:abort-1') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn((url: string) => revoked.push(url)) });

    const canvas = document.createElement('canvas');
    const nativeCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => (tag === 'canvas' ? canvas : nativeCreateElement(tag)));
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback: BlobCallback) => callback(new Blob(['frame'])));

    render(
      <MemoryRouter initialEntries={[`/batches/${readyBatchId}/capture`]}>
        <Routes>
          <Route path="/batches/:batchId/capture" element={<BatchCapturePage />} />
          <Route path="/batches/:batchId" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const startButton = await screen.findByRole('button', { name: 'Mulai Pengambilan' });
    fireEvent.click(startButton);

    const abortButton = await screen.findByRole('button', { name: 'Batalkan Akuisisi' });
    fireEvent.click(abortButton);

    await waitFor(async () => {
      const stored = await batchRepository.getBatch(readyBatchId);
      expect(stored?.status).toBe('ABORTED');
    });

    expect(stop).toHaveBeenCalled();
    expect(revoked).toContain('blob:abort-1');
  });

  it('preserves existing simulation path without touching real camera API', async () => {
    const getUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });

    render(
      <MemoryRouter initialEntries={[`/batches/${readyBatchId}/capture`]}>
        <Routes>
          <Route path="/batches/:batchId/capture" element={<BatchCapturePage />} />
          <Route path="/batches/:batchId" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const simButton = await screen.findByRole('button', { name: 'Mulai Simulasi' });
    fireEvent.click(simButton);

    await waitFor(async () => {
      const stored = await batchRepository.getBatch(readyBatchId);
      expect(stored?.status).toBe('CAPTURING');
      expect(stored?.captureSession?.captureMode).not.toBe('real');
      expect(stored?.captureSession?.realSideFrames).toBeUndefined();
    });

    expect(getUserMedia).not.toHaveBeenCalled();
  });
});
