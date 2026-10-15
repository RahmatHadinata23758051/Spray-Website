import 'fake-indexeddb/auto';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { batchRepository } from '../data';
import { productRepository } from '../data';
import { captureAssetStore } from '../application/services';
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

    let persistedFrameCount = 0;
    await waitFor(async () => {
      const stored = await batchRepository.getBatch(readyBatchId);
      const session = stored?.captureSession;
      expect(session?.captureMode).toBe('real');
      expect(session?.synchronizedMoments).toEqual([]);
      expect(session?.realSideBaseline?.selectionMethod).toBe('initial-window');
      expect(session?.realSideBaseline?.frames.length).toBeGreaterThan(0);
      const frames = session?.realSideFrames ?? [];
      persistedFrameCount = frames.length;
      frames.forEach((frame, index) => {
        expect(frame.camera).toBe('side');
        expect(frame.frameIndex).toBe(index);
        expect(frame.elapsedMs).toBeGreaterThanOrEqual(0);
        // Metadata references the binary by stable asset key, never by binary or URL.
        expect(frame.assetId).toBe(`${readyBatchId}:side:${String(index).padStart(3, '0')}`);
        expect(JSON.stringify(frame)).not.toContain('blob:');
      });
      for (let i = 1; i < frames.length; i += 1) {
        expect(frames[i].elapsedMs).toBeGreaterThanOrEqual(frames[i - 1].elapsedMs);
      }
    });

    // The binary itself is durable, so navigation/reload can restore previews.
    expect(persistedFrameCount).toBeGreaterThan(0);
    const storedBlob = await captureAssetStore.get(`${readyBatchId}:side:000`);
    expect(storedBlob).not.toBeNull();
    // localStorage must never carry binary or ObjectURL payloads.
    const rawStorage = window.localStorage.getItem('spraybot.batches.v1') ?? '';
    expect(rawStorage).not.toContain('data:image/');
    expect(rawStorage).not.toContain('blob:');

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
      { id: 'real-side-000', frameIndex: 0, capturedAt: new Date().toISOString(), elapsedMs: 0, camera: 'side', assetId: `${readyBatchId}:side:000` },
      { id: 'real-side-001', frameIndex: 1, capturedAt: new Date().toISOString(), elapsedMs: 100, camera: 'side', assetId: `${readyBatchId}:side:001` },
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

