import React from 'react';
import type { Camera as CameraType, Analysis as AnalysisData, SynchronizedAnalysisFrame } from '@spray-paragon/domain';
import type { CalibrationSnapshot, SideFinalMeasurements, FrontFinalMeasurements, MeasurementValue } from '@spray-paragon/domain';
import { selectMeasurementValue } from '@spray-paragon/domain';
import { fmt } from '../../utils/formatters';
import { formatPointPx, metricSlug, phaseLabel } from './utils';
import type { ActiveSideTool } from './types';

export function Inspector({ 
  camera, 
  a, 
  moment, 
  calibration, 
  isCalibrating, 
  onStartCalibration, 
  onCancelCalibration, 
  onApplyCalibration, 
  onAdjustCalibration, 
  isEditingMeasurement, 
  activeSideTool, 
  onSetActiveSideTool, 
  onStartMeasurementEdit, 
  onCancelMeasurementEdit, 
  onApplyMeasurementEdit, 
  sideMeasurements, 
  frontMeasurements, 
  onCorrectFront,
  totalMomentsCount = 100,
  readOnly = false,
}: {
  camera: CameraType;
  a?: Partial<AnalysisData>;
  moment?: SynchronizedAnalysisFrame;
  calibration?: CalibrationSnapshot;
  isCalibrating?: boolean;
  onStartCalibration?: () => void;
  onCancelCalibration?: () => void;
  onApplyCalibration?: () => void;
  onAdjustCalibration?: (deltaPx: number) => void;
  isEditingMeasurement?: boolean;
  activeSideTool?: ActiveSideTool;
  onSetActiveSideTool?: (tool: ActiveSideTool) => void;
  onStartMeasurementEdit?: () => void;
  onCancelMeasurementEdit?: () => void;
  onApplyMeasurementEdit?: () => void;
  sideMeasurements?: SideFinalMeasurements;
  frontMeasurements?: FrontFinalMeasurements;
  onCorrectFront?: (field: 'sprayArea' | 'centroidOffsetX' | 'centroidOffsetY', delta: number) => void;
  totalMomentsCount?: number;
  readOnly?: boolean;
}) {
  const measurementRows: { label: string; idLabel: string; value: MeasurementValue; format: (value: number) => string }[] = camera === 'side'
    ? [
      ['Panjang Semprot', 'Spray length', sideMeasurements?.sprayLength ?? { auto: a?.side?.sprayLengthMm ?? 0, final: a?.side?.sprayLengthMm ?? 0, adjusted: false }, fmt.cm],
      ['Sudut Semprot', 'Spray angle', sideMeasurements?.sprayAngle ?? { auto: a?.side?.sprayAngleDeg ?? 0, final: a?.side?.sprayAngleDeg ?? 0, adjusted: false }, fmt.deg],
      ['Sebaran Vertikal', 'Vertical spread', sideMeasurements?.verticalSpread ?? { auto: a?.side?.maxVerticalSpreadMm ?? 0, final: a?.side?.maxVerticalSpreadMm ?? 0, adjusted: false }, fmt.mm],
      ['Offset Arah', 'Direction offset', sideMeasurements?.directionOffset ?? { auto: a?.side?.directionOffsetDeg ?? 0, final: a?.side?.directionOffsetDeg ?? 0, adjusted: false }, fmt.deg],
    ].map(([label, idLabel, value, format]) => ({ label: label as string, idLabel: idLabel as string, value: value as MeasurementValue, format: format as (value: number) => string }))
    : [
      ['Luas Semprot', 'Spray area', frontMeasurements?.sprayArea ?? { auto: a?.front?.sprayAreaMm2 ?? 0, final: a?.front?.sprayAreaMm2 ?? 0, adjusted: false }, fmt.area],
      ['Diameter Ekuivalen', 'Equivalent diameter', frontMeasurements?.equivalentDiameter ?? { auto: a?.front?.equivalentDiameterMm ?? 0, final: a?.front?.equivalentDiameterMm ?? 0, adjusted: false }, fmt.mm],
      ['Sirkularitas', 'Circularity', frontMeasurements?.circularity ?? { auto: a?.front?.circularity ?? 0, final: a?.front?.circularity ?? 0, adjusted: false }, (value: number) => value.toFixed(2)],
      ['Centroid X', 'Centroid X', frontMeasurements?.centroidOffsetX ?? { auto: a?.front?.centroidOffsetXmm ?? 0, final: a?.front?.centroidOffsetXmm ?? 0, adjusted: false }, fmt.mm],
      ['Centroid Y', 'Centroid Y', frontMeasurements?.centroidOffsetY ?? { auto: a?.front?.centroidOffsetYmm ?? 0, final: a?.front?.centroidOffsetYmm ?? 0, adjusted: false }, fmt.mm],
      ['Simetri Horizontal', 'Horizontal symmetry', frontMeasurements?.horizontalSymmetry ?? { auto: a?.front?.horizontalSymmetry ?? 0, final: a?.front?.horizontalSymmetry ?? 0, adjusted: false }, fmt.pct],
      ['Simetri Vertikal', 'Vertical symmetry', frontMeasurements?.verticalSymmetry ?? { auto: a?.front?.verticalSymmetry ?? 0, final: a?.front?.verticalSymmetry ?? 0, adjusted: false }, fmt.pct],
    ].map(([label, idLabel, value, format]) => ({ label: label as string, idLabel: idLabel as string, value: value as MeasurementValue, format: format as (value: number) => string }));

  return (
    <div className="inspector-panel">
      {/* 1. Measurements */}
      <section className="inspector-section space-y-3">
        <h3 className="inspector-header">Pengukuran ({camera === 'side' ? 'Samping' : 'Depan'})</h3>
        {(!isEditingMeasurement || camera === 'front') && (
          <div className="space-y-2">
            {measurementRows.map(row => (
              <div className={`flex flex-col py-1.5 border-b border-border-subtle/50 text-xs ${row.value.adjusted ? 'bg-semantic-warning-soft/50 px-2 rounded-md border-transparent' : ''}`} key={row.label}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text-secondary">{row.label}</span>
                  {!row.value.adjusted && (
                    <strong data-testid={`inspector-${camera}-${metricSlug(row.idLabel)}`} className="font-mono text-text-primary text-sm font-bold text-right">
                      {row.format(selectMeasurementValue(row.value))}
                    </strong>
                  )}
                </div>
                {row.value.adjusted && (
                  <div className="mt-1 flex flex-col gap-1 pl-2 border-l-2 border-border-default">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-muted">Otomatis</span>
                      <strong className="font-mono text-text-muted text-xs text-right line-through">{row.format(row.value.auto)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-text-secondary">{isEditingMeasurement ? 'Pratinjau Koreksi' : 'Hasil Final'}</span>
                      <strong data-testid={`inspector-${camera}-${metricSlug(row.idLabel)}`} className="font-mono text-primary text-sm font-bold text-right">{row.format(selectMeasurementValue(row.value))}</strong>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {isEditingMeasurement && camera === 'front' && (
          <div className="text-[11px] font-medium text-text-muted mt-2 px-1">
            Handel centroid (tengah) dan diameter (sisi) aktif pada viewport.
          </div>
        )}

        {isEditingMeasurement && camera === 'side' && sideMeasurements && activeSideTool && onSetActiveSideTool && (
          <>
            <div className="grid grid-cols-3 gap-1 bg-surface-subtle p-1 rounded-lg border border-border-default" role="tablist" aria-label="Alat pengukuran">
              {(['Length', 'Spread', 'Angle'] as ActiveSideTool[]).map(tool => (
                <button
                  key={tool}
                  type="button"
                  role="tab"
                  aria-label={tool === 'Length' ? 'Panjang' : tool === 'Spread' ? 'Sebaran' : 'Sudut'}
                  aria-selected={activeSideTool === tool}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors ${activeSideTool === tool ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                  onClick={() => onSetActiveSideTool(tool)}
                >
                  {tool === 'Length' ? 'Panjang' : tool === 'Spread' ? 'Sebaran' : 'Sudut'}
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-1">
              {activeSideTool === 'Length' && (
                <>
                  <div className="flex justify-between text-xs py-1 border-b border-border-subtle">
                    <span className="text-text-muted font-medium">Otomatis</span>
                    <strong className="font-mono text-text-primary text-right">{fmt.cm(sideMeasurements.sprayLength.auto)}</strong>
                  </div>
                  <div className={`flex justify-between text-xs py-1 ${sideMeasurements.sprayLength.adjusted ? 'bg-semantic-warning-soft/50 px-2 rounded-md' : ''}`}>
                    <span className="text-text-secondary font-semibold">Pratinjau Koreksi</span>
                    <strong data-testid="inspector-side-spray-length" className="font-mono text-primary text-sm font-bold text-right">{fmt.cm(selectMeasurementValue(sideMeasurements.sprayLength))}</strong>
                  </div>
                </>
              )}
              {activeSideTool === 'Spread' && (
                <>
                  <div className="flex justify-between text-xs py-1 border-b border-border-subtle">
                    <span className="text-text-muted font-medium">Posisi Pengukuran</span>
                    <strong data-testid="inspector-side-spread-position" className="font-mono text-text-primary text-right">{fmt.cm(sideMeasurements.spreadPosition?.final ?? 0)}</strong>
                  </div>
                  <div className="flex justify-between text-xs py-1 border-b border-border-subtle">
                    <span className="text-text-muted font-medium">Otomatis</span>
                    <strong className="font-mono text-text-primary text-right">{fmt.mm(sideMeasurements.verticalSpread.auto)}</strong>
                  </div>
                  <div className={`flex justify-between text-xs py-1 ${sideMeasurements.verticalSpread.adjusted ? 'bg-semantic-warning-soft/50 px-2 rounded-md' : ''}`}>
                    <span className="text-text-secondary font-semibold">Pratinjau Koreksi</span>
                    <strong data-testid="inspector-side-vertical-spread" className="font-mono text-primary text-sm font-bold text-right">{fmt.mm(selectMeasurementValue(sideMeasurements.verticalSpread))}</strong>
                  </div>
                </>
              )}
              {activeSideTool === 'Angle' && (
                <>
                  <div className="flex justify-between text-xs py-1 border-b border-border-subtle">
                    <span className="text-text-muted font-medium">Otomatis</span>
                    <strong className="font-mono text-text-primary text-right">{fmt.deg(sideMeasurements.sprayAngle.auto)}</strong>
                  </div>
                  <div className={`flex justify-between text-xs py-1 ${sideMeasurements.sprayAngle.adjusted ? 'bg-semantic-warning-soft/50 px-2 rounded-md' : ''}`}>
                    <span className="text-text-secondary font-semibold">Pratinjau Koreksi</span>
                    <strong data-testid="inspector-side-spray-angle" className="font-mono text-primary text-sm font-bold text-right">{fmt.deg(selectMeasurementValue(sideMeasurements.sprayAngle))}</strong>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {!readOnly && (onStartMeasurementEdit || onCancelMeasurementEdit || onApplyMeasurementEdit) && (
          <div className="pt-2">
            {!isEditingMeasurement && onStartMeasurementEdit && (
              <button type="button" aria-label="Koreksi Pengukuran" className="btn btn-secondary w-full" onClick={onStartMeasurementEdit}>
                Koreksi Pengukuran
              </button>
            )}
            {isEditingMeasurement && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {onCancelMeasurementEdit && <button type="button" className="btn btn-tertiary" onClick={onCancelMeasurementEdit}>Batal</button>}
                  {onApplyMeasurementEdit && <button type="button" className="btn btn-primary" onClick={onApplyMeasurementEdit}>Terapkan Pengukuran</button>}
                </div>
                <details className="text-xs text-text-muted">
                  <summary className="cursor-pointer font-semibold hover:text-text-primary">Bantuan keyboard</summary>
                  <div className="mt-2 space-y-2">
                    <p>Biru: hasil otomatis · Oranye: koreksi aktif</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><kbd className="font-mono">Panah</kbd> &rarr; 1 px</li>
                      <li><kbd className="font-mono">Shift + Panah</kbd> &rarr; 10 px</li>
                    </ul>
                    {camera === 'front' && onCorrectFront && (
                      <div className="flex flex-col gap-1.5 pt-2 border-t border-border-subtle">
                        <button type="button" className="btn btn-tertiary !py-1 text-xs justify-start" onClick={() => onCorrectFront('sprayArea', 120)}>Area +120 mm²</button>
                        <button type="button" className="btn btn-tertiary !py-1 text-xs justify-start" onClick={() => onCorrectFront('centroidOffsetX', 0.5)}>Centroid X +0.5</button>
                        <button type="button" className="btn btn-tertiary !py-1 text-xs justify-start" onClick={() => onCorrectFront('centroidOffsetY', 0.5)}>Centroid Y +0.5</button>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. Calibration */}
      <section className="inspector-section space-y-3">
        <h3 className="inspector-header">Kalibrasi ({camera === 'side' ? 'Samping' : 'Depan'})</h3>
        {calibration ? (
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between"><dt className="text-text-muted">Referensi</dt><dd className="font-mono font-bold text-text-primary text-right">{calibration.referenceDistanceMm} mm</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Titik A</dt><dd className="font-mono text-text-secondary text-right">{formatPointPx(calibration.anchorA)}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Titik B</dt><dd className="font-mono text-text-secondary text-right">{formatPointPx(calibration.anchorB)}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">{isCalibrating ? 'Pratinjau Skala' : 'Skala'}</dt><dd className="font-mono text-text-primary font-semibold text-right" data-testid="inspector-scale">{calibration.scaleMmPerPx.toFixed(3)} mm / px</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Status</dt><dd className={`font-semibold text-right ${calibration.adjusted ? 'text-semantic-warning' : 'text-semantic-success'}`}>{calibration.adjusted ? `Disesuaikan oleh ${calibration.adjustedBy}` : 'Terkalibrasi'}</dd></div>
          </dl>
        ) : (
          <dl className="space-y-1 text-xs">
            <div className="flex justify-between"><dt className="text-text-muted">Status skala</dt><dd className="text-semantic-success font-semibold text-right">Terkalibrasi</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Mode koordinat</dt><dd className="text-text-primary font-semibold text-right">Fisik (mm)</dd></div>
          </dl>
        )}
        {!readOnly && (onStartCalibration || onApplyCalibration || onCancelCalibration) && (
          <div className="pt-2">
            {!isCalibrating && onStartCalibration && (
              <button type="button" aria-label="Atur Kalibrasi" className="btn btn-secondary w-full" onClick={onStartCalibration}>
                Atur Kalibrasi
              </button>
            )}
            {isCalibrating && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {onCancelCalibration && <button type="button" className="btn btn-tertiary" onClick={onCancelCalibration}>Batal</button>}
                  {onApplyCalibration && <button type="button" className="btn btn-primary" onClick={onApplyCalibration}>Terapkan Kalibrasi</button>}
                </div>
                <details className="text-xs text-text-muted">
                  <summary className="cursor-pointer font-semibold hover:text-text-primary">Bantuan keyboard</summary>
                  <div className="mt-2 space-y-2">
                    <p>Tarik Titik A, Titik B, atau badan penggaris.</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><kbd className="font-mono">Panah</kbd> &rarr; 1 px</li>
                      <li><kbd className="font-mono">Shift + Panah</kbd> &rarr; 10 px</li>
                    </ul>
                    {onAdjustCalibration && (
                      <div className="flex gap-2 pt-2 border-t border-border-subtle" aria-label="Kontrol kalibrasi fallback keyboard">
                        <button type="button" className="btn btn-tertiary flex-1 !py-1 text-xs" onClick={() => onAdjustCalibration(-12)}>Titik B &larr; 12 px</button>
                        <button type="button" className="btn btn-tertiary flex-1 !py-1 text-xs" onClick={() => onAdjustCalibration(12)}>Titik B &rarr; 12 px</button>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 3. Capture Moment */}
      {moment && (
        <section className="inspector-section space-y-3">
          <h3 className="inspector-header">Momen Tangkapan</h3>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between"><dt className="text-text-muted">Tangkapan</dt><dd className="font-mono font-bold text-text-primary text-right">#{String(moment.frameIndex + 1).padStart(3, '0')} · {moment.frameIndex + 1} dari {totalMomentsCount}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Waktu</dt><dd className="font-mono text-text-primary text-right">{moment.timestampMs} ms</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Fase</dt><dd className="font-semibold text-text-primary text-right">{phaseLabel(moment.phase)}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Status sinkron</dt><dd className="font-mono text-text-secondary text-right">{moment.syncStatus} · Δ {moment.timestampDeltaMs} ms</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Rekomendasi</dt><dd className={`font-semibold text-right ${moment.recommended ? 'text-semantic-warning' : 'text-text-secondary'}`}>{moment.recommended ? 'Direkomendasikan' : 'Tidak disarankan'}</dd></div>
          </dl>
        </section>
      )}
    </div>
  );
}
