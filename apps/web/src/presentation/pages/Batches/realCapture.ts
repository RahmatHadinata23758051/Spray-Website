import { captureVideoFrame } from '../CameraTest/cameraTest';

export const REAL_CAPTURE_DURATION_MS = 3_000;
export const REAL_CAPTURE_INTERVAL_MS = 100;

export type RealSideCaptureFrame = {
  id: string;
  frameIndex: number;
  capturedAt: string;
  elapsedMs: number;
  camera: 'side';
  blob: Blob;
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
    blob,
    imageUrl: URL.createObjectURL(blob),
  };
}

export function releaseRealCaptureFrames(
  frames: RealSideCaptureFrame[],
  revokeObjectUrl: (url: string) => void = (url) => URL.revokeObjectURL(url),
): void {
  frames.forEach((frame) => revokeObjectUrl(frame.imageUrl));
}

export function stopRealCaptureStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}
