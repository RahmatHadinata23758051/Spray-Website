import React from 'react';
import type { Page } from '../../navigation';
import type { Camera as CameraType, Test } from '../../../domain/types';
import type { FinalAnalysisReport, SideFinalMeasurements, FrontFinalMeasurements, CalibrationSnapshot, SidePixelGeometry, FrontPixelGeometry, MeasurementValue } from '../../../domain/analysis';
import { fmt, frames } from '../../../data/mockSpraybotRepository';
import { Status } from '../../components/ui/Status';
import { phaseLabel, hasAdjustedMeasurement, metricSlug } from '../../features/analysis/utils';
import { AnalysisOverlay } from '../../features/analysis/AnalysisOverlay';
import { createSideMeasurements, createFrontMeasurements } from '../../../domain/analysis';

import { Overlay } from '../../components/ui/Overlay';

export function ResultPage({ test, finalReport, setPage }: { test: Test; finalReport: FinalAnalysisReport | null; setPage: (p: Page) => void }) {
  if (!finalReport || finalReport.testId !== test.id) {
    return (
      <div className="result-empty surface-panel">
        <h2>Final analysis required</h2>
        <p>This test does not yet have a finalized Analysis V2 report. Return to Analysis, select one Primary Capture Moment, then confirm final analysis.</p>
        <button type="button" className="primary-button" onClick={() => setPage('Analysis')}>Return to Analysis</button>
      </div>
    );
  }

  return <FinalizedResult report={finalReport} onViewReport={() => setPage('Reports')} />;
}

function FinalizedResult({ report, onViewReport }: { report: FinalAnalysisReport; onViewReport: () => void }) {
  const primaryFrame = { 
    frameIndex: report.primaryCapture.frameIndex, 
    timestampMs: report.primaryCapture.timestampMs, 
    phase: report.primaryCapture.phase === 'pre_spray' ? 'pre-spray' as const : report.primaryCapture.phase === 'build_up' ? 'build-up' as const : report.primaryCapture.phase === 'decay' ? 'decay' as const : 'stable' as const 
  };
  
  return (
    <article className="result-v2">
      <section className="result-hero surface-panel">
        <div>
          <Status tone="success">Finalized</Status>
          <h2 className="font-mono">{report.test.testId}</h2>
          <p>{report.test.product.productName}</p>
        </div>
        <dl className="result-identity-grid">
          <div><dt>Sample</dt><dd className="font-mono">{report.test.sampleId}</dd></div>
          <div><dt>Recipe</dt><dd>{report.test.recipe.name}</dd></div>
          <div><dt>Operator</dt><dd>{report.test.operator}</dd></div>
          <div><dt>Primary Capture</dt><dd className="font-mono">#{String(report.primaryCapture.frameIndex).padStart(3, '0')} · {report.primaryCapture.timestampMs} ms</dd></div>
        </dl>
        <button type="button" className="secondary-button" onClick={onViewReport}>View Report</button>
      </section>

      <section className="result-primary surface-panel">
        <div className="result-section-heading">
          <div>
            <span>Primary Capture</span>
            <h3>Capture #{String(report.primaryCapture.frameIndex).padStart(3, '0')}</h3>
          </div>
          <p className="font-mono">{report.primaryCapture.timestampMs} ms · {phaseLabel(report.primaryCapture.phase)}</p>
        </div>
        <div className="result-camera-grid">
          <ResultCameraFrame 
            title="Side Camera Overlay" 
            camera="side" 
            frame={primaryFrame} 
            measurements={report.side} 
            calibration={report.side.calibration} 
            sideGeometry={report.side.finalGeometry} 
            frontGeometry={report.front.finalGeometry} 
          />
          <ResultCameraFrame 
            title="Front Camera Overlay" 
            camera="front" 
            frame={primaryFrame} 
            measurements={report.front} 
            calibration={report.front.calibration} 
            sideGeometry={report.side.finalGeometry} 
            frontGeometry={report.front.finalGeometry} 
          />
        </div>
      </section>

      <div className="result-two-column">
        <ResultMeasurementPanel camera="side" report={report} />
        <ResultMeasurementPanel camera="front" report={report} />
      </div>

      <section className="result-two-column">
        <CalibrationSummary camera="Side" calibration={report.side.calibration} />
        <CalibrationSummary camera="Front" calibration={report.front.calibration} />
      </section>

      <AnalysisAudit report={report} />
      <SupportingCaptures report={report} />
    </article>
  );
}

