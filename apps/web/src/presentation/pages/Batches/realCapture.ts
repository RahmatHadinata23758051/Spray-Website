import { captureVideoFrame } from '../CameraTest/cameraTest';
import { buildCaptureAssetId, buildTestRunCaptureAssetId } from '../../../application/captureAssets';
import type { CaptureVideoMetadata } from '@spray-paragon/domain';

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

/**
 * Captures a real Side frame for a TestRun within a KodePengujian.
 * Uses the new asset key format: kp:{kpId}:sample:{sampleId}:run:{runId}:side:{frameIndex}
 */
export async function captureRealSideFrameForTestRun(
  video: HTMLVideoElement,
  frameIndex: number,
  startedAt: number,
  kpId: string,
  sampleId: string,
  runId: string,
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
    assetId: buildTestRunCaptureAssetId(kpId, sampleId, runId, frameIndex),
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

export type RealSideCaptureVideo = {
  assetId: string;
  camera: 'side';
  /** Live binary for the current session. Presentation owns its ObjectURL lifetime. */
  blob: Blob;
  /** Presentation-only temporary URL for preview/playback. Never persisted. */
  videoUrl: string;
  mimeType: string;
  durationMs: number;
  sizeBytes: number;
  startedAt: string;
  completedAt: string;
};

export function toCaptureVideoMetadata(video: RealSideCaptureVideo): CaptureVideoMetadata {
  return {
    assetId: video.assetId,
    camera: video.camera,
    mimeType: video.mimeType,
    durationMs: video.durationMs,
    startedAt: video.startedAt,
    completedAt: video.completedAt,
    sizeBytes: video.sizeBytes,
  };
}

export function releaseRealCaptureVideo(
  video: RealSideCaptureVideo | null | undefined,
  revokeObjectUrl: (url: string) => void = (url) => URL.revokeObjectURL(url),
): void {
  if (video?.videoUrl) {
    revokeObjectUrl(video.videoUrl);
  }
}

const CANDIDATE_VIDEO_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4;codecs=h264',
  'video/mp4',
];

export function getSupportedVideoMimeType(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  if (typeof MediaRecorder.isTypeSupported !== 'function') return '';
  for (const candidate of CANDIDATE_VIDEO_MIME_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    } catch {
      // Ignore errors in environments with partial MediaRecorder implementation
    }
  }
  return '';
}

export function isVideoRecordingSupported(): boolean {
  if (typeof MediaRecorder === 'undefined') return false;
  return getSupportedVideoMimeType() !== null;
}

export interface RecordedVideoResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  sizeBytes: number;
}

export interface ActiveVideoRecording {
  stop: () => Promise<RecordedVideoResult | null>;
  abort: () => void;
}

export function startSideVideoRecording(stream: MediaStream): ActiveVideoRecording | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const mimeType = getSupportedVideoMimeType();
  const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, options);
  } catch {
    try {
      recorder = new MediaRecorder(stream);
    } catch {
      return null;
    }
  }

  const chunks: Blob[] = [];
  const startStamp = nowMs();
  let isStopped = false;

  recorder.ondataavailable = (event: BlobEvent) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  try {
    recorder.start();
  } catch {
    return null;
  }

  return {
    stop: () => {
      return new Promise<RecordedVideoResult | null>((resolve) => {
        if (isStopped || recorder.state === 'inactive') {
          resolve(null);
          return;
        }
        isStopped = true;
        recorder.onstop = () => {
          const endStamp = nowMs();
          const durationMs = Math.max(0, Math.round(endStamp - startStamp));
          const effectiveMime = recorder.mimeType || mimeType || 'video/webm';
          const blob = new Blob(chunks, { type: effectiveMime });
          resolve({
            blob,
            mimeType: effectiveMime,
            durationMs,
            sizeBytes: blob.size,
          });
        };
        try {
          recorder.stop();
        } catch {
          resolve(null);
        }
      });
    },
    abort: () => {
      isStopped = true;
      chunks.length = 0;
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // ignore
        }
      }
    },
  };
}
