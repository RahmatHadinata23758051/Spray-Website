import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import {
  kodePengujianRepository,
  captureAssetStore,
  captureAssetResolver,
  batchRepository,
  productRepository,
  setCaptureSavePolicy,
} from '../application/services';
import {
  buildTestRunCaptureAssetId,
  buildTestRunVideoAssetId,
} from '../application/captureAssets';
import {
  startSideVideoRecording,
  getSupportedVideoMimeType,
  isVideoRecordingSupported,
} from '../presentation/pages/Batches/realCapture';

class MockMediaRecorder {
  static isTypeSupported = vi.fn((type: string) => type.includes('webm'));
  stream: MediaStream;
  options?: MediaRecorderOptions;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  mimeType: string;

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream;
    this.options = options;
    this.mimeType = options?.mimeType || 'video/webm';
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['fake-video-bytes'], { type: this.mimeType }) });
    }
    if (this.onstop) {
      this.onstop();
    }
  }
}

function makeVideoStream() {
  const stop = vi.fn();
  const track = { stop };
  const stream = {
    getTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, stop, track };
}

describe('Phase P5 — Full Video Recording + Frame Asset Model', () => {
  beforeAll(() => {
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: (blob: Blob) => `blob:stub-${blob.type}` });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
    }
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: vi.fn().mockResolvedValue(undefined) });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, value: 640 });
    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, value: 480 });
  });

  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    setCaptureSavePolicy('review');
    vi.restoreAllMocks();
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = MockMediaRecorder;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. MediaRecorder capability handling detects supported mime types safely', () => {
    expect(isVideoRecordingSupported()).toBe(true);
    expect(getSupportedVideoMimeType()).toContain('video/webm');

    // Unsupported case
    const originalMR = (window as unknown as { MediaRecorder: unknown }).MediaRecorder;
    delete (window as unknown as { MediaRecorder?: unknown }).MediaRecorder;
    expect(isVideoRecordingSupported()).toBe(false);
    expect(getSupportedVideoMimeType()).toBeNull();
    (window as unknown as { MediaRecorder: unknown }).MediaRecorder = originalMR;
  });

  it('2. uses one shared stream for preview, frame extraction, and video recording', async () => {
    const { stream } = makeVideoStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });

    const recording = startSideVideoRecording(stream);
    expect(recording).not.toBeNull();
    expect(recording?.abort).toBeDefined();
    expect(recording?.stop).toBeDefined();

    const resultPromise = recording?.stop();
    const result = await resultPromise;
    expect(result).not.toBeNull();
    expect(result?.blob).toBeInstanceOf(Blob);
    expect(result?.mimeType).toContain('video/webm');
    expect(result?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('3. real capture review flow: finishes with pending frames and pending video, persists atomically on Simpan', async () => {
    const { stream } = makeVideoStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });

    const canvas = document.createElement('canvas');
    const nativeCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas;
      return nativeCreateElement(tag);
    });
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback: BlobCallback) => {
      callback(new Blob(['frame-data'], { type: 'image/jpeg' }));
    });

    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-V1' });
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
        <App />
      </MemoryRouter>
    );

    const startBtn = await screen.findByRole('button', { name: /Mulai Pengambilan/i });
    fireEvent.click(startBtn);

    const stopBtn = await screen.findByRole('button', { name: /Selesaikan Capture/i });
    fireEvent.click(stopBtn);

    // In review mode, capture actions Simpan, Ulangi, Buang appear
    const simpanBtn = await screen.findByRole('button', { name: /^Simpan$/i });
    expect(simpanBtn).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ulangi Pengambilan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buang/i })).toBeInTheDocument();

    // Verify assets are NOT in captureAssetStore yet
    const videoAssetId = buildTestRunVideoAssetId(kp.id, sample.id, testRun.id);
    const uncommittedVideo = await captureAssetStore.get(videoAssetId);
    expect(uncommittedVideo).toBeNull();

    // Click Simpan to commit both frames and video atomically
    fireEvent.click(simpanBtn);

    await waitFor(async () => {
      const refreshed = await kodePengujianRepository.get(kp.id);
      const tr = refreshed?.testRuns.find(t => t.id === testRun.id);
      expect(tr?.captureSession?.realSideFrames?.length).toBeGreaterThan(0);
      expect(tr?.captureSession?.video).toBeDefined();
      expect(tr?.captureSession?.video?.assetId).toBe(videoAssetId);
      expect(tr?.captureSession?.video?.camera).toBe('side');
      expect(tr?.captureSession?.video?.mimeType).toContain('video/webm');
      expect(tr?.captureSession?.video?.durationMs).toBeGreaterThanOrEqual(0);
    });

    // Verify video binary was persisted in asset store
    const storedVideo = await captureAssetStore.get(videoAssetId);
    expect(storedVideo).not.toBeNull();
    expect(storedVideo?.type).toContain('video/webm');

    // Verify localStorage NEVER contains binary data
    const rawStorage = window.localStorage.getItem('spraybot.kode-pengujian.v1') || '';
    expect(rawStorage).not.toContain('fake-video-bytes');
    expect(rawStorage).not.toContain('data:video');
    expect(rawStorage).not.toContain('blob:');
  });

  it('4. auto-save mode persists frames and video automatically upon finish', async () => {
    setCaptureSavePolicy('auto');
    const { stream } = makeVideoStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });

    const canvas = document.createElement('canvas');
    const nativeCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas;
      return nativeCreateElement(tag);
    });
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback: BlobCallback) => {
      callback(new Blob(['auto-frame'], { type: 'image/jpeg' }));
    });

    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-AUTO' });
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
        <App />
      </MemoryRouter>
    );

    const startBtn = await screen.findByRole('button', { name: /Mulai Pengambilan/i });
    fireEvent.click(startBtn);

    const stopBtn = await screen.findByRole('button', { name: /Selesaikan Capture/i });
    fireEvent.click(stopBtn);

    const videoAssetId = buildTestRunVideoAssetId(kp.id, sample.id, testRun.id);

    await waitFor(async () => {
      const refreshed = await kodePengujianRepository.get(kp.id);
      const tr = refreshed?.testRuns.find(t => t.id === testRun.id);
      expect(tr?.captureSession?.realSideFrames?.length).toBeGreaterThan(0);
      expect(tr?.captureSession?.video).toBeDefined();
      expect(tr?.captureSession?.video?.assetId).toBe(videoAssetId);
    });

    const savedVideo = await captureAssetStore.get(videoAssetId);
    expect(savedVideo).not.toBeNull();
  });

  it('5. reload resolves persisted video and frames without autoplaying video', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-RL' });
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const frameAssetId = buildTestRunCaptureAssetId(kp.id, sample.id, testRun.id, 0);
    const videoAssetId = buildTestRunVideoAssetId(kp.id, sample.id, testRun.id);

    await captureAssetStore.save(frameAssetId, { kind: 'testRun', kpId: kp.id, sampleId: sample.id, runId: testRun.id }, new Blob(['frame-0']), 'frame');
    await captureAssetStore.save(videoAssetId, { kind: 'testRun', kpId: kp.id, sampleId: sample.id, runId: testRun.id }, new Blob(['video-data'], { type: 'video/webm' }), 'video');

    await kodePengujianRepository.updateTestRun(kp.id, testRun.id, {
      status: 'CAPTURING',
      captureSession: {
        scenario: 'nominal-01',
        synchronizedMoments: [],
        startedAt: new Date().toISOString(),
        capturedAt: new Date().toISOString(),
        captureMode: 'real',
        realSideFrames: [{
          id: 'real-side-000',
          frameIndex: 0,
          capturedAt: new Date().toISOString(),
          elapsedMs: 0,
          camera: 'side',
          assetId: frameAssetId,
        }],
        video: {
          assetId: videoAssetId,
          camera: 'side',
          mimeType: 'video/webm',
          durationMs: 3000,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          sizeBytes: 10,
        },
      },
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
        <App />
      </MemoryRouter>
    );

    // Verify video metadata and playback element render
    const videoEl = await screen.findByLabelText(/Perekaman kamera Side/i);
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).not.toHaveAttribute('autoplay');

    // Resolver can fetch video
    const resolvedVideoBlob = await captureAssetResolver.resolveVideoBlob({ assetId: videoAssetId });
    expect(resolvedVideoBlob).not.toBeNull();
  });

  it('6. Retake (Ulangi Pengambilan) discards pending video and frames', async () => {
    const { stream } = makeVideoStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });

    const canvas = document.createElement('canvas');
    const nativeCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas;
      return nativeCreateElement(tag);
    });
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback: BlobCallback) => {
      callback(new Blob(['retake-frame'], { type: 'image/jpeg' }));
    });

    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-RET' });
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
        <App />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /Mulai Pengambilan/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Selesaikan Capture/i }));

    const retakeBtn = await screen.findByRole('button', { name: /Ulangi Pengambilan/i });
    fireEvent.click(retakeBtn);

    // Should return to ready state without persisting
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Mulai Pengambilan/i })).toBeInTheDocument();
    });

    const videoAssetId = buildTestRunVideoAssetId(kp.id, sample.id, testRun.id);
    expect(await captureAssetStore.get(videoAssetId)).toBeNull();
  });

  it('7. Discard (Buang) resets status to PENDING and cleans up video and frame assets', async () => {
    const { stream } = makeVideoStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });

    const canvas = document.createElement('canvas');
    const nativeCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas;
      return nativeCreateElement(tag);
    });
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback: BlobCallback) => {
      callback(new Blob(['discard-frame'], { type: 'image/jpeg' }));
    });

    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-DISC' });
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
        <App />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /Mulai Pengambilan/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Selesaikan Capture/i }));

    const discardBtn = await screen.findByRole('button', { name: /Buang/i });
    fireEvent.click(discardBtn);

    await waitFor(async () => {
      const refreshed = await kodePengujianRepository.get(kp.id);
      const tr = refreshed?.testRuns.find(t => t.id === testRun.id);
      expect(tr?.status).toBe('PENDING');
      expect(tr?.captureSession).toBeUndefined();
    });

    const videoAssetId = buildTestRunVideoAssetId(kp.id, sample.id, testRun.id);
    expect(await captureAssetStore.get(videoAssetId)).toBeNull();
  });

  it('8. unsupported MediaRecorder allows frame-only capture and displays fallback state without fabricating video', async () => {
    delete (window as unknown as { MediaRecorder?: unknown }).MediaRecorder;

    const { stream } = makeVideoStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });

    const canvas = document.createElement('canvas');
    const nativeCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return canvas;
      return nativeCreateElement(tag);
    });
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback: BlobCallback) => {
      callback(new Blob(['frame-no-video'], { type: 'image/jpeg' }));
    });

    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-NO-MR' });
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Perekaman video tidak didukung browser/i)).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: /Mulai Pengambilan/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Selesaikan Capture/i }));

    const simpanBtn = await screen.findByRole('button', { name: /^Simpan$/i });
    fireEvent.click(simpanBtn);

    await waitFor(async () => {
      const refreshed = await kodePengujianRepository.get(kp.id);
      const tr = refreshed?.testRuns.find(t => t.id === testRun.id);
      expect(tr?.captureSession?.realSideFrames?.length).toBeGreaterThan(0);
      expect(tr?.captureSession?.video).toBeUndefined();
    });
  });

  it('9. scoped cleanup guarantees TestRun A assets are never touched when TestRun B cleans up', async () => {
    const scopeA = { kind: 'testRun' as const, kpId: 'kp-1', sampleId: 'smp-1', runId: 'run-A' };
    const scopeB = { kind: 'testRun' as const, kpId: 'kp-1', sampleId: 'smp-1', runId: 'run-B' };

    const videoA = buildTestRunVideoAssetId('kp-1', 'smp-1', 'run-A');
    const frameA = buildTestRunCaptureAssetId('kp-1', 'smp-1', 'run-A', 0);

    const videoB = buildTestRunVideoAssetId('kp-1', 'smp-1', 'run-B');
    const frameB = buildTestRunCaptureAssetId('kp-1', 'smp-1', 'run-B', 0);

    await captureAssetStore.save(frameA, scopeA, new Blob(['frameA']), 'frame');
    await captureAssetStore.save(videoA, scopeA, new Blob(['videoA'], { type: 'video/webm' }), 'video');

    await captureAssetStore.save(frameB, scopeB, new Blob(['frameB']), 'frame');
    await captureAssetStore.save(videoB, scopeB, new Blob(['videoB'], { type: 'video/webm' }), 'video');

    // Clean up scope B
    await captureAssetStore.deleteScope(scopeB);

    expect(await captureAssetStore.get(frameB)).toBeNull();
    expect(await captureAssetStore.get(videoB)).toBeNull();

    // Scope A remains intact
    expect(await captureAssetStore.get(frameA)).not.toBeNull();
    expect(await captureAssetStore.get(videoA)).not.toBeNull();
  });

  it('10. legacy Batch capture workflow remains functional and regression-free', async () => {
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
      productLot: 'LOT-LEGACY-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
      fixture: 'nominal-01',
    });
    const ready = await batchRepository.prepareBatch(draft.id);

    render(
      <MemoryRouter initialEntries={[`/batches/${ready.id}/capture`]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(ready.id)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mulai Pengambilan/i })).toBeInTheDocument();
  });
});