describe('Phase 4 — capture asset persistence bridge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  async function makeReadyBatch(batchId: string, productLot: string) {
    const product = (await productRepository.listProducts())[0];
    const recipe = (await productRepository.listRecipes(product.id))[0];
    const draft = await batchRepository.createBatchDraft({
      id: batchId,
      productId: product.id,
      productSnapshot: { productCode: product.productCode, productName: product.name },
      recipeId: recipe.id,
      recipeSnapshot: {
        name: recipe.name,
        forceSetpointN: recipe.forceSetpointN,
        pressDurationMs: recipe.pressDurationMs,
        strokeMm: recipe.strokeMm,
      },
      productLot,
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });
    return batchRepository.prepareBatch(draft.id);
  }

  function stubRealCaptureEnvironment(revoked: string[]) {
    const { stream, stop } = makeVideoStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, value: 640 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, value: 480 });

    let urlSeq = 0;
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => `blob:p4-${urlSeq++}`) });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn((url: string) => revoked.push(url)) });

    const canvas = document.createElement('canvas');
    const nativeCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => (tag === 'canvas' ? canvas : nativeCreateElement(tag)));
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback: BlobCallback) => callback(new Blob(['phase4-frame'], { type: 'image/jpeg' })));

    return { getUserMedia, stop };
  }

  function renderAt(batchId: string) {
    return render(
      <MemoryRouter initialEntries={[`/batches/${batchId}/capture`]}>
        <Routes>
          <Route path="/batches/:batchId/capture" element={<BatchCapturePage />} />
          <Route path="/batches/:batchId" element={<div>detail</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('restores frame previews from persisted binaries after a reload', async () => {
    const batchId = 'BAT-P4-RESTORE';
    await makeReadyBatch(batchId, 'LOT-P4-RESTORE');
    const revoked: string[] = [];
    stubRealCaptureEnvironment(revoked);

    const first = renderAt(batchId);
    fireEvent.click(await screen.findByRole('button', { name: 'Mulai Pengambilan' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Selesaikan Capture' }));

    await waitFor(async () => {
      expect(await captureAssetStore.get(`${batchId}:side:000`)).not.toBeNull();
    });
    const stored = await batchRepository.getBatch(batchId);
    expect(stored?.captureSession?.realSideBaseline?.selectionMethod).toBe('initial-window');
    expect(stored?.captureSession?.realSideBaseline?.frames[0]?.assetId).toBe(`${batchId}:side:000`);

    // Unmount stands in for navigating away: URLs die, binaries stay.
    first.unmount();
    expect(revoked.length).toBeGreaterThan(0);
    expect(await captureAssetStore.get(`${batchId}:side:000`)).not.toBeNull();

    renderAt(batchId);
    const restoredImage = await screen.findByAltText(/^Frame Side 0 pada /);
    expect(restoredImage).toHaveAttribute('src', expect.stringContaining('blob:'));
  });

  it('does not start the simulation loop or fabricate moments for a restored real session', async () => {
    const batchId = 'BAT-P4-SESSION';
    await makeReadyBatch(batchId, 'LOT-P4-SESSION');
    await batchRepository.startCapture(batchId);
    await batchRepository.updateRealCaptureSession!(batchId, [
      { id: 'real-side-000', frameIndex: 0, capturedAt: new Date().toISOString(), elapsedMs: 0, camera: 'side', assetId: `${batchId}:side:000` },
    ]);
    const revoked: string[] = [];
    stubRealCaptureEnvironment(revoked);

    const stored = await batchRepository.getBatch(batchId);
    expect(stored?.status).toBe('CAPTURING');
    renderAt(batchId);

    // Metadata survives; the binary was never written for this asset, so the
    // preview degrades instead of crashing.
    await waitFor(() => {
      expect(screen.getByText('1 frame Side · metadata tersimpan')).toBeInTheDocument();
    });
    expect(screen.queryByAltText(/^Frame Side/)).toBeNull();
    const afterRender = await batchRepository.getBatch(batchId);
    expect(afterRender?.status).toBe('CAPTURING');
    expect(afterRender?.captureSession?.synchronizedMoments).toEqual([]);
  });

  it('deletes persisted batch assets when the capture is aborted', async () => {
    const batchId = 'BAT-P4-ABORT';
    await makeReadyBatch(batchId, 'LOT-P4-ABORT');
    await captureAssetStore.save(`${batchId}:side:000`, batchId, new Blob(['orphan'], { type: 'image/jpeg' }));
    const revoked: string[] = [];
    stubRealCaptureEnvironment(revoked);

    renderAt(batchId);
    fireEvent.click(await screen.findByRole('button', { name: 'Mulai Pengambilan' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Batalkan Akuisisi' }));

    await waitFor(async () => {
      expect((await batchRepository.getBatch(batchId))?.status).toBe('ABORTED');
    });
    expect(await captureAssetStore.get(`${batchId}:side:000`)).toBeNull();
  });

  it('purges superseded assets when a replacement real capture starts', async () => {
    const batchId = 'BAT-P4-REPLACE';
    await makeReadyBatch(batchId, 'LOT-P4-REPLACE');
    await captureAssetStore.save(`${batchId}:side:000`, batchId, new Blob(['superseded'], { type: 'image/jpeg' }));
    const revoked: string[] = [];
    stubRealCaptureEnvironment(revoked);

    renderAt(batchId);
    fireEvent.click(await screen.findByRole('button', { name: 'Mulai Pengambilan' }));

    await waitFor(async () => {
      expect(await captureAssetStore.get(`${batchId}:side:000`)).toBeNull();
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Selesaikan Capture' }));
    await waitFor(async () => {
      expect(await captureAssetStore.get(`${batchId}:side:000`)).not.toBeNull();
    });
  });

  describe('Phase 5 — pre-spray baseline selection and adjustment', () => {
    it('renders baseline info, timeline indicators, and supports manual reselection', async () => {
      const batchId = 'BAT-P5-BASELINE';
      await makeReadyBatch(batchId, 'LOT-P5-BASELINE');
      const revoked: string[] = [];
      stubRealCaptureEnvironment(revoked);

      renderAt(batchId);
      fireEvent.click(await screen.findByRole('button', { name: 'Mulai Pengambilan' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Selesaikan Capture' }));

      // Baseline panel renders after capture finishes
      await screen.findByLabelText('Baseline pra-spray Side');
      expect(screen.getByText('Baseline pra-spray Side')).toBeInTheDocument();
      expect(screen.getByText(/Window waktu capture, bukan sinkronisasi trigger spray fisik/)).toBeInTheDocument();

      // Timeline frame has (Baseline) indicator in aria-label
      await waitFor(() => {
        expect(screen.getByLabelText(/Side frame 0.*\(Baseline\)/)).toBeInTheDocument();
      });

      // Operator can reselect via initial window input
      const windowInput = screen.getByLabelText('Window baseline awal (ms)');
      fireEvent.change(windowInput, { target: { value: '300' } });
      fireEvent.click(screen.getByRole('button', { name: 'Pilih Window Awal' }));

      await waitFor(async () => {
        const stored = await batchRepository.getBatch(batchId);
        expect(stored?.captureSession?.realSideBaseline?.configuredWindowMs).toBe(300);
      });

      // Operator can reselect via manual range inputs, bounded by the captured span.
      const captured = await batchRepository.getBatch(batchId);
      const capturedFrames = captured?.captureSession?.realSideFrames ?? [];
      const lastElapsedMs = capturedFrames[capturedFrames.length - 1].elapsedMs;
      const startInput = screen.getByLabelText('Mulai baseline manual (ms)');
      const endInput = screen.getByLabelText('Selesai baseline manual (ms)');
      fireEvent.change(startInput, { target: { value: '0' } });
      fireEvent.change(endInput, { target: { value: String(lastElapsedMs) } });
      fireEvent.click(screen.getByRole('button', { name: 'Terapkan Rentang Manual' }));

      await waitFor(async () => {
        const stored = await batchRepository.getBatch(batchId);
        const baseline = stored?.captureSession?.realSideBaseline;
        expect(baseline?.selectionMethod).toBe('manual-range');
        expect(baseline?.startElapsedMs).toBe(0);
        expect(baseline?.endElapsedMs).toBe(lastElapsedMs);
      });
    });
  });
});
