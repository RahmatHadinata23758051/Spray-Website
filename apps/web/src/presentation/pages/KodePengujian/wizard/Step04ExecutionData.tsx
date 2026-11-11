import React from 'react';
import type { WizardFormData } from './types';
import { computeLiveOperationalMetrics } from './types';
import { FormSection } from '../../../components/ui/FormSection';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import type { TestRun, LeakageStatus } from '@spray-paragon/domain';

interface Step04ExecutionDataProps {
  formData: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
  testRun: TestRun;
  kpId?: string;
  sampleId?: string;
  isReadOnly?: boolean;
  onOpenCapture: () => void;
  onOpenAnalysis: () => void;
}

export function Step04ExecutionData({
  formData,
  onChange,
  testRun,
  kpId: _kpId,
  sampleId: _sampleId,
  isReadOnly = false,
  onOpenCapture,
  onOpenAnalysis,
}: Step04ExecutionDataProps) {
  const isAerosol = formData.deviceType === 'Aerosol';
  const liveMetrics = computeLiveOperationalMetrics(formData);

  const captureSession = testRun.captureSession;
  const hasCapture = Boolean(
    (captureSession?.realSideFrames && captureSession.realSideFrames.length > 0) ||
      (captureSession?.synchronizedMoments && captureSession.synchronizedMoments.length > 0)
  );
  const frameCount =
    captureSession?.realSideFrames?.length ??
    captureSession?.synchronizedMoments?.length ??
    0;
  const analysisDraft = testRun.analysisDraft;
  const finalReport = testRun.finalReport;
  const hasAnalysis = Boolean(analysisDraft || finalReport);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold text-text-primary">
          04. Eksekusi Pengujian & Data Lapangan
        </h2>
      </div>

      {/* A. Capture Kamera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface border border-border-default rounded-md">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-text-primary">Capture Kamera</div>
          <div className="text-xs text-text-secondary mt-0.5 flex items-center gap-1.5 font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                hasCapture ? 'bg-semantic-success' : 'bg-semantic-warning'
              }`}
            />
            <span>{hasCapture ? `${frameCount} frame • video tersimpan` : 'Status: Belum ada data'}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCapture}
          className="btn btn-primary !min-h-[30px] px-3.5 text-xs font-semibold self-start sm:self-auto"
          id="btn-buka-capture"
        >
          {hasCapture ? 'Ulangi / Buka Capture' : 'Buka Capture'}
        </button>
      </div>

      {/* B. Data Aktual Mesin & Fisik */}
      <FormSection title="Data Aktual">
        {isAerosol && (
          <>
            <FormField
              label="Tekanan Awal (bar)"
              hint={<span className="text-[10px] text-text-muted">MANUAL — input manometer</span>}
            >
              <Input
                type="number"
                step="0.01"
                value={formData.initialPressureBar}
                onChange={(e) => onChange({ initialPressureBar: e.target.value })}
                disabled={isReadOnly}
                placeholder="Contoh: 4.5"
                mono
              />
            </FormField>

            <FormField
              label="Tekanan Setelah (bar)"
              hint={<span className="text-[10px] text-text-muted">MANUAL — input manometer</span>}
            >
              <Input
                type="number"
                step="0.01"
                value={formData.finalPressureBar}
                onChange={(e) => onChange({ finalPressureBar: e.target.value })}
                disabled={isReadOnly}
                placeholder="Contoh: 4.2"
                mono
              />
            </FormField>
          </>
        )}

        <FormField
          label="Bobot Awal Bruto (g)"
          hint={<span className="text-[10px] text-text-muted">MANUAL — input timbangan</span>}
          required
        >
          <Input
            type="number"
            step="0.01"
            value={formData.initialGrossWeightG}
            onChange={(e) => onChange({ initialGrossWeightG: e.target.value })}
            disabled={isReadOnly}
            placeholder="Contoh: 120.45"
            mono
          />
        </FormField>

        <FormField
          label="Bobot Akhir Bruto (g)"
          hint={<span className="text-[10px] text-text-muted">MANUAL — input timbangan</span>}
          required
        >
          <Input
            type="number"
            step="0.01"
            value={formData.finalGrossWeightG}
            onChange={(e) => onChange({ finalGrossWeightG: e.target.value })}
            disabled={isReadOnly}
            placeholder="Contoh: 120.25"
            mono
          />
        </FormField>

        <FormField
          label="Durasi Tekan Aktual (s)"
          hint={<span className="text-[10px] text-text-muted">MANUAL — integrasi hardware pending</span>}
          required
        >
          <Input
            type="number"
            step="0.01"
            value={formData.actualPressDurationS}
            onChange={(e) => onChange({ actualPressDurationS: e.target.value })}
            disabled={isReadOnly}
            placeholder="Contoh: 1.02"
            mono
          />
        </FormField>

        <FormField
          label="Kedalaman Stroke Aktual"
          hint={<span className="text-[10px] text-text-muted">MANUAL — integrasi hardware pending</span>}
        >
          <Input
            type="number"
            step="0.1"
            value={formData.actualStrokeDepth}
            onChange={(e) => onChange({ actualStrokeDepth: e.target.value })}
            disabled={isReadOnly}
            placeholder="Contoh: 10.0"
            mono
          />
        </FormField>

        <FormField
          label="Kebocoran"
          hint={
            formData.leakage === 'Tidak' ? (
              <span className="text-[10px] text-semantic-success font-medium">Aman (Tidak Bocor)</span>
            ) : formData.leakage === 'Ya' ? (
              <span className="text-[10px] text-semantic-danger font-medium">Terdeteksi Bocor</span>
            ) : (
              <span className="text-[10px] text-text-muted">MANUAL</span>
            )
          }
          required
        >
          <Select
            value={formData.leakage}
            onChange={(e) => onChange({ leakage: e.target.value as LeakageStatus })}
            disabled={isReadOnly}
          >
            <option value="">-- Pilih Status Kebocoran --</option>
            <option value="Tidak">Tidak</option>
            <option value="Ya">Ya</option>
          </Select>
        </FormField>

        <FormField
          label="Waktu Pengeringan (s)"
          hint={<span className="text-[10px] text-text-muted">MANUAL</span>}
        >
          <Input
            type="number"
            step="0.1"
            value={formData.dryingTimeS}
            onChange={(e) => onChange({ dryingTimeS: e.target.value })}
            disabled={isReadOnly}
            placeholder="Contoh: 15.0"
            mono
          />
        </FormField>

        <FormField
          label="Catatan Pengamatan"
          className="md:col-span-2 lg:col-span-3"
        >
          <Textarea
            rows={2}
            value={formData.observationNotes}
            onChange={(e) => onChange({ observationNotes: e.target.value })}
            disabled={isReadOnly}
            placeholder="Catatan visual atau anomali pengujian..."
          />
        </FormField>
      </FormSection>

      {/* C. Analisis Kamera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface border border-border-default rounded-md">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-text-primary">Analisis Kamera</div>
          <div className="text-xs text-text-secondary mt-0.5 flex items-center gap-1.5 font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                finalReport ? 'bg-semantic-success' : hasAnalysis ? 'bg-primary' : 'bg-text-muted'
              }`}
            />
            <span>
              {finalReport
                ? 'Finalized'
                : analysisDraft
                ? 'Review diperlukan'
                : hasCapture
                ? 'Siap dianalisis'
                : 'Belum dianalisis'}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenAnalysis}
          disabled={!hasCapture}
          className={`btn !min-h-[30px] px-3.5 text-xs font-semibold self-start sm:self-auto ${
            hasCapture ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'
          }`}
          id="btn-buka-analisis"
        >
          {hasAnalysis ? 'Tinjau Analisis' : 'Buka Analisis'}
        </button>
      </div>

      {/* D. Operational Metrics (Compact Technical Readout) */}
      {liveMetrics && (
        <div className="p-3 bg-surface border border-border-default rounded-md space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-text-primary border-b border-border-subtle pb-1.5 flex items-center justify-between">
            <span>Metrik Operasional</span>
            <span className="text-[10px] font-mono text-text-muted">Live Kalkulasi</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono">
            <div className="flex items-center justify-between p-2 bg-surface-subtle/50 rounded border border-border-subtle">
              <span className="font-sans text-xs text-text-muted">Discharged Mass</span>
              <span className="text-sm font-bold text-text-primary">
                {liveMetrics.dischargedMassG !== undefined ? `${liveMetrics.dischargedMassG.toFixed(3)} g` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-surface-subtle/50 rounded border border-border-subtle">
              <span className="font-sans text-xs text-text-muted">Discharge Rate</span>
              <span className="text-sm font-bold text-text-primary">
                {liveMetrics.dischargeRateGPerS !== undefined ? `${liveMetrics.dischargeRateGPerS.toFixed(3)} g/s` : '—'}
              </span>
            </div>
            {isAerosol && (
              <div className="flex items-center justify-between p-2 bg-surface-subtle/50 rounded border border-border-subtle">
                <span className="font-sans text-xs text-text-muted">Pressure Drop</span>
                <span className="text-sm font-bold text-text-primary">
                  {liveMetrics.pressureDropBar !== undefined ? `${liveMetrics.pressureDropBar.toFixed(2)} bar` : '—'}
                </span>
              </div>
            )}
          </div>
          {((liveMetrics.dischargedMassG !== undefined && liveMetrics.dischargedMassG < 0) ||
            (liveMetrics.pressureDropBar !== undefined && liveMetrics.pressureDropBar < 0)) && (
            <div className="p-2 rounded bg-semantic-warning/10 border border-semantic-warning/20 text-[11px] text-semantic-warning font-sans flex items-center gap-1.5">
              <span className="font-bold">Anomali:</span>
              <span>Terdeteksi nilai negatif (kemungkinan drift tare atau penurunan tekanan). Nilai bertanda tetap dipertahankan.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
