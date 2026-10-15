import { captureVideoFrame } from '../CameraTest/cameraTest';
import { buildCaptureAssetId } from '../../../application/captureAssets';

export const REAL_CAPTURE_DURATION_MS = 3_000;
export const REAL_CAPTURE_INTERVAL_MS = 100;

export type RealSideCaptureFrame = {
  id: string;
  frameIndex: number;
  capturedAt: string;
  elapsedMs: number;
  camera: 'side';
  /** Stable store key for the frame binary. Never a URL. */
  assetId: string;
  /** Live binary for the current session. Presentation owns its ObjectURL lifetime. */
  blob: Blob;
  /** Presentation-only temporary URL. Never persisted. */
  imageUrl: string;
};

export type RealSideCaptureFrameMetadata = Omit<RealSideCaptureFrame, 'blob' | 'imageUrl'>;

export function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

export function getRealCaptureElapsedMs(startedAt: number, now = nowMs()): number {
  return Math.max(0, Math.round(now - startedAt));
}

export function getSideCameraConstraints(deviceId = ''): MediaStreamConstraints {
  return {
    video: deviceId ? { deviceId: { exact: deviceId } } : true,
    audio: false,
  };
}

export async function captureRealSideFrame(
  video: HTMLVideoElement,
  frameIndex: number,
  startedAt: number,
  batchId: string,
  capturedAt = new Date().toISOString(),
  now = performance.now(),
): Promise<RealSideCaptureFrame> {
  const blob = await captureVideoFrame(video);
  return {
    id: `real-side-${String(frameIndex).padStart(3, '0')}`,
    frameIndex,
    capturedAt,
    elapsedMs: getRealCaptureElapsedMs(startedAt, now),
    camera: 'side',
    assetId: buildCaptureAssetId(batchId, frameIndex),
    blob,
    imageUrl: URL.createObjectURL(blob),
  };
}

/** Strips presentation-only fields. Metadata must never carry binary or URLs. */
export function toRealSideCaptureFrameMetadata(frame: RealSideCaptureFrame): RealSideCaptureFrameMetadata {
  return {
    id: frame.id,
    frameIndex: frame.frameIndex,
    capturedAt: frame.capturedAt,
    elapsedMs: frame.elapsedMs,
    camera: frame.camera,
    assetId: frame.assetId,
  };
}

/** Releases presentation-only ObjectURLs. Never touches persisted assets. */
export function releaseRealCaptureFrames(
  frames: RealSideCaptureFrame[],
  revokeObjectUrl: (url: string) => void = (url) => URL.revokeObjectURL(url),
): void {
  frames.forEach((frame) => {
    if (frame.imageUrl) revokeObjectUrl(frame.imageUrl);
  });
}

export function stopRealCaptureStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
