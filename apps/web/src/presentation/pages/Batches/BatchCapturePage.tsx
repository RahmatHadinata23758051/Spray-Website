import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { batchRepository, simulationService } from '../../../application/services';
import type { Batch, Camera as CameraType } from '@spray-paragon/domain';
import { Status } from '../../components/ui/Status';
import { Overlay } from '../../components/ui/Overlay';
import { formatStatus } from '../../utils/formatters';
import {
  REAL_CAPTURE_DURATION_MS,
  REAL_CAPTURE_INTERVAL_MS,
  captureRealSideFrame,
  getRealCaptureElapsedMs,
  getSideCameraConstraints,
  nowMs,
  releaseRealCaptureFrames,
  stopRealCaptureStream,
  type RealSideCaptureFrame,
} from './realCapture';

const frames = simulationService.getFrames();
type CaptureMode = 'simulation' | 'real';
type RealCaptureStatus = 'idle' | 'activating' | 'recording' | 'complete' | 'failed';

export function BatchCapturePage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<Batch | null>(null);
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const realFramesRef = useRef<RealSideCaptureFrame[]>([]);
  const realSessionRef = useRef(0);
  const realStartedAtRef = useRef(0);
  const realDurationMsRef = useRef(REAL_CAPTURE_DURATION_MS);
  const realTimerRef = useRef<number | null>(null);

  const clearRealFrames = useCallback(() => {
    releaseRealCaptureFrames(realFramesRef.current);
    realFramesRef.current = [];
    setRealFrames([]);
    setRestoredRealFrameCount(0);
    setCaptureProgress(0);
  }, []);

  const stopRealResources = useCallback(() => {
    realSessionRef.current += 1;
    if (realTimerRef.current !== null) window.clearInterval(realTimerRef.current);
    realTimerRef.current = null;
    stopRealCaptureStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!batchId) {
      setError('Batch ID hilang dari URL');
      setLoading(false);
      return;
    }
    const loadBatch = async () => {
      try {
        const loaded = await batchRepository.getBatch(batchId);
        if (!loaded) {
          setError(`Batch ${batchId} tidak ditemukan`);
          return;
        }
        if (['DRAFT', 'FINALIZED', 'FAILED', 'ABORTED', 'PROCESSING', 'REVIEW_REQUIRED'].includes(loaded.status)) {
          navigate(`/batches/${batchId}`);
          return;
        }
        setBatch(loaded);
        const isRealSession = loaded.captureSession?.captureMode === 'real';
        setRestoredRealFrameCount(isRealSession ? (loaded.captureSession?.realSideFrames ?? []).length : 0);
        setMode(isRealSession ? 'real' : 'simulation');
        setIsRealPreview(!isRealSession);
        // A restored real session is never re-driven by the simulation loop; its status stays CAPTURING until the operator aborts.
        setIsCapturing(!isRealSession && loaded.status === 'CAPTURING');
        if (!isRealSession && loaded.status === 'CAPTURING' && loaded.captureSession?.synchronizedMoments) {
          setCaptureProgress(loaded.captureSession.synchronizedMoments.length);
        }
      } catch (loadError) {
        console.error('Failed to load batch', loadError);
        setError('Gagal memuat data batch');
      } finally {
        setLoading(false);
      }
    };
    void loadBatch();
  }, [batchId, navigate]);

  useEffect(() => () => {
    stopRealResources();
    clearRealFrames();
  }, [clearRealFrames, stopRealResources]);

  const handleStartSimulation = async () => {
    if (!batch || batch.status !== 'READY') return;
    try {
      const updated = await batchRepository.startCapture(batch.id);
      setBatch(updated);
      setMode('simulation');
      setIsCapturing(true);
    } catch (startError) {
      console.error('Failed to start simulated capture', startError);
      setError('Gagal memulai akuisisi simulasi');
    }
  };

  const handleStartRealCapture = async () => {
    if (!batch || batch.status !== 'READY' || !navigator.mediaDevices?.getUserMedia) {
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
      const updated = await batchRepository.startCapture(batch.id);
      clearRealFrames();
      realSessionRef.current += 1;
      const sessionId = realSessionRef.current;
      realStartedAtRef.current = nowMs();
      realDurationMsRef.current = realDurationMs;
      setBatch(updated);
      setMode('real');
      setIsRealPreview(true);
      setIsCapturing(true);
      setRealStatus('recording');
      const sample = async () => {
        if (sessionId !== realSessionRef.current || !videoRef.current) return;
        const elapsedMs = getRealCaptureElapsedMs(realStartedAtRef.current);
        if (elapsedMs >= realDurationMsRef.current) {
          await finishRealCapture(sessionId);
          return;
        }
        try {
          const frame = await captureRealSideFrame(videoRef.current, realFramesRef.current.length, realStartedAtRef.current);
          if (sessionId !== realSessionRef.current) {
            releaseRealCaptureFrames([frame]);
            return;
          }
          realFramesRef.current = [...realFramesRef.current, frame];
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
    if (sessionId !== realSessionRef.current || !batch) return;
    realSessionRef.current += 1;
    if (realTimerRef.current !== null) window.clearInterval(realTimerRef.current);
    realTimerRef.current = null;
    const capturedFrames = realFramesRef.current;
    try {
      if (batchRepository.updateRealCaptureSession) {
        const persisted = await batchRepository.updateRealCaptureSession(batch.id, capturedFrames.map(({ blob: _blob, imageUrl: _imageUrl, ...metadata }) => metadata));
        setBatch(persisted);
      }
      stopRealCaptureStream(streamRef.current);
      streamRef.current = null;
      setIsCapturing(false);
      setRealStatus('complete');
      // Real frame binaries stay in this page's memory only; localStorage receives metadata, never blobs.
    } catch (captureError) {
      console.error('Failed to persist real capture metadata', captureError);
      setError('Metadata frame gagal disimpan.');
      setRealStatus('failed');
    }
  };

  const handleCompleteSimulation = useCallback(async () => {
    if (!batch) return;
    try {
      await batchRepository.updateCaptureSession(batch.id, simulationService.getSynchronizedFrames());
      const processing = await batchRepository.completeCapture(batch.id);
      setBatch(processing);
      const reviewRequired = await batchRepository.markReviewRequired(batch.id);
      setBatch(reviewRequired);
      setIsCapturing(false);
      navigate(`/batches/${batchId}`);
    } catch (completeError) {
      console.error('Failed to complete simulated capture', completeError);
      setError('Gagal menyelesaikan akuisisi simulasi');
    }
  }, [batch, batchId, navigate]);

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

  const handleAbortCapture = async () => {
    if (!batch) return;
    stopRealResources();
    clearRealFrames();
    try {
      const aborted = await batchRepository.abortBatch(batch.id, 'User aborted capture');
      setBatch(aborted);
      setIsCapturing(false);
      setRealStatus('idle');
    } catch (abortError) {
      console.error('Failed to abort capture', abortError);
      setError('Gagal membatalkan akuisisi');
    }
  };

  if (loading) return <div className="p-4 text-sm text-text-secondary">Memuat sesi akuisisi...</div>;
  if (error && !batch) return <div className="space-y-4"><h1 aria-label="Kesalahan Akuisisi" className="text-xl font-bold text-text-primary">Kesalahan Akuisisi</h1><p className="text-sm text-text-secondary">{error}</p><button onClick={() => navigate(`/batches/${batchId}`)} className="text-sm font-medium text-primary hover:underline">&larr; Kembali ke Detail Batch</button></div>;
  if (!batch) return null;

  const getPhaseName = (phase: string) => {
    if (phase === 'pre-spray' || phase === 'pre_spray') return 'PRA-SPRAY';
    if (phase === 'build-up' || phase === 'build_up') return 'PEMBENTUKAN';
    if (phase === 'stable') return 'STABIL';
    if (phase === 'decay' || phase === 'complete') return 'PELURUHAN';
    return phase.toUpperCase();
  };
  const visibleCount = mode === 'real' ? (realFrames.length || restoredRealFrameCount) : captureProgress;
  const realDisplayCount = realFrames.length || restoredRealFrameCount;
  return (
    <div className="flex flex-col h-full space-y-6 max-w-[1320px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2"><span className="font-mono text-base font-bold text-text-primary">{batch.id}</span><span className="text-text-muted">•</span><span className="text-sm font-semibold text-text-secondary">{batch.setupSnapshot?.productSnapshot.productName ?? batch.setupDraft?.productSnapshot?.productName}</span><span className="text-text-muted">•</span><Status tone={isCapturing ? 'warning' : 'neutral'}>{isCapturing ? 'Merekam' : formatStatus(batch.status)}</Status></div>
          <p className="text-xs text-text-muted">{mode === 'real' ? 'Mode kamera nyata — Side only' : 'Mode simulasi — fixture capture'}</p>
          {error && <p role="alert" className="text-xs text-semantic-danger">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {!isCapturing && batch.status === 'READY' && <><button onClick={handleStartSimulation} className="btn btn-secondary">Mulai Simulasi</button><label className="flex items-center gap-2 text-xs text-text-secondary"><span>Durasi</span><input aria-label="Durasi capture Side (detik)" type="number" min="1" max="30" step="1" value={realDurationMs / 1000} onChange={(event) => setRealDurationMs(Math.max(1000, Math.min(30000, Number(event.target.value) * 1000 || REAL_CAPTURE_DURATION_MS)))} className="w-16 rounded border border-border-default bg-surface px-2 py-1 text-right font-mono" /><span>detik</span></label><button onClick={() => void handleStartRealCapture()} className="btn btn-primary" aria-label="Mulai Pengambilan">Mulai Pengambilan Data</button></>}
          {isCapturing && mode === 'simulation' && <button onClick={handleAbortCapture} className="btn btn-danger">Batalkan Akuisisi</button>}
          {mode === 'real' && isCapturing && <><button onClick={() => void finishRealCapture()} className="btn btn-primary">Selesaikan Capture</button><button onClick={handleAbortCapture} className="btn btn-danger">Batalkan Akuisisi</button></>}
          {mode === 'real' && !isCapturing && (realStatus === 'complete' || restoredRealFrameCount > 0) && <><button onClick={() => navigate(`/batches/${batchId}`)} className="btn btn-secondary">Kembali ke Batch</button><button onClick={handleAbortCapture} className="btn btn-danger">Batalkan Akuisisi</button></>}
        </div>
      </div>

      <div className="flex-1 grid gap-6 xl:grid-cols-2">
        <CameraBox camera="side" captureProgress={visibleCount} isCapturing={isCapturing} videoRef={videoRef} showRealPreview={isRealPreview} realFrames={realFrames} restoredFrameCount={restoredRealFrameCount} mode={mode} />
        <CameraBox camera="front" captureProgress={visibleCount} isCapturing={mode === 'simulation' && isCapturing} mode={mode} />
      </div>

      <div className="bg-surface rounded-xl border border-border-default shadow-[0_4px_20px_rgba(16,42,67,0.04)] p-5">
        <div className="flex items-center justify-between mb-4"><h2 className="text-sm font-bold text-text-primary">Linimasa Tangkapan</h2><div className="text-sm font-semibold">{mode === 'real' ? <span className="text-primary">{realDisplayCount} frame Side · {realStatus === 'complete' ? 'selesai' : realStatus === 'recording' ? 'merekam' : restoredRealFrameCount > 0 ? 'metadata tersimpan' : 'siap'}</span> : <span className={isCapturing ? 'text-primary' : 'text-text-primary'}>{visibleCount} / 60 tangkapan</span>}</div></div>
        <div className="space-y-1.5">
          {mode === 'simulation' && <div className="flex gap-0.5 px-0.5">{['pre-spray', 'build-up', 'stable', 'decay'].map((phaseKey) => { const phaseFrames = frames.filter((frame) => frame.phase === phaseKey || (phaseKey === 'decay' && frame.phase === 'complete')); return phaseFrames.length ? <div key={phaseKey} style={{ flex: phaseFrames.length }} className="text-[10px] font-bold uppercase tracking-wider text-text-secondary border-l border-border-default pl-1">{getPhaseName(phaseKey)}</div> : null; })}</div>}
          {mode === 'real' ? (
            realFrames.length > 0 ? (
              <div className="flex gap-0.5 h-10 w-full rounded overflow-hidden bg-bg-subtle border border-border-subtle p-0.5">{realFrames.map((frame) => <button key={frame.id} onClick={() => videoRef.current && (videoRef.current.currentTime = 0)} title={`Side frame ${frame.frameIndex}, ${frame.elapsedMs} ms`} aria-label={`Side frame ${frame.frameIndex}, ${frame.elapsedMs} ms`} className="flex-1 bg-primary rounded-sm" />)}</div>
            ) : restoredRealFrameCount > 0 ? (
              <div className="flex gap-0.5 h-10 w-full rounded overflow-hidden bg-bg-subtle border border-border-subtle p-0.5">{Array.from({ length: restoredRealFrameCount }, (_, index) => <div key={index} title={`Side frame metadata ${index}`} className="flex-1 bg-primary/70 rounded-sm" />)}</div>
            ) : null
          ) : <div className="flex gap-0.5 h-10 w-full rounded overflow-hidden bg-bg-subtle border border-border-subtle p-0.5">{frames.map((frame, index) => <div key={frame.frameIndex} title={`Tangkapan ${frame.frameIndex} (${getPhaseName(frame.phase)})`} className={`flex-1 rounded-sm ${index < visibleCount ? 'bg-primary' : index === visibleCount && isCapturing ? 'bg-semantic-warning animate-pulse' : 'bg-border-default'}`} />)}</div>}
          {mode === 'real' && <p className="text-xs text-text-muted">Frame nyata hanya berasal dari Kamera Side. Timestamp dan urutan dipertahankan; gambar tidak dipersist ke localStorage.</p>}
        </div>
      </div>
    </div>
  );
}

function CameraBox({ camera, captureProgress, isCapturing, videoRef, showRealPreview = false, realFrames = [], restoredFrameCount = 0, mode }: { camera: CameraType; captureProgress: number; isCapturing: boolean; videoRef?: React.RefObject<HTMLVideoElement>; showRealPreview?: boolean; realFrames?: RealSideCaptureFrame[]; restoredFrameCount?: number; mode?: CaptureMode }) {
  const isRealSide = camera === 'side' && showRealPreview;
  const isRealFront = camera === 'front' && mode === 'real';
  const displayCount = realFrames.length || restoredFrameCount;
  return <div className="flex flex-col bg-surface rounded-xl overflow-hidden border border-border-default shadow-[0_4px_20px_rgba(16,42,67,0.04)]"><div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle bg-bg-subtle"><h2 className="text-sm font-bold tracking-tight text-text-primary">Kamera {camera === 'side' ? 'Samping' : 'Depan'}</h2>{camera === 'side' && isRealSide && displayCount > 0 && <span className="text-[11px] font-mono text-text-muted">{displayCount} frame</span>}</div><div className="relative aspect-[600/340] w-full bg-surface-subtle overflow-hidden flex-1 border-t border-border-subtle">{camera === 'side' && <video ref={videoRef} muted playsInline className={isRealSide ? 'h-full w-full object-cover' : 'hidden'} aria-label="Preview kamera Side nyata" />}{!isRealSide && <Overlay camera={camera} />}{isRealFront && <div className="absolute inset-x-0 bottom-0 bg-bg-subtle/95 border-t border-border-subtle px-4 py-2"><p className="text-[11px] font-semibold text-text-secondary">Kamera Depan belum diimplementasikan</p><p className="text-[11px] text-text-muted">Fase ini hanya mengakuisisi Side. Tidak ada frame Depan yang dibuat-buat.</p></div>}{isCapturing && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="font-mono text-2xl font-bold text-white tracking-tight">FRAME <span className="text-primary">{String(captureProgress + 1).padStart(3, '0')}</span></div></div>}</div></div>;
}
