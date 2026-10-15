import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureRealSideFrame,
  getRealCaptureElapsedMs,
  getSideCameraConstraints,
  releaseRealCaptureFrames,
  stopRealCaptureStream,
} from '../presentation/pages/Batches/realCapture';

describe('real side capture foundation', () => {
  afterEach(() => vi.restoreAllMocks());

  beforeEach(() => {
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn() });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    }
  });

  it('uses a side-only camera constraint and does not request audio', () => {
    expect(getSideCameraConstraints()).toEqual({ video: true, audio: false });
    expect(getSideCameraConstraints('side-1')).toEqual({ video: { deviceId: { exact: 'side-1' } }, audio: false });
  });

  it('keeps elapsed capture time non-negative', () => {
    expect(getRealCaptureElapsedMs(100, 90)).toBe(0);
    expect(getRealCaptureElapsedMs(100, 223)).toBe(123);
  });

  it('creates side-only ordered frame metadata with an object URL', async () => {
    const blob = new Blob(['frame']);
    const video = { videoWidth: 10, videoHeight: 10 } as HTMLVideoElement;
    const canvas = document.createElement('canvas');
    vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas);
    vi.spyOn(canvas, 'getContext').mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback) => callback(blob));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:side-001');

    const frame = await captureRealSideFrame(video, 0, 100, 'BAT-001', '2026-01-01T00:00:00.000Z', 140);
    expect(frame).toMatchObject({ id: 'real-side-000', frameIndex: 0, camera: 'side', elapsedMs: 40, imageUrl: 'blob:side-001', assetId: 'BAT-001:side:000' });
    expect(frame.blob).toBe(blob);
  });

  it('releases object URLs and media tracks', () => {
    const revoke = vi.fn();
    releaseRealCaptureFrames([
      { id: 'a', frameIndex: 0, capturedAt: '', elapsedMs: 0, camera: 'side', assetId: 'a', blob: new Blob(), imageUrl: 'blob:a' },
    ], revoke);
    const stop = vi.fn();
    stopRealCaptureStream({ getTracks: () => [{ stop }] } as unknown as MediaStream);
    expect(revoke).toHaveBeenCalledWith('blob:a');
    expect(stop).toHaveBeenCalledOnce();
  });
});