type ResultMetric = { label: string; value: MeasurementValue; format: (value: number) => string; editable: boolean };

function resultMetrics(camera: CameraType, report: FinalAnalysisReport): ResultMetric[] {
  if (camera === 'side') return [
    { label: 'Spray Length', value: report.side.sprayLength, format: fmt.cm, editable: true },
    { label: 'Spray Angle', value: report.side.sprayAngle, format: fmt.deg, editable: true },
    { label: 'Vertical Spread', value: report.side.verticalSpread, format: fmt.mm, editable: true },
    { label: 'Direction Offset', value: report.side.directionOffset, format: fmt.deg, editable: true },
  ];
  return [
    { label: 'Spray Area', value: report.front.sprayArea, format: fmt.area, editable: true },
    { label: 'Equivalent Diameter', value: report.front.equivalentDiameter, format: fmt.mm, editable: true },
    { label: 'Circularity', value: report.front.circularity, format: value => value.toFixed(2), editable: false },
    { label: 'Centroid Offset X', value: report.front.centroidOffsetX, format: fmt.mm, editable: true },
    { label: 'Centroid Offset Y', value: report.front.centroidOffsetY, format: fmt.mm, editable: true },
    { label: 'Horizontal Symmetry', value: report.front.horizontalSymmetry, format: fmt.pct, editable: false },
    { label: 'Vertical Symmetry', value: report.front.verticalSymmetry, format: fmt.pct, editable: false },
  ];
}

function ResultCameraFrame({ 
  title, 
  camera, 
  frame, 
  measurements, 
  calibration, 
  sideGeometry, 
  frontGeometry 
}: { 
  title: string; 
  camera: CameraType; 
  frame: { frameIndex: number; timestampMs: number; phase: 'pre-spray' | 'build-up' | 'decay' | 'stable' }; 
  measurements: SideFinalMeasurements | FrontFinalMeasurements; 
  calibration: CalibrationSnapshot; 
  sideGeometry: SidePixelGeometry; 
  frontGeometry: FrontPixelGeometry; 
}) {
  return (
    <figure className="result-camera-frame">
      <div className="result-frame-meta"><strong>{title}</strong><span className="font-mono">#{String(frame.frameIndex).padStart(3, '0')} · {frame.timestampMs} ms</span></div>
      <div className="result-frame-image">
        <AnalysisOverlay 
          camera={camera} 
          mode="Overlay" 
          frame={frame as unknown as typeof frames[number]} 
          calibration={calibration} 
          sideGeometry={sideGeometry} 
          frontGeometry={frontGeometry} 
          sideMeasurements={camera === 'side' ? measurements as SideFinalMeasurements : createSideMeasurements({ sprayLengthMm: 0, sprayAngleDeg: 0, maxVerticalSpreadMm: 0, directionOffsetDeg: 0 })} 
          frontMeasurements={camera === 'front' ? measurements as FrontFinalMeasurements : createFrontMeasurements({ sprayAreaMm2: 0, equivalentDiameterMm: 0, circularity: 0, centroidOffsetXmm: 0, centroidOffsetYmm: 0, horizontalSymmetry: 0, verticalSymmetry: 0 })} 
        />
      </div>
      <figcaption>Frozen synchronized capture · Analysis source: Simulation</figcaption>
    </figure>
  );
}

