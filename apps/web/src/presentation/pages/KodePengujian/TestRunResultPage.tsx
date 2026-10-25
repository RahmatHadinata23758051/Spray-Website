import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  kodePengujianRepository,
} from '../../../application/services';
import type { KodePengujian, TestRun, Sample } from '@spray-paragon/domain';
import { fmt, formatStatus } from '../../utils/formatters';
import { Status } from '../../components/ui/Status';
import { Panel } from '../../components/ui/Panel';
import { createFinalReportCsv } from '../../../application/reporting/createFinalReportCsv';

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
        const sample = kp.samples.find(s => s.id === sampleId);
        if (!sample) {
          setError(`Sampel ${sampleId} tidak ditemukan dalam Kode Pengujian ${kpId}`);
          return;
        }
        const testRun = kp.testRuns.find(t => t.id === runId && t.sampleId === sampleId);
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

  if (loading) return <div className="p-8 text-center text-text-muted font-medium">Memuat hasil pengujian...</div>;

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
              className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-sm"
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
              Pengujian <strong className="font-mono">{testRun.id}</strong> saat ini dalam status <strong>{formatStatus(testRun.status)}</strong>. Hasil hanya tersedia untuk pengujian yang telah difinalisasi.
            </p>
            <div className="flex gap-3 pt-2">
              {testRun.status === 'ANALYZING' && (
                <button
                  type="button"
                  onClick={() => navigate(`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/analysis`)}
                  className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-sm"
                >
                  Buka Ruang Kerja Analisis
                </button>
              )}
              <button
                type="button"
                onClick={handleBack}
                className="rounded-sm border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-subtle shadow-sm"
              >
                Kembali ke Kode Pengujian
              </button>
            </div>
          </div>
        </Panel>
      </div>
    );
  }

  const effectiveStorage = sample.storageCondition ?? kp.storageCondition ?? '—';
  const effectiveBottlePosition = sample.bottlePosition ?? kp.bottlePosition ?? '—';

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Hasil Pengujian <span className="font-mono text-primary">{testRun.id}</span>
            </h1>
            <p className="text-sm text-text-secondary">
              <span className="font-mono">{kp.id}</span> / <span>{sample.sampleCode || sample.id}</span> / <span className="text-primary">{testRun.recipeSnapshot.name}</span>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleDownloadCsv}
              className="rounded-sm border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-subtle shadow-sm flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Unduh CSV
            </button>
            <button onClick={handleBack} className="rounded-sm border border-border-subtle bg-bg-surface px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-subtle shadow-sm">
              Kembali
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="px-3 py-1 bg-surface-subtle rounded border border-border-default">
            <span className="font-semibold text-text-primary">Status: </span>
            <Status tone="success">Finalized</Status>
          </span>
          <span className="px-3 py-1 bg-surface-subtle rounded border border-border-default">
            <span className="font-semibold text-text-primary">Finalized by: </span>
            <span className="font-mono text-text-secondary">{report.finalizedBy}</span>
          </span>
          <span className="px-3 py-1 bg-surface-subtle rounded border border-border-default">
            <span className="font-semibold text-text-primary">Finalized at: </span>
            <span className="font-mono text-text-secondary">{fmt.date(report.finalizedAt)}</span>
          </span>
          <span className="px-3 py-1 bg-surface-subtle rounded border border-border-default">
            <span className="font-semibold text-text-primary">Analisis: </span>
            <span className="font-mono text-text-secondary">{report.analysisSource}</span>
          </span>
          {report.analysisSource === 'simulation' && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-soft px-2.5 py-1 rounded border border-primary/20">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span>Mode Simulasi — Data Fixture</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Test Context Panel */}
        <Panel title="Konteks Pengujian">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-text-primary border-b border-border-subtle pb-2">Kode Pengujian</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-text-muted">ID</dt><dd className="font-mono text-text-primary">{kp.id}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Produk</dt><dd className="font-medium text-text-primary">{kp.productSnapshot.productName} ({kp.productSnapshot.productCode})</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Lot Produk</dt><dd className="font-mono text-text-secondary">{kp.productLot || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Periode Uji</dt><dd className="font-mono text-text-secondary">{kp.testPeriod || '—'}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Operator</dt><dd className="font-medium text-text-primary">{kp.operatorName}</dd></div>
              </dl>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-text-primary border-b border-border-subtle pb-2">Sampel</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-text-muted">Kode Sampel</dt><dd className="font-medium text-text-primary">{sample.sampleCode || sample.id}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Posisi</dt><dd className="font-mono text-text-secondary">#{sample.positionInRun}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Kondisi Simpan</dt><dd className="text-text-secondary">{effectiveStorage}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Posisi Botol</dt><dd className="text-text-secondary">{effectiveBottlePosition}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Status</dt><dd><Status tone="success">TESTED</Status></dd></div>
              </dl>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold text-text-primary border-b border-border-subtle pb-2">Metodologi</h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-text-muted">Resep</dt><dd className="font-medium text-text-primary">{testRun.recipeSnapshot.name}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Setpoint Gaya</dt><dd className="font-mono text-text-secondary">{testRun.setpoints.forceSetpointN} N</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Durasi Tekan</dt><dd className="font-mono text-text-secondary">{testRun.setpoints.pressDurationMs} ms</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Stroke</dt><dd className="font-mono text-text-secondary">{testRun.setpoints.strokeMm} mm</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted">Mode Capture</dt><dd className="font-mono text-text-secondary">{testRun.captureSession?.captureMode || '—'}</dd></div>
              </dl>
            </div>
          </div>
        </Panel>

        {/* Primary Capture Panel */}
        <Panel title="Tangkapan Utama">
          <div className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-text-muted">Frame Index</dt>
              <dd className="font-mono text-text-primary">{report.primaryCapture.frameIndex}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Waktu (ms)</dt>
              <dd className="font-mono text-text-primary">{report.primaryCapture.timestampMs}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Fase</dt>
              <dd className="text-text-secondary">{report.primaryCapture.phase}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Capture Moment ID</dt>
              <dd className="font-mono text-xs text-text-secondary">{report.primaryCaptureMomentId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Jumlah Pendukung</dt>
              <dd className="font-mono text-text-primary">{report.supportingCaptureMomentIds.length} / 9</dd>
            </div>
          </div>
        </Panel>

        {/* Side Analysis Panel */}
        <Panel title="Analisis Samping (Side)">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="font-semibold text-text-primary">Kalibrasi</h5>
                <dl className="space-y-1 text-xs text-text-secondary">
                  <div className="flex justify-between"><dt>mm/px</dt><dd className="font-mono">{report.side.calibration.scaleMmPerPx.toFixed(4)}</dd></div>
                  <div className="flex justify-between"><dt>Referensi (mm)</dt><dd className="font-mono">{report.side.calibration.referenceDistanceMm}</dd></div>
                  <div className="flex justify-between"><dt>Diadjust</dt><dd>{report.side.calibration.adjusted ? 'Ya' : 'Tidak'}</dd></div>
                </dl>
              </div>
              <div className="space-y-2">
                <h5 className="font-semibold text-text-primary">Geometri Otomatis (Piksel)</h5>
                <dl className="space-y-1 text-xs text-text-secondary">
                  <div className="flex justify-between"><dt>Nozzle Origin</dt><dd className="font-mono">({report.side.autoGeometry.nozzleOriginPx.x.toFixed(0)}, {report.side.autoGeometry.nozzleOriginPx.y.toFixed(0)})</dd></div>
                  <div className="flex justify-between"><dt>Spray Endpoint</dt><dd className="font-mono">({report.side.autoGeometry.sprayEndpointPx.x.toFixed(0)}, {report.side.autoGeometry.sprayEndpointPx.y.toFixed(0)})</dd></div>
                  <div className="flex justify-between"><dt>Upper Boundary</dt><dd className="font-mono">({report.side.autoGeometry.upperBoundaryPx.x.toFixed(0)}, {report.side.autoGeometry.upperBoundaryPx.y.toFixed(0)})</dd></div>
                  <div className="flex justify-between"><dt>Lower Boundary</dt><dd className="font-mono">({report.side.autoGeometry.lowerBoundaryPx.x.toFixed(0)}, {report.side.autoGeometry.lowerBoundaryPx.y.toFixed(0)})</dd></div>
                </dl>
              </div>
            </div>
            <div className="space-y-2">
              <h5 className="font-semibold text-text-primary">Pengukuran Final (mm)</h5>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div><dt className="text-text-muted">Panjang Spray</dt><dd className="font-mono text-text-primary">{report.side.sprayLength.final.toFixed(2)}</dd></div>
                <div><dt className="text-text-muted">Sudut Spray</dt><dd className="font-mono text-text-primary">{report.side.sprayAngle.final.toFixed(2)}</dd></div>
                <div><dt className="text-text-muted">Spread Vertikal</dt><dd className="font-mono text-text-primary">{report.side.verticalSpread.final.toFixed(2)}</dd></div>
                <div><dt className="text-text-muted">Offset Arah</dt><dd className="font-mono text-text-primary">{report.side.directionOffset.final.toFixed(2)}</dd></div>
                {report.side.spreadPosition && (
                  <div><dt className="text-text-muted">Posisi Spread</dt><dd className="font-mono text-text-primary">{report.side.spreadPosition.final.toFixed(2)}</dd></div>
                )}
              </dl>
            </div>
            <div className="p-3 bg-surface-subtle rounded border border-border-default text-xs text-text-secondary">
              Koreksi manual: {Object.keys(report.side.finalGeometry || {}).length > 0 ? 'Diterapkan' : 'Tidak ada'}
            </div>
          </div>
        </Panel>

        {/* Front Analysis Panel - only if available */}
        {report.front ? (
          <Panel title="Analisis Depan (Front)">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h5 className="font-semibold text-text-primary">Kalibrasi</h5>
                  <dl className="space-y-1 text-xs text-text-secondary">
                    <div className="flex justify-between"><dt>mm/px</dt><dd className="font-mono">{report.front.calibration.scaleMmPerPx.toFixed(4)}</dd></div>
                    <div className="flex justify-between"><dt>Referensi (mm)</dt><dd className="font-mono">{report.front.calibration.referenceDistanceMm}</dd></div>
                    <div className="flex justify-between"><dt>Diadjust</dt><dd>{report.front.calibration.adjusted ? 'Ya' : 'Tidak'}</dd></div>
                  </dl>
                </div>
                <div className="space-y-2">
                  <h5 className="font-semibold text-text-primary">Pengukuran Otomatis</h5>
                  <dl className="space-y-1 text-xs text-text-secondary">
                    <div className="flex justify-between"><dt>Area Spray (mm²)</dt><dd className="font-mono">{report.front.autoGeometry?.sprayAreaPixels ? report.front.autoGeometry.sprayAreaPixels.toFixed(0) + ' px' : '—'}</dd></div>
                    <div className="flex justify-between"><dt>Diameter Ekuivalen (mm)</dt><dd className="font-mono">{report.front.autoGeometry?.equivalentDiameterPx ? report.front.autoGeometry.equivalentDiameterPx.toFixed(1) + ' px' : '—'}</dd></div>
                    <div className="flex justify-between"><dt>Circularity</dt><dd className="font-mono">{report.front.autoGeometry?.circularity ? report.front.autoGeometry.circularity.toFixed(3) : '—'}</dd></div>
                  </dl>
                </div>
              </div>
              <div className="space-y-2">
                <h5 className="font-semibold text-text-primary">Pengukuran Final (mm)</h5>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-text-muted">Area Spray</dt><dd className="font-mono text-text-primary">{report.front.sprayArea.final.toFixed(2)}</dd></div>
                  <div><dt className="text-text-muted">Diameter Ekuivalen</dt><dd className="font-mono text-text-primary">{report.front.equivalentDiameter.final.toFixed(2)}</dd></div>
                  <div><dt className="text-text-muted">Circularity</dt><dd className="font-mono text-text-primary">{report.front.circularity.final.toFixed(3)}</dd></div>
                  <div><dt className="text-text-muted">Simetri Horizontal</dt><dd className="font-mono text-text-primary">{report.front.horizontalSymmetry.final.toFixed(3)}</dd></div>
                  <div><dt className="text-text-muted">Simetri Vertikal</dt><dd className="font-mono text-text-primary">{report.front.verticalSymmetry.final.toFixed(3)}</dd></div>
                </dl>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel title="Analisis Depan (Front)">
            <p className="text-sm text-text-secondary">Data Profil Depan tidak tersedia</p>
          </Panel>
        )}

        {/* Supporting Captures Panel */}
        {report.supportingCaptures.length > 0 && (
          <Panel title="Tangkapan Pendukung">
            <div className="space-y-3">
              {report.supportingCaptures.map((cap, idx) => (
                <div key={cap.captureMomentId} className="p-3 bg-surface-subtle rounded border border-border-default">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-text-primary">Pendukung #{idx + 1}</span>
                    <span className="font-mono text-xs text-text-secondary">{cap.captureMomentId}</span>
                  </div>
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div><dt className="text-text-muted">Frame Index</dt><dd className="font-mono text-text-primary">{cap.frameIndex}</dd></div>
                    <div><dt className="text-text-muted">Waktu (ms)</dt><dd className="font-mono text-text-primary">{cap.timestampMs}</dd></div>
                    <div><dt className="text-text-muted">Fase</dt><dd className="text-text-secondary">{cap.phase}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}