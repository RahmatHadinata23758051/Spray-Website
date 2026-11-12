import React, { useState } from 'react';
import type { FinalAnalysisReport, KodePengujian, Sample, TestRun } from '@spray-paragon/domain';

interface TechnicalDetailsDisclosureProps {
  report: FinalAnalysisReport;
  kp?: KodePengujian;
  sample?: Sample;
  testRun: TestRun;
}

export function TechnicalDetailsDisclosure({
  report,
  kp: _kp,
  sample: _sample,
  testRun,
}: TechnicalDetailsDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-surface border border-border-default rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-surface-subtle/60 hover:bg-surface-subtle transition-colors flex items-center justify-between text-xs font-medium text-text-secondary"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90 text-primary' : 'text-text-muted'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-semibold text-text-primary">Detail teknis & audit</span>
          <span className="text-[10px] font-mono text-text-muted">(Kalibrasi, Geometri Piksel, ID Moment)</span>
        </div>
        <span className="text-[11px] text-primary hover:underline">
          {isOpen ? 'Sembunyikan detail teknis' : 'Lihat detail teknis'}
        </span>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-border-subtle space-y-4 text-xs bg-surface">
          {/* 1. Capture Moment & Frame Registry */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
              Tangkapan utama & momen
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono p-2.5 bg-surface-subtle rounded border border-border-subtle">
              <div>
                <span className="text-text-muted text-[10px] block font-sans">Primary Frame Index</span>
                <span className="font-medium text-text-primary">{report.primaryCapture?.frameIndex ?? 0}</span>
              </div>
              <div>
                <span className="text-text-muted text-[10px] block font-sans">Waktu (ms)</span>
                <span className="font-medium text-text-primary">{report.primaryCapture?.timestampMs ?? 0}</span>
              </div>
              <div>
                <span className="text-text-muted text-[10px] block font-sans">Fase</span>
                <span className="text-text-secondary">{report.primaryCapture?.phase ?? '—'}</span>
              </div>
              <div>
                <span className="text-text-muted text-[10px] block font-sans">Capture Moment ID</span>
                <span className="text-text-secondary text-[11px] truncate block" title={report.primaryCaptureMomentId}>
                  {report.primaryCaptureMomentId || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Side Calibration & Pixel Geometry */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
              Analisis samping (side)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.side?.calibration && (
                <div className="p-2.5 bg-surface-subtle rounded border border-border-subtle space-y-1.5 font-mono text-xs">
                  <div className="font-sans font-medium text-text-primary text-[11px]">Kalibrasi Samping</div>
                  <div className="flex justify-between text-text-secondary">
                    <span className="font-sans">mm/px</span>
                    <span className="text-text-primary">{report.side.calibration.scaleMmPerPx?.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span className="font-sans">Jarak Referensi (mm)</span>
                    <span className="text-text-primary">{report.side.calibration.referenceDistanceMm}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span className="font-sans">Status Penyesuaian</span>
                    <span>{report.side.calibration.adjusted ? 'Diadjust' : 'Bawaan'}</span>
                  </div>
                </div>
              )}

              {report.side?.autoGeometry && (
                <div className="p-2.5 bg-surface-subtle rounded border border-border-subtle space-y-1.5 font-mono text-xs">
                  <div className="font-sans font-medium text-text-primary text-[11px]">Geometri otomatis (piksel)</div>
                  {report.side.autoGeometry.nozzleOriginPx && (
                    <div className="flex justify-between text-text-secondary">
                      <span className="font-sans">Nozzle Origin</span>
                      <span>({report.side.autoGeometry.nozzleOriginPx.x.toFixed(0)}, {report.side.autoGeometry.nozzleOriginPx.y.toFixed(0)})</span>
                    </div>
                  )}
                  {report.side.autoGeometry.sprayEndpointPx && (
                    <div className="flex justify-between text-text-secondary">
                      <span className="font-sans">Spray Endpoint</span>
                      <span>({report.side.autoGeometry.sprayEndpointPx.x.toFixed(0)}, {report.side.autoGeometry.sprayEndpointPx.y.toFixed(0)})</span>
                    </div>
                  )}
                  {report.side.autoGeometry.upperBoundaryPx && (
                    <div className="flex justify-between text-text-secondary">
                      <span className="font-sans">Upper Boundary</span>
                      <span>({report.side.autoGeometry.upperBoundaryPx.x.toFixed(0)}, {report.side.autoGeometry.upperBoundaryPx.y.toFixed(0)})</span>
                    </div>
                  )}
                  {report.side.autoGeometry.lowerBoundaryPx && (
                    <div className="flex justify-between text-text-secondary">
                      <span className="font-sans">Lower Boundary</span>
                      <span>({report.side.autoGeometry.lowerBoundaryPx.x.toFixed(0)}, {report.side.autoGeometry.lowerBoundaryPx.y.toFixed(0)})</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-2 text-[11px] text-text-muted font-mono">
              Koreksi manual: {Object.keys(report.side?.finalGeometry || {}).length > 0 ? 'Diterapkan' : 'Tidak ada'}
            </div>
          </div>

          {/* 3. Front Analysis (if present) */}
          {report.front && (
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
                Analisis depan (front)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {report.front.calibration && (
                  <div className="p-2.5 bg-surface-subtle rounded border border-border-subtle space-y-1.5 font-mono text-xs">
                    <div className="font-sans font-medium text-text-primary text-[11px]">Kalibrasi Depan</div>
                    <div className="flex justify-between text-text-secondary">
                      <span className="font-sans">mm/px</span>
                      <span className="text-text-primary">{report.front.calibration.scaleMmPerPx?.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span className="font-sans">Jarak Referensi (mm)</span>
                      <span className="text-text-primary">{report.front.calibration.referenceDistanceMm}</span>
                    </div>
                  </div>
                )}
                <div className="p-2.5 bg-surface-subtle rounded border border-border-subtle space-y-1.5 font-mono text-xs">
                  <div className="font-sans font-medium text-text-primary text-[11px]">Pengukuran Otomatis Depan</div>
                  <div className="flex justify-between text-text-secondary">
                    <span className="font-sans">Area Spray (px)</span>
                    <span>{report.front.autoGeometry?.sprayAreaPixels ? `${report.front.autoGeometry.sprayAreaPixels.toFixed(0)} px` : '—'}</span>
                  </div>
                  <div className="flex justify-between text-text-secondary">
                    <span className="font-sans">Circularity</span>
                    <span>{report.front.autoGeometry?.circularity ? report.front.autoGeometry.circularity.toFixed(3) : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. Supporting Captures Registry */}
          {report.supportingCaptures && report.supportingCaptures.length > 0 && (
            <div>
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
                Tangkapan pendukung
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {report.supportingCaptures.map((cap, idx) => (
                  <div key={cap.captureMomentId} className="p-2 bg-surface-subtle rounded border border-border-subtle text-xs font-mono">
                    <div className="flex justify-between items-center text-text-muted font-sans text-[10px]">
                      <span>Pendukung #{idx + 1}</span>
                      <span>{cap.phase}</span>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span className="text-text-secondary">Frame #{cap.frameIndex}</span>
                      <span className="text-text-primary">{cap.timestampMs} ms</span>
                    </div>
                    <div className="text-[9px] text-text-muted truncate mt-0.5" title={cap.captureMomentId}>
                      {cap.captureMomentId}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. System Provenance & Immutability */}
          <div className="pt-2 border-t border-border-subtle flex flex-wrap items-center justify-between gap-3 text-[11px] text-text-muted font-mono">
            <span>Test ID: {report.testId || report.test?.testId || testRun.id}</span>
            <span>Finalized by: {report.finalizedBy || '—'} · {report.finalizedAt ? new Date(report.finalizedAt).toLocaleString('id-ID') : '—'}</span>
            <span>Sumber: {report.analysisSource || '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

