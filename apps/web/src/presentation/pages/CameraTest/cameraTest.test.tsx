import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CameraTestPage } from './CameraTestPage';
import {
  CAMERA_TEST_ASSIGNMENT_KEY,
  attachSharedStream,
  createSharedCapturePair,
  enumerateVideoDevices,
  getCaptureElapsedMs,
  persistSharedCameraDevice,
  readSharedCameraDevice,
  isAssignmentAvailable,
  isSnapshotReady,
  mapCameraError,
  nextCaptureSequence,
  persistCameraAssignment,
  readCameraAssignment,
  reconcileCameraAssignment,
  stopMediaStream,
} from './cameraTest';

function device(deviceId: string, kind: MediaDeviceKind = 'videoinput') {
  return { deviceId, kind } as MediaDeviceInfo;
}

describe('camera test utilities', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('enumerates video inputs only', async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([
      device('side-camera'),
      device('microphone', 'audioinput'),
      device('front-camera'),
    ]);

    await expect(enumerateVideoDevices({ enumerateDevices })).resolves.toEqual([
      expect.objectContaining({ deviceId: 'side-camera' }),
      expect.objectContaining({ deviceId: 'front-camera' }),
    ]);
  });

  it('prevents assigning the same physical device to both roles', () => {
    expect(isAssignmentAvailable({ front: 'front-camera', side: '' }, 'side', 'front-camera')).toBe(false);
    expect(isAssignmentAvailable({ front: 'front-camera', side: '' }, 'side', 'side-camera')).toBe(true);
  });

  it('falls back when a remembered device disappears', () => {
    expect(reconcileCameraAssignment(
      { front: 'missing-camera', side: 'side-camera' },
      [device('side-camera')],
    )).toEqual({ front: '', side: 'side-camera' });
  });

  it('does not retain a duplicate remembered assignment', () => {
    expect(reconcileCameraAssignment(
      { front: 'same-camera', side: 'same-camera' },
      [device('same-camera')],
    )).toEqual({ front: 'same-camera', side: '' });
  });

  it('persists the shared camera preference in its own PoC namespace', () => {
    persistSharedCameraDevice(window.localStorage, 'shared-camera');
    expect(readSharedCameraDevice(window.localStorage)).toBe('shared-camera');
    persistSharedCameraDevice(window.localStorage, '');
    expect(readSharedCameraDevice(window.localStorage)).toBe('');
  });

  it('reads and writes only the namespaced assignment fields', () => {
    const storage = window.localStorage;
    storage.clear();
    storage.setItem(CAMERA_TEST_ASSIGNMENT_KEY, JSON.stringify({ front: 'f', side: 's', other: 'ignored' }));
    expect(readCameraAssignment(storage)).toEqual({ front: 'f', side: 's' });
    persistCameraAssignment(storage, { front: 'front-camera', side: 'side-camera' });
    expect(JSON.parse(storage.getItem(CAMERA_TEST_ASSIGNMENT_KEY) ?? '{}')).toEqual({
      front: 'front-camera',
      side: 'side-camera',
    });
    expect(readCameraAssignment(null)).toEqual({ front: '', side: '' });
  });

  it.each([
    ['NotAllowedError', 'Akses kamera ditolak.'],
    ['NotFoundError', 'Kamera tidak ditemukan.'],
    ['NotReadableError', 'Kamera tidak dapat digunakan. Periksa apakah kamera sedang digunakan aplikasi lain.'],
  ])('maps %s without exposing raw errors', (name, message) => {
    expect(mapCameraError({ name, message: 'raw device message' })).toBe(message);
  });

  it('keeps paired snapshot action disabled until both streams are ready', () => {
    render(<CameraTestPage />);
    expect(screen.getByRole('button', { name: /Ambil Snapshot Bersamaan/ })).toBeDisabled();
  });

  it('requests permission, enumerates cameras, and opens each selected device independently', async () => {
    const tracks = [{ stop: vi.fn(), addEventListener: vi.fn() }];
    const stream = { getTracks: () => tracks } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const enumerateDevices = vi.fn().mockResolvedValue([
      device('front-camera'),
      device('side-camera'),
    ]);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia, enumerateDevices, addEventListener: vi.fn(), removeEventListener: vi.fn() },
    });

    render(<CameraTestPage />);
    await userEvent.click(screen.getByRole('button', { name: /Aktifkan Kamera/ }));

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(6));
    expect(getUserMedia).toHaveBeenCalledWith({ video: true, audio: false });
    const sideSelect = screen.getByRole('combobox', { name: /Kamera Samping/ });
    const frontSelect = screen.getByRole('combobox', { name: /Kamera Depan/ });
    expect(sideSelect).toBeEnabled();
    expect(frontSelect).toBeEnabled();

    await userEvent.selectOptions(sideSelect, 'side-camera');
    await userEvent.selectOptions(frontSelect, 'front-camera');
    await waitFor(() => {
      expect(getUserMedia).toHaveBeenCalledWith({ video: { deviceId: { exact: 'side-camera' } }, audio: false });
      expect(getUserMedia).toHaveBeenCalledWith({ video: { deviceId: { exact: 'front-camera' } }, audio: false });
    });
  });

  it('opens one shared stream, marks both logical roles ready, and enables paired snapshot', async () => {
    const tracks = [{ stop: vi.fn(), addEventListener: vi.fn() }];
    const stream = { getTracks: () => tracks, getVideoTracks: () => [] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    const enumerateDevices = vi.fn().mockResolvedValue([device('shared-camera')]);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia, enumerateDevices, addEventListener: vi.fn(), removeEventListener: vi.fn() },
    });

    render(<CameraTestPage />);
    await userEvent.click(screen.getByRole('button', { name: '1 Kamera untuk 2 View' }));
    await userEvent.click(screen.getByRole('button', { name: /Aktifkan Kamera/ }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Sumber Kamera Bersama' })).toHaveValue('shared-camera'));

    const videos = document.querySelectorAll('video');
    fireEvent.canPlay(videos[0]);
    fireEvent.canPlay(videos[1]);
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect((videos[0] as HTMLVideoElement).srcObject).toBe(stream);
    expect((videos[1] as HTMLVideoElement).srcObject).toBe(stream);
    expect(screen.getByText('Sinkron dari sumber kamera yang sama')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ambil Snapshot Bersamaan/ })).toBeEnabled();
    expect(screen.getAllByText('Siap')).toHaveLength(2);
  });

  it('attaches one shared stream to both logical views', () => {
    const side = {} as HTMLVideoElement;
    const front = {} as HTMLVideoElement;
    const stream = {} as MediaStream;
    attachSharedStream(stream, { side, front });
    expect(side.srcObject).toBe(stream);
    expect(front.srcObject).toBe(stream);
  });

  it('creates synchronized shared pairs from one source sample', () => {
    expect(createSharedCapturePair(1, 103, 1103, 'side-url', 'front-url')).toEqual({
      sequence: 1,
      elapsedMs: 103,
      capturedAt: 1103,
      side: { role: 'side', imageUrl: 'side-url' },
      front: { role: 'front', imageUrl: 'front-url' },
    });
  });

  it('increments frame sequence indexes', () => {
    expect([1, 2, 3].map((current) => nextCaptureSequence(current - 1))).toEqual([1, 2, 3]);
  });

  it('keeps capture elapsed timestamps monotonic', () => {
    expect(getCaptureElapsedMs(100, 100)).toBe(0);
    expect(getCaptureElapsedMs(100, 203)).toBe(103);
    expect(getCaptureElapsedMs(100, 201)).toBe(101);
  });

  it('reports snapshot readiness only when both logical cameras are ready', () => {
    expect(isSnapshotReady({ front: false, side: true })).toBe(false);
    expect(isSnapshotReady({ front: true, side: true })).toBe(true);
  });

  it('stops every track during cleanup', () => {
    const tracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
    stopMediaStream({ getTracks: () => tracks } as unknown as MediaStream);
    tracks.forEach((track) => expect(track.stop).toHaveBeenCalledOnce());
  });
});
