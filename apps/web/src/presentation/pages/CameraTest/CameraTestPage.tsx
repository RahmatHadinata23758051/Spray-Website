import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Images, RefreshCw } from 'lucide-react';
import {
  attachSharedStream,
  captureVideoFrame,
  createSharedCapturePair,
  EMPTY_ASSIGNMENT,
  enumerateVideoDevices,
  SINGLE_CAPTURE_DURATION_MS,
  SINGLE_CAPTURE_INTERVAL_MS,
  formatCaptureTime,
  getCaptureElapsedMs,
  nextCaptureSequence,
  getCameraErrorName,
  isAssignmentAvailable,
  isSnapshotReady,
  mapCameraError,
  persistCameraAssignment,
  persistSharedCameraDevice,
  readCameraAssignment,
  readSharedCameraDevice,
  reconcileCameraAssignment,
  stopMediaStream,
  type CameraAssignment,
  type CameraTestMode,
  type CaptureFrame,
  type LogicalCamera,
  type SharedCapturePair,
} from './cameraTest';

type SingleCaptureStatus = 'idle' | 'recording' | 'complete' | 'cancelled' | 'failed';

type CameraStatus = 'inactive' | 'ready' | 'unavailable' | 'disconnected' | 'failed';
type VideoRef = HTMLVideoElement | null;

type SnapshotPair = {
  sequence: number;
  capturedAt: string;
  sideUrl: string;
  frontUrl: string;
};

const STATUS_LABELS: Record<CameraStatus, string> = {
  inactive: 'Belum aktif',
  ready: 'Siap',
  unavailable: 'Tidak tersedia',
  disconnected: 'Terputus',
  failed: 'Gagal dibuka',
};

const ROLE_LABELS: Record<LogicalCamera, string> = {
  side: 'Kamera Samping',
  front: 'Kamera Depan',
};

const CAPTURE_STATUS_LABELS: Record<SingleCaptureStatus, string> = {
  idle: 'Belum dimulai',
  recording: 'Merekam',
  complete: 'Selesai',
  cancelled: 'Dibatalkan',
  failed: 'Gagal',
};

function getCameraDisplayName(device: MediaDeviceInfo, index: number): string {
  return device.label || `Kamera ${index + 1}`;
}

