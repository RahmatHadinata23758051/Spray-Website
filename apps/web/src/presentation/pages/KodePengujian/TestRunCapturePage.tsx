import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  kodePengujianRepository,
  captureAssetStore,
  captureAssetResolver,
  simulationService,
  getCaptureSavePolicy,
  setCaptureSavePolicy,
  syncService,
} from '../../../application/services';
import { buildTestRunVideoAssetId } from '../../../application/captureAssets';
import type { KodePengujian, TestRun, RealSideCaptureFrameMetadata, SynchronizedAnalysisFrame, CaptureSavePolicy } from '@spray-paragon/domain';
import type { CaptureVideoMetadata } from '@spray-paragon/domain';
import { DEFAULT_REAL_SIDE_BASELINE_WINDOW_MS } from '@spray-paragon/domain';
import { Status } from '../../components/ui/Status';
import { Overlay } from '../../components/ui/Overlay';
import {
  REAL_CAPTURE_DURATION_MS,
  REAL_CAPTURE_INTERVAL_MS,
  captureRealSideFrameForTestRun,
  getRealCaptureElapsedMs,
  getSideCameraConstraints,
  nowMs,
  releaseRealCaptureFrames,
  stopRealCaptureStream,
  toRealSideCaptureFrameMetadata,
  type RealSideCaptureFrame,
  toCaptureVideoMetadata,
  isVideoRecordingSupported,
  startSideVideoRecording,
  releaseRealCaptureVideo,
  type RealSideCaptureVideo,
  type RecordedVideoResult,
  type ActiveVideoRecording,
} from '../Batches/realCapture';

const simulationFrames = simulationService.getFrames();

type CaptureMode = 'simulation' | 'real';
type RealCaptureStatus = 'idle' | 'activating' | 'recording' | 'complete' | 'failed';

interface TestRunCaptureContext {
  kp: KodePengujian;
  sample: KodePengujian['samples'][0];
  testRun: TestRun;
  effectiveStorage: string;
  effectiveBottlePosition: string;
}

interface PendingCapture {
  mode: CaptureMode;
  realFrames?: RealSideCaptureFrame[];
  realVideo?: RealSideCaptureVideo | null;
  simulatedMoments?: SynchronizedAnalysisFrame[];
  capturedAt: string;
  baselineWindowMs?: number;
}

