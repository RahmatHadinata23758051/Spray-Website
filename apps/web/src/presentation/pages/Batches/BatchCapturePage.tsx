import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { batchRepository, simulationService } from '../../../application/services';
import type { Batch, Camera as CameraType } from '@spray-paragon/domain';
import { Status } from '../../components/ui/Status';
import { Overlay } from '../../components/ui/Overlay';
import { formatStatus } from '../../utils/formatters';

const frames = simulationService.getFrames();

export function BatchCapturePage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!batchId) {
      setError('Batch ID hilang dari URL');
      setLoading(false);
      return;
    }

    const loadBatch = async () => {
      try {
        const b = await batchRepository.getBatch(batchId);
        if (!b) {
          setError(`Batch ${batchId} tidak ditemukan`);
          return;
        }

        if (b.status === 'DRAFT' || b.status === 'FINALIZED' || b.status === 'FAILED' || b.status === 'ABORTED') {
          navigate(`/batches/${batchId}`);
          return;
        }

        if (b.status === 'PROCESSING' || b.status === 'REVIEW_REQUIRED') {
          navigate(`/batches/${batchId}`);
          return;
        }

        setBatch(b);
        setIsCapturing(b.status === 'CAPTURING');
        if (b.status === 'CAPTURING' && b.captureSession?.synchronizedMoments) {
          setCaptureProgress(b.captureSession.synchronizedMoments.length);
        }
      } catch (e) {
        console.error('Failed to load batch', e);
        setError('Gagal memuat data batch');
      } finally {
        setLoading(false);
      }
    };

    loadBatch();
  }, [batchId, navigate]);

  const handleStartCapture = async () => {
    if (!batch || batch.status !== 'READY') return;

    try {
      const updated = await batchRepository.startCapture(batch.id);
      setBatch(updated);
      setIsCapturing(true);
    } catch (e) {
      console.error('Failed to start capture', e);
      setError('Gagal memulai akuisisi');
    }
  };

  const handleCompleteCapture = useCallback(async () => {
    if (!batch) return;

    try {
      const { simulationService } = await import('../../../application/services');
      const synchronizedFrames = simulationService.getSynchronizedFrames();
      await batchRepository.updateCaptureSession(batch.id, synchronizedFrames);

      const processing = await batchRepository.completeCapture(batch.id);
      setBatch(processing);

      const reviewRequired = await batchRepository.markReviewRequired(batch.id);
      setBatch(reviewRequired);
      setIsCapturing(false);
      navigate(`/batches/${batchId}`);
    } catch (e) {
      console.error('Failed to complete capture', e);
      setError('Gagal menyelesaikan akuisisi');
    }
  }, [batch, batchId, navigate]);

  const simulateCaptureProgress = useCallback(() => {
    if (isCapturing) {
      const interval = setInterval(() => {
        setCaptureProgress(prev => {
          if (prev >= 60) {
            clearInterval(interval);
            handleCompleteCapture();
            return prev;
          }
          return prev + 1;
        });
      }, 20);

      return () => clearInterval(interval);
    }
  }, [isCapturing, handleCompleteCapture]);

  useEffect(() => {
    if (isCapturing) {
      return simulateCaptureProgress();
    }
  }, [isCapturing, simulateCaptureProgress]);

  const handleAbortCapture = async () => {
    if (!batch) return;

    try {
      const aborted = await batchRepository.abortBatch(batch.id, 'User aborted capture');
      setBatch(aborted);
      setIsCapturing(false);
      setCaptureProgress(0);
    } catch (e) {
      console.error('Failed to abort capture', e);
      setError('Gagal membatalkan akuisisi');
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">Memuat sesi akuisisi...</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 aria-label="Kesalahan Akuisisi" className="text-xl font-bold text-text-primary">Kesalahan Akuisisi</h1>
        <p className="text-sm text-text-secondary">{error}</p>
        <button onClick={() => navigate(`/batches/${batchId}`)} className="text-sm font-medium text-primary hover:underline">
          &larr; Kembali ke Detail Batch
        </button>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Batch Tidak Ditemukan</h1>
        <p className="text-sm text-text-secondary">Batch {batchId} tidak ada atau tidak dapat diakses untuk akuisisi.</p>
        <button onClick={() => navigate('/batches')} className="text-sm font-medium text-primary hover:underline">
          &larr; Kembali ke Daftar Batch
        </button>
      </div>
    );
  }

  const getPhaseName = (phase: string) => {
    if (phase === 'pre-spray' || phase === 'pre_spray') return 'PRA-SPRAY';
    if (phase === 'build-up' || phase === 'build_up') return 'PEMBENTUKAN';
    if (phase === 'stable') return 'STABIL';
    if (phase === 'decay' || phase === 'complete') return 'PELURUHAN';
    return phase.toUpperCase();
  };

  return (
    <div className="flex flex-col h-full space-y-6 max-w-[1320px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-bold text-text-primary">{batch.id}</span>
            <span className="text-text-muted">•</span>
            <span className="text-sm font-semibold text-text-secondary">
              {batch.setupSnapshot?.productSnapshot.productName ?? batch.setupDraft?.productSnapshot?.productName}
            </span>
            <span className="text-text-muted">•</span>
            <Status tone={isCapturing ? 'warning' : 'neutral'}>
              {isCapturing ? 'Merekam' : formatStatus(batch.status)}
            </Status>
          </div>
        </div>

        <div>
          {isCapturing ? (
            <button onClick={handleAbortCapture} className="btn btn-danger">
              Batalkan Akuisisi
            </button>
          ) : batch.status === 'READY' ? (
            <button onClick={handleStartCapture} className="btn btn-primary" aria-label="Mulai Pengambilan">
              Mulai Pengambilan Data
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1 grid gap-6 xl:grid-cols-2">
        <CameraBox camera="side" captureProgress={captureProgress} isCapturing={isCapturing} />
        <CameraBox camera="front" captureProgress={captureProgress} isCapturing={isCapturing} />
      </div>

      <div className="bg-surface rounded-xl border border-border-default shadow-[0_4px_20px_rgba(16,42,67,0.04)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-text-primary">
            Sinkronisasi Tangkapan
          </h2>
          <div className="text-sm font-semibold">
            {isCapturing ? (
              <span className="text-primary">{captureProgress} / 60 tangkapan</span>
            ) : batch.status === 'READY' ? (
              <span className="text-text-muted">0 / 60 tangkapan</span>
            ) : (
              <span className="text-text-primary">60 / 60 tangkapan</span>
            )}
          </div>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex gap-0.5 px-0.5">
            {/* Phase legend row */}
            {['pre-spray', 'build-up', 'stable', 'decay'].map(phaseKey => {
              const phaseFrames = frames.filter(f => f.phase === phaseKey || (phaseKey === 'decay' && f.phase === 'complete'));
              if (phaseFrames.length === 0) return null;
              
              const flexWidth = phaseFrames.length;
              return (
                <div key={phaseKey} style={{ flex: flexWidth }} className="text-[10px] font-bold uppercase tracking-wider text-text-secondary border-l border-border-default pl-1">
                  {getPhaseName(phaseKey)}
                </div>
              );
            })}
          </div>

          <div className="flex gap-0.5 h-10 w-full rounded overflow-hidden bg-bg-subtle border border-border-subtle p-0.5">
            {frames.map((f, idx) => {
              const isCaptured = idx < captureProgress;
              const isCurrent = idx === captureProgress && isCapturing;
              
              let bgColor = 'bg-border-default';
              if (isCurrent) bgColor = 'bg-semantic-warning ring-1 ring-semantic-warning animate-pulse';
              else if (isCaptured) bgColor = 'bg-primary';
              
              return (
                <div
                  key={f.frameIndex}
                  title={`Tangkapan ${f.frameIndex} (${getPhaseName(f.phase)})`}
                  className={`flex-1 ${bgColor} rounded-sm transition-colors duration-75`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CameraBox({ camera, captureProgress, isCapturing }: { 
  camera: CameraType; 
  captureProgress: number; 
  isCapturing: boolean; 
}) {
  return (
    <div className="flex flex-col bg-surface rounded-xl overflow-hidden border border-border-default shadow-[0_4px_20px_rgba(16,42,67,0.04)]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border-subtle bg-bg-subtle">
        <h2 className="text-sm font-bold tracking-tight text-text-primary">
          Kamera {camera === 'side' ? 'Samping' : 'Depan'}
        </h2>
      </div>
      <div className="relative aspect-[600/340] w-full bg-surface-subtle overflow-hidden flex-1 border-t border-border-subtle">
        <Overlay camera={camera} />
        {isCapturing && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="font-mono text-2xl font-bold text-white tracking-tight">
              FRAME <span className="text-primary">{String(captureProgress + 1).padStart(3, '0')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
