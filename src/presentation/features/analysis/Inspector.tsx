import React from 'react';
import type { Camera as CameraType, Analysis as AnalysisData, SynchronizedAnalysisFrame } from '../../../domain/types';
import type { CalibrationSnapshot, SideFinalMeasurements, FrontFinalMeasurements, MeasurementValue } from '../../../domain/analysis';
import { selectMeasurementValue } from '../../../domain/analysis';
import { fmt, synchronizedFrames } from '../../../data/mockSpraybotRepository';
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
  onCorrectFront 
}: {
  camera: CameraType;
  a: AnalysisData;
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
}) {
  const measurementRows: { label: string; value: MeasurementValue; format: (value: number) => string }[] = camera === 'side'
    ? [
      ['Spray length', sideMeasurements?.sprayLength ?? { auto: a.side.sprayLengthMm, final: a.side.sprayLengthMm, adjusted: false }, fmt.cm],
      ['Spray angle', sideMeasurements?.sprayAngle ?? { auto: a.side.sprayAngleDeg, final: a.side.sprayAngleDeg, adjusted: false }, fmt.deg],
      ['Vertical spread', sideMeasurements?.verticalSpread ?? { auto: a.side.maxVerticalSpreadMm, final: a.side.maxVerticalSpreadMm, adjusted: false }, fmt.mm],
      ['Direction offset', sideMeasurements?.directionOffset ?? { auto: a.side.directionOffsetDeg, final: a.side.directionOffsetDeg, adjusted: false }, fmt.deg],
    ].map(([label, value, format]) => ({ label: label as string, value: value as MeasurementValue, format: format as (value: number) => string }))
    : [
      ['Spray area', frontMeasurements?.sprayArea ?? { auto: a.front.sprayAreaMm2, final: a.front.sprayAreaMm2, adjusted: false }, fmt.area],
      ['Equivalent diameter', frontMeasurements?.equivalentDiameter ?? { auto: a.front.equivalentDiameterMm, final: a.front.equivalentDiameterMm, adjusted: false }, fmt.mm],
      ['Circularity', frontMeasurements?.circularity ?? { auto: a.front.circularity, final: a.front.circularity, adjusted: false }, (value: number) => value.toFixed(2)],
      ['Centroid X', frontMeasurements?.centroidOffsetX ?? { auto: a.front.centroidOffsetXmm, final: a.front.centroidOffsetXmm, adjusted: false }, fmt.mm],
      ['Centroid Y', frontMeasurements?.centroidOffsetY ?? { auto: a.front.centroidOffsetYmm, final: a.front.centroidOffsetYmm, adjusted: false }, fmt.mm],
      ['Horizontal symmetry', frontMeasurements?.horizontalSymmetry ?? { auto: a.front.horizontalSymmetry, final: a.front.horizontalSymmetry, adjusted: false }, fmt.pct],
      ['Vertical symmetry', frontMeasurements?.verticalSymmetry ?? { auto: a.front.verticalSymmetry, final: a.front.verticalSymmetry, adjusted: false }, fmt.pct],
    ].map(([label, value, format]) => ({ label: label as string, value: value as MeasurementValue, format: format as (value: number) => string }));

  return (
    <div className="inspector-sections">
      {calibration && (
        <section className="calibration-summary-strip" aria-label={`${camera} calibration summary`}>
          <span><strong>Scale</strong> <span data-testid="inspector-scale" className="font-mono">{calibration.scaleMmPerPx.toFixed(3)} mm / px</span></span>
          <span><strong>Anchor B</strong> <span className="font-mono">{formatPointPx(calibration.anchorB)}</span></span>
        </section>
      )}
      <section>
        <h3>Measurements</h3>
        {(!isEditingMeasurement || camera === 'front') && (
          <div className="metric-list">
            {measurementRows.map(row => (
              <div className={`metric-row ${row.value.adjusted ? 'metric-row-adjusted' : ''}`} key={row.label}>
                <span>{row.label}</span>
                <strong data-testid={`inspector-${camera}-${metricSlug(row.label)}`} className="font-mono">
                  {row.value.adjusted ? `Auto ${row.format(row.value.auto)} / Final ${row.format(selectMeasurementValue(row.value))}` : row.format(selectMeasurementValue(row.value))}
                </strong>
              </div>
            ))}
          </div>
        )}
        
        {isEditingMeasurement && camera === 'side' && sideMeasurements && activeSideTool && onSetActiveSideTool && (
          <>
            <div className="measurement-tool-bar" role="tablist" aria-label="Measurement tools">
              <span className="measurement-tool-label">Measurement tool</span>
              <div className="measurement-tool-buttons">
                {(['Length', 'Spread', 'Angle'] as ActiveSideTool[]).map(tool => (
                  <button
                    key={tool}
                    type="button"
                    role="tab"
                    aria-selected={activeSideTool === tool}
                    className={`measurement-tool-btn ${activeSideTool === tool ? 'is-active' : ''}`}
                    onClick={() => onSetActiveSideTool(tool)}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>

            <div className="metric-list">
              {activeSideTool === 'Length' && (
                <>
                  <div className="metric-row"><span>Automatic</span><strong className="font-mono">{fmt.cm(sideMeasurements.sprayLength.auto)}</strong></div>
                  <div className={`metric-row ${sideMeasurements.sprayLength.adjusted ? 'metric-row-adjusted' : ''}`}><span>Final</span><strong data-testid="inspector-side-spray-length" className="font-mono">{fmt.cm(selectMeasurementValue(sideMeasurements.sprayLength))}</strong></div>
                </>
              )}
              {activeSideTool === 'Spread' && (
                <>
                  <div className="metric-row"><span>Position</span><strong data-testid="inspector-side-spread-position" className="font-mono">{fmt.cm(sideMeasurements.spreadPosition?.final ?? 0)}</strong></div>
                  <div className="metric-row"><span>Automatic</span><strong className="font-mono">{fmt.mm(sideMeasurements.verticalSpread.auto)}</strong></div>
                  <div className={`metric-row ${sideMeasurements.verticalSpread.adjusted ? 'metric-row-adjusted' : ''}`}><span>Final</span><strong data-testid="inspector-side-vertical-spread" className="font-mono">{fmt.mm(selectMeasurementValue(sideMeasurements.verticalSpread))}</strong></div>
                </>
              )}
              {activeSideTool === 'Angle' && (
                <>
                  <div className="metric-row"><span>Automatic</span><strong className="font-mono">{fmt.deg(sideMeasurements.sprayAngle.auto)}</strong></div>
                  <div className={`metric-row ${sideMeasurements.sprayAngle.adjusted ? 'metric-row-adjusted' : ''}`}><span>Final</span><strong data-testid="inspector-side-spray-angle" className="font-mono">{fmt.deg(selectMeasurementValue(sideMeasurements.sprayAngle))}</strong></div>
                </>
              )}
            </div>
          </>
        )}

        {(onStartMeasurementEdit || onCancelMeasurementEdit || onApplyMeasurementEdit) && (
          <div className="measurement-actions">
            {!isEditingMeasurement && onStartMeasurementEdit && <button type="button" className="secondary-button" onClick={onStartMeasurementEdit}>Edit Measurement</button>}
            {isEditingMeasurement && (
              <>
                <div className="measurement-action-row">
                  {onCancelMeasurementEdit && <button type="button" className="secondary-button" onClick={onCancelMeasurementEdit}>Cancel</button>}
                  {onApplyMeasurementEdit && <button type="button" className="primary-button" onClick={onApplyMeasurementEdit}>Apply Measurement</button>}
                </div>
                <p className="measurement-hint">Blue is automatic detection. Drag orange handles to define the accepted final geometry. Arrow = 1 px; Shift + Arrow = 10 px.</p>
                {camera === 'front' && onCorrectFront && (
                  <details className="measurement-fallback">
                    <summary>Keyboard fallback controls</summary>
                    <div className="measurement-nudge">
                      <button type="button" onClick={() => onCorrectFront('sprayArea', 120)}>Area +120 mm²</button>
                      <button type="button" onClick={() => onCorrectFront('centroidOffsetX', 0.5)}>Centroid X +0.5</button>
                      <button type="button" onClick={() => onCorrectFront('centroidOffsetY', 0.5)}>Centroid Y +0.5</button>
                    </div>
                  </details>
                )}
              </>
            )}
          </div>
        )}
      </section>
      {moment && (
        <section>
          <h3>Capture moment</h3>
          <dl className="inspector-data">
            <div><dt>Capture</dt><dd className="font-mono">#{String(moment.frameIndex).padStart(3, '0')} · {moment.frameIndex + 1} of {synchronizedFrames.length}</dd></div>
            <div><dt>Timestamp</dt><dd className="font-mono">{moment.timestampMs} ms</dd></div>
            <div><dt>Phase</dt><dd>{phaseLabel(moment.phase)}</dd></div>
            <div><dt>Sync status</dt><dd className="font-mono">{moment.syncStatus} · Δ {moment.timestampDeltaMs} ms</dd></div>
            <div><dt>Recommendation</dt><dd>{moment.recommended ? 'Recommended capture' : 'Not recommended'}</dd></div>
          </dl>
        </section>
      )}
      <section>
        <h3>Calibration</h3>
        {calibration ? (
          <dl className="inspector-data">
            <div><dt>Reference</dt><dd className="font-mono">{calibration.referenceDistanceMm} mm</dd></div>
            <div><dt>Anchor A</dt><dd className="font-mono">{formatPointPx(calibration.anchorA)}</dd></div>
            <div><dt>Anchor B</dt><dd className="font-mono">{formatPointPx(calibration.anchorB)}</dd></div>
            <div><dt>Scale</dt><dd className="font-mono">{calibration.scaleMmPerPx.toFixed(3)} mm / px</dd></div>
            <div><dt>Status</dt><dd className={calibration.adjusted ? 'text-semantic-warning' : 'text-semantic-success'}>{calibration.adjusted ? `Adjusted by ${calibration.adjustedBy}` : 'Fixture calibrated'}</dd></div>
          </dl>
        ) : (
          <dl className="inspector-data">
            <div><dt>Scale status</dt><dd className="text-semantic-success">Fixture calibrated</dd></div>
            <div><dt>Coordinate mode</dt><dd>Physical mm</dd></div>
          </dl>
        )}
        {(onStartCalibration || onApplyCalibration || onCancelCalibration) && (
          <div className="calibration-actions">
            {!isCalibrating && onStartCalibration && <button type="button" className="secondary-button" onClick={onStartCalibration}>Adjust Calibration</button>}
            {isCalibrating && (
              <>
                <div className="calibration-action-row">
                  {onCancelCalibration && <button type="button" className="secondary-button" onClick={onCancelCalibration}>Cancel</button>}
                  {onApplyCalibration && <button type="button" className="primary-button" onClick={onApplyCalibration}>Apply Calibration</button>}
                </div>
                <p className="calibration-hint">Drag Anchor A, Anchor B, or the ruler body. Keyboard fallback: Arrow = 1 px, Shift + Arrow = 10 px.</p>
                {onAdjustCalibration && (
                  <div className="calibration-nudge" aria-label="Keyboard fallback calibration controls">
                    <button type="button" onClick={() => onAdjustCalibration(-12)} aria-label="Move anchor B left 12 px">B ← 12 px</button>
                    <button type="button" onClick={() => onAdjustCalibration(12)} aria-label="Move anchor B right 12 px">B → 12 px</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
