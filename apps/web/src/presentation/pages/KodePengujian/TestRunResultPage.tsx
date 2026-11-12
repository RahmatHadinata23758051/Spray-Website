import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { kodePengujianRepository } from '../../../application/services';
import type { KodePengujian, TestRun, Sample } from '@spray-paragon/domain';
import { formatStatus } from '../../utils/formatters';
import { Status } from '../../components/ui/Status';
import { Panel } from '../../components/ui/Panel';
import { createFinalReportCsv } from '../../../application/reporting/createFinalReportCsv';
import { ResultEvidenceGallery } from '../../features/analysis/ResultEvidenceGallery';
import { TechnicalDetailsDisclosure } from '../../features/analysis/TechnicalDetailsDisclosure';

export function TestRunResultPage() {
  const { kpId, sampleId, runId } = useParams();
  const navigate = useNavigate();
  const [context, setContext] = useState<{ kp: KodePengujian; sample: Sample; testRun: TestRun } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kpId || !sampleId || !runId) {
      setError('Parameter URL tidak lengkap');
      setLoading(false);
      return;
    }
    let cancelled = false;
    const loadContext = async () => {
      try {
        const kp = await kodePengujianRepository.get(kpId);
        if (cancelled) return;
        if (!kp) {
          setError(`Kode Pengujian ${kpId} tidak ditemukan`);
          return;
        }
        const sample = kp.samples.find((s) => s.id === sampleId);
        if (!sample) {
          setError(`Sampel ${sampleId} tidak ditemukan dalam Kode Pengujian ${kpId}`);
          return;
        }
        const testRun = kp.testRuns.find((t) => t.id === runId && t.sampleId === sampleId);
        if (!testRun) {
          setError(`Pengujian ${runId} tidak ditemukan untuk Sampel ${sampleId}`);
          return;
        }
        setContext({ kp, sample, testRun });
      } catch (loadError) {
        if (cancelled) return;
        console.error('Failed to load test run result context', loadError);
        setError('Gagal memuat konteks hasil pengujian');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadContext();
    return () => {
      cancelled = true;
    };
  }, [kpId, sampleId, runId]);

  const handleBack = useCallback(() => {
    if (context) {
      navigate(`/kode-pengujian/${context.kp.id}`);
    } else if (kpId) {
      navigate(`/kode-pengujian/${kpId}`);
    }
  }, [context, kpId, navigate]);

  const handleDownloadCsv = useCallback(async () => {
    if (!context?.testRun.finalReport) return;
    const csv = createFinalReportCsv(context.testRun.finalReport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${context.kp.id}-${context.sample.sampleCode || context.sample.id}-${context.testRun.id}-hasil.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [context]);

  if (loading) {
    return <div className="p-8 text-center text-text-muted font-medium text-xs">Memuat hasil pengujian...</div>;
  }

  if (error && !context) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-6">
        <Panel title="Hasil Pengujian Tidak Tersedia">
          <div className="p-6 space-y-4">
            <Status tone="danger">Kesalahan</Status>
            <p className="text-sm text-text-secondary">{error}</p>
            <button
              type="button"
              onClick={handleBack}
              className="btn btn-primary text-xs font-medium"
            >
              Kembali ke Kode Pengujian
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  if (!context) return null;

  const { kp, sample, testRun } = context;
  const report = testRun.finalReport;

  if (!report) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-6">
        <Panel title="Hasil Pengujian Belum Tersedia">
          <div className="p-6 space-y-4">
            <Status tone="warning">Hasil Belum Tersedia ({formatStatus(testRun.status)})</Status>
            <p className="text-sm text-text-secondary">
              Pengujian <strong className="font-mono font-medium">{testRun.id}</strong> saat ini dalam status{' '}
              <strong>{formatStatus(testRun.status)}</strong>. Hasil hanya tersedia untuk pengujian yang telah difinalisasi.
            </p>
            <div className="flex gap-3 pt-2">
              {testRun.status === 'ANALYZING' && (
                <button
                  type="button"
                  onClick={() => navigate(`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/analysis`)}
                  className="btn btn-primary text-xs font-medium"
                >
                  Buka Ruang Kerja Analisis
                </button>
              )}
              <button
                type="button"
                onClick={handleBack}
                className="btn btn-secondary text-xs font-medium"
              >
                Kembali ke Kode Pengujian
              </button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  // Parse authoritative snapshot metrics
  const rawOperational = report.operationalMetrics as {
    measurements?: Record<string, unknown>;
    derived?: {
      dischargedMassG?: number;
      dischargeRateGPerS?: number;
      pressureDropBar?: number;
    };
    dischargedMassG?: number;
    dischargeRateGPerS?: number;
    pressureDropBar?: number;
  } | undefined;

  const derived = rawOperational?.derived ?? (rawOperational?.dischargedMassG !== undefined ? rawOperational : undefined);
  const m = rawOperational?.measurements ?? {};

  const isAerosol = sample.deviceConfiguration?.deviceType === 'Aerosol';
  const effectiveStorage = sample.storageCondition ?? kp.storageCondition ?? '—';
  const effectiveBottlePosition = sample.bottlePosition ?? kp.bottlePosition ?? '—';
  const anyAdjusted = Boolean(
    report.side.sprayLength?.adjusted ||
    report.side.sprayAngle?.adjusted ||
    report.side.verticalSpread?.adjusted ||
    (report.side.calibration && report.side.calibration.adjusted)
  );

  return (
    <div className="max-w-5xl mx-auto w-full space-y-5">
      {/* 1. Simplified Restrained Result Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-border-subtle">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-text-primary">Hasil Pengujian</h1>
            <Status tone="success">Finalized</Status>
            {report.analysisSource === 'simulation' && (
              <span
                className="text-[10px] font-mono text-primary bg-primary-soft px-2 py-0.5 rounded border border-primary/20"
                title="Data fixture untuk validasi antarmuka"
              >
                Simulasi
              </span>
            )}
          </div>
          <div className="text-sm font-medium text-text-primary">
            {kp.productSnapshot.productName} ({kp.productSnapshot.productCode})
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary font-mono">
            <span className="font-semibold text-text-primary">{sample.sampleCode || sample.id}</span>
            <span>•</span>
            <span>{testRun.id}</span>
            <span>•</span>
            <span className="text-primary">{testRun.recipeSnapshot.name}</span>
            <span>•</span>
            <span>{kp.id}</span>
          </div>
          <div className="text-xs text-text-muted font-sans">
            <span>{new Date(report.finalizedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span> · </span>
            <span>Finalisasi oleh: </span>
            <span className="font-medium text-text-primary">{report.finalizedBy}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadCsv}
            className="btn btn-secondary !min-h-[30px] !py-1 px-3 text-xs font-medium flex items-center gap-1.5"
            aria-label="Unduh CSV"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Unduh CSV
          </button>
          <button
            onClick={handleBack}
            className="btn btn-secondary !min-h-[30px] !py-1 px-3 text-xs font-medium"
          >
            Kembali
          </button>
        </div>
      </div>

      {/* 2. Hasil Utama & Hasil Analisis (2-Column Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Hasil Utama (Operational Metrics) */}
        <div className="bg-surface border border-border-default rounded-md overflow-hidden">
          <div className="bg-surface-subtle px-3.5 py-2 border-b border-border-subtle flex items-center justify-between text-xs">
            <span className="font-semibold text-text-primary">Hasil utama</span>
            <span className="text-[10px] font-mono text-text-muted">Kalkulasi terverifikasi</span>
          </div>
          <div className="divide-y divide-border-subtle text-xs font-mono">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="font-sans text-text-secondary">Discharged Mass</span>
              <span className="font-medium text-text-primary">
                {derived?.dischargedMassG !== undefined ? `${derived.dischargedMassG.toFixed(3)} g` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="font-sans text-text-secondary">Discharge Rate</span>
              <span className="font-medium text-text-primary">
                {derived?.dischargeRateGPerS !== undefined ? `${derived.dischargeRateGPerS.toFixed(3)} g/s` : '—'}
              </span>
            </div>
            {isAerosol && (
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="font-sans text-text-secondary">Pressure Drop</span>
                <span className="font-medium text-text-primary">
                  {derived?.pressureDropBar !== undefined ? `${derived.pressureDropBar.toFixed(2)} bar` : '—'}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between px-3.5 py-2.5 font-sans">
              <span className="text-text-secondary">Kebocoran</span>
              <span className="font-medium text-text-primary">
                {m.leakage === 'Tidak' ? (
                  <span className="text-semantic-success">Tidak</span>
                ) : m.leakage === 'Ya' ? (
                  <span className="text-semantic-danger">Ya</span>
                ) : (
                  '—'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Hasil Analisis Kamera */}
        <div className="bg-surface border border-border-default rounded-md overflow-hidden">
          <div className="bg-surface-subtle px-3.5 py-2 border-b border-border-subtle flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary">Hasil analisis kamera</span>
              {anyAdjusted && (
                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-semantic-warning/10 text-semantic-warning border border-semantic-warning/30">
                  Disesuaikan
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono text-text-muted">Side CV Geometry</span>
          </div>
          <div className="divide-y divide-border-subtle text-xs font-mono">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="font-sans text-text-secondary">Spray Length</span>
              <span className="font-medium text-text-primary">
                {report.side.sprayLength?.final !== undefined ? `${report.side.sprayLength.final.toFixed(1)} mm` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <span className="font-sans text-text-secondary">Spray Angle</span>
              <span className="font-medium text-text-primary">
                {report.side.sprayAngle?.final !== undefined ? `${report.side.sprayAngle.final.toFixed(1)}°` : '—'}
              </span>
            </div>
            {report.side.verticalSpread?.final !== undefined && (
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="font-sans text-text-secondary">Vertical Spread</span>
                <span className="font-medium text-text-primary">
                  {report.side.verticalSpread.final.toFixed(1)} mm
                </span>
              </div>
            )}
            {report.side.directionOffset?.final !== undefined && (
              <div className="flex items-center justify-between px-3.5 py-2.5">
                <span className="font-sans text-text-secondary">Direction Offset</span>
                <span className="font-medium text-text-primary">
                  {report.side.directionOffset.final.toFixed(1)}°
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Evidence Presentation: Primary Frame + Telemetry & Supporting Gallery */}
      <ResultEvidenceGallery testRun={testRun} report={report} />

      {/* 4. Ringkasan Konteks & Parameter Pengujian */}
      <div className="bg-surface border border-border-default rounded-md overflow-hidden">
        <div className="bg-surface-subtle px-3.5 py-2 border-b border-border-subtle text-xs font-semibold text-text-primary">
          Ringkasan parameter & data lapangan
        </div>
        <dl className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-xs">
          <div>
            <dt className="text-text-muted text-[10px]">No. Formula</dt>
            <dd className="font-mono font-medium text-text-primary">{kp.formulaNumber || (kp.metadata?.formulaNumber as string) || '—'}</dd>
          </div>
          <div>
            <dt className="text-text-muted text-[10px]">Lot Produk</dt>
            <dd className="font-mono font-medium text-text-primary">{kp.productLot || '—'}</dd>
          </div>
          <div>
            <dt className="text-text-muted text-[10px]">Periode Uji</dt>
            <dd className="font-mono text-text-secondary">{kp.testPeriod || '—'}</dd>
          </div>
          <div>
            <dt className="text-text-muted text-[10px]">Posisi / Kondisi Simpan</dt>
            <dd className="text-text-primary">{effectiveBottlePosition} / {effectiveStorage}</dd>
          </div>
          <div>
            <dt className="text-text-muted text-[10px]">Gaya Tekan (Setpoint)</dt>
            <dd className="font-mono text-text-primary">{testRun.setpoints.forceSetpointN} N</dd>
          </div>
          <div>
            <dt className="text-text-muted text-[10px]">Durasi Tekan (Set / Aktual)</dt>
            <dd className="font-mono text-text-primary">
              {(testRun.setpoints.pressDurationMs / 1000).toFixed(2)} s
              {m.actualPressDurationS !== undefined ? ` / ${String(m.actualPressDurationS)} s` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted text-[10px]">Stroke (Set / Aktual)</dt>
            <dd className="font-mono text-text-primary">
              {testRun.setpoints.strokeMm} mm
              {m.actualStrokeDepth !== undefined ? ` / ${String(m.actualStrokeDepth)} mm` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-text-muted text-[10px]">Bobot Awal / Akhir</dt>
            <dd className="font-mono text-text-primary">
              {String(m.initialGrossWeightG ?? '—')} g / {String(m.finalGrossWeightG ?? '—')} g
            </dd>
          </div>
        </dl>
      </div>

      {/* 5. Detail Teknis (Collapsible Disclosure) */}
      <TechnicalDetailsDisclosure report={report} kp={kp} sample={sample} testRun={testRun} />
    </div>
  );
}