export function ResultMeasurementPanel({ camera, report }: { camera: CameraType; report: FinalAnalysisReport }) {
  return (
    <section className="result-measurements surface-panel">
      <div className="result-section-heading">
        <div>
          <span>{camera === 'side' ? 'Profile geometry' : 'Pattern geometry'}</span>
          <h3>{camera === 'side' ? 'Side Camera Result' : 'Front Camera Result'}</h3>
        </div>
      </div>
      <div className="result-metric-list">
        {resultMetrics(camera, report).map(metric => (
          <div className="result-metric" key={metric.label}>
            <div>
              <span>{metric.label}</span>
              {metric.value.adjusted ? <small>Adjusted by {metric.value.adjustedBy}</small> : <small>{metric.editable ? 'Automatic accepted' : 'Automatic measurement'}</small>}
            </div>
            {metric.value.adjusted ? (
              <div className="result-value-comparison">
                <span>Automatic <del>{metric.format(metric.value.auto)}</del></span>
                <strong>Final {metric.format(metric.value.final)}</strong>
              </div>
            ) : (
              <strong>{metric.format(metric.value.final)}</strong>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function CalibrationSummary({ camera, calibration }: { camera: 'Side' | 'Front'; calibration: CalibrationSnapshot }) {
  return (
    <section className="calibration-result surface-panel">
      <span>{camera} calibration</span>
      <strong>{calibration.referenceDistanceMm} mm reference</strong>
      <span className="font-mono">{calibration.scaleMmPerPx.toFixed(3)} mm/px</span>
      <small>{calibration.adjusted ? `Operator adjusted by ${calibration.adjustedBy}` : 'Default calibration'}</small>
    </section>
  );
}

export function AnalysisAudit({ report }: { report: FinalAnalysisReport }) {
  const sideAdjusted = hasAdjustedMeasurement(report.side);
  const frontAdjusted = hasAdjustedMeasurement(report.front);
  return (
    <section className="result-audit surface-panel">
      <div className="result-section-heading">
        <div><span>Traceability</span><h3>Analysis Audit</h3></div>
      </div>
      <dl>
        <div><dt>Analysis finalized</dt><dd>{new Date(report.finalizedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
        <div><dt>Finalized by</dt><dd>{report.finalizedBy}</dd></div>
        <div><dt>Side measurement</dt><dd>{sideAdjusted ? 'Operator adjusted' : 'Automatic accepted'}</dd></div>
        <div><dt>Side calibration</dt><dd>{report.side.calibration.adjusted ? 'Operator adjusted' : 'Default'}</dd></div>
        <div><dt>Front measurement</dt><dd>{frontAdjusted ? 'Operator adjusted' : 'Automatic accepted'}</dd></div>
        <div><dt>Front calibration</dt><dd>{report.front.calibration.adjusted ? 'Operator adjusted' : 'Default'}</dd></div>
      </dl>
    </section>
  );
}

export function SupportingCaptures({ report }: { report: FinalAnalysisReport }) {
  if (report.supportingCaptures.length === 0) return <p className="supporting-empty">No supporting captures were selected.</p>;
  return (
    <section className="supporting-section surface-panel">
      <div className="result-section-heading">
        <div><span>Evidence</span><h3>Supporting Captures</h3></div>
        <p>{report.supportingCaptures.length} of 9</p>
      </div>
      <div className="supporting-list">
        {report.supportingCaptures.map(capture => (
          <article key={capture.captureMomentId}>
            <header>
              <strong className="font-mono">#{String(capture.frameIndex).padStart(3, '0')} · {capture.timestampMs} ms</strong>
              <span>{phaseLabel(capture.phase)}</span>
            </header>
            <div>
              <div>
                <Overlay camera="side" />
                <span>Side · {capture.side.frameId}</span>
              </div>
              <div>
                <Overlay camera="front" />
                <span>Front · {capture.front.frameId}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function createFinalReportCsv(report: FinalAnalysisReport): string {
  const fields: Array<[string, string | number | boolean]> = [
    ['test_id', report.test.testId], ['sample_id', report.test.sampleId], ['status', report.status], ['analysis_source', 'Simulation'],
    ['primary_capture_id', report.primaryCaptureMomentId], ['primary_frame_index', report.primaryCapture.frameIndex], ['primary_timestamp_ms', report.primaryCapture.timestampMs],
  ];
  for (const metric of resultMetrics('side', report)) fields.push([`side_${metricSlug(metric.label)}_auto`, metric.value.auto], [`side_${metricSlug(metric.label)}_final`, metric.value.final], [`side_${metricSlug(metric.label)}_adjusted`, metric.value.adjusted]);
  for (const metric of resultMetrics('front', report)) fields.push([`front_${metricSlug(metric.label)}_auto`, metric.value.auto], [`front_${metricSlug(metric.label)}_final`, metric.value.final], [`front_${metricSlug(metric.label)}_adjusted`, metric.value.adjusted]);
  return `${fields.map(([key]) => key).join(',')}\n${fields.map(([, value]) => String(value)).join(',')}`;
}
