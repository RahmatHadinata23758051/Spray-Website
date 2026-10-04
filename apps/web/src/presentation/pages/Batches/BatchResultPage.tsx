import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { fmt, formatStatus } from '../../utils/formatters';
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
        Memuat hasil batch...
      </div>
    );
  }

  if (!batchId || !batch) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-6">
        <Panel title="Hasil Batch Tidak Tersedia">
          <div className="p-6 space-y-4">
            <Status tone="danger">Batch Tidak Ditemukan</Status>
            <p className="text-sm text-text-secondary">
              Tidak ada batch dengan ID "{batchId || ''}".
            </p>
            <button
              type="button"
              onClick={() => navigate('/batches')}
              className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-sm"
            >
              Kembali ke Batch
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  if (batch.status !== 'FINALIZED') {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-6">
        <Panel title="Hasil Batch Belum Tersedia">
          <div className="p-6 space-y-4">
            <Status tone="warning">Hasil Belum Tersedia ({formatStatus(batch.status)})</Status>
            <p className="text-sm text-text-secondary">
              Batch <strong className="font-mono">{batch.id}</strong> saat ini dalam status <strong>{formatStatus(batch.status)}</strong>. Hasil hanya tersedia untuk batch yang telah difinalisasi.
            </p>
            <div className="flex gap-3 pt-2">
              {batch.status === 'REVIEW_REQUIRED' && (
                <button
                  type="button"
                  onClick={() => navigate(`/batches/${batch.id}/analysis`)}
                  className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-sm"
                >
                  Buka Ruang Kerja Analisis
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(`/batches/${batch.id}`)}
                className="rounded-sm border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-subtle shadow-sm"
              >
                Kembali ke Detail Batch
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
        <Panel title="Integritas Data">
          <div className="p-6 space-y-4">
            <Status tone="danger">Laporan Akhir Hilang</Status>
            <p className="text-sm text-text-secondary">
              Batch <strong className="font-mono">{batch.id}</strong> ditandai sebagai FINALIZED, namun snapshot laporan analisis akhir tidak ditemukan.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/batches/${batch.id}`)}
              className="rounded-sm border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-subtle shadow-sm"
            >
              Kembali ke Detail Batch
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
    <article className="result-v2 space-y-6 h-full flex flex-col pb-8">
      {/* Navigation breadcrumb / bar */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-text-primary font-mono">{report.test.testId}</h2>
            <Status tone="success">Final</Status>
          </div>
          <p className="mt-1 text-sm font-semibold text-text-secondary">{report.test.product.productName}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-secondary" onClick={handleExportCsv} disabled={exporting}>
            {exporting ? 'Mengekspor CSV...' : 'Ekspor CSV'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => navigate(`/batches/${batch.id}`)}>
            Detail Batch
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 bg-surface-subtle py-3 px-4 rounded-panel border border-border-subtle">
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Sampel</span><span className="font-mono text-sm font-bold text-text-primary">{report.test.sampleId}</span></div>
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Lot Produk</span><span className="font-mono text-sm font-semibold text-text-secondary">{report.test.productionBatch || '—'}</span></div>
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Resep</span><span className="text-sm font-semibold text-text-primary">{report.test.recipe.name}</span></div>
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Operator</span><span className="text-sm font-semibold text-text-primary">{report.test.operator}</span></div>
        <div className="flex flex-col"><span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Tangkapan Utama</span><span className="font-mono text-sm font-bold text-primary">#{String(report.primaryCapture.frameIndex).padStart(3, '0')} · {report.primaryCapture.timestampMs} ms</span></div>
      </div>

      {/* Primary Capture Overlay */}
      <section className="surface-panel !rounded-panel overflow-hidden border border-border-default shadow-sm">
        <div className="flex items-center justify-between bg-surface px-5 py-3 border-b border-border-subtle">
          <h3 className="text-sm font-bold text-text-primary">Tangkapan Utama</h3>
          <div className="text-right flex gap-3 items-center">
            <div className="font-mono text-sm font-bold text-text-primary">#{String(report.primaryCapture.frameIndex).padStart(3, '0')} · {report.primaryCapture.timestampMs} ms</div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-secondary px-2 py-0.5 rounded-full border border-border-subtle">{phaseLabel(report.primaryCapture.phase)}</div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-workbench-border bg-[#080f18]">
          <ResultCameraFrame
            title="Kamera Samping"
            camera="side"
            frame={primaryFrame}
            measurements={report.side}
            calibration={report.side.calibration}
            sideGeometry={report.side.finalGeometry}
            frontGeometry={report.front.finalGeometry}
          />
          <ResultCameraFrame
            title="Kamera Depan"
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
      <div className="grid md:grid-cols-2 gap-6">
        <ResultMeasurementPanel camera="side" report={report} />
        <ResultMeasurementPanel camera="front" report={report} />
      </div>

      {/* Side & Front Calibration Summaries */}
      <section className="grid md:grid-cols-2 gap-6">
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

type ResultMetric = { label: string; enLabel: string; value: MeasurementValue; format: (value: number) => string; editable: boolean };

function resultMetrics(camera: CameraType, report: FinalAnalysisReport): ResultMetric[] {
  if (camera === 'side') return [
    { label: 'Panjang Semprot', enLabel: 'Spray Length', value: report.side.sprayLength, format: fmt.cm, editable: true },
    { label: 'Sudut Semprot', enLabel: 'Spray Angle', value: report.side.sprayAngle, format: fmt.deg, editable: true },
    { label: 'Sebaran Vertikal', enLabel: 'Vertical Spread', value: report.side.verticalSpread, format: fmt.mm, editable: true },
    { label: 'Offset Arah', enLabel: 'Direction Offset', value: report.side.directionOffset, format: fmt.deg, editable: true },
  ];
  return [
    { label: 'Luas Semprot', enLabel: 'Spray Area', value: report.front.sprayArea, format: fmt.area, editable: true },
    { label: 'Diameter Ekuivalen', enLabel: 'Equivalent Diameter', value: report.front.equivalentDiameter, format: fmt.mm, editable: true },
    { label: 'Sirkularitas', enLabel: 'Circularity', value: report.front.circularity, format: value => value.toFixed(2), editable: false },
    { label: 'Offset Centroid X', enLabel: 'Centroid Offset X', value: report.front.centroidOffsetX, format: fmt.mm, editable: true },
    { label: 'Offset Centroid Y', enLabel: 'Centroid Offset Y', value: report.front.centroidOffsetY, format: fmt.mm, editable: true },
    { label: 'Simetri Horizontal', enLabel: 'Horizontal Symmetry', value: report.front.horizontalSymmetry, format: fmt.pct, editable: false },
    { label: 'Simetri Vertikal', enLabel: 'Vertical Symmetry', value: report.front.verticalSymmetry, format: fmt.pct, editable: false },
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
    <figure className="flex flex-col relative h-full">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 text-[10px] font-mono font-bold text-workbench-muted tracking-widest bg-black/40 backdrop-blur-sm px-2 py-1 rounded-sm border border-workbench-border/50">
        <span className="text-white uppercase">
          {title}
        </span>
        <span>FRM {String(frame.frameIndex).padStart(3, '0')}</span>
        <span>{frame.timestampMs}MS</span>
      </div>
      <div className="relative aspect-[4/3] w-full flex-1">
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
    </figure>
  );
}

export function ResultMeasurementPanel({ camera, report }: { camera: CameraType; report: FinalAnalysisReport }) {
  const metrics = resultMetrics(camera, report);
  const anyAdjusted = metrics.some(m => m.value.adjusted);
  const adjustedOperator = metrics.find(m => m.value.adjusted)?.value.adjustedBy;

  return (
    <section className="surface-panel !rounded-panel flex flex-col border border-border-default shadow-sm bg-surface">
      <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {camera === 'side' ? 'Geometri Profil' : 'Geometri Pola'}
          </span>
          <h3 className="text-sm font-bold text-text-primary mt-0.5">
            {camera === 'side' ? 'Hasil Kamera Samping' : 'Hasil Kamera Depan'}
          </h3>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
          anyAdjusted 
            ? 'bg-semantic-warning-soft border-semantic-warning/30 text-semantic-warning' 
            : 'bg-surface-subtle border-border-subtle text-text-secondary'
        }`}>
          {anyAdjusted ? `Disesuaikan oleh ${adjustedOperator || 'Operator'}` : 'Sumber: Otomatis diterima'}
        </span>
      </div>
      <div className="divide-y divide-border-subtle/60 px-4">
        {metrics.map(metric => (
          <div key={metric.label} className="py-2.5 flex items-center justify-between text-xs">
            <span className="font-medium text-text-secondary">{metric.label}</span>
            <div className="flex items-center gap-3">
              {metric.value.adjusted ? (
                <>
                  <span className="text-text-muted text-[11px] font-mono">
                    Otomatis <del>{metric.format(metric.value.auto)}</del>
                  </span>
                  <strong className="font-mono text-primary font-bold text-sm">
                    {metric.format(metric.value.final)}
                  </strong>
                </>
              ) : (
                <strong className="font-mono text-text-primary font-semibold text-sm">
                  {metric.format(metric.value.final)}
                </strong>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CalibrationSummary({ camera, calibration }: { camera: 'Side' | 'Front'; calibration: CalibrationSnapshot }) {
  const camLabel = camera === 'Side' ? 'Samping' : 'Depan';
  return (
    <section className="surface-panel !rounded-panel p-4 border border-border-default shadow-sm bg-surface flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3 border-b border-border-subtle pb-2">
        <h4 className="text-xs font-bold text-text-primary">Kalibrasi {camLabel}</h4>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
          calibration.adjusted 
            ? 'bg-semantic-warning-soft border-semantic-warning/30 text-semantic-warning' 
            : 'bg-surface-subtle border-border-subtle text-text-secondary'
        }`}>
          {calibration.adjusted ? `Disesuaikan oleh ${calibration.adjustedBy}` : 'Terkalibrasi'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-[10px] font-medium text-text-muted block">Referensi</span>
          <span className="font-mono font-semibold text-text-primary">{calibration.referenceDistanceMm} mm</span>
        </div>
        <div>
          <span className="text-[10px] font-medium text-text-muted block">Skala</span>
          <span className="font-mono font-bold text-primary">{calibration.scaleMmPerPx.toFixed(3)} mm/px</span>
        </div>
      </div>
    </section>
  );
}

export function AnalysisAudit({ report }: { report: FinalAnalysisReport }) {
  const sideAdjusted = hasAdjustedMeasurement(report.side);
  const frontAdjusted = hasAdjustedMeasurement(report.front);
  return (
    <section className="surface-panel !rounded-panel border border-border-default shadow-sm bg-surface">
      <div className="px-4 py-3 border-b border-border-subtle flex justify-between items-center">
        <h3 className="text-sm font-bold text-text-primary">Audit Analisis</h3>
        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Keterlacakan</span>
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 text-xs">
        <div className="flex flex-col">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Difinalisasi Pada</dt>
          <dd className="font-mono font-semibold text-text-primary">
            {new Date(report.finalizedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Oleh</dt>
          <dd className="font-semibold text-text-primary">{report.finalizedBy}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Basis Hasil Samping</dt>
          <dd className="font-semibold text-text-primary">{sideAdjusted ? 'Disesuaikan operator' : 'Otomatis diterima'}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Basis Hasil Depan</dt>
          <dd className="font-semibold text-text-primary">{frontAdjusted ? 'Disesuaikan operator' : 'Otomatis diterima'}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">Tangkapan Utama</dt>
          <dd className="font-mono font-semibold text-primary">#{String(report.primaryCapture.frameIndex).padStart(3, '0')} · {report.primaryCapture.timestampMs} ms</dd>
        </div>
      </dl>
    </section>
  );
}

export function SupportingCaptures({ report }: { report: FinalAnalysisReport }) {
  if (report.supportingCaptures.length === 0) return (
    <div className="bg-surface-subtle border border-border-default border-dashed rounded-panel py-3 px-4 text-center">
      <p className="text-xs font-medium text-text-muted">Tidak ada tangkapan pendukung yang dipilih.</p>
    </div>
  );
  return (
    <section className="surface-panel !rounded-panel border border-border-default shadow-sm overflow-hidden">
      <div className="bg-surface px-4 py-3 border-b border-border-subtle flex justify-between items-center">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Bukti</span>
          <h3 className="text-sm font-bold text-text-primary mt-0.5">Tangkapan Pendukung</h3>
        </div>
        <span className="text-xs font-bold text-text-primary bg-subtle border border-border-default px-2 py-0.5 rounded-full">{report.supportingCaptures.length} dari 9</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border-subtle p-px">
        {report.supportingCaptures.map(capture => (
          <article key={capture.captureMomentId} className="bg-surface flex flex-col">
            <header className="px-3 py-2 border-b border-border-subtle flex justify-between items-center bg-surface-subtle">
              <strong className="font-mono text-[11px] text-text-primary">#{String(capture.frameIndex).padStart(3, '0')} · {capture.timestampMs} ms</strong>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">{phaseLabel(capture.phase)}</span>
            </header>
            <div className="flex-1 grid grid-cols-2 divide-x divide-border-subtle">
              <div className="flex flex-col bg-[#080f18] relative">
                <div className="absolute top-2 left-2 z-10 text-[9px] font-mono font-bold text-workbench-muted bg-black/40 px-1.5 py-0.5 rounded-sm">SAMPING</div>
                <div className="aspect-[4/3] relative"><Overlay camera="side" /></div>
              </div>
              <div className="flex flex-col bg-[#080f18] relative">
                <div className="absolute top-2 left-2 z-10 text-[9px] font-mono font-bold text-workbench-muted bg-black/40 px-1.5 py-0.5 rounded-sm">DEPAN</div>
                <div className="aspect-[4/3] relative"><Overlay camera="front" /></div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
