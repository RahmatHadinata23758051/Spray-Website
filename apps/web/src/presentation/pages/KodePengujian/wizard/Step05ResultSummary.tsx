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
  const rawReportMetrics = testRun.finalReport?.operationalMetrics as Record<string, unknown> | undefined;
  const derivedReportMetrics =
    (rawReportMetrics?.derived as OperationalDerivedMetrics | undefined) ??
    (rawReportMetrics && 'dischargedMassG' in rawReportMetrics
      ? (rawReportMetrics as unknown as OperationalDerivedMetrics)
      : undefined);

  const operationalMetrics =
    derivedReportMetrics ??
    testRun.operationalDerivedMetrics ??
    computeLiveOperationalMetrics(formData);
  const finalReport = testRun.finalReport;
  const isFinalized = testRun.status === 'FINALIZED';

  return (
    <div className="space-y-6">
      {/* Banner status */}
      <div className="bg-surface-subtle/40 border border-border-subtle rounded-md p-3.5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-text-primary">
              05. Ringkasan & Hasil Akhir Pengujian
            </h2>
            {isFinalized ? (
              <Status tone="success">Finalized (Terkunci)</Status>
            ) : (
              <Status tone="warning">Draf Belum Difinalisasi</Status>
            )}
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Ringkasan komprehensif data formulasi, spesifikasi kemasan, pengukuran fisik mesin, dan visual CV.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDownloadCsv}
            className="btn btn-secondary !min-h-[30px] px-3 text-xs font-semibold flex items-center gap-1.5"
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

      {/* KPI Cards: Derived Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border border-border-default bg-surface p-4 rounded-md">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Discharged Mass
          </div>
          <div className="font-mono text-2xl font-bold text-primary mt-1">
            {operationalMetrics?.dischargedMassG !== undefined
              ? `${operationalMetrics.dischargedMassG.toFixed(3)} g`
              : '—'}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            Massa formula tersemprot
          </div>
        </div>

        <div className="border border-border-default bg-surface p-4 rounded-md">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Discharge Rate
          </div>
          <div className="font-mono text-2xl font-bold text-primary mt-1">
            {operationalMetrics?.dischargeRateGPerS !== undefined
              ? `${operationalMetrics.dischargeRateGPerS.toFixed(3)} g/s`
              : '—'}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            Laju alir per detik
          </div>
        </div>

        {isAerosol ? (
          <div className="border border-border-default bg-surface p-4 rounded-md">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Pressure Drop
            </div>
            <div className="font-mono text-2xl font-bold text-primary mt-1">
              {operationalMetrics?.pressureDropBar !== undefined
                ? `${operationalMetrics.pressureDropBar.toFixed(2)} bar`
                : '—'}
            </div>
            <div className="text-[11px] text-text-muted mt-1">
              Penurunan tekanan kanister
            </div>
          </div>
        ) : (
          <div className="border border-border-default bg-surface p-4 rounded-md">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Status Kebocoran
            </div>
            <div className="font-mono text-2xl font-bold mt-1">
              {formData.leakage === 'Tidak' ? (
                <span className="text-semantic-success">Aman (Tidak)</span>
              ) : formData.leakage === 'Ya' ? (
                <span className="text-semantic-danger">Bocor (Ya)</span>
              ) : (
                '—'
              )}
            </div>
            <div className="text-[11px] text-text-muted mt-1">
              Observasi fisik seal & pump
            </div>
          </div>
        )}

        <div className="border border-border-default bg-surface p-4 rounded-md">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Spray Length (CV)
          </div>
          <div className="font-mono text-2xl font-bold text-text-primary mt-1">
            {finalReport?.side?.sprayLength?.final !== undefined
              ? `${finalReport.side.sprayLength.final.toFixed(1)} mm`
              : '—'}
          </div>
          <div className="text-[11px] text-text-muted mt-1">
            Panjang semprotan Side Camera
          </div>
        </div>
      </div>

      {/* Summary Data Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Identitas Produk & Studi */}
        <div className="border border-border-default bg-surface rounded-md p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary border-b border-border-subtle pb-2">
            Identitas Produk & Parameter Studi
          </h3>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div>
              <dt className="text-text-muted text-[11px]">Nama Produk</dt>
              <dd className="font-semibold text-text-primary">{formData.productName}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[11px]">No. Formula</dt>
              <dd className="font-mono font-medium text-text-primary">{formData.formulaNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[11px]">No. Batch / Lot</dt>
              <dd className="font-mono font-medium text-text-primary">{formData.lotNumber || '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[11px]">KUF</dt>
              <dd className="font-mono font-medium text-text-primary">{formData.kuf || '—'}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[11px]">Jenis Trial</dt>
              <dd className="font-semibold text-text-primary">{formData.trialType}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[11px]">Tanggal Pengambilan</dt>
              <dd className="font-mono text-text-primary">{formData.acquisitionDate}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-text-muted text-[11px]">Tujuan Trial</dt>
              <dd className="text-text-secondary">{formData.trialObjective || '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Konfigurasi Kemasan & Kondisi */}
        <div className="border border-border-default bg-surface rounded-md p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary border-b border-border-subtle pb-2">
            Spesifikasi Kemasan & Kondisi Botol
          </h3>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div>
              <dt className="text-text-muted text-[11px]">Tipe Kemasan</dt>
              <dd className="font-semibold text-text-primary">{formData.deviceType}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[11px]">Pola Penggunaan</dt>
              <dd className="text-text-primary">{formData.usagePattern}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[11px]">Posisi Penyimpanan</dt>
              <dd className="text-text-primary">{formData.storagePosition}</dd>
            </div>
            <div>
              <dt className="text-text-muted text-[11px]">Kondisi Penyimpanan</dt>
              <dd className="text-text-primary">{formData.storageCondition}</dd>
            </div>
            {isAerosol ? (
              <>
                <div>
                  <dt className="text-text-muted text-[11px]">Kode Aktuator / Kaleng</dt>
                  <dd className="font-mono text-text-primary">
                    {formData.aerosolSpec.actuatorCode || '—'} / {formData.aerosolSpec.canBottleCode || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted text-[11px]">Gas & Rasio</dt>
                  <dd className="font-mono text-text-primary">
                    {formData.aerosolSpec.gasType || '—'} ({formData.aerosolSpec.gasRatio || '—'})
                  </dd>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt className="text-text-muted text-[11px]">Kode Botol</dt>
                  <dd className="font-mono text-text-primary">{formData.nonAerosolSpec.bottleCode || '—'}</dd>
                </div>
                <div>
                  <dt className="text-text-muted text-[11px]">Kode Pump</dt>
                  <dd className="font-mono text-text-primary">{formData.nonAerosolSpec.pumpCode || '—'}</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        {/* Setpoints Mesin */}
        <div className="border border-border-default bg-surface rounded-md p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary border-b border-border-subtle pb-2">
            Setpoints & Geometri Mesin
          </h3>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs font-mono">
            <div>
              <dt className="font-sans text-text-muted text-[11px]">Mode Gaya Tekan</dt>
              <dd className="font-bold text-text-primary">
                {formData.forceMode === 'Normal'
                  ? `${formData.normalForcePresetN} N (Normal)`
                  : `${formData.customForceN} N (Tidak Normal)`}
              </dd>
            </div>
            <div>
              <dt className="font-sans text-text-muted text-[11px]">Durasi Tekan / Holding Time</dt>
              <dd className="text-text-primary">{formData.holdingTimeS} s</dd>
            </div>
            <div>
              <dt className="font-sans text-text-muted text-[11px]">Tinggi Botol</dt>
              <dd className="text-text-primary">{formData.bottleHeightMm} mm</dd>
            </div>
            <div>
              <dt className="font-sans text-text-muted text-[11px]">Setting Stroke</dt>
              <dd className="text-text-primary">{formData.strokeMm} mm</dd>
            </div>
          </dl>
        </div>

        {/* Data Aktual Mesin & Kebocoran */}
        <div className="border border-border-default bg-surface rounded-md p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary border-b border-border-subtle pb-2">
            Data Aktual Mesin & Pengamatan Lapangan
          </h3>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs font-mono">
            <div>
              <dt className="font-sans text-text-muted text-[11px]">Bobot Awal / Akhir Bruto</dt>
              <dd className="text-text-primary">
                {formData.initialGrossWeightG || '—'} g / {formData.finalGrossWeightG || '—'} g
              </dd>
            </div>
            <div>
              <dt className="font-sans text-text-muted text-[11px]">Durasi Tekan Aktual</dt>
              <dd className="text-text-primary">{formData.actualPressDurationS ? `${formData.actualPressDurationS} s` : '—'}</dd>
            </div>
            {isAerosol && (
              <div>
                <dt className="font-sans text-text-muted text-[11px]">Tekanan Awal / Sesudah</dt>
                <dd className="text-text-primary">
                  {formData.initialPressureBar || '—'} bar / {formData.finalPressureBar || '—'} bar
                </dd>
              </div>
            )}
            <div>
              <dt className="font-sans text-text-muted text-[11px]">Kebocoran</dt>
              <dd className="font-sans font-semibold">
                {formData.leakage === 'Tidak' ? (
                  <span className="text-semantic-success">Tidak</span>
                ) : formData.leakage === 'Ya' ? (
                  <span className="text-semantic-danger">Ya</span>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="font-sans text-text-muted text-[11px]">Sasaran Observasi Terpilih</dt>
              <dd className="font-sans text-text-secondary mt-0.5">
                {formData.observationObjectives.length > 0
                  ? formData.observationObjectives.join(', ')
                  : 'Tidak ada sasaran khusus'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-border-default flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToKp}
          className="btn btn-secondary !min-h-[32px] px-4 text-xs font-medium"
        >
          &larr; Kembali ke Detail Kode Pengujian
        </button>

        <div className="flex items-center gap-3">
          {/* Add Replication button - disabled per client audit requirements */}
          <div className="relative group">
            <button
              type="button"
              disabled
              className="btn btn-secondary !min-h-[32px] px-3.5 text-xs font-medium opacity-50 cursor-not-allowed"
            >
              + Tambah Repetisi (Add Replication)
            </button>
            <div className="hidden group-hover:block absolute bottom-full right-0 mb-1.5 w-64 p-2 bg-text-primary text-surface text-[10px] rounded shadow-md z-10">
              [Belum Aktif - Menunggu Klarifikasi Semantik Paragon: Apakah membuat baris repetisi baru pada sampel yang sama atau test run baru]
            </div>
          </div>

          <button
            type="button"
            onClick={onDownloadCsv}
            className="btn btn-primary !min-h-[32px] px-4 text-xs font-semibold"
          >
            Unduh Hasil (CSV)
          </button>
        </div>
      </div>
    </div>
  );
}
