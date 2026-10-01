import React, { useState, useEffect } from 'react';
import type { FinalAnalysisReport } from '@spray-paragon/domain';
import { createFinalReportCsv } from '../../../application/reporting/createFinalReportCsv';
import { batchRepository } from '../../../application/services';
import { Status } from '../../components/ui/Status';
import { Panel } from '../../components/ui/Panel';
import { phaseLabel } from '../../features/analysis/utils';
import { ResultMeasurementPanel, CalibrationSummary, AnalysisAudit, SupportingCaptures } from '../Batches/BatchResultPage';

export function ReportsPage() {
  const [report, setReport] = useState<FinalAnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    batchRepository.listBatches().then(batches => {
      if (!active) return;
      const finalized = batches
        .filter(b => b.status === 'FINALIZED' && b.finalReport)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      if (finalized.length > 0 && finalized[0].finalReport) {
        setReport(finalized[0].finalReport);
      }
      setLoading(false);
    }).catch(e => {
      console.error(e);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleExport = () => {
    if (!report) return;
    setExporting(true);
    const csv = createFinalReportCsv(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spraybot-report-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 800);
  };

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">Loading reports...</div>;
  }

  if (!report) {
    return (
      <Panel title="Reports">
        <div className="p-4">
          <p className="text-sm text-text-secondary">No finalized analysis report is available. Finalize a Batch Analysis session to produce a report.</p>
        </div>
      </Panel>
    );
  }

  const finalReport = report;

  return (
    <article className="report-v2">
      <div className="report-header surface-panel">
        <div>
          <div className="report-mark">
            <Status tone="success">Finalized</Status>
            <span className="report-disclosure">Analysis source: Simulation</span>
          </div>
          <h2>Technical Test Report</h2>
          <p className="font-mono">{finalReport.test.testId}</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="secondary-button">
          {exporting ? 'Exporting CSV...' : 'Export CSV'}
        </button>
      </div>

      <section className="report-section surface-panel">
        <div className="result-section-heading">
          <div><span>Identification</span><h3>Test Information</h3></div>
        </div>
        <dl>
          <div><dt>Test ID</dt><dd className="font-mono">{finalReport.test.testId}</dd></div>
          <div><dt>Sample ID</dt><dd className="font-mono">{finalReport.test.sampleId}</dd></div>
          <div><dt>Product</dt><dd>{finalReport.test.product.productName}</dd></div>
          <div><dt>Product Code</dt><dd className="font-mono">{finalReport.test.product.productCode}</dd></div>
          <div><dt>Recipe</dt><dd>{finalReport.test.recipe.name}</dd></div>
          {finalReport.test.productionBatch && <div><dt>Production Batch</dt><dd className="font-mono">{finalReport.test.productionBatch}</dd></div>}
          <div><dt>Operator</dt><dd>{finalReport.test.operator}</dd></div>
          <div><dt>Test Timestamp</dt><dd>{new Date(finalReport.test.testTimestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
          <div><dt>Report Status</dt><dd><Status tone="success">{finalReport.status}</Status></dd></div>
        </dl>
      </section>

      <section className="report-section surface-panel">
        <div className="result-section-heading">
          <div><span>Configuration</span><h3>Test Setpoints</h3></div>
        </div>
        <dl>
          <div><dt>Force setpoint</dt><dd>{finalReport.test.setpoints.forceSetpointN} N</dd></div>
          <div><dt>Press duration</dt><dd>{finalReport.test.setpoints.pressDurationMs} ms</dd></div>
          <div><dt>Stroke</dt><dd>{finalReport.test.setpoints.strokeMm} mm</dd></div>
        </dl>
      </section>

      <section className="report-section surface-panel">
        <div className="result-section-heading">
          <div><span>Selected capture moment</span><h3>Primary Capture</h3></div>
        </div>
        <dl>
          <div><dt>Capture</dt><dd className="font-mono">#{String(finalReport.primaryCapture.frameIndex).padStart(3, '0')}</dd></div>
          <div><dt>Timestamp</dt><dd className="font-mono">{finalReport.primaryCapture.timestampMs} ms</dd></div>
          <div><dt>Phase</dt><dd>{phaseLabel(finalReport.primaryCapture.phase)}</dd></div>
          <div><dt>Side Frame</dt><dd className="font-mono">{finalReport.side.frameId}</dd></div>
          <div><dt>Front Frame</dt><dd className="font-mono">{finalReport.front.frameId}</dd></div>
        </dl>
      </section>

      <ResultMeasurementPanel camera="side" report={finalReport} />
      <ResultMeasurementPanel camera="front" report={finalReport} />

      <section className="result-two-column">
        <CalibrationSummary camera="Side" calibration={finalReport.side.calibration} />
        <CalibrationSummary camera="Front" calibration={finalReport.front.calibration} />
      </section>

      <AnalysisAudit report={finalReport} />
      <SupportingCaptures report={finalReport} />

      <section className="report-section surface-panel">
        <div className="result-section-heading">
          <div><span>Record</span><h3>Finalization</h3></div>
        </div>
        <dl>
          <div><dt>Finalized by</dt><dd>{finalReport.finalizedBy}</dd></div>
          <div><dt>Finalized at</dt><dd>{new Date(finalReport.finalizedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
          <div><dt>Analysis source</dt><dd>Simulation</dd></div>
        </dl>
      </section>
    </article>
  );
}
