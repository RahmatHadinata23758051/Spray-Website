import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { 
  Batch, 
  FinalAnalysisReport, 
  SideFinalMeasurements, 
  FrontFinalMeasurements, 
  CalibrationSnapshot, 
  SidePixelGeometry, 
  FrontPixelGeometry, 
  MeasurementValue,
  Camera as CameraType,
  Frame
} from '@spray-paragon/domain';
import { createSideMeasurements, createFrontMeasurements } from '@spray-paragon/domain';
import { createFinalReportCsv } from '../../../application/reporting/createFinalReportCsv';
import { batchRepository } from '../../../application/services';
import { fmt } from '../../utils/formatters';
import { Status } from '../../components/ui/Status';
import { Panel } from '../../components/ui/Panel';
import { phaseLabel, hasAdjustedMeasurement } from '../../features/analysis/utils';
import { AnalysisOverlay } from '../../features/analysis/AnalysisOverlay';
import { Overlay } from '../../components/ui/Overlay';

export function BatchResultPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!batchId) {
      setLoading(false);
      return;
    }

    let isSubscribed = true;
    batchRepository.getBatch(batchId).then(fetchedBatch => {
      if (!isSubscribed) return;
      setBatch(fetchedBatch);
      setLoading(false);
    }).catch(err => {
      console.error('Error fetching batch:', err);
      if (isSubscribed) {
        setBatch(null);
        setLoading(false);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [batchId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-text-muted font-medium">
        Loading batch result...
      </div>
    );
  }

  if (!batchId || !batch) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-6">
        <Panel title="Batch Result Unavailable">
          <div className="p-6 space-y-4">
            <Status tone="danger">Batch Not Found</Status>
            <p className="text-sm text-text-secondary">No batch found with ID "{batchId || ''}".</p>
            <button
              type="button"
              onClick={() => navigate('/batches')}
              className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-sm"
            >
              Back to Batches
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  if (batch.status !== 'FINALIZED') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-6">
        <Panel title="Batch Result Unavailable">
          <div className="p-6 space-y-4">
            <Status tone="warning">Result Unavailable ({batch.status})</Status>
            <p className="text-sm text-text-secondary">
              Batch <strong className="font-mono">{batch.id}</strong> is currently in <strong>{batch.status}</strong> status. Result is only available for finalized batches.
            </p>
            <div className="flex gap-3 pt-2">
              {batch.status === 'REVIEW_REQUIRED' && (
                <button
                  type="button"
                  onClick={() => navigate(`/batches/${batch.id}/analysis`)}
                  className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-sm"
                >
                  Go to Analysis Workspace
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/batches/${batch.id}`)}
                className="rounded-sm border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-subtle shadow-sm"
              >
                Back to Batch Detail
              </button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  if (!batch.finalReport) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-6">
        <Panel title="Data Integrity Error">
          <div className="p-6 space-y-4">
            <Status tone="danger">Missing Final Report</Status>
            <p className="text-sm text-text-secondary">
              Batch <strong className="font-mono">{batch.id}</strong> is marked as FINALIZED, but no immutable final analysis report snapshot was found.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/batches/${batch.id}`)}
              className="rounded-sm border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-subtle shadow-sm"
            >
              Back to Batch Detail
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  return <FinalizedBatchResult batch={batch} report={batch.finalReport} />;
}

function FinalizedBatchResult({ batch, report }: { batch: Batch; report: FinalAnalysisReport }) {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const handleExportCsv = () => {
    setExporting(true);
    const csv = createFinalReportCsv(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `batch-result-${batch.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 800);
  };

  const primaryFrame = {
    frameIndex: report.primaryCapture.frameIndex,
    timestampMs: report.primaryCapture.timestampMs,
    phase: report.primaryCapture.phase === 'pre_spray' ? ('pre-spray' as const) : report.primaryCapture.phase === 'build_up' ? ('build-up' as const) : report.primaryCapture.phase === 'decay' ? ('decay' as const) : ('stable' as const),
  };

  return (
    <article className="result-v2 space-y-6">
      {/* Navigation breadcrumb / bar */}
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <div className="flex items-center gap-2">
          <Link to="/batches" className="hover:text-text-primary underline">Batches</Link>
          <span>/</span>
          <Link to={`/batches/${batch.id}`} className="hover:text-text-primary font-mono underline">{batch.id}</Link>
          <span>/</span>
          <span className="font-semibold text-text-primary">Result</span>
        </div>
      </div>

      {/* Result Hero Header */}
      <section className="result-hero surface-panel">
        <div>
          <Status tone="success">Finalized</Status>
          <h2 className="font-mono">{report.test.testId}</h2>
          <p>{report.test.product.productName}</p>
        </div>
        <dl className="result-identity-grid">
          <div><dt>Sample</dt><dd className="font-mono">{report.test.sampleId}</dd></div>
          <div><dt>Product Lot</dt><dd className="font-mono">{report.test.productionBatch || '—'}</dd></div>
          <div><dt>Recipe</dt><dd>{report.test.recipe.name}</dd></div>
          <div><dt>Operator</dt><dd>{report.test.operator}</dd></div>
          <div><dt>Primary Capture</dt><dd className="font-mono">#{String(report.primaryCapture.frameIndex).padStart(3, '0')} · {report.primaryCapture.timestampMs} ms</dd></div>
        </dl>
        <div className="flex gap-2">
          <button type="button" className="secondary-button" onClick={handleExportCsv} disabled={exporting}>
            {exporting ? 'Exporting CSV...' : 'Export CSV'}
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate(`/batches/${batch.id}`)}>
            Back to Batch
          </button>
        </div>
      </section>

      {/* Primary Capture Overlay */}
      <section className="result-primary surface-panel">
        <div className="result-section-heading">
          <div>
            <span>Primary Capture Moment</span>
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

      {/* Side & Front Measurement Panels */}
      <div className="result-two-column">
        <ResultMeasurementPanel camera="side" report={report} />
        <ResultMeasurementPanel camera="front" report={report} />
      </div>

      {/* Side & Front Calibration Summaries */}
      <section className="result-two-column">
        <CalibrationSummary camera="Side" calibration={report.side.calibration} />
        <CalibrationSummary camera="Front" calibration={report.front.calibration} />
      </section>

      {/* Audit & Traceability */}
      <AnalysisAudit report={report} />

      {/* Supporting Captures */}
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
  frontGeometry,
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
          frame={frame as unknown as Frame}
          calibration={calibration}
          sideGeometry={sideGeometry}
          frontGeometry={frontGeometry}
          sideMeasurements={camera === 'side' ? (measurements as SideFinalMeasurements) : createSideMeasurements({ sprayLengthMm: 0, sprayAngleDeg: 0, maxVerticalSpreadMm: 0, directionOffsetDeg: 0 })}
          frontMeasurements={camera === 'front' ? (measurements as FrontFinalMeasurements) : createFrontMeasurements({ sprayAreaMm2: 0, equivalentDiameterMm: 0, circularity: 0, centroidOffsetXmm: 0, centroidOffsetYmm: 0, horizontalSymmetry: 0, verticalSymmetry: 0 })}
        />
      </div>
      <figcaption>Frozen synchronized capture · Analysis source: {calibration ? 'Simulation' : 'Simulation'}</figcaption>
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
