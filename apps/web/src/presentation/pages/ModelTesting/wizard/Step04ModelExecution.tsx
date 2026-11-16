import React, { useState, useRef, useEffect } from 'react';
import type { ModelTestRun, ModelTestFrame } from '../types';
import { extractFramesFromVideo } from '../frameExtractor';
import { processModelSegmentation } from '../segmentationEngine';
import { UploadCloud, Play, Pause, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, Star } from 'lucide-react';

interface Step04ModelExecutionProps {
  data: ModelTestRun;
  onChange: (patch: Partial<ModelTestRun>) => void;
  isReadOnly?: boolean;
}

type ViewMode = 'original' | 'mask' | 'overlay';

export function Step04ModelExecution({ data, onChange, isReadOnly = false }: Step04ModelExecutionProps) {
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<'idle' | 'extracting' | 'inferring'>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Review Studio State
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('overlay');
  const [overlayOpacity, setOverlayOpacity] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const playTimerRef = useRef<number | null>(null);

  const hasFrames = data.frames && data.frames.length > 0;
  const currentFrame: ModelTestFrame | undefined = hasFrames ? data.frames[activeFrameIndex] : undefined;
  const isPrimary = data.selectedPrimaryFrameIndex === activeFrameIndex;
  const isSupporting = data.selectedSupportingFrameIndexes?.includes(activeFrameIndex);

  // Auto-play scrubber playback
  useEffect(() => {
    if (isPlaying && hasFrames) {
      playTimerRef.current = window.setInterval(() => {
        setActiveFrameIndex((prev) => (prev + 1) % data.frames.length);
      }, 100);
    } else if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, hasFrames, data.frames.length]);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isReadOnly || isProcessing) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      handleSelectFile(file);
    } else {
      setError('Format video tidak didukung (.mp4, .mov, .webm)');
    }
  };

  const handleSelectFile = (file: File) => {
    setError(null);
    setSelectedVideoFile(file);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl(URL.createObjectURL(file));
  };

  const handleStartProcess = async () => {
    if (!selectedVideoFile) return;
    try {
      setIsProcessing(true);
      setError(null);
      setProgressPercent(0);

      // Stage 1: Frame extraction
      setProcessingStage('extracting');
      setProgressText('Mengekstrak frame...');
      const extraction = await extractFramesFromVideo(selectedVideoFile, {
        targetFps: 20,
        maxFrames: 60,
        onProgress: (percent, current, total) => {
          setProgressPercent(Math.round(percent * 0.45));
          setProgressText(`Ekstraksi frame (${current}/${total})...`);
        },
      });

      // Stage 2: Model Segmentation Inference
      setProcessingStage('inferring');
      setProgressText('Segmentasi plume...');
      const processedFrames = await processModelSegmentation(extraction.frames, {
        onProgress: (percent, current, total) => {
          setProgressPercent(45 + Math.round(percent * 0.55));
          setProgressText(`Segmentasi model (${current}/${total})...`);
        },
      });

      // Pick best primary candidate
      let bestFrameIndex = Math.floor(processedFrames.length / 2);
      let maxArea = 0;
      processedFrames.forEach((f, idx) => {
        if ((f.plumeAreaPx || 0) > maxArea) {
          maxArea = f.plumeAreaPx || 0;
          bestFrameIndex = idx;
        }
      });

      onChange({
        videoMetadata: extraction.metadata,
        frames: processedFrames,
        selectedPrimaryFrameIndex: bestFrameIndex,
        selectedSupportingFrameIndexes: [],
        status: 'REVIEW',
      });

      setActiveFrameIndex(bestFrameIndex);
      setIsProcessing(false);
      setProcessingStage('idle');
    } catch (err: unknown) {
      console.error('Gagal memproses video dan model:', err);
      const message = err instanceof Error ? err.message : 'Gagal memproses video';
      setError(message);
      setIsProcessing(false);
      setProcessingStage('idle');
    }
  };

  const handleTogglePrimary = () => {
    if (isReadOnly || !hasFrames) return;
    onChange({ selectedPrimaryFrameIndex: activeFrameIndex });
  };

  const handleToggleSupporting = () => {
    if (isReadOnly || !hasFrames) return;
    const currentList = data.selectedSupportingFrameIndexes || [];
    const updated = currentList.includes(activeFrameIndex)
      ? currentList.filter((idx) => idx !== activeFrameIndex)
      : [...currentList, activeFrameIndex];
    onChange({ selectedSupportingFrameIndexes: updated });
  };

  const handleResetVideo = () => {
    if (isReadOnly) return;
    if (window.confirm('Ganti video? Data frame saat ini akan direset.')) {
      onChange({
        videoMetadata: undefined,
        frames: [],
        selectedPrimaryFrameIndex: undefined,
        selectedSupportingFrameIndexes: [],
        status: 'READY_FOR_UPLOAD',
      });
      setSelectedVideoFile(null);
      setVideoPreviewUrl(null);
      setActiveFrameIndex(0);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">04. Eksekusi</h2>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-semantic-danger/10 border border-semantic-danger/30 text-semantic-danger text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STATE A: Upload & Extraction Initiation */}
      {!hasFrames && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-lg p-6 sm:p-8 text-center transition-colors bg-surface ${
              isProcessing
                ? 'border-border-default opacity-60 cursor-not-allowed'
                : 'border-border-strong hover:border-primary cursor-pointer'
            }`}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleSelectFile(file);
              }}
              disabled={isProcessing}
            />

            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary-soft flex items-center justify-center text-primary mb-1">
                <UploadCloud size={24} />
              </div>
              <div className="text-xs font-semibold text-text-primary">
                {selectedVideoFile ? selectedVideoFile.name : 'Pilih atau tarik file video'}
              </div>
              <p className="text-[11px] text-text-muted max-w-sm">
                Format MP4, MOV, atau WebM.
              </p>
              {!selectedVideoFile && (
                <button
                  type="button"
                  className="btn btn-secondary !min-h-[28px] text-xs px-3 font-medium mt-2"
                >
                  Pilih file
                </button>
              )}
            </div>
          </div>

          {/* Selected Video Preview & Action */}
          {selectedVideoFile && !isProcessing && (
            <div className="rounded-md border border-border-default bg-surface p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {videoPreviewUrl && (
                  <video
                    src={videoPreviewUrl}
                    className="w-24 h-16 object-cover rounded bg-black border border-border-subtle"
                    muted
                    controls={false}
                  />
                )}
                <div>
                  <div className="text-xs font-semibold text-text-primary">{selectedVideoFile.name}</div>
                  <div className="text-[11px] text-text-muted mt-0.5">
                    {(selectedVideoFile.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVideoFile(null)}
                  className="btn btn-secondary !min-h-[32px] px-3 text-xs"
                >
                  Ganti file
                </button>
                <button
                  type="button"
                  onClick={handleStartProcess}
                  className="btn btn-primary !min-h-[32px] px-4 text-xs font-medium flex items-center gap-1.5 shadow-xs"
                >
                  <Play size={14} fill="currentColor" />
                  Ekstrak &amp; Segmentasi
                </button>
              </div>
            </div>
          )}

          {/* Processing Progress Bar */}
          {isProcessing && (
            <div className="rounded-md border border-primary/30 bg-primary-soft/10 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-primary">{progressText}</span>
                <span className="font-mono font-medium text-primary">{progressPercent}%</span>
              </div>
              <div className="w-full bg-surface border border-border-default rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center gap-4 text-[11px] text-text-muted">
                <span className={processingStage === 'extracting' ? 'font-bold text-primary' : ''}>
                  1. Ekstraksi frame
                </span>
                <span>&rarr;</span>
                <span className={processingStage === 'inferring' ? 'font-bold text-primary' : ''}>
                  2. Segmentasi plume
                </span>
                <span>&rarr;</span>
                <span>3. Selesai</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STATE B: Studio Review Segmentasi Frame-by-Frame */}
      {hasFrames && currentFrame && (
        <div className="space-y-4">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface border border-border-default rounded-md">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-text-primary">
                {data.videoMetadata?.fileName || 'Video'}
              </span>
              <span className="text-border-strong">&middot;</span>
              <span className="font-mono text-xs text-text-secondary">
                {data.frames.length} frame
              </span>
              <span className="text-border-strong">&middot;</span>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                currentFrame.plumeDetected
                  ? 'bg-semantic-success-soft text-semantic-success'
                  : 'bg-surface-subtle text-text-muted'
              }`}>
                {currentFrame.plumeDetected ? 'Plume' : 'Non-spray'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetVideo}
                disabled={isReadOnly}
                className="btn btn-secondary !min-h-[28px] px-2.5 text-xs font-medium flex items-center gap-1 text-text-secondary"
              >
                <RefreshCw size={12} />
                Ganti video
              </button>
            </div>
          </div>

          {/* Main Inspection Canvas Area */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            <div className="rounded-md border border-border-default bg-black overflow-hidden flex flex-col items-center justify-center min-h-[380px] p-2 relative">
              <div className="relative max-w-full max-h-[440px] flex items-center justify-center">
                {viewMode === 'original' && (
                  <img
                    src={currentFrame.originalImageUrl}
                    alt={`Frame ${activeFrameIndex}`}
                    className="max-h-[420px] w-auto object-contain rounded"
                  />
                )}

                {viewMode === 'mask' && (
                  <img
                    src={currentFrame.maskImageUrl}
                    alt={`Mask ${activeFrameIndex}`}
                    className="max-h-[420px] w-auto object-contain rounded"
                  />
                )}

                {viewMode === 'overlay' && (
                  <div className="relative">
                    <img
                      src={currentFrame.originalImageUrl}
                      alt={`Original Base ${activeFrameIndex}`}
                      className="max-h-[420px] w-auto object-contain rounded"
                    />
                    <img
                      src={currentFrame.maskImageUrl}
                      alt={`Mask Overlay ${activeFrameIndex}`}
                      style={{ opacity: overlayOpacity / 100 }}
                      className="absolute inset-0 max-h-[420px] w-auto object-contain rounded mix-blend-screen pointer-events-none"
                    />
                  </div>
                )}

                {/* Badge Overlay */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/75 px-2 py-0.5 rounded text-[11px] font-mono text-white border border-white/10">
                  <span className="font-semibold text-cyan-400">#{String(activeFrameIndex).padStart(3, '0')}</span>
                  <span className="text-white/40">&middot;</span>
                  <span>{currentFrame.timestampMs} ms</span>
                  {isPrimary && (
                    <>
                      <span className="text-white/40">&middot;</span>
                      <span className="text-amber-300 font-sans font-medium flex items-center gap-0.5">
                        <Star size={11} fill="currentColor" /> Utama
                      </span>
                    </>
                  )}
                  {isSupporting && (
                    <>
                      <span className="text-white/40">&middot;</span>
                      <span className="text-cyan-300 font-sans font-medium">Pendukung</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Side Controls & Telemetry */}
            <div className="rounded-md border border-border-default bg-surface p-4 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-text-primary block mb-2">Tampilan</span>
                <div className="grid grid-cols-3 gap-1 bg-surface-subtle p-0.5 rounded border border-border-subtle">
                  <button
                    type="button"
                    onClick={() => setViewMode('original')}
                    className={`py-1 text-center font-medium rounded transition-colors ${
                      viewMode === 'original' ? 'bg-primary text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Asli
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('mask')}
                    className={`py-1 text-center font-medium rounded transition-colors ${
                      viewMode === 'mask' ? 'bg-primary text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Mask
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('overlay')}
                    className={`py-1 text-center font-medium rounded transition-colors ${
                      viewMode === 'overlay' ? 'bg-primary text-white shadow-xs' : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Overlay
                  </button>
                </div>
              </div>

              {viewMode === 'overlay' && (
                <div className="space-y-1.5 border-t border-border-subtle pt-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-text-muted">Opasitas mask</span>
                    <span className="font-mono text-text-primary">{overlayOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                    className="w-full h-1.5 bg-surface-subtle rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
              )}

              {/* Telemetry Metrics */}
              <div className="border-t border-border-subtle pt-3 space-y-2">
                <span className="font-semibold text-text-primary block">Metrik frame</span>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between py-0.5 border-b border-border-subtle">
                    <span className="text-text-muted">Plume:</span>
                    <span className={currentFrame.plumeDetected ? 'font-semibold text-semantic-success' : 'text-text-muted'}>
                      {currentFrame.plumeDetected ? 'Terdeteksi' : 'Tidak ada'}
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5 border-b border-border-subtle">
                    <span className="text-text-muted">Confidence:</span>
                    <span className="font-mono font-medium text-text-primary">
                      {(currentFrame.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-text-muted">Luas:</span>
                    <span className="font-mono font-medium text-text-primary">
                      {currentFrame.plumeAreaPx?.toLocaleString() || 0} px
                    </span>
                  </div>
                </div>
              </div>

              {/* Role Selection */}
              <div className="border-t border-border-subtle pt-3 space-y-2">
                <span className="font-semibold text-text-primary block">Tandai frame</span>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={handleTogglePrimary}
                    disabled={isReadOnly}
                    className={`btn !min-h-[28px] w-full text-xs font-medium flex items-center justify-center gap-1.5 ${
                      isPrimary
                        ? 'btn-primary'
                        : 'btn-secondary text-text-secondary'
                    }`}
                  >
                    <Star size={13} fill={isPrimary ? 'currentColor' : 'none'} />
                    {isPrimary ? 'Frame utama' : 'Jadikan utama'}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleSupporting}
                    disabled={isReadOnly}
                    className={`btn !min-h-[28px] w-full text-xs font-medium flex items-center justify-center gap-1.5 ${
                      isSupporting
                        ? 'btn-secondary !border-primary text-primary font-semibold'
                        : 'btn-secondary text-text-secondary'
                    }`}
                  >
                    <CheckCircle2 size={13} />
                    {isSupporting ? 'Frame pendukung' : 'Jadikan pendukung'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Scrubber Timeline */}
          <div className="rounded-md border border-border-default bg-surface p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-7 h-7 rounded border border-border-default flex items-center justify-center hover:bg-surface-subtle"
                  title={isPlaying ? 'Jeda' : 'Putar'}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFrameIndex((prev) => Math.max(0, prev - 1))}
                  className="w-7 h-7 rounded border border-border-default flex items-center justify-center hover:bg-surface-subtle"
                  title="Sebelumnya"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFrameIndex((prev) => Math.min(data.frames.length - 1, prev + 1))}
                  className="w-7 h-7 rounded border border-border-default flex items-center justify-center hover:bg-surface-subtle"
                  title="Berikutnya"
                >
                  <ChevronRight size={14} />
                </button>
                <span className="font-mono text-xs text-text-primary ml-1">
                  Frame {activeFrameIndex + 1} / {data.frames.length}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-text-muted">
                <span>{currentFrame.timestampMs} ms</span>
                <span>&middot;</span>
                <span>{data.videoMetadata?.durationSeconds || 0}s</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="0"
              max={data.frames.length - 1}
              value={activeFrameIndex}
              onChange={(e) => setActiveFrameIndex(Number(e.target.value))}
              className="w-full h-2 bg-surface-subtle rounded-lg appearance-none cursor-pointer accent-primary"
            />

            {/* Frame Thumbnail Dots / Ticks */}
            <div className="flex items-center gap-1 overflow-x-auto py-1">
              {data.frames.map((f, idx) => {
                const isActive = idx === activeFrameIndex;
                const isCurPrimary = idx === data.selectedPrimaryFrameIndex;
                const isCurSupporting = data.selectedSupportingFrameIndexes?.includes(idx);
                return (
                  <button
                    key={f.frameIndex}
                    type="button"
                    onClick={() => setActiveFrameIndex(idx)}
                    className={`h-4 min-w-[12px] flex-1 rounded-xs transition-all ${
                      isActive
                        ? 'bg-primary ring-2 ring-primary/40'
                        : isCurPrimary
                        ? 'bg-amber-400'
                        : isCurSupporting
                        ? 'bg-cyan-500'
                        : f.plumeDetected
                        ? 'bg-border-strong hover:bg-primary/50'
                        : 'bg-surface-subtle hover:bg-border-default'
                    }`}
                    title={`#${idx} - ${f.timestampMs}ms ${isCurPrimary ? '(Utama)' : ''}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
