import React from 'react';
import type { WizardFormData } from './types';
import { computeLiveOperationalMetrics } from './types';
import { Status } from '../../../components/ui/Status';
import type { TestRun, KodePengujian, Sample, OperationalDerivedMetrics } from '@spray-paragon/domain';

interface Step05ResultSummaryProps {
  formData: WizardFormData;
  kp?: KodePengujian;
  sample?: Sample;
  testRun: TestRun;
  onDownloadCsv: () => void;
  onBackToKp: () => void;
}

export function Step05ResultSummary({
  formData,
  kp: _kp,
  sample: _sample,
  testRun,
  onDownloadCsv,
  onBackToKp,
}: Step05ResultSummaryProps) {
  const isAerosol = formData.deviceType === 'Aerosol';
  const isFinalized = testRun.status === 'FINALIZED';
  const finalReport = testRun.finalReport;

  const rawReportMetrics = finalReport?.operationalMetrics as {
    measurements?: Record<string, unknown>;
    derived?: OperationalDerivedMetrics;
    dischargedMassG?: number;
    dischargeRateGPerS?: number;
    pressureDropBar?: number;
  } | undefined;

  const snapshotDerived =
    rawReportMetrics?.derived ??
    (rawReportMetrics && 'dischargedMassG' in rawReportMetrics
      ? (rawReportMetrics as OperationalDerivedMetrics)
      : undefined);

  const snapshotMeasurements = rawReportMetrics?.measurements;

  // Authoritative operational metrics: if finalized, MUST use immutable final report snapshot
  const operationalMetrics: OperationalDerivedMetrics | undefined = isFinalized
    ? snapshotDerived
    : testRun.operationalDerivedMetrics ?? computeLiveOperationalMetrics(formData);

  // Field measurements: if finalized, use frozen snapshot measurements; otherwise formData
  const displayInitialWeight = isFinalized && snapshotMeasurements?.initialGrossWeightG !== undefined
    ? String(snapshotMeasurements.initialGrossWeightG)
    : formData.initialGrossWeightG;

  const displayFinalWeight = isFinalized && snapshotMeasurements?.finalGrossWeightG !== undefined
    ? String(snapshotMeasurements.finalGrossWeightG)
    : formData.finalGrossWeightG;

  const displayActualDuration = isFinalized && snapshotMeasurements?.actualPressDurationS !== undefined
    ? String(snapshotMeasurements.actualPressDurationS)
    : formData.actualPressDurationS;

  const displayInitialPressure = isFinalized && snapshotMeasurements?.initialPressureBar !== undefined
    ? String(snapshotMeasurements.initialPressureBar)
    : formData.initialPressureBar;

  const displayFinalPressure = isFinalized && snapshotMeasurements?.finalPressureBar !== undefined
    ? String(snapshotMeasurements.finalPressureBar)
    : formData.finalPressureBar;

  const displayLeakage = isFinalized && snapshotMeasurements?.leakage !== undefined
    ? String(snapshotMeasurements.leakage)
    : formData.leakage;

  return (
    <div className="space-y-5">
      {/* Header status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold text-text-primary">
            05. Ringkasan & Hasil Akhir Pengujian
          </h2>
          {isFinalized ? (
            <Status tone="success">Finalized</Status>
          ) : (
            <Status tone="neutral">Draf</Status>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDownloadCsv}
            className="btn btn-secondary !min-h-[28px] !py-0.5 px-3 text-xs font-semibold flex items-center gap-1.5"
            id="btn-export-csv"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 001 1h12a1 1 0 100-2H4a1 1 0 00-1 1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* Ringkasan: Compact Identity Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-surface border border-border-default rounded-md text-xs">
        <div>
          <span className="text-[10px] text-text-muted block">Produk</span>
          <span className="font-semibold text-text-primary truncate block" title={formData.productName}>
            {formData.productName}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-text-muted block">Sampel</span>
          <span className="font-mono font-medium text-text-primary block">
            {formData.sampleCode || '—'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-text-muted block">Trial</span>
          <span className="font-medium text-text-primary block">{formData.trialType}</span>
        </div>
        <div>
          <span className="text-[10px] text-text-muted block">Device</span>
          <span className="font-medium text-text-primary block">{formData.deviceType}</span>
        </div>
        <div>
          <span className="text-[10px] text-text-muted block">Tanggal</span>
          <span className="font-mono text-text-primary block">{formData.acquisitionDate}</span>
        </div>
      </div>

      {/* 2-Column Technical Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Hasil Operasional & Kamera */}
        <div className="space-y-4">
          {/* Hasil Operasional */}
          <div className="bg-surface border border-border-default rounded-md overflow-hidden">
            <div className="bg-surface-subtle px-3 py-1.5 border-b border-border-subtle text-xs font-bold uppercase tracking-wider text-text-primary">
              Hasil Operasional
            </div>
            <div className="divide-y divide-border-subtle text-xs font-mono">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="font-sans text-text-secondary">Discharged Mass</span>
                <span className="font-bold text-text-primary">
                  {operationalMetrics?.dischargedMassG !== undefined
                    ? `${operationalMetrics.dischargedMassG.toFixed(3)} g`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="font-sans text-text-secondary">Discharge Rate</span>
                <span className="font-bold text-text-primary">
                  {operationalMetrics?.dischargeRateGPerS !== undefined
                    ? `${operationalMetrics.dischargeRateGPerS.toFixed(3)} g/s`
                    : '—'}
                </span>
              </div>
              {isAerosol && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="font-sans text-text-secondary">Pressure Drop</span>
                  <span className="font-bold text-text-primary">
                    {operationalMetrics?.pressureDropBar !== undefined
                      ? `${operationalMetrics.pressureDropBar.toFixed(2)} bar`
                      : '—'}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between px-3 py-2 font-sans">
                <span className="text-text-secondary">Kebocoran</span>
                <span className="font-semibold text-text-primary">
                  {displayLeakage === 'Tidak' ? (
                    <span className="text-semantic-success">Tidak</span>
                  ) : displayLeakage === 'Ya' ? (
                    <span className="text-semantic-danger">Ya</span>
                  ) : (
                    '—'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Hasil Analisis Kamera */}
          <div className="bg-surface border border-border-default rounded-md overflow-hidden">
            <div className="bg-surface-subtle px-3 py-1.5 border-b border-border-subtle text-xs font-bold uppercase tracking-wider text-text-primary">
              Hasil Analisis Kamera
            </div>
            <div className="divide-y divide-border-subtle text-xs font-mono">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="font-sans text-text-secondary">Spray Length</span>
                <span className="font-bold text-text-primary">
                  {finalReport?.side?.sprayLength?.final !== undefined
                    ? `${finalReport.side.sprayLength.final.toFixed(1)} mm`
                    : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="font-sans text-text-secondary">Spray Angle</span>
                <span className="font-bold text-text-primary">
                  {finalReport?.side?.sprayAngle?.final !== undefined
                    ? `${finalReport.side.sprayAngle.final.toFixed(1)}°`
                    : '—'}
                </span>
              </div>
              {finalReport?.side?.verticalSpread?.final !== undefined && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="font-sans text-text-secondary">Vertical Spread</span>
                  <span className="font-bold text-text-primary">
                    {finalReport.side.verticalSpread.final.toFixed(1)} mm
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detail Pengujian */}
        <div className="bg-surface border border-border-default rounded-md overflow-hidden">
          <div className="bg-surface-subtle px-3 py-1.5 border-b border-border-subtle text-xs font-bold uppercase tracking-wider text-text-primary">
            Detail Pengujian
          </div>
          <dl className="p-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div>
              <dt className="text-text-muted text-[10px]">No. Formula</dt>
              <dd className="font-mono font-medium text-text-primary">{formData.formulaNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[10px]">No. Batch / Lot</dt>
              <dd className="font-mono font-medium text-text-primary">{formData.lotNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[10px]">KUF</dt>
              <dd className="font-mono font-medium text-text-primary">{formData.kuf || '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[10px]">Benchmark</dt>
              <dd className="text-text-primary">{formData.benchmark || '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[10px]">Posisi / Kondisi</dt>
              <dd className="text-text-primary">{formData.storagePosition} / {formData.storageCondition}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[10px]">Pola Pakai</dt>
              <dd className="text-text-primary">{formData.usagePattern}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[10px]">Gaya Tekan</dt>
              <dd className="font-mono text-text-primary">
                {formData.forceMode === 'Normal' ? `${formData.normalForcePresetN} N` : `${formData.customForceN} N`}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted text-[10px]">Durasi Tekan (Set / Aktual)</dt>
              <dd className="font-mono text-text-primary">
                {formData.holdingTimeS} s {displayActualDuration ? `/ ${displayActualDuration} s` : ''}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted text-[10px]">Tinggi / Stroke</dt>
              <dd className="font-mono text-text-primary">{formData.bottleHeightMm} mm / {formData.strokeMm} mm</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[10px]">Bobot Awal / Akhir</dt>
              <dd className="font-mono text-text-primary">{displayInitialWeight || '—'} g / {displayFinalWeight || '—'} g</dd>
            </div>
            {isAerosol && (
              <div>
                <dt className="text-text-muted text-[10px]">Tekanan Awal / Akhir</dt>
                <dd className="font-mono text-text-primary">{displayInitialPressure || '—'} bar / {displayFinalPressure || '—'} bar</dd>
              </div>
            )}
            <div className="col-span-2">
              <dt className="text-text-muted text-[10px]">Sasaran Observasi</dt>
              <dd className="text-text-secondary mt-0.5">
                {formData.observationObjectives.length > 0 ? formData.observationObjectives.join(', ') : '—'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-border-default flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToKp}
          className="btn btn-secondary !min-h-[30px] px-3.5 text-xs font-medium"
        >
          &larr; Kembali ke Detail Kode Pengujian
        </button>

        <div className="flex items-center gap-2.5">
          {/* Add Replication button - disabled per client audit requirements */}
          <div className="relative group">
            <button
              type="button"
              disabled
              className="btn btn-secondary !min-h-[30px] px-3 text-xs font-medium opacity-50 cursor-not-allowed"
            >
              + Tambah Repetisi (Add Replication)
            </button>
            <div className="hidden group-hover:block absolute bottom-full right-0 mb-1.5 w-64 p-2 bg-text-primary text-surface text-[10px] rounded shadow-md z-10">
              Menunggu klarifikasi Paragon: apakah repetisi menjalankan TestRun baru pada sampel fisik yang sama, atau membuat sampel fisik baru beserta TestRun baru.
            </div>
          </div>

          <button
            type="button"
            onClick={onDownloadCsv}
            className="btn btn-primary !min-h-[30px] px-4 text-xs font-semibold"
          >
            Unduh Hasil (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}
