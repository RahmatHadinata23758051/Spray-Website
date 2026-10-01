import React from 'react';
import type { Camera as CameraType } from '@spray-paragon/domain';
import type { SideFinalMeasurements, FrontFinalMeasurements, CalibrationSnapshot, FinalAnalysisReport } from '@spray-paragon/domain';
import type { SynchronizedAnalysisFrame } from '@spray-paragon/domain';
import { selectMeasurementValue } from '@spray-paragon/domain';
import { fmt } from '../../utils/formatters';
import { hasAdjustedMeasurement } from './utils';

export function FinalAnalysisConfirmation({ 
  status, 
  selectedCount, 
  primaryMoment, 
  sideMeasurements, 
  frontMeasurements, 
  calibrations, 
  finalReport, 
  onConfirm, 
  onViewResult 
}: {
  status: 'captured' | 'review_required' | 'finalized';
  selectedCount: number;
  primaryMoment?: SynchronizedAnalysisFrame;
  sideMeasurements?: SideFinalMeasurements;
  frontMeasurements?: FrontFinalMeasurements;
  calibrations: Record<CameraType, CalibrationSnapshot>;
  finalReport: FinalAnalysisReport | null;
  onConfirm: () => void;
  onViewResult: () => void;
}) {
  const canConfirm = Boolean(primaryMoment && sideMeasurements && frontMeasurements);
  return (
    <section className="final-confirmation">
      <div className="final-confirmation-heading">
        <h3>Final analysis confirmation</h3>
        <span className={`final-status final-status-${status}`}>{status.replace('_', ' ')}</span>
      </div>
      <p className="final-confirmation-copy">Operator confirmation is required before this simulated analysis becomes final.</p>
      {!primaryMoment && <p className="final-confirmation-warning">Select exactly one Primary Capture Moment before confirmation.</p>}
      {primaryMoment && sideMeasurements && frontMeasurements && (
        <dl className="final-confirmation-summary">
          <div><dt>Primary Capture</dt><dd className="font-mono">#{String(primaryMoment.frameIndex).padStart(3, '0')} · {primaryMoment.timestampMs} ms</dd></div>
          <div><dt>Selected Captures</dt><dd>{selectedCount} / 10</dd></div>
          <div><dt>Side Camera final</dt><dd className="font-mono">{fmt.cm(selectMeasurementValue(sideMeasurements.sprayLength))} · {fmt.deg(selectMeasurementValue(sideMeasurements.sprayAngle))} · {fmt.mm(selectMeasurementValue(sideMeasurements.verticalSpread))}</dd></div>
          <div><dt>Front Camera final</dt><dd className="font-mono">{fmt.area(selectMeasurementValue(frontMeasurements.sprayArea))} · Ø {fmt.mm(selectMeasurementValue(frontMeasurements.equivalentDiameter))} · {selectMeasurementValue(frontMeasurements.circularity).toFixed(2)}</dd></div>
          <div><dt>Side calibration</dt><dd>{calibrations.side.adjusted ? `Adjusted by ${calibrations.side.adjustedBy}` : 'Default fixture calibration'}</dd></div>
          <div><dt>Front calibration</dt><dd>{calibrations.front.adjusted ? `Adjusted by ${calibrations.front.adjustedBy}` : 'Default fixture calibration'}</dd></div>
          <div><dt>Side measurement</dt><dd>{hasAdjustedMeasurement(sideMeasurements) ? 'Operator adjusted final values' : 'Automatic accepted'}</dd></div>
          <div><dt>Front measurement</dt><dd>{hasAdjustedMeasurement(frontMeasurements) ? 'Operator adjusted final values' : 'Automatic accepted'}</dd></div>
        </dl>
      )}
      <button type="button" className="primary-button final-confirm-button" onClick={onConfirm} disabled={!canConfirm || status === 'finalized'}>Confirm Final Analysis</button>
      {finalReport && (
        <div className="mt-2 space-y-2">
          <p className="final-report-id">Final report saved in memory: <strong className="font-mono">{finalReport.primaryCaptureMomentId}</strong></p>
          <button type="button" className="secondary-button w-full" onClick={onViewResult}>View Result →</button>
        </div>
      )}
    </section>
  );
}
