export type LogicalCamera = 'front' | 'side';

export type CameraAssignment = {
  front: string;
  side: string;
};

export type CaptureFrame = {
  sequence: number;
  elapsedMs: number;
  role: LogicalCamera;
  url: string;
};

export type CameraTestMode = 'separate' | 'shared';

export type SharedCapturePair = {
  sequence: number;
  elapsedMs: number;
  capturedAt: number;
  side: { role: 'side'; imageUrl: string };
  front: { role: 'front'; imageUrl: string };
};

export const CAMERA_TEST_ASSIGNMENT_KEY = 'spraybot_camera_test_assignment';
export const SHARED_CAMERA_ASSIGNMENT_KEY = 'spraybot_camera_test_shared_device';
export const SINGLE_CAPTURE_DURATION_MS = 3_000;
export const SINGLE_CAPTURE_INTERVAL_MS = 100;

export const EMPTY_ASSIGNMENT: CameraAssignment = { front: '', side: '' };

export function enumerateVideoDevices(
  mediaDevices: Pick<MediaDevices, 'enumerateDevices'>,
): Promise<MediaDeviceInfo[]> {
  return mediaDevices.enumerateDevices().then((devices) => (
    devices.filter((device) => device.kind === 'videoinput')
  ));
}

export function readSharedCameraDevice(storage: Storage | null | undefined): string {
  if (!storage) return '';
  try {
    return storage.getItem(SHARED_CAMERA_ASSIGNMENT_KEY) ?? '';
  } catch {
    return '';
  }
}

export function persistSharedCameraDevice(storage: Storage | null | undefined, deviceId: string): void {
  if (!storage) return;
  try {
    if (deviceId) storage.setItem(SHARED_CAMERA_ASSIGNMENT_KEY, deviceId);
    else storage.removeItem(SHARED_CAMERA_ASSIGNMENT_KEY);
  } catch {
    // Storage is a convenience for this PoC.
  }
}

export function readCameraAssignment(storage: Storage | null | undefined): CameraAssignment {
  if (!storage) return { ...EMPTY_ASSIGNMENT };

  try {
    const raw = storage.getItem(CAMERA_TEST_ASSIGNMENT_KEY);
    if (!raw) return { ...EMPTY_ASSIGNMENT };

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_ASSIGNMENT };

    const candidate = parsed as Partial<Record<LogicalCamera, unknown>>;
    return {
      front: typeof candidate.front === 'string' ? candidate.front : '',
      side: typeof candidate.side === 'string' ? candidate.side : '',
    };
  } catch {
    return { ...EMPTY_ASSIGNMENT };
  }
}

export function persistCameraAssignment(storage: Storage | null | undefined, assignment: CameraAssignment): void {
  if (!storage) return;

  try {
    storage.setItem(CAMERA_TEST_ASSIGNMENT_KEY, JSON.stringify({
      front: assignment.front,
      side: assignment.side,
    }));
  } catch {
    // Storage is a convenience for this PoC. Camera use should continue if it is unavailable.
  }
}

export function reconcileCameraAssignment(
  preferred: CameraAssignment,
  devices: Pick<MediaDeviceInfo, 'deviceId'>[],
): CameraAssignment {
  const available = new Set(devices.map((device) => device.deviceId));
  const front = available.has(preferred.front) ? preferred.front : '';
  const side = available.has(preferred.side) && preferred.side !== front ? preferred.side : '';

  return { front, side };
}

export function isAssignmentAvailable(
  assignment: CameraAssignment,
  role: LogicalCamera,
  deviceId: string,
): boolean {
  if (!deviceId) return true;
  const otherRole: LogicalCamera = role === 'front' ? 'side' : 'front';
  return assignment[otherRole] !== deviceId;
}

export function isSnapshotReady(ready: Record<LogicalCamera, boolean>): boolean {
  return ready.front && ready.side;
}

export function getCameraErrorName(error: unknown): string {
  return error instanceof DOMException
    ? error.name
    : typeof error === 'object' && error !== null && 'name' in error
      ? String((error as { name?: unknown }).name)
      : '';
}

export function mapCameraError(error: unknown): string {
  switch (getCameraErrorName(error)) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Akses kamera ditolak.';
    case 'NotFoundError':
      return 'Kamera tidak ditemukan.';
    case 'NotReadableError':
    case 'AbortError':
      return 'Kamera tidak dapat digunakan. Periksa apakah kamera sedang digunakan aplikasi lain.';
    case 'OverconstrainedError':
      return 'Kamera yang dipilih tidak tersedia.';
    default:
      return 'Kamera gagal dibuka.';
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function formatCaptureTime(date: Date): string {
  const pad = (value: number, length = 2) => value.toString().padStart(length, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

export function getCaptureElapsedMs(startedAt: number, now = performance.now()): number {
  return Math.max(0, Math.round(now - startedAt));
}

export function nextCaptureSequence(current: number): number {
  return current + 1;
}

export function attachSharedStream(
  stream: MediaStream,
  videos: Record<LogicalCamera, HTMLVideoElement | null>,
): void {
  (['side', 'front'] as LogicalCamera[]).forEach((role) => {
    if (videos[role]) videos[role].srcObject = stream;
  });
}

export function createSharedCapturePair(
  sequence: number,
  elapsedMs: number,
  capturedAt: number,
  sideUrl: string,
  frontUrl: string,
): SharedCapturePair {
  return {
    sequence,
    elapsedMs,
    capturedAt,
    side: { role: 'side', imageUrl: sideUrl },
    front: { role: 'front', imageUrl: frontUrl },
  };
}

export function captureVideoFrame(video: HTMLVideoElement): Promise<Blob> {
  const width = video.videoWidth || video.clientWidth;
  const height = video.videoHeight || video.clientHeight;

  if (!width || !height) {
    return Promise.reject(new Error('Video frame belum siap'));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    return Promise.reject(new Error('Canvas tidak tersedia'));
  }

  context.drawImage(video, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Snapshot gagal dibuat'));
    }, 'image/jpeg', 0.92);
  });
}
