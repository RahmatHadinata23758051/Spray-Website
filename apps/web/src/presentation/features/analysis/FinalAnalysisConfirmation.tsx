import React from 'react';
import type { Camera as CameraType } from '@spray-paragon/domain';
import type { SideFinalMeasurements, FrontFinalMeasurements, CalibrationSnapshot, FinalAnalysisReport } from '@spray-paragon/domain';
import type { SynchronizedAnalysisFrame } from '@spray-paragon/domain';
import { selectMeasurementValue } from '@spray-paragon/domain';
import { fmt } from '../../utils/formatters';
import { hasAdjustedMeasurement } from './utils';

export function FinalAnalysisConfirmation({ 
  status, 
  selectedCount, 
  primaryMoment, 
  sideMeasurements, 
  frontMeasurements, 
  calibrations, 
  finalReport, 
  onConfirm, 
  onViewResult 
}: {
  status: 'captured' | 'review_required' | 'finalized';
  selectedCount: number;
  primaryMoment?: SynchronizedAnalysisFrame;
  sideMeasurements?: SideFinalMeasurements;
  frontMeasurements?: FrontFinalMeasurements;
  calibrations: Record<CameraType, CalibrationSnapshot>;
  finalReport: FinalAnalysisReport | null;
  onConfirm: () => void;
  onViewResult: () => void;
}) {
  const canConfirm = Boolean(primaryMoment && sideMeasurements && frontMeasurements);
  const statusLabel = status === 'finalized' ? 'Final' : status === 'review_required' ? 'Perlu Ditinjau' : 'Tercatat';

  return (
    <section className="inspector-section space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
        <h3 className="inspector-header !mb-0">Finalisasi Analisis</h3>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${status === 'finalized' ? 'bg-semantic-success-soft text-semantic-success' : 'bg-primary-soft text-primary'}`}>{statusLabel}</span>
      </div>
      <div className="space-y-4 pt-1">
        <p className="text-xs text-text-secondary leading-relaxed">Konfirmasi operator diperlukan sebelum analisis ini difinalisasi.</p>
        {!primaryMoment && <p className="text-xs font-semibold text-semantic-warning bg-semantic-warning-soft p-2.5 rounded-md">Pilih tepat satu Momen Tangkapan Utama sebelum konfirmasi.</p>}
        {primaryMoment && sideMeasurements && frontMeasurements && (
          <dl className="space-y-1.5 text-xs bg-surface-subtle p-3 rounded-lg border border-border-subtle">
            <div className="flex justify-between"><dt className="text-text-muted">Tangkapan Utama</dt><dd className="font-mono font-bold text-text-primary">#{String(primaryMoment.frameIndex).padStart(3, '0')} · {primaryMoment.timestampMs} ms</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Tangkapan Dipilih</dt><dd className="font-semibold text-text-primary">{selectedCount} / 10</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Kamera Samping akhir</dt><dd className="font-mono font-semibold text-text-primary">{fmt.cm(selectMeasurementValue(sideMeasurements.sprayLength))} · {fmt.deg(selectMeasurementValue(sideMeasurements.sprayAngle))} · {fmt.mm(selectMeasurementValue(sideMeasurements.verticalSpread))}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Kamera Depan akhir</dt><dd className="font-mono font-semibold text-text-primary">{fmt.area(selectMeasurementValue(frontMeasurements.sprayArea))} · Ø {fmt.mm(selectMeasurementValue(frontMeasurements.equivalentDiameter))} · {selectMeasurementValue(frontMeasurements.circularity).toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Kalibrasi Samping</dt><dd className="text-text-secondary">{calibrations.side.adjusted ? `Disesuaikan oleh ${calibrations.side.adjustedBy}` : 'Terkalibrasi'}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Kalibrasi Depan</dt><dd className="text-text-secondary">{calibrations.front.adjusted ? `Disesuaikan oleh ${calibrations.front.adjustedBy}` : 'Terkalibrasi'}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Pengukuran Samping</dt><dd className="text-text-secondary">{hasAdjustedMeasurement(sideMeasurements) ? 'Penyesuaian manual' : 'Otomatis diterima'}</dd></div>
            <div className="flex justify-between"><dt className="text-text-muted">Pengukuran Depan</dt><dd className="text-text-secondary">{hasAdjustedMeasurement(frontMeasurements) ? 'Penyesuaian manual' : 'Otomatis diterima'}</dd></div>
          </dl>
        )}
        <button 
          type="button" 
          aria-label="Finalisasi Analisis"
          className="btn btn-primary w-full shadow-sm" 
          onClick={onConfirm} 
          disabled={!canConfirm || status === 'finalized'}
        >
          Finalisasi Analisis
        </button>
        {finalReport && (
          <div className="pt-2 space-y-2 border-t border-border-subtle">
            <p className="text-[11px] text-text-muted">Laporan final tersimpan: <strong className="font-mono text-text-primary">{finalReport.primaryCaptureMomentId}</strong></p>
            <button type="button" className="btn btn-secondary w-full" onClick={onViewResult}>Lihat Hasil &rarr;</button>
          </div>
        )}
      </div>
    </section>
  );
}
