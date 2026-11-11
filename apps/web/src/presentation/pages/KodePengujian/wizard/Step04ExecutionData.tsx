import React from 'react';
import type { WizardFormData } from './types';
import { computeLiveOperationalMetrics } from './types';
import { FormSection } from '../../../components/ui/FormSection';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { Status } from '../../../components/ui/Status';
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
  const hasBaseline = Boolean(captureSession?.realSideBaseline);

  const analysisDraft = testRun.analysisDraft;
  const finalReport = testRun.finalReport;
  const hasAnalysis = Boolean(analysisDraft || finalReport);
  const primaryId = analysisDraft?.primaryCaptureMomentId;
  const autoResult = primaryId && analysisDraft?.sideAutomaticAnalysis ? analysisDraft.sideAutomaticAnalysis[primaryId] : undefined;
  const autoMeasurements = autoResult?.measurements;
  const draftSprayLength = autoMeasurements?.sprayLength?.auto;
  const draftSprayAngle = autoMeasurements?.sprayAngle?.auto;

  return (
    <div className="space-y-6">
      <div className="bg-surface-subtle/40 border border-border-subtle rounded-md p-3.5 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-bold text-text-primary">
            04. Eksekusi Pengujian & Data Lapangan
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Lakukan akuisisi kamera, catat pembacaan sensor mesin & data fisik botol, dan tinjau hasil analisis CV.
          </p>
        </div>
        <Status tone="info">Langkah 4 dari 5</Status>
      </div>

      {/* Sub-phase 04A: Kamera & Video Capture */}
      <div className="border border-border-default bg-surface rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <span>04A. Akuisisi Kamera & Video (Capture)</span>
              <span className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                SYSTEM / HARDWARE
              </span>
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Status rekaman video kecepatan tinggi dan frame sinkron Side Camera
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCapture}
            className="btn btn-primary !min-h-[30px] px-3.5 text-xs font-medium"
            id="btn-buka-capture"
          >
            {hasCapture ? 'Ulangi / Buka Studio Capture' : 'Buka Studio Pengambilan Data (Capture)'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-2.5 rounded bg-surface-subtle/50 border border-border-subtle">
            <div className="text-[11px] text-text-muted">Status Tangkapan</div>
            <div className="font-semibold text-xs text-text-primary mt-1 flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  hasCapture ? 'bg-semantic-success' : 'bg-semantic-warning'
                }`}
              />
              {hasCapture ? `${frameCount} Frame Tersimpan` : 'Belum Ada Frame'}
            </div>
          </div>

          <div className="p-2.5 rounded bg-surface-subtle/50 border border-border-subtle">
            <div className="text-[11px] text-text-muted">Mode Kamera</div>
            <div className="font-semibold text-xs text-text-primary mt-1 font-mono">
              {captureSession?.captureMode === 'real' ? 'Real Hardware Stream' : 'Simulation Fixture'}
            </div>
          </div>

          <div className="p-2.5 rounded bg-surface-subtle/50 border border-border-subtle">
            <div className="text-[11px] text-text-muted">Baseline Pra-Spray</div>
            <div className="font-semibold text-xs text-text-primary mt-1">
              {hasBaseline ? (
                <span className="text-semantic-success font-medium">Terverifikasi</span>
              ) : (
                <span className="text-text-muted">Auto / Menunggu Sesi</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-phase 04B: Data Aktual Mesin & Pengukuran Fisik */}
      <FormSection
        title="04B. Data Aktual Mesin & Pengukuran Fisik"
        description="Catat nilai aktual dari pembacaan timbangan analitik, manometer tekanan, dan pengamatan kebocoran"
      >
        {isAerosol && (
          <>
            <FormField
              label="Tekanan Awal (bar)"
              hint={
                <span className="inline-flex items-center gap-1">
                  <span className="font-mono text-[10px] bg-surface-subtle text-text-muted px-1 rounded">MANUAL / SENSOR</span>
                  <span>Tekanan sebelum semprot</span>
                </span>
              }
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
              hint={
                <span className="inline-flex items-center gap-1">
                  <span className="font-mono text-[10px] bg-surface-subtle text-text-muted px-1 rounded">MANUAL / SENSOR</span>
                  <span>Tekanan sesudah semprot</span>
                </span>
              }
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
          hint={
            <span className="inline-flex items-center gap-1">
              <span className="font-mono text-[10px] bg-surface-subtle text-text-muted px-1 rounded">MANUAL / TIMBANGAN</span>
              <span>Berat sebelum semprot</span>
            </span>
          }
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
          hint={
            <span className="inline-flex items-center gap-1">
              <span className="font-mono text-[10px] bg-surface-subtle text-text-muted px-1 rounded">MANUAL / TIMBANGAN</span>
              <span>Berat sesudah semprot</span>
            </span>
          }
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
          hint={
            <span className="inline-flex items-center gap-1">
              <span className="font-mono text-[10px] bg-surface-subtle text-text-muted px-1 rounded">HARDWARE</span>
              <span>Waktu riil aktuator menekan</span>
            </span>
          }
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
          hint={
            <span className="inline-flex items-center gap-1">
              <span className="font-mono text-[10px] bg-surface-subtle text-text-muted px-1 rounded">MANUAL — integrasi hardware pending</span>
              <span>Satuan menunggu konfirmasi Paragon</span>
            </span>
          }
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
            <span className="inline-flex items-center gap-1">
              <span className="font-mono text-[10px] bg-surface-subtle text-text-muted px-1 rounded">MANUAL</span>
              <span>Sesuai form client (Ya / Tidak)</span>
            </span>
          }
          required
        >
          <Select
            value={formData.leakage}
            onChange={(e) => onChange({ leakage: e.target.value as LeakageStatus })}
            disabled={isReadOnly}
          >
            <option value="">-- Pilih Status Kebocoran --</option>
            <option value="Tidak">Tidak (Tidak ada kebocoran)</option>
            <option value="Ya">Ya (Terdapat kebocoran)</option>
          </Select>
        </FormField>

        <FormField
          label="Waktu Pengeringan (s)"
          hint={
            <span className="inline-flex items-center gap-1">
              <span className="font-mono text-[10px] bg-surface-subtle text-text-muted px-1 rounded">MANUAL</span>
              <span>Waktu kering pada media uji</span>
            </span>
          }
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
            placeholder="Catatan visual tambahan selama spray berlangsung..."
          />
        </FormField>
      </FormSection>

      {/* Live Operational Metrics Preview */}
      {liveMetrics && (
        <div className="border border-primary/20 bg-primary/5 rounded-md p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center justify-between">
            <span>Kalkulasi Metrik Operasional (Live Derived Metrics)</span>
            <span className="text-[10px] font-mono text-text-muted font-normal">
              Formula Standar Paragon
            </span>
          </div>
          {((liveMetrics.dischargedMassG !== undefined && liveMetrics.dischargedMassG < 0) ||
            (liveMetrics.pressureDropBar !== undefined && liveMetrics.pressureDropBar < 0)) && (
            <div className="bg-semantic-warning/10 border border-semantic-warning/30 rounded p-2 text-xs text-semantic-warning flex items-center gap-2">
              <span className="font-bold">Perhatian:</span>
              <span>Terdeteksi nilai negatif (kemungkinan drift tare atau anomali sensor). Nilai bertanda negatif dipertahankan sesuai formula analitik.</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-surface p-3 rounded border border-border-subtle">
              <div className="text-[11px] text-text-muted">Discharged Mass</div>
              <div className="font-mono text-base font-bold text-text-primary mt-1">
                {liveMetrics.dischargedMassG !== undefined ? `${liveMetrics.dischargedMassG.toFixed(3)} g` : '—'}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">Bobot Awal - Bobot Akhir</div>
            </div>

            <div className="bg-surface p-3 rounded border border-border-subtle">
              <div className="text-[11px] text-text-muted">Discharge Rate</div>
              <div className="font-mono text-base font-bold text-text-primary mt-1">
                {liveMetrics.dischargeRateGPerS !== undefined ? `${liveMetrics.dischargeRateGPerS.toFixed(3)} g/s` : '—'}
              </div>
              <div className="text-[10px] text-text-muted mt-0.5">Massa / Durasi Tekan</div>
            </div>

            {isAerosol && (
              <div className="bg-surface p-3 rounded border border-border-subtle">
                <div className="text-[11px] text-text-muted">Pressure Drop</div>
                <div className="font-mono text-base font-bold text-text-primary mt-1">
                  {liveMetrics.pressureDropBar !== undefined ? `${liveMetrics.pressureDropBar.toFixed(2)} bar` : '—'}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Tekanan Awal - Tekanan Akhir</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-phase 04C: Analisis Kamera CV */}
      <div className="border border-border-default bg-surface rounded-md p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-2">
              <span>04C. Analisis Citra Komputer (Computer Vision)</span>
              <span className="font-mono text-[10px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded font-semibold">
                AI / COMPUTER VISION
              </span>
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Deteksi geometri spray otomatis, koreksi manual operator, dan verifikasi frame
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenAnalysis}
            disabled={!hasCapture}
            className={`btn !min-h-[30px] px-3.5 text-xs font-medium ${
              hasCapture ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed'
            }`}
            id="btn-buka-analisis"
          >
            {hasAnalysis ? 'Tinjau / Buka Workspace Analisis' : 'Buka Ruang Analisis Kamera (CV)'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-2.5 rounded bg-surface-subtle/50 border border-border-subtle">
            <div className="text-[11px] text-text-muted">Status Analisis</div>
            <div className="font-semibold text-xs text-text-primary mt-1">
              {finalReport ? (
                <span className="text-semantic-success font-medium">Finalized</span>
              ) : analysisDraft ? (
                <span className="text-primary font-medium">Draf Analisis Tersimpan</span>
              ) : hasCapture ? (
                <span className="text-semantic-warning font-medium">Siap Dianalisis</span>
              ) : (
                <span className="text-text-muted">Menunggu Capture</span>
              )}
            </div>
          </div>

          <div className="p-2.5 rounded bg-surface-subtle/50 border border-border-subtle">
            <div className="text-[11px] text-text-muted">Panjang Lintasan (Spray Length)</div>
            <div className="font-semibold text-xs text-text-primary mt-1 font-mono">
              {finalReport?.side?.sprayLength?.final !== undefined
                ? `${finalReport.side.sprayLength.final.toFixed(1)} mm`
                : draftSprayLength !== undefined
                ? `${draftSprayLength.toFixed(1)} mm (auto)`
                : '—'}
            </div>
          </div>

          <div className="p-2.5 rounded bg-surface-subtle/50 border border-border-subtle">
            <div className="text-[11px] text-text-muted">Sudut Semprot (Spray Angle)</div>
            <div className="font-semibold text-xs text-text-primary mt-1 font-mono">
              {finalReport?.side?.sprayAngle?.final !== undefined
                ? `${finalReport.side.sprayAngle.final.toFixed(1)}°`
                : draftSprayAngle !== undefined
                ? `${draftSprayAngle.toFixed(1)}° (auto)`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-phase 04D: Tinjauan Pengukuran Gabungan (Review Measurement) */}
      <div className="border border-border-default bg-surface rounded-md p-4 space-y-3">
        <div className="border-b border-border-subtle pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            04D. Tinjauan Data Gabungan (Measurement Review)
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Perbandingan metrik CV otomatis, penyesuaian operator, dan pembacaan fisik sebelum finalisasi
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-border-subtle">
            <thead>
              <tr className="bg-surface-subtle border-b border-border-subtle text-text-secondary">
                <th className="py-2 px-3 text-left font-semibold">Parameter / Metrik</th>
                <th className="py-2 px-3 text-left font-semibold">Sumber Data</th>
                <th className="py-2 px-3 text-right font-semibold">Nilai Terukur</th>
                <th className="py-2 px-3 text-center font-semibold">Status / Verifikasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle font-mono">
              <tr>
                <td className="py-2 px-3 font-sans text-text-primary font-medium">Panjang Lintasan (Spray Length)</td>
                <td className="py-2 px-3 text-text-muted font-sans">Side Camera (CV)</td>
                <td className="py-2 px-3 text-right font-bold">
                  {finalReport?.side?.sprayLength?.final ?? draftSprayLength ?? '—'} mm
                </td>
                <td className="py-2 px-3 text-center font-sans">
                  {finalReport?.side?.sprayLength?.adjusted ? (
                    <span className="text-[10px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded">Disesuaikan Operator</span>
                  ) : finalReport ? (
                    <span className="text-[10px] bg-semantic-success/10 text-semantic-success px-1.5 py-0.5 rounded">Otomatis Terverifikasi</span>
                  ) : (
                    <span className="text-[10px] text-text-muted">Draft</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans text-text-primary font-medium">Sudut Semprot (Spray Angle)</td>
                <td className="py-2 px-3 text-text-muted font-sans">Side Camera (CV)</td>
                <td className="py-2 px-3 text-right font-bold">
                  {finalReport?.side?.sprayAngle?.final ?? draftSprayAngle ?? '—'}°
                </td>
                <td className="py-2 px-3 text-center font-sans">
                  {finalReport?.side?.sprayAngle?.adjusted ? (
                    <span className="text-[10px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded">Disesuaikan Operator</span>
                  ) : finalReport ? (
                    <span className="text-[10px] bg-semantic-success/10 text-semantic-success px-1.5 py-0.5 rounded">Otomatis Terverifikasi</span>
                  ) : (
                    <span className="text-[10px] text-text-muted">Draft</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans text-text-primary font-medium">Discharged Mass</td>
                <td className="py-2 px-3 text-text-muted font-sans">Timbangan Lapangan</td>
                <td className="py-2 px-3 text-right font-bold">
                  {liveMetrics?.dischargedMassG !== undefined ? `${liveMetrics.dischargedMassG.toFixed(3)} g` : '—'}
                </td>
                <td className="py-2 px-3 text-center font-sans">
                  {liveMetrics?.dischargedMassG !== undefined ? (
                    <span className="text-[10px] bg-semantic-success/10 text-semantic-success px-1.5 py-0.5 rounded">Terkalkulasi</span>
                  ) : (
                    <span className="text-[10px] text-text-muted">Menunggu Bobot</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans text-text-primary font-medium">Discharge Rate</td>
                <td className="py-2 px-3 text-text-muted font-sans">Turunan Massa / Waktu</td>
                <td className="py-2 px-3 text-right font-bold">
                  {liveMetrics?.dischargeRateGPerS !== undefined ? `${liveMetrics.dischargeRateGPerS.toFixed(3)} g/s` : '—'}
                </td>
                <td className="py-2 px-3 text-center font-sans">
                  {liveMetrics?.dischargeRateGPerS !== undefined ? (
                    <span className="text-[10px] bg-semantic-success/10 text-semantic-success px-1.5 py-0.5 rounded">Terkalkulasi</span>
                  ) : (
                    <span className="text-[10px] text-text-muted">Menunggu Durasi</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-3 font-sans text-text-primary font-medium">Status Kebocoran</td>
                <td className="py-2 px-3 text-text-muted font-sans">Observasi Visual Operator</td>
                <td className="py-2 px-3 text-right font-bold font-sans">
                  {formData.leakage || '—'}
                </td>
                <td className="py-2 px-3 text-center font-sans">
                  {formData.leakage === 'Tidak' ? (
                    <span className="text-[10px] bg-semantic-success/10 text-semantic-success px-1.5 py-0.5 rounded">Aman (Tidak Bocor)</span>
                  ) : formData.leakage === 'Ya' ? (
                    <span className="text-[10px] bg-semantic-danger/10 text-semantic-danger px-1.5 py-0.5 rounded">Terdeteksi Bocor</span>
                  ) : (
                    <span className="text-[10px] text-text-muted">Belum Diisi</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