export function TestRunCapturePage() {
  const { kpId, sampleId, runId } = useParams();
  const navigate = useNavigate();
  const [context, setContext] = useState<TestRunCaptureContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [mode, setMode] = useState<CaptureMode>('simulation');
  const [realDurationMs, setRealDurationMs] = useState(REAL_CAPTURE_DURATION_MS);
  const [realStatus, setRealStatus] = useState<RealCaptureStatus>('idle');
  const [realFrames, setRealFrames] = useState<RealSideCaptureFrame[]>([]);
  const [restoredRealFrameCount, setRestoredRealFrameCount] = useState(0);
  const [isRealPreview, setIsRealPreview] = useState(true);
  const [selectedRealFrameIndex, setSelectedRealFrameIndex] = useState(0);
  const [baselineWindowMs, setBaselineWindowMs] = useState(DEFAULT_REAL_SIDE_BASELINE_WINDOW_MS);
  const [manualRangeDraft, setManualRangeDraft] = useState<{ start: string; end: string } | null>(null);
  const [isApplyingBaseline, setIsApplyingBaseline] = useState(false);

  // P5: Video recording state
  const [realVideo, setRealVideo] = useState<RealSideCaptureVideo | null>(null);
  const [restoredVideo, setRestoredVideo] = useState<RealSideCaptureVideo | null>(null);

  // P4: Save Policy
  const [savePolicy, setSavePolicy] = useState<CaptureSavePolicy>(getCaptureSavePolicy());

  // P4: Pending capture (unsaved state)
  const [pendingCapture, setPendingCapture] = useState<PendingCapture | null>(null);
  const hasUnsavedCapture = pendingCapture !== null;

  // P4: Navigation confirmation state
  const [showNavConfirmation, setShowNavConfirmation] = useState(false);
  const [targetNavPath, setTargetNavPath] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const realFramesRef = useRef<RealSideCaptureFrame[]>([]);
  const recordingRef = useRef<ActiveVideoRecording | null>(null);
  const captureStartedAtRef = useRef<string>('');
  const realSessionRef = useRef(0);
  const realStartedAtRef = useRef(0);
  const realDurationMsRef = useRef(REAL_CAPTURE_DURATION_MS);
  const realTimerRef = useRef<number | null>(null);

  const clearRealFrames = useCallback(() => {
    releaseRealCaptureFrames(realFramesRef.current);
    realFramesRef.current = [];
    setRealFrames([]);
    setRestoredRealFrameCount(0);
    setSelectedRealFrameIndex(0);
    setCaptureProgress(0);
  }, []);

  const clearRealVideo = useCallback(() => {
    if (recordingRef.current) {
      recordingRef.current.abort();
      recordingRef.current = null;
    }
    setRealVideo((prev) => {
      releaseRealCaptureVideo(prev);
      return null;
    });
    setRestoredVideo((prev) => {
      releaseRealCaptureVideo(prev);
      return null;
    });
  }, []);

  const resolvePersistedFrames = useCallback(async (metadata: RealSideCaptureFrameMetadata[]) => {
    const restored: RealSideCaptureFrame[] = [];
    for (const frame of metadata) {
      if (!frame.assetId) continue;
      const blob = await captureAssetResolver.resolveBlob(frame);
      if (!blob) continue;
      restored.push({
        id: frame.id,
        frameIndex: frame.frameIndex,
        capturedAt: frame.capturedAt,
        elapsedMs: frame.elapsedMs,
        camera: 'side',
        assetId: frame.assetId,
        blob,
        imageUrl: URL.createObjectURL(blob),
      });
    }
    return restored;
  }, []);

  const restorePersistedVideo = useCallback(async (videoMeta: CaptureVideoMetadata) => {
    if (!videoMeta.assetId) return null;
    const blob = await captureAssetResolver.resolveVideoBlob(videoMeta);
    if (!blob) return null;
    const videoUrl = URL.createObjectURL(blob);
    const video: RealSideCaptureVideo = {
      assetId: videoMeta.assetId,
      camera: 'side',
      blob,
      videoUrl,
      mimeType: videoMeta.mimeType,
      durationMs: videoMeta.durationMs,
      sizeBytes: videoMeta.sizeBytes ?? blob.size,
      startedAt: videoMeta.startedAt,
      completedAt: videoMeta.completedAt,
    };
    return video;
  }, []);

  const stopRealResources = useCallback(() => {
    realSessionRef.current += 1;
    if (realTimerRef.current !== null) window.clearInterval(realTimerRef.current);
    realTimerRef.current = null;
    stopRealCaptureStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // P4: Browser beforeunload protection
  useEffect(() => {
    if (!hasUnsavedCapture) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedCapture]);

  // P4: In-app navigation interceptor - intercepts sidebar/header navigation
  useEffect(() => {
    if (!hasUnsavedCapture) {
      delete window.__spraybot_on_nav_attempt;
      delete window.__spraybot_navigation_blocker;
      return;
    }

    const handleNavAttempt = async (targetPath: string) => {
      // Show custom confirmation modal
      setTargetNavPath(targetPath);
      setShowNavConfirmation(true);
      // Wait for user decision
      return new Promise<boolean>((resolve) => {
        const checkDecision = setInterval(() => {
          if (!showNavConfirmation) {
            clearInterval(checkDecision);
            resolve(true); // navigation allowed (user chose save or discard)
          }
        }, 100);
      });
    };

    window.__spraybot_on_nav_attempt = handleNavAttempt;

    // Also listen for popstate (browser back/forward)
    const handlePopState = (event: PopStateEvent) => {
      if (hasUnsavedCapture) {
        event.preventDefault();
        void handleNavAttempt(window.location.pathname);
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      delete window.__spraybot_on_nav_attempt;
      delete window.__spraybot_navigation_blocker;
    };
  }, [hasUnsavedCapture, showNavConfirmation]);

  useEffect(() => {
    if (!kpId || !sampleId || !runId) {
      setError('Parameter URL tidak lengkap');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const loadContext = async () => {
      try {
        const kp = await kodePengujianRepository.get(kpId);
        if (cancelled) return;
        if (!kp) {
          setError(`Kode Pengujian ${kpId} tidak ditemukan`);
          return;
        }
        const sample = kp.samples.find(s => s.id === sampleId);
        if (!sample) {
          setError(`Sampel ${sampleId} tidak ditemukan dalam Kode Pengujian ${kpId}`);
          return;
        }
        const testRun = kp.testRuns.find(t => t.id === runId && t.sampleId === sampleId);
        if (!testRun) {
          setError(`Pengujian ${runId} tidak ditemukan untuk Sampel ${sampleId}`);
          return;
        }
        if (testRun.status !== 'PENDING' && testRun.status !== 'CAPTURING') {
          navigate(`/kode-pengujian/${kpId}`);
          return;
        }
        const effectiveStorage = sample.storageCondition ?? kp.storageCondition ?? '—';
        const effectiveBottlePosition = sample.bottlePosition ?? kp.bottlePosition ?? '—';
        setContext({ kp, sample, testRun, effectiveStorage, effectiveBottlePosition });
        const isRealSession = testRun.captureSession?.captureMode === 'real';
        const persistedFrames = isRealSession ? (testRun.captureSession?.realSideFrames ?? []) : [];
        setRestoredRealFrameCount(persistedFrames.length);
        setMode(isRealSession ? 'real' : 'simulation');
        setIsRealPreview(!isRealSession);
        // A restored real session is never re-driven by the simulation loop; its status stays CAPTURING until the operator aborts.
        setIsCapturing(!isRealSession && testRun.status === 'CAPTURING');
        if (isRealSession) {
          const restored = await resolvePersistedFrames(persistedFrames);
          if (cancelled) {
            releaseRealCaptureFrames(restored);
            return;
          }
          realFramesRef.current = restored;
          setRealFrames(restored);
          setSelectedRealFrameIndex(restored[0]?.frameIndex ?? 0);
          // Restore video if present
          const videoMeta = testRun.captureSession?.video;
          if (videoMeta) {
            const restoredVideo = await restorePersistedVideo(videoMeta);
            if (restoredVideo) {
              setRestoredVideo(restoredVideo);
            }
          }
        }
      } catch (loadError) {
        if (cancelled) return;
        console.error('Failed to load test run context', loadError);
        setError('Gagal memuat konteks pengujian');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadContext();
    return () => {
      cancelled = true;
    };
  }, [kpId, sampleId, runId, navigate, resolvePersistedFrames, restorePersistedVideo]);

  useEffect(() => () => {
    stopRealResources();
    clearRealFrames();
    clearRealVideo();
  }, [clearRealFrames, clearRealVideo, stopRealResources]);

  const handleStartSimulation = async () => {
    if (!context || context.testRun.status !== 'PENDING') return;
    try {
      const now = new Date().toISOString();
      const updatedKp = await kodePengujianRepository.updateTestRun(context.kp.id, context.testRun.id, {
        status: 'CAPTURING',
        startedAt: now,
        captureSession: {
          scenario: context.testRun.fixture,
          synchronizedMoments: [], // Empty initially; filled on completion/save
          startedAt: now,
          captureMode: 'simulation',
        },
      });
      setContext(c => c ? { ...c, testRun: updatedKp } : null);
      setMode('simulation');
      setIsCapturing(true);
    } catch (startError) {
      console.error('Failed to start simulated capture', startError);
      setError('Gagal memulai akuisisi simulasi');
    }
  };

  const handleStartRealCapture = async () => {
    if (!context || context.testRun.status !== 'PENDING' || !navigator.mediaDevices?.getUserMedia) {
      setError('Browser ini tidak mendukung akses kamera.');
      return;
    }
    setError(null);
    setRealStatus('activating');
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getSideCameraConstraints());
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Preview Side belum tersedia.');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const now = new Date().toISOString();
      const updatedKp = await kodePengujianRepository.updateTestRun(context.kp.id, context.testRun.id, {
        status: 'CAPTURING',
        startedAt: now,
        captureSession: {
          scenario: context.testRun.fixture,
          synchronizedMoments: [],
          startedAt: now,
          captureMode: 'real',
        },
      });
      await captureAssetStore.deleteScope({ kind: 'testRun', kpId: context.kp.id, sampleId: context.sample.id, runId: context.testRun.id }).catch((cleanupError) => {
        console.warn('Could not remove superseded capture assets before replacement.', cleanupError);
      });
      clearRealFrames();
      clearRealVideo();
      realSessionRef.current += 1;
      const sessionId = realSessionRef.current;
      captureStartedAtRef.current = now;
      realStartedAtRef.current = nowMs();
      realDurationMsRef.current = realDurationMs;
      setContext(c => c ? { ...c, testRun: updatedKp } : null);
      setMode('real');
      setIsRealPreview(true);
      setIsCapturing(true);
      setRealStatus('recording');

      // Start video recording using the same stream
      const recording = startSideVideoRecording(stream);
      recordingRef.current = recording;

      const sample = async () => {
        if (sessionId !== realSessionRef.current || !videoRef.current || !context) return;
        const elapsedMs = getRealCaptureElapsedMs(realStartedAtRef.current);
        if (elapsedMs >= realDurationMsRef.current) {
          await finishRealCapture(sessionId);
          return;
        }
        try {
          const frame = await captureRealSideFrameForTestRun(
            videoRef.current,
            realFramesRef.current.length,
            realStartedAtRef.current,
            context.kp.id,
            context.sample.id,
            context.testRun.id,
          );
          if (sessionId !== realSessionRef.current) {
            releaseRealCaptureFrames([frame]);
            return;
          }
          realFramesRef.current = [...realFramesRef.current, frame];
          setSelectedRealFrameIndex(frame.frameIndex);
          setRealFrames(realFramesRef.current);
          setCaptureProgress(realFramesRef.current.length);
        } catch (captureError) {
          console.error('Failed to capture Side frame', captureError);
          setError('Gagal mengambil frame Side.');
          setRealStatus('failed');
          stopRealResources();
        }
      };
      await sample();
      realTimerRef.current = window.setInterval(() => void sample(), REAL_CAPTURE_INTERVAL_MS);
    } catch (cameraError) {
      console.error('Failed to start real capture', cameraError);
      stopRealResources();
      setRealStatus('failed');
      setError('Kamera Side gagal dibuka. Periksa izin kamera dan perangkat.');
    }
  };

  const finishRealCapture = async (targetSessionId?: number) => {
    const sessionId = targetSessionId ?? realSessionRef.current;
    if (sessionId !== realSessionRef.current || !context) return;
    realSessionRef.current += 1;
    if (realTimerRef.current !== null) window.clearInterval(realTimerRef.current);
    realTimerRef.current = null;
    const capturedFrames = realFramesRef.current;

    // Stop video recording
    let recordedVideo: RecordedVideoResult | null = null;
    if (recordingRef.current) {
      recordedVideo = await recordingRef.current.stop();
      recordingRef.current = null;
    }

    stopRealCaptureStream(streamRef.current);
    streamRef.current = null;
    setIsCapturing(false);
    setIsRealPreview(false);
    setRealStatus('complete');

    // Build video object if recording succeeded
    let capturedVideo: RealSideCaptureVideo | null = null;
    if (recordedVideo) {
      const videoAssetId = buildTestRunVideoAssetId(context.kp.id, context.sample.id, context.testRun.id);
      const videoUrl = URL.createObjectURL(recordedVideo.blob);
      capturedVideo = {
        assetId: videoAssetId,
        camera: 'side',
        blob: recordedVideo.blob,
        videoUrl,
        mimeType: recordedVideo.mimeType,
        durationMs: recordedVideo.durationMs,
        sizeBytes: recordedVideo.sizeBytes,
        startedAt: captureStartedAtRef.current,
        completedAt: new Date().toISOString(),
      };
      setRealVideo(capturedVideo);
    }

    try {
      const now = new Date().toISOString();
      const defaultWindowMs = DEFAULT_REAL_SIDE_BASELINE_WINDOW_MS;
      const maxElapsed = capturedFrames[capturedFrames.length - 1]?.elapsedMs ?? 0;
      const appliedWindowMs = Math.min(defaultWindowMs, maxElapsed);
      const baselineFrames = capturedFrames
        .filter(f => f.elapsedMs >= 0 && f.elapsedMs <= appliedWindowMs)
        .map(f => ({
          frameId: f.id,
          frameIndex: f.frameIndex,
          elapsedMs: f.elapsedMs,
          assetId: f.assetId,
        }));
      const realSideBaseline = baselineFrames.length > 0 ? {
        selectionMethod: 'initial-window' as const,
        configuredWindowMs: defaultWindowMs,
        startElapsedMs: 0,
        endElapsedMs: appliedWindowMs,
        frames: baselineFrames,
        selectedAt: now,
      } : undefined;

      if (savePolicy === 'auto') {
        // AUTO MODE: Persist assets and metadata immediately
        for (const frame of capturedFrames) {
          await captureAssetStore.save(
            frame.assetId,
            { kind: 'testRun', kpId: context.kp.id, sampleId: context.sample.id, runId: context.testRun.id },
            frame.blob
          );
        }
        // Save video if available
        if (capturedVideo) {
          await captureAssetStore.save(
            capturedVideo.assetId,
            { kind: 'testRun', kpId: context.kp.id, sampleId: context.sample.id, runId: context.testRun.id },
            capturedVideo.blob,
            'video'
          );
        }
        const persistedKp = await kodePengujianRepository.updateTestRun(context.kp.id, context.testRun.id, {
          captureSession: {
            scenario: context.testRun.fixture,
            synchronizedMoments: [],
            startedAt: context.testRun.captureSession?.startedAt ?? now,
            capturedAt: now,
            captureMode: 'real',
            realSideFrames: capturedFrames.map(toRealSideCaptureFrameMetadata),
            realSideBaseline,
            video: capturedVideo ? toCaptureVideoMetadata(capturedVideo) : undefined,
          },
        });
        setContext(c => c ? { ...c, testRun: persistedKp } : null);
        void syncService.queueSync(context.kp.id);
        setPendingCapture(null);
      } else {
        // REVIEW MODE: Keep capture in pending state, do NOT persist to repository or asset store yet
        setPendingCapture({
          mode: 'real',
          realFrames: capturedFrames,
          realVideo: capturedVideo,
          capturedAt: now,
          baselineWindowMs: defaultWindowMs,
        });
      }
    } catch (captureError) {
      console.error('Failed to process real capture completion', captureError);
      // Cleanup video on error
      if (capturedVideo) {
        releaseRealCaptureVideo(capturedVideo);
        setRealVideo(null);
      }
      await captureAssetStore.deleteScope({ kind: 'testRun', kpId: context.kp.id, sampleId: context.sample.id, runId: context.testRun.id }).catch(() => undefined);
      setError('Gagal memproses hasil tangkapan.');
      setRealStatus('failed');
    }
  };

  const handleCompleteSimulation = useCallback(async () => {
    if (!context) return;
    const now = new Date().toISOString();
    const moments = simulationService.getSynchronizedFrames();
    try {
      if (savePolicy === 'auto') {
        // AUTO MODE: Persist and stay on page
        const updatedKp = await kodePengujianRepository.updateTestRun(context.kp.id, context.testRun.id, {
          captureSession: {
            scenario: context.testRun.fixture,
            synchronizedMoments: moments,
            startedAt: context.testRun.captureSession?.startedAt ?? now,
            capturedAt: now,
            captureMode: 'simulation',
          },
          status: 'CAPTURING',
        });
        setContext(c => c ? { ...c, testRun: updatedKp } : null);
        void syncService.queueSync(context.kp.id);
        setPendingCapture(null);
      } else {
        // REVIEW MODE: Keep in pending state
        setPendingCapture({
          mode: 'simulation',
          simulatedMoments: moments,
          capturedAt: now,
        });
      }
      setIsCapturing(false);
    } catch (completeError) {
      console.error('Failed to complete simulated capture', completeError);
      setError('Gagal menyelesaikan akuisisi simulasi');
    }
  }, [context, savePolicy]);

  useEffect(() => {
    if (mode !== 'simulation' || !isCapturing) return;
    const interval = window.setInterval(() => {
      setCaptureProgress((previous) => {
        if (previous >= 60) {
          window.clearInterval(interval);
          void handleCompleteSimulation();
          return previous;
        }
        return previous + 1;
      });
    }, 20);
    return () => window.clearInterval(interval);
  }, [handleCompleteSimulation, isCapturing, mode]);

  const applyInitialBaseline = async () => {
    if (!context || mode !== 'real' || realDisplayCount === 0) return;
    setIsApplyingBaseline(true);
    setError(null);
    try {
      const frames = realFramesRef.current;
      const appliedWindowMs = Math.min(baselineWindowMs, frames[frames.length - 1].elapsedMs);
      const baselineFrames = frames
        .filter(f => f.elapsedMs >= 0 && f.elapsedMs <= appliedWindowMs)
        .map(f => ({
          frameId: f.id,
          frameIndex: f.frameIndex,
          elapsedMs: f.elapsedMs,
          assetId: f.assetId,
        }));
      const updatedKp = await kodePengujianRepository.updateTestRun(context.kp.id, context.testRun.id, {
        captureSession: {
          ...context.testRun.captureSession!,
          realSideBaseline: {
            selectionMethod: 'initial-window',
            configuredWindowMs: baselineWindowMs,
            startElapsedMs: 0,
            endElapsedMs: appliedWindowMs,
            frames: baselineFrames,
            selectedAt: new Date().toISOString(),
          },
        },
      });
      setContext(c => c ? { ...c, testRun: updatedKp } : null);
    } catch (baselineError) {
      console.error('Failed to select initial Side baseline', baselineError);
      setError('Baseline pra-spray tidak dapat dipilih. Pastikan ada frame Side tersimpan.');
    } finally {
      setIsApplyingBaseline(false);
    }
  };

  const applyManualBaseline = async (startElapsedMs: number, endElapsedMs: number) => {
    if (!context || mode !== 'real') return;
    setIsApplyingBaseline(true);
    setError(null);
    try {
      const frames = realFramesRef.current;
      const capturedSpanMs = frames[frames.length - 1].elapsedMs;
      if (endElapsedMs > capturedSpanMs) {
        setError('Rentang baseline tidak valid. Pilih rentang yang masih berada dalam capture.');
        return;
      }
      const baselineFrames = frames
        .filter(f => f.elapsedMs >= startElapsedMs && f.elapsedMs <= endElapsedMs)
        .map(f => ({
          frameId: f.id,
          frameIndex: f.frameIndex,
          elapsedMs: f.elapsedMs,
          assetId: f.assetId,
        }));
      if (baselineFrames.length === 0) {
        setError('Tidak ada frame Side dalam rentang yang dipilih.');
        return;
      }
      const updatedKp = await kodePengujianRepository.updateTestRun(context.kp.id, context.testRun.id, {
        captureSession: {
          ...context.testRun.captureSession!,
          realSideBaseline: {
            selectionMethod: 'manual-range',
            configuredWindowMs: endElapsedMs - startElapsedMs,
            startElapsedMs,
            endElapsedMs,
            frames: baselineFrames,
            selectedAt: new Date().toISOString(),
          },
        },
      });
      setContext(c => c ? { ...c, testRun: updatedKp } : null);
      setManualRangeDraft(null);
    } catch (baselineError) {
      console.error('Failed to select manual Side baseline', baselineError);
      setError('Rentang baseline tidak valid. Pilih rentang yang masih berada dalam capture.');
    } finally {
      setIsApplyingBaseline(false);
    }
  };

  // P4: Save pending capture to repository and asset store
  const handleSaveCapture = async () => {
    if (!context || !pendingCapture) return;
    try {
      const now = pendingCapture.capturedAt || new Date().toISOString();
      if (pendingCapture.mode === 'real') {
        const capturedFrames = pendingCapture.realFrames ?? realFramesRef.current;
        for (const frame of capturedFrames) {
          await captureAssetStore.save(
            frame.assetId,
            { kind: 'testRun', kpId: context.kp.id, sampleId: context.sample.id, runId: context.testRun.id },
            frame.blob
          );
        }
        const defaultWindowMs = pendingCapture.baselineWindowMs ?? DEFAULT_REAL_SIDE_BASELINE_WINDOW_MS;
        const maxElapsed = capturedFrames[capturedFrames.length - 1]?.elapsedMs ?? 0;
        const appliedWindowMs = Math.min(defaultWindowMs, maxElapsed);
        const baselineFrames = capturedFrames
          .filter(f => f.elapsedMs >= 0 && f.elapsedMs <= appliedWindowMs)
          .map(f => ({
            frameId: f.id,
            frameIndex: f.frameIndex,
            elapsedMs: f.elapsedMs,
            assetId: f.assetId,
          }));
        const realSideBaseline = baselineFrames.length > 0 ? {
          selectionMethod: 'initial-window' as const,
          configuredWindowMs: defaultWindowMs,
          startElapsedMs: 0,
          endElapsedMs: appliedWindowMs,
          frames: baselineFrames,
          selectedAt: now,
        } : undefined;

        // Save video if available
        if (pendingCapture.realVideo) {
          await captureAssetStore.save(
            pendingCapture.realVideo.assetId,
            { kind: 'testRun', kpId: context.kp.id, sampleId: context.sample.id, runId: context.testRun.id },
            pendingCapture.realVideo.blob,
            'video'
          );
        }

        const persistedKp = await kodePengujianRepository.updateTestRun(context.kp.id, context.testRun.id, {
          status: 'CAPTURING',
          captureSession: {
            scenario: context.testRun.fixture,
            synchronizedMoments: [],
            startedAt: context.testRun.captureSession?.startedAt ?? now,
            capturedAt: now,
            captureMode: 'real',
            realSideFrames: capturedFrames.map(toRealSideCaptureFrameMetadata),
            realSideBaseline,
            video: pendingCapture.realVideo ? toCaptureVideoMetadata(pendingCapture.realVideo) : undefined,
          },
        });
        setContext(c => c ? { ...c, testRun: persistedKp } : null);
        void syncService.queueSync(context.kp.id);
      } else {
        // simulation
        const persistedKp = await kodePengujianRepository.updateTestRun(context.kp.id, context.testRun.id, {
          status: 'CAPTURING',
          captureSession: {
            scenario: context.testRun.fixture,
            synchronizedMoments: pendingCapture.simulatedMoments ?? simulationService.getSynchronizedFrames(),
            startedAt: context.testRun.captureSession?.startedAt ?? now,
            capturedAt: now,
            captureMode: 'simulation',
          },
        });
        setContext(c => c ? { ...c, testRun: persistedKp } : null);
      }
      setPendingCapture(null);
    } catch (saveError) {
      console.error('Gagal menyimpan hasil tangkapan', saveError);
      setError('Gagal menyimpan hasil tangkapan.');
    }
  };

  // P4: Retake - discard pending capture and return to ready state
  const handleRetakeCapture = async () => {
    if (!context) return;
    stopRealResources();
    clearRealFrames();
    clearRealVideo();
    setPendingCapture(null);
    setRealStatus('idle');
    setIsCapturing(false);
    setIsRealPreview(mode === 'real');
    setCaptureProgress(0);
    // Clean up temporary assets if no previous accepted session exists
    const hadPriorAcceptedSession = ((context.testRun.captureSession?.synchronizedMoments?.length ?? 0) > 0) ||
      ((context.testRun.captureSession?.realSideFrames?.length ?? 0) > 0);

    if (!hadPriorAcceptedSession) {
      await captureAssetStore.deleteScope({
        kind: 'testRun',
        kpId: context.kp.id,
        sampleId: context.sample.id,
        runId: context.testRun.id,
      }).catch(() => undefined);
      const updated = await kodePengujianRepository.updateTestRun(context.kp.id, context.testRun.id, {
        status: 'PENDING',
        captureSession: undefined,
      });
      setContext(c => c ? { ...c, testRun: updated } : null);
    } else {
      // Restore previously accepted session
      const persistedFrames = context.testRun.captureSession?.realSideFrames ?? [];
      setRestoredRealFrameCount(persistedFrames.length);
      if (persistedFrames.length > 0) {
        const restored = await resolvePersistedFrames(persistedFrames);
        realFramesRef.current = restored;
        setRealFrames(restored);
        setSelectedRealFrameIndex(restored[0]?.frameIndex ?? 0);
      }
      const persistedVideo = context.testRun.captureSession?.video;
      if (persistedVideo) {
        const restoredVid = await restorePersistedVideo(persistedVideo);
        if (restoredVid) setRestoredVideo(restoredVid);
      }
    }
  };

  // P4: Discard - discard pending capture and reset to PENDING if no prior session
  const handleDiscardCapture = async () => {
    if (!context) return;
    stopRealResources();
    clearRealFrames();
    clearRealVideo();
    setPendingCapture(null);
    setRealStatus('idle');
    setIsCapturing(false);
    setCaptureProgress(0);
    // Clean up temporary assets
    const hadPriorAcceptedSession = ((context.testRun.captureSession?.synchronizedMoments?.length ?? 0) > 0) ||
      ((context.testRun.captureSession?.realSideFrames?.length ?? 0) > 0);

    if (!hadPriorAcceptedSession) {
      await captureAssetStore.deleteScope({
        kind: 'testRun',
        kpId: context.kp.id,
        sampleId: context.sample.id,
        runId: context.testRun.id,
      }).catch(() => undefined);
      const updated = await kodePengujianRepository.updateTestRun(context.kp.id, context.testRun.id, {
        status: 'PENDING',
        captureSession: undefined,
      });
      setContext(c => c ? { ...c, testRun: updated } : null);
    } else {
      // Restore previously accepted session
      const persistedFrames = context.testRun.captureSession?.realSideFrames ?? [];
      setRestoredRealFrameCount(persistedFrames.length);
      if (persistedFrames.length > 0) {
        const restored = await resolvePersistedFrames(persistedFrames);
        realFramesRef.current = restored;
        setRealFrames(restored);
        setSelectedRealFrameIndex(restored[0]?.frameIndex ?? 0);
      }
      const persistedVideo = context.testRun.captureSession?.video;
      if (persistedVideo) {
        const restoredVid = await restorePersistedVideo(persistedVideo);
        if (restoredVid) setRestoredVideo(restoredVid);
      }
    }
  };

  const handleProceedToAnalysis = async () => {
    if (!context) return;
    try {
      // Ensure baseline exists on captureSession before proceeding
      let currentTestRun = context.testRun;
      if (!currentTestRun.captureSession?.realSideBaseline && realFramesRef.current.length > 0) {
        const frames = realFramesRef.current;
        const defaultWindowMs = DEFAULT_REAL_SIDE_BASELINE_WINDOW_MS;
        const maxElapsed = frames[frames.length - 1]?.elapsedMs ?? 0;
        const appliedWindowMs = Math.min(defaultWindowMs, maxElapsed);
        const baselineFrames = frames
          .filter((f) => f.elapsedMs >= 0 && f.elapsedMs <= appliedWindowMs)
          .map((f) => ({
            frameId: f.id,
            frameIndex: f.frameIndex,
            elapsedMs: f.elapsedMs,
            assetId: f.assetId,
          }));
        if (baselineFrames.length > 0) {
          const updatedTr = await kodePengujianRepository.updateTestRun(context.kp.id, currentTestRun.id, {
            captureSession: {
              ...currentTestRun.captureSession!,
              realSideBaseline: {
                selectionMethod: 'initial-window',
                configuredWindowMs: defaultWindowMs,
                startElapsedMs: 0,
                endElapsedMs: appliedWindowMs,
                frames: baselineFrames,
                selectedAt: new Date().toISOString(),
              },
            },
          });
          currentTestRun = updatedTr;
        }
      }

      // Transition CAPTURING -> ANALYZING
      await kodePengujianRepository.updateTestRun(context.kp.id, currentTestRun.id, {
        status: 'ANALYZING',
      });
      navigate(`/kode-pengujian/${context.kp.id}/samples/${context.sample.id}/runs/${currentTestRun.id}/analysis`);
    } catch (err) {
      console.error('Gagal melanjutkan ke analisis', err);
      setError('Gagal melanjutkan ke analisis');
    }
  };

  const handleAbortCapture = async () => {
    if (!context) return;
    stopRealResources();
    clearRealFrames();
    try {
      await captureAssetStore.deleteScope({ kind: 'testRun', kpId: context.kp.id, sampleId: context.sample.id, runId: context.testRun.id });
      const updatedKp = await kodePengujianRepository.updateTestRun(context.kp.id, context.testRun.id, {
        status: 'PENDING',
        captureSession: undefined,
      });
      setContext(c => c ? { ...c, testRun: updatedKp } : null);
      setIsCapturing(false);
      setRealStatus('idle');
    } catch (abortError) {
      console.error('Failed to abort capture', abortError);
      setError('Gagal membatalkan akuisisi');
    }
  };

  // P4: Navigation handler with confirmation for unsaved data
  const handleNavigate = (path: string) => {
    if (!hasUnsavedCapture) {
      navigate(path);
      return;
    }
    setTargetNavPath(path);
    setShowNavConfirmation(true);
  };

  const handleSaveAndExit = async () => {
    await handleSaveCapture();
    setShowNavConfirmation(false);
    if (targetNavPath) navigate(targetNavPath);
    setTargetNavPath(null);
  };

  const handleDiscardAndExit = async () => {
    await handleDiscardCapture();
    setShowNavConfirmation(false);
    if (targetNavPath) navigate(targetNavPath);
    setTargetNavPath(null);
  };

  const handleCancelNav = () => {
    setShowNavConfirmation(false);
    setTargetNavPath(null);
  };

  if (loading) return <div className="p-4 text-sm text-text-secondary">Memuat sesi akuisisi...</div>;
  if (error && !context) return (
    <div className="space-y-4">
      <h1 aria-label="Kesalahan Akuisisi" className="text-xl font-bold text-text-primary">Kesalahan Akuisisi</h1>
      <p className="text-sm text-text-secondary">{error}</p>
      <button onClick={() => navigate(`/kode-pengujian/${kpId}`)} className="text-sm font-medium text-primary hover:underline">
        &larr; Kembali ke Detail Kode Pengujian
      </button>
    </div>
  );
  if (!context) return null;

  const { kp, sample, testRun } = context;

  const getPhaseName = (phase: string) => {
    if (phase === 'pre-spray' || phase === 'pre_spray') return 'PRA-SPRAY';
    if (phase === 'build-up' || phase === 'build_up') return 'PEMBENTUKAN';
    if (phase === 'stable') return 'STABIL';
    if (phase === 'decay' || phase === 'complete') return 'PELURUHAN';
    return phase.toUpperCase();
  };
  const visibleCount = mode === 'real' ? (realFrames.length || restoredRealFrameCount) : captureProgress;
  const realDisplayCount = realFrames.length || restoredRealFrameCount;
  const activeBaseline = testRun.captureSession?.realSideBaseline;
  const baselineIndexes = new Set(activeBaseline?.frames.map((frame) => frame.frameIndex) ?? []);
  const activeVideo = pendingCapture?.realVideo ?? realVideo ?? restoredVideo;

  return (
    <div className="flex flex-col h-full space-y-6 max-w-[1320px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-text-primary">{kp.id}</span>
            <span className="text-text-muted">/</span>
            <span className="font-mono text-base font-bold text-text-primary">{sample.sampleCode || sample.id}</span>
            <span className="text-text-muted">/</span>
            <span className="font-mono text-base font-bold text-text-primary">{testRun.id}</span>
            <span className="text-text-muted">•</span>
            <span className="text-sm font-semibold text-text-secondary">{testRun.recipeSnapshot.name}</span>
            <span className="text-text-muted">•</span>
            <Status tone={isCapturing ? 'warning' : hasUnsavedCapture ? 'warning' : 'neutral'}>
              {isCapturing ? 'Merekam' : hasUnsavedCapture ? 'Belum Disimpan' : testRun.status}
            </Status>
          </div>
          <p className="text-xs text-text-muted">
            {mode === 'real' ? 'Mode kamera nyata — Side only' : 'Mode simulasi — fixture capture'}
            {!isVideoRecordingSupported() && ' · Perekaman video tidak didukung browser'}
          </p>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Kondisi Simpan: {context.effectiveStorage}</span>
            <span>•</span>
            <span>Posisi Botol: {context.effectiveBottlePosition}</span>
            <span>•</span>
            <span>Setpoint: {testRun.setpoints.forceSetpointN} N · {testRun.setpoints.pressDurationMs} ms · {testRun.setpoints.strokeMm} mm</span>
          </div>
          {error && <p role="alert" className="text-xs text-semantic-danger">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {/* P4: Save Policy Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border-subtle bg-surface-subtle">
            <span className="text-xs text-text-muted">Kebijakan Simpan:</span>
            <button
              type="button"
              onClick={() => { setSavePolicy('review'); setCaptureSavePolicy('review'); }}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                savePolicy === 'review'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-text-secondary border-border-default hover:bg-surface-subtle'
              }`}
            >
              Tinjau sebelum menyimpan
            </button>
            <button
              type="button"
              onClick={() => { setSavePolicy('auto'); setCaptureSavePolicy('auto'); }}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                savePolicy === 'auto'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-text-secondary border-border-default hover:bg-surface-subtle'
              }`}
            >
              Simpan otomatis
            </button>
          </div>

          {!isCapturing && testRun.status === 'PENDING' && (
            <>
              <button onClick={handleStartSimulation} className="btn btn-secondary">Mulai Simulasi</button>
              <label className="flex items-center gap-2 text-xs text-text-secondary">
                <span>Durasi</span>
                <input
                  aria-label="Durasi capture Side (detik)"
                  type="number"
                  min="1"
                  max="30"
                  step="1"
                  value={realDurationMs / 1000}
                  onChange={(event) => setRealDurationMs(Math.max(1000, Math.min(30000, Number(event.target.value) * 1000 || REAL_CAPTURE_DURATION_MS)))}
                  className="w-16 rounded border border-border-default bg-surface px-2 py-1 text-right font-mono"
                />
                <span>detik</span>
              </label>
              <button onClick={() => void handleStartRealCapture()} className="btn btn-primary" aria-label="Mulai Pengambilan">
                Mulai Pengambilan Data
              </button>
            </>
          )}
          {isCapturing && mode === 'simulation' && <button onClick={handleAbortCapture} className="btn btn-danger">Batalkan Akuisisi</button>}
          {mode === 'real' && isCapturing && (
            <>
              <button onClick={() => void finishRealCapture()} className="btn btn-primary">Selesaikan Capture</button>
              <button onClick={handleAbortCapture} className="btn btn-danger">Batalkan Akuisisi</button>
            </>
          )}
          {mode === 'real' && !isCapturing && (realStatus === 'complete' || restoredRealFrameCount > 0) && !hasUnsavedCapture && (
            <>
              <button onClick={handleProceedToAnalysis} className="btn btn-primary">Lanjut ke Analisis</button>
              <button onClick={() => handleNavigate(`/kode-pengujian/${kpId}`)} className="btn btn-secondary">Kembali ke Kode Pengujian</button>
              <button onClick={handleAbortCapture} className="btn btn-danger">Batalkan Akuisisi</button>
            </>
          )}
          {hasUnsavedCapture && (
            <>
              <button onClick={() => handleNavigate(`/kode-pengujian/${kp.id}`)} className="btn btn-secondary">
                Kembali ke Kode Pengujian
              </button>
              <button onClick={handleSaveCapture} className="btn btn-primary">Simpan</button>
              <button onClick={handleRetakeCapture} className="btn btn-secondary">Ulangi Pengambilan</button>
              <button onClick={handleDiscardCapture} className="btn btn-danger">Buang</button>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 grid gap-6 xl:grid-cols-2">
        <CameraBox
          camera="side"
          captureProgress={visibleCount}
          isCapturing={isCapturing}
          videoRef={videoRef}
          showRealPreview={isRealPreview}
          realFrames={realFrames}
          restoredFrameCount={restoredRealFrameCount}
          selectedRealFrameIndex={selectedRealFrameIndex}
          mode={mode}
          hasVideo={Boolean(activeVideo)}
          videoPending={hasUnsavedCapture && Boolean(pendingCapture?.realVideo)}
          videoUnsupported={mode === 'real' && !isVideoRecordingSupported()}
        />
        <CameraBox camera="front" captureProgress={visibleCount} isCapturing={mode === 'simulation' && isCapturing} mode={mode} />
      </div>

      {activeVideo && mode === 'real' && (
        <div className="bg-surface rounded-xl border border-border-default shadow-[0_4px_20px_rgba(16,42,67,0.04)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-text-primary">Perekaman Video</h2>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span className="font-mono">{activeVideo.durationMs} ms</span>
              <span className="px-2 py-0.5 rounded border border-border-subtle bg-bg-subtle text-[10px] font-medium">
                {hasUnsavedCapture ? 'Belum Disimpan' : 'Tersimpan'}
              </span>
            </div>
          </div>
          <video
            src={activeVideo.videoUrl}
            controls
            muted
            className="w-full max-h-[340px] rounded-lg bg-black"
            aria-label="Perekaman kamera Side"
          />
        </div>
      )}

      <div className="bg-surface rounded-xl border border-border-default shadow-[0_4px_20px_rgba(16,42,67,0.04)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-text-primary">Linimasa Tangkapan</h2>
          <div className="text-sm font-semibold">
            {mode === 'real' ? (
              <span className="text-primary">
                {realDisplayCount} frame Side · {realStatus === 'complete' ? (hasUnsavedCapture ? 'selesai — menunggu tinjauan' : 'selesai') : realStatus === 'recording' ? 'merekam' : restoredRealFrameCount > 0 ? 'metadata tersimpan' : 'siap'}
              </span>
            ) : (
              <span className={isCapturing ? 'text-primary' : 'text-text-primary'}>
                {visibleCount} / 60 tangkapan
              </span>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          {mode === 'simulation' && (
            <div className="flex gap-0.5 px-0.5">
              {['pre-spray', 'build-up', 'stable', 'decay'].map((phaseKey) => {
                const phaseFrames = simulationFrames.filter(
                  (frame) => frame.phase === phaseKey || (phaseKey === 'decay' && frame.phase === 'complete')
                );
                return phaseFrames.length ? (
                  <div key={phaseKey} style={{ flex: phaseFrames.length }} className="text-[10px] font-bold uppercase tracking-wider text-text-secondary border-l border-border-default pl-1">
                    {getPhaseName(phaseKey)}
                  </div>
                ) : null;
              })}
            </div>
          )}
          {mode === 'real' ? (
            realFrames.length > 0 ? (
              <div className="flex gap-0.5 h-10 w-full rounded overflow-hidden bg-bg-subtle border border-border-subtle p-0.5">
                {realFrames.map((frame) => (
                  <button
                    key={frame.id}
                    onClick={() => setSelectedRealFrameIndex(frame.frameIndex)}
                    title={`Side frame ${frame.frameIndex}, ${frame.elapsedMs} ms${baselineIndexes.has(frame.frameIndex) ? ' (Baseline)' : ''}`}
                    aria-label={`Side frame ${frame.frameIndex}, ${frame.elapsedMs} ms${baselineIndexes.has(frame.frameIndex) ? ' (Baseline)' : ''}`}
                    className={`flex-1 rounded-sm ${baselineIndexes.has(frame.frameIndex) ? 'bg-primary ring-1 ring-primary' : 'bg-primary/30'} ${frame.frameIndex === selectedRealFrameIndex ? 'outline outline-2 outline-offset-1 outline-primary' : ''}`}
                  />
                ))}
              </div>
            ) : restoredRealFrameCount > 0 ? (
              <div className="flex gap-0.5 h-10 w-full rounded overflow-hidden bg-bg-subtle border border-border-subtle p-0.5">
                {Array.from({ length: restoredRealFrameCount }, (_, index) => (
                  <div key={index} title={`Side frame metadata ${index}`} className={`flex-1 rounded-sm ${baselineIndexes.has(index) ? 'bg-primary' : 'bg-primary/30'}`} />
                ))}
              </div>
            ) : null
          ) : (
            <div className="flex gap-0.5 h-10 w-full rounded overflow-hidden bg-bg-subtle border border-border-subtle p-0.5">
              {simulationFrames.map((frame, index) => (
                <div key={frame.frameIndex} title={`Tangkapan ${frame.frameIndex} (${getPhaseName(frame.phase)})`} className={`flex-1 rounded-sm ${index < visibleCount ? 'bg-primary' : index === visibleCount && isCapturing ? 'bg-semantic-warning animate-pulse' : 'bg-border-default'}`} />
              ))}
            </div>
          )}
          {mode === 'real' && (
            <>
              <p className="text-xs text-text-muted">Frame nyata hanya berasal dari Kamera Side. Timestamp dan urutan dipertahankan; gambar tidak dipersist ke localStorage.</p>
              <div className="mt-4 border-t border-border-subtle pt-4 space-y-3" aria-label="Baseline pra-spray Side">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">Baseline pra-spray Side</p>
                    <p className="text-[11px] text-text-muted">Window waktu capture, bukan sinkronisasi trigger spray fisik.</p>
                  </div>
                  <span className="text-[11px] font-mono text-text-secondary">
                    {activeBaseline ? `${activeBaseline.frames.length} frame · ${activeBaseline.startElapsedMs}–${activeBaseline.endElapsedMs} ms` : 'Belum dipilih'}
                  </span>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-[11px] text-text-secondary">
                    <span className="mb-1 block">Window awal (ms)</span>
                    <input
                      aria-label="Window baseline awal (ms)"
                      type="number"
                      min="1"
                      value={baselineWindowMs}
                      onChange={(event) => setBaselineWindowMs(Math.max(1, Number(event.target.value) || DEFAULT_REAL_SIDE_BASELINE_WINDOW_MS))}
                      className="w-24 rounded border border-border-default bg-surface px-2 py-1 font-mono"
                    />
                  </label>
                  <button type="button" onClick={() => void applyInitialBaseline()} disabled={isApplyingBaseline || realDisplayCount === 0 || isCapturing} className="btn btn-secondary">
                    {isApplyingBaseline ? 'Menyimpan…' : 'Pilih Window Awal'}
                  </button>
                  {realFrames.length > 0 && (
                    <button type="button" onClick={() => void applyManualBaseline(0, realFrames[realFrames.length - 1].elapsedMs)} disabled={isApplyingBaseline || isCapturing} className="btn btn-secondary">
                      Pilih Semua Frame
                    </button>
                  )}
                </div>
                {activeBaseline && (
                  <>
                    <p className="text-[11px] text-text-muted">Metode: {activeBaseline.selectionMethod === 'initial-window' ? 'window awal terkonfigurasi' : 'rentang manual'} · frame primary pada timeline adalah baseline.</p>
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="text-[11px] text-text-secondary">
                        <span className="mb-1 block">Mulai (ms)</span>
                        <input
                          aria-label="Mulai baseline manual (ms)"
                          type="number"
                          min="0"
                          value={manualRangeDraft?.start ?? String(activeBaseline.startElapsedMs)}
                          onChange={(event) => setManualRangeDraft({ start: event.target.value, end: manualRangeDraft?.end ?? String(activeBaseline.endElapsedMs) })}
                          className="w-24 rounded border border-border-default bg-surface px-2 py-1 font-mono"
                        />
                      </label>
                      <label className="text-[11px] text-text-secondary">
                        <span className="mb-1 block">Selesai (ms)</span>
                        <input
                          aria-label="Selesai baseline manual (ms)"
                          type="number"
                          min="0"
                          value={manualRangeDraft?.end ?? String(activeBaseline.endElapsedMs)}
                          onChange={(event) => setManualRangeDraft({ start: manualRangeDraft?.start ?? String(activeBaseline.startElapsedMs), end: event.target.value })}
                          className="w-24 rounded border border-border-default bg-surface px-2 py-1 font-mono"
                        />
                      </label>
                      <button type="button" onClick={() => void applyManualBaseline(Number(manualRangeDraft?.start ?? activeBaseline.startElapsedMs), Number(manualRangeDraft?.end ?? activeBaseline.endElapsedMs))} disabled={isApplyingBaseline || isCapturing} className="btn btn-secondary">
                        Terapkan Rentang Manual
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* P4: Navigation Confirmation Modal */}
      {showNavConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-labelledby="nav-confirm-title">
          <div className="bg-surface rounded-xl p-6 max-w-md w-full mx-4">
            <h3 id="nav-confirm-title" className="text-lg font-bold text-text-primary mb-2">Hasil pengambilan data belum disimpan.</h3>
            <p className="text-sm text-text-secondary mb-6">
              Anda memiliki data tangkapan yang belum disimpan. Apa yang ingin Anda lakukan?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={handleCancelNav} className="btn btn-secondary">Batal</button>
              <button onClick={handleDiscardAndExit} className="btn btn-danger">Keluar Tanpa Menyimpan</button>
              <button onClick={handleSaveAndExit} className="btn btn-primary">Simpan & Keluar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CameraBox({ camera, captureProgress, isCapturing, videoRef, showRealPreview = false, realFrames = [], restoredFrameCount = 0, selectedRealFrameIndex = 0, mode, hasVideo = false, videoPending = false, videoUnsupported = false }: { camera: 'side' | 'front'; captureProgress: number; isCapturing: boolean; videoRef?: React.RefObject<HTMLVideoElement>; showRealPreview?: boolean; realFrames?: RealSideCaptureFrame[]; restoredFrameCount?: number; selectedRealFrameIndex?: number; mode?: CaptureMode; hasVideo?: boolean; videoPending?: boolean; videoUnsupported?: boolean }) {
  const isRealSide = camera === 'side' && showRealPreview;
  const isRealFront = camera === 'front' && mode === 'real';
  const displayCount = realFrames.length || restoredFrameCount;
  const selectedFrame = realFrames.find((frame) => frame.frameIndex === selectedRealFrameIndex) ?? realFrames[realFrames.length - 1];
  return (
    <div className="flex flex-col bg-surface rounded-xl overflow-hidden border border-border-default shadow-[0_4px_20px_rgba(16,42,67,0.04)]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle bg-bg-subtle">
        <h2 className="text-sm font-bold tracking-tight text-text-primary">Kamera {camera === 'side' ? 'Samping' : 'Depan'}</h2>
        {camera === 'side' && displayCount > 0 && (
          <span className="flex items-center gap-2 text-[11px] font-mono text-text-muted">
            <span>{displayCount} frame</span>
            {hasVideo && (
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${videoPending ? 'bg-semantic-warning/20 text-semantic-warning' : 'bg-primary/20 text-primary'}`}>
                {videoPending ? 'Video: Menunggu' : 'Video: Tersimpan'}
              </span>
            )}
            {videoUnsupported && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-semantic-danger/20 text-semantic-danger">
                Video: Tidak Tersedia
              </span>
            )}
          </span>
        )}
      </div>
      <div className="relative aspect-[600/340] w-full bg-surface-subtle overflow-hidden flex-1 border-t border-border-subtle">
        {camera === 'side' && <video ref={videoRef} muted playsInline className={isRealSide ? 'h-full w-full object-cover' : 'hidden'} aria-label="Preview kamera Side nyata" />}
        {!isRealSide && selectedFrame && <img src={selectedFrame.imageUrl} alt={`Frame Side ${selectedFrame.frameIndex} pada ${selectedFrame.elapsedMs} ms`} className="h-full w-full object-cover" />}
        {!isRealSide && !selectedFrame && <Overlay camera={camera} />}
        {isRealFront && <div className="absolute inset-x-0 bottom-0 bg-bg-subtle/95 border-t border-border-subtle px-4 py-2"><p className="text-[11px] font-semibold text-text-secondary">Kamera Depan belum diimplementasikan</p><p className="text-[11px] text-text-muted">Fase ini hanya mengakuisisi Side. Tidak ada frame Depan yang dibuat-buat.</p></div>}
        {isCapturing && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="font-mono text-2xl font-bold text-white tracking-tight">FRAME <span className="text-primary">{String(captureProgress + 1).padStart(3, '0')}</span></div></div>}
        {!isCapturing && selectedFrame && <div className="absolute inset-x-0 bottom-0 bg-bg-subtle/95 border-t border-border-subtle px-4 py-1.5 flex items-center justify-between"><span className="font-mono text-[11px] text-text-secondary">FRAME {String(selectedFrame.frameIndex).padStart(3, '0')}</span><span className="font-mono text-[11px] text-text-muted">{selectedFrame.elapsedMs} ms</span></div>}
      </div>
    </div>
  );
}