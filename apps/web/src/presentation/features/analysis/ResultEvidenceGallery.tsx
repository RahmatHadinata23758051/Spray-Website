import React, { useEffect, useState } from 'react';
import type {
  FinalAnalysisReport,
  TestRun,
  Frame,
  FrontPixelGeometry,
  SidePixelGeometry,
  CalibrationSnapshot,
} from '@spray-paragon/domain';
import {
  createFrontMeasurements,
  createCalibrationSnapshot,
} from '@spray-paragon/domain';
import { AnalysisOverlay } from './AnalysisOverlay';
import { captureAssetResolver } from '../../../application/services';

interface ResultEvidenceGalleryProps {
  testRun: TestRun;
  report?: FinalAnalysisReport;
}

const defaultFallbackFrontGeometry: FrontPixelGeometry = {
  contourPx: [],
  sprayAreaPixels: 6000,
  centroidPx: { x: 360, y: 180 },
  referenceCenterPx: { x: 360, y: 180 },
  equivalentDiameterPx: 80,
  circularity: 0.95,
  horizontalSymmetry: 0.95,
  verticalSymmetry: 0.95,
};

const defaultFallbackSideGeometry: SidePixelGeometry = {
  nozzleOriginPx: { x: 120, y: 300 },
  sprayEndpointPx: { x: 500, y: 300 },
  upperBoundaryPx: { x: 450, y: 220 },
  lowerBoundaryPx: { x: 450, y: 380 },
  verticalSpreadTopPx: { x: 350, y: 240 },
  verticalSpreadBottomPx: { x: 350, y: 360 },
  directionReferencePx: { x: 500, y: 300 },
};

const defaultFallbackCalibration: CalibrationSnapshot = createCalibrationSnapshot({
  camera: 'side',
  referenceDistanceMm: 1000,
  anchorA: { x: 112, y: 296 },
  anchorB: { x: 634, y: 296 },
});

function mapPhaseLabel(phase?: string): string {
  switch (phase) {
    case 'pre-spray':
    case 'pre_spray':
      return 'Pra-semprot';
    case 'build-up':
    case 'build_up':
      return 'Pelepasan';
    case 'stable':
      return 'Semprot Stabil';
    case 'decay':
      return 'Pelemahan';
    default:
      return phase || 'Semprot';
  }
}

