import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { batchRepository, simulationService } from '../../../application/services';
import type { Batch } from '@spray-paragon/domain';
import type { Camera as CameraType } from '@spray-paragon/domain';
const frames = simulationService.getFrames();
import { Status } from '../../components/ui/Status';
import { Panel } from '../../components/ui/Panel';
import { Overlay } from '../../components/ui/Overlay';

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
      setError('Batch ID missing from URL');
      setLoading(false);
      return;
    }

    const loadBatch = async () => {
      try {
        const b = await batchRepository.getBatch(batchId);
        if (!b) {
          setError(`Batch ${batchId} not found`);
          return;
        }

        // Validate lifecycle state
        if (b.status === 'DRAFT' || b.status === 'FINALIZED' || b.status === 'FAILED' || b.status === 'ABORTED') {
          // Redirect to batch detail for invalid states
          navigate(`/batches/${batchId}`);
          return;
        }

        if (b.status === 'PROCESSING' || b.status === 'REVIEW_REQUIRED') {
          // Capture already completed, redirect to detail
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
        setError('Failed to load batch data');
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
      setError('Failed to start capture');
    }
  };

  const handleCompleteCapture = useCallback(async () => {
    if (!batch) return;

    try {
      // Complete capture (CAPTURING → PROCESSING)
      // MOCK: populate synchronized frames
      const { simulationService } = await import('../../../application/services');
      const synchronizedFrames = simulationService.getSynchronizedFrames();
      await batchRepository.updateCaptureSession(batch.id, synchronizedFrames);

      const processing = await batchRepository.completeCapture(batch.id);
      setBatch(processing);

      // In simulation, processing is instantaneous and transitions to REVIEW_REQUIRED
      const reviewRequired = await batchRepository.markReviewRequired(batch.id);
      setBatch(reviewRequired);
      setIsCapturing(false);
      // After capture completion, navigate to batch detail
      navigate(`/batches/${batchId}`);
    } catch (e) {
      console.error('Failed to complete capture', e);
      setError('Failed to complete capture');
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
      }, 20); // Simulate faster progress for testing

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
      setError('Failed to abort capture');
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">Loading capture session...</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Capture Error</h1>
        <p className="text-sm text-text-secondary">{error}</p>
        <button onClick={() => navigate(`/batches/${batchId}`)} className="text-sm font-medium text-primary hover:underline">
          &larr; Return to Batch Detail
        </button>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Batch Not Found</h1>
        <p className="text-sm text-text-secondary">The batch {batchId} does not exist or cannot be accessed for capture.</p>
        <button onClick={() => navigate('/batches')} className="text-sm font-medium text-primary hover:underline">
          &larr; Return to Batches
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div>
          <button onClick={() => navigate(`/batches/${batchId}`)} className="text-xs font-semibold text-text-muted hover:text-text-primary mb-1 inline-block">
            &larr; Back to Batch Detail
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Capture — {batch.id}</h1>
            <Status tone={isCapturing ? 'warning' : 'neutral'}>
              {isCapturing ? 'CAPTURING' : batch.status}
            </Status>
          </div>
          <p className="mt-1 text-sm text-text-secondary">
            {batch.setupSnapshot?.productSnapshot.productName ?? batch.setupDraft?.productSnapshot?.productName}
          </p>
        </div>

        {isCapturing ? (
          <button
            onClick={handleAbortCapture}
            className="rounded-sm bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          >
            Abort Capture
          </button>
        ) : batch.status === 'READY' ? (
          <button
            onClick={handleStartCapture}
            className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          >
            Start Capture
          </button>
        ) : null}
      </div>

      <Status>Simulation environment · No hardware connected</Status>

      <div className="grid gap-4 lg:grid-cols-2">
        {(['side', 'front'] as CameraType[]).map(c => (
          <CameraBox key={c} camera={c} captureProgress={captureProgress} isCapturing={isCapturing} />
        ))}
      </div>

      <Panel title="Capture timeline">
        <div className="flex gap-1">
          {frames.map((f, idx) => {
            const isCaptured = idx < captureProgress;
            const isCurrent = idx === captureProgress && isCapturing;
            return (
              <div
                key={f.frameIndex}
                title={`${f.frameIndex} ${f.phase}`}
                className={`h-8 flex-1 rounded-xs ${isCurrent ? 'bg-primary-hover ring-2 ring-primary' : isCaptured ? 'bg-primary' : 'bg-border-default'}`}
              />
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            {isCapturing ? (
              <span>Capturing {captureProgress} / 60 frames...</span>
            ) : batch.status === 'READY' ? (
              <span>Ready to start capture</span>
            ) : (
              <span>Capture {captureProgress} / 60 frames completed</span>
            )}
          </div>
          {isCapturing && (
            <div className="text-xs font-medium text-text-muted">
              {Math.round((captureProgress / 60) * 100)}% complete
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}

function CameraBox({ camera, captureProgress, isCapturing }: { 
  camera: CameraType; 
  captureProgress: number; 
  isCapturing: boolean; 
}) {
  return (
    <Panel title={`${camera[0].toUpperCase() + camera.slice(1)} Camera`}>
      <div className="relative aspect-video overflow-hidden rounded-sm border border-border-strong bg-subtle">
        <Overlay camera={camera} />
        {isCapturing && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-white text-lg font-bold">Capturing frame {captureProgress + 1}</div>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-text-muted">
        {isCapturing ? `Capturing frame ${captureProgress + 1} of 60` : 'Mock capture loaded · fixture frame set'}
      </p>
    </Panel>
  );
}