export function CameraTestPage() {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [assignment, setAssignment] = useState<CameraAssignment>({ ...EMPTY_ASSIGNMENT });
  const [mode, setMode] = useState<CameraTestMode>('separate');
  const [sharedDeviceId, setSharedDeviceId] = useState('');
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [status, setStatus] = useState<Record<LogicalCamera, CameraStatus>>({
    front: 'inactive',
    side: 'inactive',
  });
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotPair | null>(null);
  const [captureStatus, setCaptureStatus] = useState<SingleCaptureStatus>('idle');
  const [captureFrames, setCaptureFrames] = useState<CaptureFrame[]>([]);
  const [sharedPairs, setSharedPairs] = useState<SharedCapturePair[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<CaptureFrame | null>(null);
  const [selectedPair, setSelectedPair] = useState<SharedCapturePair | null>(null);
  const [captureElapsedMs, setCaptureElapsedMs] = useState(0);

  const streamsRef = useRef<Record<LogicalCamera, MediaStream | null>>({ front: null, side: null });
  const sharedStreamRef = useRef<MediaStream | null>(null);
  const videoRefs = useRef<Record<LogicalCamera, VideoRef>>({ front: null, side: null });
  const objectUrlsRef = useRef<string[]>([]);
  const frameObjectUrlsRef = useRef<string[]>([]);
  const assignmentRef = useRef(assignment);
  const streamRequestRef = useRef<Record<LogicalCamera, number>>({ front: 0, side: 0 });
  const sharedRequestRef = useRef(0);
  const captureStopTimerRef = useRef<number | null>(null);
  const captureIntervalRef = useRef<number | null>(null);
  const captureFrameRequestRef = useRef<number | null>(null);
  const captureStartedAtRef = useRef(0);
  const captureSequenceRef = useRef(0);
  const pairedSnapshotSequenceRef = useRef(0);
  const captureSessionRef = useRef(0);
  const captureRoleRef = useRef<LogicalCamera | null>(null);
  const captureStatusRef = useRef<SingleCaptureStatus>('idle');
  const sharedSampleInFlightRef = useRef(false);

  const mediaDevices = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
  const isSupported = Boolean(mediaDevices?.getUserMedia && mediaDevices.enumerateDevices);
  const bothReady = isSnapshotReady({ front: status.front === 'ready', side: status.side === 'ready' });
  const sharedReady = mode === 'shared' && status.side === 'ready' && status.front === 'ready';
  const activeRole: LogicalCamera | null = mode === 'shared'
    ? sharedReady ? 'side' : null
    : status.side === 'ready'
    ? 'side'
    : status.front === 'ready'
      ? 'front'
      : null;
  const isCapturing = captureStatus === 'recording';

  useEffect(() => {
    assignmentRef.current = assignment;
  }, [assignment]);

  const stopRoleStream = useCallback((role: LogicalCamera) => {
    stopMediaStream(streamsRef.current[role]);
    streamsRef.current[role] = null;

    const video = videoRefs.current[role];
    if (video) {
      video.srcObject = null;
    }
  }, []);

  const stopSharedStream = useCallback(() => {
    stopMediaStream(sharedStreamRef.current);
    sharedStreamRef.current = null;
    (['side', 'front'] as LogicalCamera[]).forEach((role) => {
      const video = videoRefs.current[role];
      if (video) video.srcObject = null;
    });
  }, []);

  const stopAllStreams = useCallback(() => {
    (Object.keys(streamRequestRef.current) as LogicalCamera[]).forEach((role) => {
      streamRequestRef.current[role] += 1;
    });
    sharedRequestRef.current += 1;
    (Object.keys(streamsRef.current) as LogicalCamera[]).forEach(stopRoleStream);
    stopSharedStream();
  }, [stopRoleStream, stopSharedStream]);

  const setRoleStatus = useCallback((role: LogicalCamera, nextStatus: CameraStatus) => {
    setStatus((current) => ({ ...current, [role]: nextStatus }));
  }, []);

  const refreshDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    if (!mediaDevices?.enumerateDevices) return [];

    const available = await enumerateVideoDevices(mediaDevices);
    setDevices(available);
    return available;
  }, [mediaDevices]);

  const openRoleStream = useCallback(async (role: LogicalCamera, deviceId: string) => {
    if (!mediaDevices?.getUserMedia) {
      setRoleStatus(role, 'failed');
      setError('Browser ini tidak mendukung akses kamera.');
      return;
    }

    const requestId = streamRequestRef.current[role] + 1;
    streamRequestRef.current[role] = requestId;
    stopRoleStream(role);
    if (!deviceId) {
      setRoleStatus(role, 'unavailable');
      return;
    }

    setRoleStatus(role, 'inactive');

    try {
      const stream = await mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      if (streamRequestRef.current[role] !== requestId) {
        stopMediaStream(stream);
        return;
      }
      streamsRef.current[role] = stream;
      const handleTrackEnded = () => {
        setRoleStatus(role, 'disconnected');
        setError(`${ROLE_LABELS[role]} terputus.`);
      };
      stream.getTracks().forEach((track) => track.addEventListener('ended', handleTrackEnded, { once: true }));
      const video = videoRefs.current[role];

      if (video) {
        video.srcObject = stream;
      }

      if (video && video.readyState >= 2) {
        setRoleStatus(role, 'ready');
      }
    } catch (cameraError) {
      console.error(`Failed to open ${role} camera`, cameraError);
      setRoleStatus(role, getCameraErrorName(cameraError) === 'NotFoundError' ? 'unavailable' : 'failed');
      setError(mapCameraError(cameraError));
    }
  }, [mediaDevices, setRoleStatus, stopRoleStream]);

  const setSharedReady = useCallback((nextStatus: CameraStatus) => {
    setStatus({ front: nextStatus, side: nextStatus });
  }, []);

  const openSharedStream = useCallback(async (deviceId: string, existingStream?: MediaStream) => {
    if (!mediaDevices?.getUserMedia) return;
    stopAllStreams();
    const requestId = sharedRequestRef.current + 1;
    sharedRequestRef.current = requestId;
    if (!deviceId) {
      setSharedReady('unavailable');
      return;
    }
    try {
      const stream = existingStream ?? await mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      if (sharedRequestRef.current !== requestId) {
        stopMediaStream(stream);
        return;
      }
      sharedStreamRef.current = stream;
      const handleEnded = () => {
        stopSharedStream();
        setSharedReady('disconnected');
        setError('Sumber kamera bersama terputus.');
      };
      stream.getTracks().forEach((track) => track.addEventListener('ended', handleEnded, { once: true }));
      attachSharedStream(stream, videoRefs.current);
    } catch (cameraError) {
      setSharedReady(getCameraErrorName(cameraError) === 'NotFoundError' ? 'unavailable' : 'failed');
      setError(mapCameraError(cameraError));
    }
  }, [mediaDevices, setSharedReady, stopAllStreams, stopSharedStream]);

  const handleSharedDeviceChange = useCallback(async (deviceId: string) => {
    if (isCapturing) return;
    setSharedDeviceId(deviceId);
    persistSharedCameraDevice(window.localStorage, deviceId);
    if (mode === 'shared') await openSharedStream(deviceId);
  }, [isCapturing, mode, openSharedStream]);

  const clearSnapshot = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    setSnapshot(null);
  }, []);

  const clearCaptureFrames = useCallback(() => {
    frameObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    frameObjectUrlsRef.current = [];
    setCaptureFrames([]);
    setSharedPairs([]);
    setSelectedFrame(null);
    setSelectedPair(null);
    setCaptureElapsedMs(0);
    captureSequenceRef.current = 0;
  }, []);

  const clearCaptureResults = useCallback(() => {
    clearCaptureFrames();
    clearSnapshot();
  }, [clearCaptureFrames, clearSnapshot]);

  const handleModeChange = useCallback(async (nextMode: CameraTestMode) => {
    if (isCapturing || nextMode === mode) return;
    clearCaptureResults();
    setMode(nextMode);
    stopAllStreams();
    setStatus({ front: 'inactive', side: 'inactive' });
    if (nextMode === 'shared' && sharedDeviceId && permissionRequested) {
      await openSharedStream(sharedDeviceId);
    } else if (nextMode === 'separate' && permissionRequested) {
      await Promise.all((Object.keys(assignmentRef.current) as LogicalCamera[]).map((role) => (
        openRoleStream(role, assignmentRef.current[role])
      )));
    }
  }, [clearCaptureResults, isCapturing, mode, openRoleStream, openSharedStream, permissionRequested, sharedDeviceId, stopAllStreams]);

  const finishSingleCapture = useCallback((nextStatus: Exclude<SingleCaptureStatus, 'recording'>) => {
    if (captureStopTimerRef.current !== null) {
      window.clearTimeout(captureStopTimerRef.current);
      captureStopTimerRef.current = null;
    }
    if (captureIntervalRef.current !== null) {
      window.clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }

    const role = captureRoleRef.current;
    const video = role ? videoRefs.current[role] : null;
    if (video && captureFrameRequestRef.current !== null && 'cancelVideoFrameCallback' in video) {
      (video as HTMLVideoElement & { cancelVideoFrameCallback: (handle: number) => void }).cancelVideoFrameCallback(captureFrameRequestRef.current);
    }
    captureFrameRequestRef.current = null;
    sharedSampleInFlightRef.current = false;
    setCaptureElapsedMs(Math.min(SINGLE_CAPTURE_DURATION_MS, getCaptureElapsedMs(captureStartedAtRef.current)));
    captureStatusRef.current = nextStatus;
    setCaptureStatus(nextStatus);
    captureRoleRef.current = null;
  }, []);

  const sampleCaptureFrame = useCallback((sessionId: number) => {
    const role = captureRoleRef.current;
    const video = role ? videoRefs.current[role] : null;
    if (sessionId !== captureSessionRef.current || !role || !video || captureStatusRef.current !== 'recording') return;

    const elapsedMs = getCaptureElapsedMs(captureStartedAtRef.current);
    setCaptureElapsedMs(Math.min(SINGLE_CAPTURE_DURATION_MS, elapsedMs));
    if (elapsedMs >= SINGLE_CAPTURE_DURATION_MS) {
      finishSingleCapture('complete');
      return;
    }

    const sequence = nextCaptureSequence(captureSequenceRef.current);
    captureSequenceRef.current = sequence;
    captureVideoFrame(video).then((blob) => {
      if (sessionId !== captureSessionRef.current || captureStatusRef.current !== 'recording') return;
      const url = URL.createObjectURL(blob);
      frameObjectUrlsRef.current.push(url);
      setCaptureFrames((current) => [...current, { sequence, elapsedMs, role, url }]);
    }).catch(() => {
      if (sessionId === captureSessionRef.current) finishSingleCapture('failed');
    });
  }, [finishSingleCapture]);

  const sampleSharedCaptureFrame = useCallback(async (sessionId: number) => {
    if (sharedSampleInFlightRef.current || sessionId !== captureSessionRef.current || captureStatusRef.current !== 'recording') return;
    const video = videoRefs.current.side;
    if (!video) return;

    const elapsedMs = getCaptureElapsedMs(captureStartedAtRef.current);
    setCaptureElapsedMs(Math.min(SINGLE_CAPTURE_DURATION_MS, elapsedMs));
    if (elapsedMs >= SINGLE_CAPTURE_DURATION_MS) return;

    sharedSampleInFlightRef.current = true;
    const sequence = nextCaptureSequence(captureSequenceRef.current);
    const capturedAt = Date.now();
    captureSequenceRef.current = sequence;
    try {
      const blob = await captureVideoFrame(video);
      if (sessionId !== captureSessionRef.current || captureStatusRef.current !== 'recording') return;
      const sideUrl = URL.createObjectURL(blob);
      const frontUrl = URL.createObjectURL(blob);
      frameObjectUrlsRef.current.push(sideUrl, frontUrl);
      setSharedPairs((current) => [...current, createSharedCapturePair(
        sequence,
        elapsedMs,
        capturedAt,
        sideUrl,
        frontUrl,
      )]);
    } catch {
      if (sessionId === captureSessionRef.current) finishSingleCapture('failed');
    } finally {
      sharedSampleInFlightRef.current = false;
    }
  }, [finishSingleCapture]);

  const startSingleCapture = useCallback(() => {
    if (!activeRole || isCapturing) return;
    const video = videoRefs.current[activeRole];
    if (!video) return;

    clearCaptureFrames();
    captureSessionRef.current += 1;
    const sessionId = captureSessionRef.current;
    captureRoleRef.current = activeRole;
    captureStartedAtRef.current = performance.now();
    captureStatusRef.current = 'recording';
    setCaptureStatus('recording');
    setCaptureElapsedMs(0);

    captureStopTimerRef.current = window.setTimeout(() => {
      if (sessionId === captureSessionRef.current) finishSingleCapture('complete');
    }, SINGLE_CAPTURE_DURATION_MS);

    const requestVideoFrameCallback = (video as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: VideoFrameRequestCallback) => number;
    }).requestVideoFrameCallback;

    const sample = () => mode === 'shared'
      ? void sampleSharedCaptureFrame(sessionId)
      : sampleCaptureFrame(sessionId);

    if (requestVideoFrameCallback) {
      const scheduleFrame = () => {
        if (sessionId !== captureSessionRef.current) return;
        captureFrameRequestRef.current = requestVideoFrameCallback.call(video, () => {
          sample();
          window.setTimeout(scheduleFrame, SINGLE_CAPTURE_INTERVAL_MS);
        });
      };
      scheduleFrame();
    } else {
      sample();
      captureIntervalRef.current = window.setInterval(sample, SINGLE_CAPTURE_INTERVAL_MS);
    }
  }, [activeRole, clearCaptureFrames, finishSingleCapture, isCapturing, mode, sampleCaptureFrame, sampleSharedCaptureFrame]);

  const stopSingleCapture = useCallback(() => {
    if (isCapturing) {
      captureSessionRef.current += 1;
      finishSingleCapture('cancelled');
    }
  }, [finishSingleCapture, isCapturing]);

  const activateCameras = useCallback(async () => {
    if (!isSupported || !mediaDevices) {
      setError('Browser ini tidak mendukung akses kamera.');
      setStatus({ front: 'failed', side: 'failed' });
      return;
    }

    setIsActivating(true);
    setError(null);

    try {
      const remembered = readCameraAssignment(window.localStorage);
      const rememberedShared = readSharedCameraDevice(window.localStorage);
      const initialDevices = await refreshDevices();
      const sharedDeviceIsAvailable = mode === 'shared'
        && initialDevices.some((device) => device.deviceId === rememberedShared);
      const permissionConstraints: MediaStreamConstraints = mode === 'shared' && sharedDeviceIsAvailable
        ? { video: { deviceId: { exact: rememberedShared } }, audio: false }
        : { video: true, audio: false };
      const permissionStream = await mediaDevices.getUserMedia(permissionConstraints);
      setPermissionRequested(true);

      const available = await refreshDevices();
      const reconciled = reconcileCameraAssignment(remembered, available);
      const streamDeviceId = permissionStream.getVideoTracks?.()[0]?.getSettings?.().deviceId ?? '';
      const nextSharedDevice = mode === 'shared'
        ? streamDeviceId || (sharedDeviceIsAvailable ? rememberedShared : available[0]?.deviceId || '')
        : '';
      setDevices(available);
      assignmentRef.current = reconciled;
      setAssignment(reconciled);
      persistCameraAssignment(window.localStorage, reconciled);
      setSharedDeviceId(nextSharedDevice);

      if (mode === 'shared') {
        await openSharedStream(nextSharedDevice, permissionStream);
      } else {
        stopMediaStream(permissionStream);
        await Promise.all((Object.keys(reconciled) as LogicalCamera[]).map((role) => (
          openRoleStream(role, reconciled[role])
        )));
      }
      if (mode === 'shared' && !nextSharedDevice) stopMediaStream(permissionStream);
    } catch (cameraError) {
      console.error('Failed to activate camera test', cameraError);
      setError(mapCameraError(cameraError));
      setPermissionRequested(true);
      setStatus({ front: 'failed', side: 'failed' });
    } finally {
      setIsActivating(false);
    }
  }, [isSupported, mediaDevices, mode, openRoleStream, openSharedStream, refreshDevices]);

  useEffect(() => {
    if (!permissionRequested || !mediaDevices?.addEventListener) return;

    const handleDeviceChange = async () => {
      const available = await refreshDevices();
      const current = assignmentRef.current;
      const reconciled = reconcileCameraAssignment(current, available);
      const sharedAvailable = sharedDeviceId && available.some((device) => device.deviceId === sharedDeviceId);
      assignmentRef.current = reconciled;
      setAssignment(reconciled);
      persistCameraAssignment(window.localStorage, reconciled);

      if (mode === 'shared') {
        if (!sharedAvailable) {
          stopSharedStream();
          setSharedReady('disconnected');
          setError('Sumber kamera bersama terputus.');
        }
        return;
      }

      (Object.keys(current) as LogicalCamera[]).forEach((role) => {
        if (current[role] && !reconciled[role]) {
          stopRoleStream(role);
          setRoleStatus(role, 'disconnected');
          setError(`${ROLE_LABELS[role]} terputus.`);
        }
      });

      (Object.keys(reconciled) as LogicalCamera[]).forEach((role) => {
        if (reconciled[role] && reconciled[role] !== current[role]) {
          void openRoleStream(role, reconciled[role]);
        }
      });
    };

    mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, [mediaDevices, mode, openRoleStream, permissionRequested, refreshDevices, setRoleStatus, setSharedReady, sharedDeviceId, stopRoleStream, stopSharedStream]);

  useEffect(() => () => {
    captureSessionRef.current += 1;
    sharedRequestRef.current += 1;
    captureStatusRef.current = 'cancelled';
    if (captureStopTimerRef.current !== null) window.clearTimeout(captureStopTimerRef.current);
    if (captureIntervalRef.current !== null) window.clearInterval(captureIntervalRef.current);
    const role = captureRoleRef.current;
    const video = role ? videoRefs.current[role] : null;
    if (video && captureFrameRequestRef.current !== null && 'cancelVideoFrameCallback' in video) {
      (video as HTMLVideoElement & { cancelVideoFrameCallback: (handle: number) => void }).cancelVideoFrameCallback(captureFrameRequestRef.current);
    }
    frameObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    frameObjectUrlsRef.current = [];
    (Object.keys(streamRequestRef.current) as LogicalCamera[]).forEach((role) => {
      streamRequestRef.current[role] += 1;
    });
    (Object.keys(streamsRef.current) as LogicalCamera[]).forEach(stopRoleStream);
    stopSharedStream();
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, [stopRoleStream, stopSharedStream]);

  const handleAssignmentChange = async (role: LogicalCamera, deviceId: string) => {
    if (isCapturing || !isAssignmentAvailable(assignmentRef.current, role, deviceId)) return;

    const nextAssignment = { ...assignmentRef.current, [role]: deviceId };
    assignmentRef.current = nextAssignment;
    setAssignment(nextAssignment);
    persistCameraAssignment(window.localStorage, nextAssignment);
    await openRoleStream(role, deviceId);
  };

  const handleVideoReady = (role: LogicalCamera) => {
    if (mode === 'shared' && sharedStreamRef.current) {
      setStatus({ front: 'ready', side: 'ready' });
    } else if (streamsRef.current[role]) {
      setRoleStatus(role, 'ready');
    }
  };

  const handleSnapshot = async () => {
    if (!bothReady) return;

    const sideVideo = videoRefs.current.side;
    const frontVideo = videoRefs.current.front;
    if (!sideVideo || !frontVideo) return;

    try {
      const capturedAt = formatCaptureTime(new Date());
      const sideBlob = await captureVideoFrame(sideVideo);
      const frontBlob = mode === 'shared' ? sideBlob : await captureVideoFrame(frontVideo);
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      const sideUrl = URL.createObjectURL(sideBlob);
      const frontUrl = mode === 'shared' ? URL.createObjectURL(sideBlob) : URL.createObjectURL(frontBlob);
      objectUrlsRef.current = [sideUrl, frontUrl];
      const nextSequence = pairedSnapshotSequenceRef.current + 1;
      pairedSnapshotSequenceRef.current = nextSequence;
      setSnapshot({
        sequence: nextSequence,
        capturedAt,
        sideUrl,
        frontUrl,
      });
    } catch (snapshotError) {
      console.error('Failed to capture paired snapshot', snapshotError);
      setError('Snapshot belum dapat dibuat. Pastikan kedua kamera menampilkan gambar.');
    }
  };

  const deviceOptions = useMemo(() => devices.map((device, index) => ({
    id: device.deviceId,
    name: getCameraDisplayName(device, index),
  })), [devices]);

  return (
    <div className="camera-test-page">
      <div className="camera-test-intro">
        <div>
          <div className="camera-test-kicker">ENGINEERING POC · CAMERA I/O</div>
          <h1>Uji Dual Kamera</h1>
          <p>Uji terisolasi untuk dua kamera browser dan snapshot berpasangan.</p>
        </div>
        <div className="camera-test-api-note">Browser MediaDevices</div>
      </div>

      <section className="camera-test-panel camera-test-setup" aria-labelledby="camera-setup-title">
        <div className="camera-test-panel-heading">
          <div>
            <div className="camera-test-section-label">01 / KONFIGURASI</div>
            <h2 id="camera-setup-title">Pilih perangkat fisik</h2>
          </div>
          <button className="btn btn-primary" type="button" onClick={() => void activateCameras()} disabled={isActivating || !isSupported}>
            <Camera size={16} />
            {isActivating ? 'Mengaktifkan...' : 'Aktifkan Kamera'}
          </button>
        </div>

        {!isSupported && <p className="camera-test-error">Browser ini tidak mendukung akses kamera.</p>}
        {error && <p className="camera-test-error" role="alert">{error}</p>}

        <div className="camera-test-mode-switch" role="group" aria-label="Mode Uji Kamera">
          <span>Mode Uji Kamera</span>
          <button type="button" className={mode === 'separate' ? 'is-selected' : ''} onClick={() => void handleModeChange('separate')} disabled={isCapturing}>Kamera Terpisah</button>
          <button type="button" className={mode === 'shared' ? 'is-selected' : ''} onClick={() => void handleModeChange('shared')} disabled={isCapturing}>1 Kamera untuk 2 View</button>
        </div>

        {mode === 'shared' ? (
          <div className="camera-test-shared-assignment">
            <label htmlFor="shared-camera-device">Sumber Kamera Bersama</label>
            <select id="shared-camera-device" className="form-select" value={sharedDeviceId} onChange={(event) => void handleSharedDeviceChange(event.target.value)} disabled={isCapturing || !permissionRequested || deviceOptions.length === 0}>
              <option value="">Pilih perangkat</option>
              {deviceOptions.map((device) => <option key={device.id} value={device.id}>{device.name}</option>)}
            </select>
            <p>Mode uji: Kamera Samping dan Kamera Depan menggunakan sumber kamera yang sama.</p>
          </div>
        ) : (
          <div className="camera-test-assignment-grid">
            {(['side', 'front'] as LogicalCamera[]).map((role) => (
            <div className="camera-test-assignment" key={role}>
              <label htmlFor={`camera-${role}-device`}>{ROLE_LABELS[role]}</label>
              <select
                id={`camera-${role}-device`}
                aria-label={ROLE_LABELS[role]}
                className="form-select"
                value={assignment[role]}
                onChange={(event) => void handleAssignmentChange(role, event.target.value)}
                disabled={isCapturing || !permissionRequested || deviceOptions.length === 0}
              >
                <option value="">Pilih perangkat</option>
                {deviceOptions.map((device) => (
                  <option
                    key={device.id}
                    value={device.id}
                    disabled={!isAssignmentAvailable(assignment, role, device.id)}
                  >
                    {device.name}
                  </option>
                ))}
              </select>
              {!assignment[role] && permissionRequested && <small>Pilih perangkat untuk membuka kamera ini.</small>}
            </div>
            ))}
          </div>
        )}
      </section>

      <section className="camera-test-panel" aria-labelledby="single-capture-title">
        <div className="camera-test-panel-heading compact">
          <div>
            <div className="camera-test-section-label">03 / CAPTURE</div>
            <h2 id="single-capture-title">{mode === 'shared' ? 'Capture 2 View' : 'Uji 1 Kamera'}</h2>
          </div>
          <span className="camera-test-hardware-note">Capture langsung dari preview aktif</span>
        </div>

        <div className="camera-test-single-summary">
          <div><span>Mode</span><strong>{mode === 'shared' ? '1 Kamera → 2 View' : 'Uji 1 Kamera'}</strong></div>
          <div><span>Kamera</span><strong>{mode === 'shared' ? 'Sumber kamera yang sama' : activeRole ? ROLE_LABELS[activeRole] : 'Belum siap'}</strong></div>
          <div><span>Status</span><strong>{CAPTURE_STATUS_LABELS[captureStatus]}</strong></div>
          <div><span>Durasi</span><strong>{(captureElapsedMs / 1000).toFixed(1)} / 3.0 s</strong></div>
        </div>

        <div className="camera-test-action-row">
          <button className="btn btn-primary" type="button" onClick={isCapturing ? stopSingleCapture : startSingleCapture} disabled={!activeRole && !isCapturing}>
            {isCapturing ? 'Hentikan Capture' : 'Mulai Capture'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={clearCaptureResults} disabled={isCapturing || (captureFrames.length === 0 && sharedPairs.length === 0 && !snapshot)}>
            Bersihkan Hasil
          </button>
          {isCapturing && <span>Merekam...</span>}
        </div>

        {mode === 'shared' && sharedPairs.length > 0 && (
          <div className="camera-test-frame-results">
            <div className="camera-test-frame-results-heading"><strong>HASIL CAPTURE</strong><span>Pasangan Frame: {sharedPairs.length}</span></div>
            <div className="camera-test-pair-grid" aria-label="Timeline pasangan frame">
              {sharedPairs.map((pair) => (
                <button className="camera-test-pair" type="button" key={pair.sequence} onClick={() => setSelectedPair(pair)}>
                  <div><strong>Pair #{pair.sequence.toString().padStart(3, '0')}</strong><small>{pair.elapsedMs} ms · Sinkron dari sumber kamera yang sama</small></div>
                  <span><img src={pair.side.imageUrl} alt={`Pair ${pair.sequence} kamera samping`} /><img src={pair.front.imageUrl} alt={`Pair ${pair.sequence} kamera depan`} /></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {mode !== 'shared' && captureFrames.length > 0 && (
          <div className="camera-test-frame-results">
            <div className="camera-test-frame-results-heading">
              <strong>HASIL CAPTURE</strong>
              <span>Frame: {captureFrames.length}</span>
            </div>
            <div className="camera-test-frame-grid" aria-label="Timeline frame capture">
              {captureFrames.map((frame) => (
                <button className="camera-test-frame" type="button" key={frame.sequence} onClick={() => setSelectedFrame(frame)}>
                  <img src={frame.url} alt={`Frame ${frame.sequence}`} />
                  <span>#{frame.sequence.toString().padStart(3, '0')}</span>
                  <small>{frame.elapsedMs} ms · {ROLE_LABELS[frame.role]}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedPair && (
          <div className="camera-test-frame-detail" role="dialog" aria-label="Detail pasangan frame" onClick={() => setSelectedPair(null)}>
            <div onClick={(event) => event.stopPropagation()}>
              <div className="camera-test-pair-detail-images"><img src={selectedPair.side.imageUrl} alt="Detail kamera samping" /><img src={selectedPair.front.imageUrl} alt="Detail kamera depan" /></div>
              <p>Pair #{selectedPair.sequence.toString().padStart(3, '0')} · {selectedPair.elapsedMs} ms · 1 Kamera → 2 View</p>
              <button className="btn btn-secondary" type="button" onClick={() => setSelectedPair(null)}>Tutup</button>
            </div>
          </div>
        )}

        {selectedFrame && (
          <div className="camera-test-frame-detail" role="dialog" aria-label="Detail frame" onClick={() => setSelectedFrame(null)}>
            <div onClick={(event) => event.stopPropagation()}>
              <img src={selectedFrame.url} alt={`Frame ${selectedFrame.sequence} diperbesar`} />
              <p>Frame #{selectedFrame.sequence.toString().padStart(3, '0')} · {selectedFrame.elapsedMs} ms · {ROLE_LABELS[selectedFrame.role]}</p>
              <button className="btn btn-secondary" type="button" onClick={() => setSelectedFrame(null)}>Tutup</button>
            </div>
          </div>
        )}
      </section>

      <section className="camera-test-panel" aria-labelledby="camera-preview-title">
        <div className="camera-test-panel-heading compact">
          <div>
            <div className="camera-test-section-label">02 / LIVE PREVIEW</div>
            <h2 id="camera-preview-title">{mode === 'shared' ? 'Dua view dari satu sumber' : 'Dua kamera independen'}</h2>
          </div>
          <span className="camera-test-hardware-note">{mode === 'shared' ? 'Sinkron dari sumber kamera yang sama' : 'Perangkat fisik tetap dapat ditukar'}</span>
        </div>

        <div className="camera-test-preview-grid">
          {(['side', 'front'] as LogicalCamera[]).map((role) => (
            <div className="camera-test-preview" key={role}>
              <div className="camera-test-preview-heading">
                <strong>{ROLE_LABELS[role].toUpperCase()}</strong>
                <span className={`camera-test-status status-${status[role]}`}><i aria-hidden="true" />{STATUS_LABELS[status[role]]}</span>
              </div>
              <div className="camera-test-video-frame">
                <video
                  ref={(node) => { videoRefs.current[role] = node; }}
                  autoPlay
                  playsInline
                  muted
                  onLoadedMetadata={() => handleVideoReady(role)}
                  onCanPlay={() => handleVideoReady(role)}
                  onEnded={() => {
                    if (mode === 'shared') {
                      stopSharedStream();
                      setSharedReady('disconnected');
                      setError('Sumber kamera bersama terputus.');
                    } else {
                      setRoleStatus(role, 'disconnected');
                      setError(`${ROLE_LABELS[role]} terputus.`);
                    }
                  }}
                  onError={() => {
                    if (mode === 'shared') {
                      setSharedReady('failed');
                    } else {
                      setRoleStatus(role, 'failed');
                    }
                    setError('Kamera gagal dibuka.');
                  }}
                />
                {status[role] !== 'ready' && <span className="camera-test-video-placeholder">Preview belum aktif</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="camera-test-action-row">
          <button className="btn btn-primary" type="button" onClick={() => void handleSnapshot()} disabled={!bothReady}>
            <Images size={16} /> Ambil Snapshot Bersamaan
          </button>
          {!bothReady && <span>Snapshot aktif setelah kedua kamera berstatus Siap.</span>}
        </div>
      </section>

      <section className="camera-test-panel" aria-labelledby="snapshot-title">
        <div className="camera-test-panel-heading compact">
          <div>
            <div className="camera-test-section-label">04 / HASIL UJI</div>
            <h2 id="snapshot-title">Snapshot {snapshot ? `#${snapshot.sequence.toString().padStart(3, '0')}` : 'belum tersedia'}</h2>
          </div>
          {snapshot && <span className="camera-test-time">Waktu: {snapshot.capturedAt}</span>}
        </div>

        {snapshot ? (
          <div className="camera-test-snapshot-grid">
            <figure><figcaption>KAMERA SAMPING</figcaption><img src={snapshot.sideUrl} alt="Snapshot kamera samping" /></figure>
            <figure><figcaption>KAMERA DEPAN</figcaption><img src={snapshot.frontUrl} alt="Snapshot kamera depan" /></figure>
          </div>
        ) : (
          <div className="camera-test-empty"><RefreshCw size={18} /> Snapshot berpasangan akan muncul di sini.</div>
        )}
      </section>
    </div>
  );
}