export function ResultEvidenceGallery({ testRun, report }: ResultEvidenceGalleryProps) {
  const finalReport = report || testRun.finalReport;
  const isSimulation = testRun.captureSession?.captureMode === 'simulation' || finalReport?.analysisSource === 'simulation';

  // Primary frame metadata
  const primaryCapture = finalReport?.primaryCapture ?? {
    frameIndex: 0,
    timestampMs: 0,
    phase: 'stable' as const,
  };

  const primaryPhase = mapPhaseLabel(primaryCapture.phase);
  const primarySeconds = (primaryCapture.timestampMs / 1000).toFixed(2);

  // Telemetry values (from testRun setpoints and measurements)
  const forceValue = testRun.setpoints?.forceSetpointN !== undefined
    ? `${testRun.setpoints.forceSetpointN.toFixed(1)} N`
    : null;
  const strokeValue = testRun.setpoints?.strokeMm !== undefined
    ? `${testRun.setpoints.strokeMm.toFixed(1)} mm`
    : null;

  // Real capture image resolution
  const [realPrimaryUrl, setRealPrimaryUrl] = useState<string | null>(null);
  const [realSupportingUrls, setRealSupportingUrls] = useState<Record<string, string>>({});
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(primaryCapture.frameIndex);

  useEffect(() => {
    let cancelled = false;
    const urlsToRevoke: string[] = [];

    async function loadRealImages() {
      if (isSimulation || !testRun.captureSession?.realSideFrames) return;

      const frames = testRun.captureSession.realSideFrames;
      const primaryFrame = frames.find(f => f.frameIndex === primaryCapture.frameIndex) || frames[0];

      if (primaryFrame?.assetId) {
        try {
          const blob = await captureAssetResolver.resolveBlob(primaryFrame);
          if (blob && !cancelled) {
            const url = URL.createObjectURL(blob);
            urlsToRevoke.push(url);
            setRealPrimaryUrl(url);
          }
        } catch (e) {
          console.error('Failed to load primary frame blob', e);
        }
      }

      // Supporting frames
      const supUrls: Record<string, string> = {};
      const supMoments = finalReport?.supportingCaptures ?? [];
      for (const sup of supMoments) {
        const frame = frames.find(f => f.frameIndex === sup.frameIndex);
        if (frame?.assetId) {
          try {
            const blob = await captureAssetResolver.resolveBlob(frame);
            if (blob && !cancelled) {
              const url = URL.createObjectURL(blob);
              urlsToRevoke.push(url);
              supUrls[sup.captureMomentId] = url;
            }
          } catch (e) {
            console.error('Failed to load supporting frame blob', e);
          }
        }
      }
      if (!cancelled) {
        setRealSupportingUrls(supUrls);
      }
    }

    void loadRealImages();

    return () => {
      cancelled = true;
      urlsToRevoke.forEach(u => URL.revokeObjectURL(u));
    };
  }, [isSimulation, testRun, primaryCapture.frameIndex, finalReport]);

  // Supporting captures list
  const supportingCaptures = finalReport?.supportingCaptures ?? [];

  return (
    <div className="bg-surface border border-border-default rounded-md overflow-hidden space-y-0">
      <div className="bg-surface-subtle px-4 py-2 border-b border-border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-primary">Bukti Citra & Telemetri</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border-subtle text-text-muted">
            {isSimulation ? 'Simulasi' : 'Akuisisi Nyata'}
          </span>
        </div>
        <span className="text-[11px] text-text-muted font-mono">
          1 Utama · {supportingCaptures.length} Pendukung
        </span>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        {/* Left: Primary Evidence Frame */}
        <div className="space-y-2.5">
          <div className="relative aspect-[16/10] bg-[#080f18] rounded border border-workbench-border overflow-hidden flex items-center justify-center">
            {/* Top-Left Metadata Badge */}
            <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 text-[10px] font-mono font-medium text-white/90 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded border border-white/10 shadow-xs">
              <span className="text-primary font-semibold">★ Utama</span>
              <span>•</span>
              <span>Side</span>
              <span>•</span>
              <span>Frame #{String(activeFrameIndex).padStart(3, '0')}</span>
              <span>•</span>
              <span>{primarySeconds} s</span>
              <span>•</span>
              <span className="text-text-muted">{primaryPhase}</span>
            </div>

            {/* Frame Viewport */}
            {isSimulation && finalReport ? (
              <div className="w-full h-full">
                <AnalysisOverlay
                  camera="side"
                  mode="Overlay"
                  frame={{
                    id: `frm-${activeFrameIndex}`,
                    camera: 'side',
                    frameIndex: activeFrameIndex,
                    timestampMs: primaryCapture.timestampMs,
                    phase: primaryCapture.phase,
                    assets: { original: '', mask: '', overlay: '' },
                  } as unknown as Frame}
                  calibration={finalReport.side?.calibration || defaultFallbackCalibration}
                  sideGeometry={finalReport.side?.finalGeometry || finalReport.side?.autoGeometry || defaultFallbackSideGeometry}
                  frontGeometry={finalReport.front?.finalGeometry || finalReport.front?.autoGeometry || defaultFallbackFrontGeometry}
                  sideMeasurements={finalReport.side}
                  frontMeasurements={finalReport.front || createFrontMeasurements({
                    sprayAreaMm2: 0,
                    equivalentDiameterMm: 0,
                    circularity: 0,
                    centroidOffsetXmm: 0,
                    centroidOffsetYmm: 0,
                    horizontalSymmetry: 0,
                    verticalSymmetry: 0,
                  })}
                />
              </div>
            ) : realPrimaryUrl ? (
              <img
                src={realPrimaryUrl}
                alt={`Frame Utama ${activeFrameIndex}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-workbench-muted text-xs p-6 text-center">
                <svg className="w-8 h-8 mb-1.5 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <span>Gambar tidak tersedia</span>
                <span className="text-[10px] font-mono mt-0.5 text-text-muted">Frame #{String(activeFrameIndex).padStart(3, '0')}</span>
              </div>
            )}
          </div>

          {/* Telemetry Strip for Primary Frame */}
          <div className="p-2.5 bg-surface-subtle border border-border-subtle rounded flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-text-muted text-[11px] font-medium">Telemetri saat frame:</span>
            <div className="flex flex-wrap items-center gap-4 font-mono text-text-primary">
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted text-[10px] font-sans">Gaya Tekan:</span>
                <span className="font-medium">{forceValue ?? 'Tidak tersedia'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted text-[10px] font-sans">Stroke:</span>
                <span className="font-medium">{strokeValue ?? 'Tidak tersedia'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted text-[10px] font-sans">Waktu:</span>
                <span className="font-medium">{primarySeconds} s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Supporting Evidence Gallery */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">Tangkapan Pendukung</span>
            <span className="text-[10px] text-text-muted font-mono">{supportingCaptures.length} / 9</span>
          </div>

          {supportingCaptures.length === 0 ? (
            <div className="p-4 border border-dashed border-border-default rounded bg-surface-subtle/40 text-center text-xs text-text-muted">
              Tidak ada tangkapan pendukung yang dipilih.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
              {supportingCaptures.map((sup, idx) => {
                const supUrl = realSupportingUrls[sup.captureMomentId];
                const isSelected = activeFrameIndex === sup.frameIndex;

                return (
                  <button
                    key={sup.captureMomentId}
                    type="button"
                    onClick={() => setActiveFrameIndex(sup.frameIndex)}
                    className={`text-left p-1.5 rounded border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary-soft/30'
                        : 'border-border-subtle bg-surface-subtle hover:border-border-default'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-black/80 rounded overflow-hidden flex items-center justify-center relative mb-1">
                      {isSimulation && finalReport ? (
                        <div className="w-full h-full scale-90">
                          <AnalysisOverlay
                            camera="side"
                            mode="Overlay"
                            frame={{
                              id: `frm-sup-${sup.frameIndex}`,
                              camera: 'side',
                              frameIndex: sup.frameIndex,
                              timestampMs: sup.timestampMs,
                              phase: sup.phase,
                              assets: { original: '', mask: '', overlay: '' },
                            } as unknown as Frame}
                            calibration={finalReport.side?.calibration || defaultFallbackCalibration}
                            sideGeometry={finalReport.side?.finalGeometry || finalReport.side?.autoGeometry || defaultFallbackSideGeometry}
                            frontGeometry={finalReport.front?.finalGeometry || finalReport.front?.autoGeometry || defaultFallbackFrontGeometry}
                            sideMeasurements={finalReport.side}
                            frontMeasurements={finalReport.front || createFrontMeasurements({
                              sprayAreaMm2: 0,
                              equivalentDiameterMm: 0,
                              circularity: 0,
                              centroidOffsetXmm: 0,
                              centroidOffsetYmm: 0,
                              horizontalSymmetry: 0,
                              verticalSymmetry: 0,
                            })}
                          />
                        </div>
                      ) : supUrl ? (
                        <img src={supUrl} alt={`Supporting #${idx + 1}`} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-text-muted font-mono">#{sup.frameIndex}</span>
                      )}
                      <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] font-mono text-white/90 px-1 rounded">
                        #{String(sup.frameIndex).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-text-muted font-mono px-0.5">
                      <span>Pendukung #{idx + 1}</span>
                      <span>{(sup.timestampMs / 1000).toFixed(2)}s</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

