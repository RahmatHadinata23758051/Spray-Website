import React from 'react';
import type { SelectedCaptureMoment } from '@spray-paragon/domain';
import type { SynchronizedAnalysisFrame } from '@spray-paragon/domain';
import { simulationService } from '../../../application/services';
const synchronizedFrames = simulationService.getSynchronizedFrames();

export function CaptureSelection({ 
  currentMoment, 
  selectedCaptures, 
  selectionError, 
  onSetPrimary, 
  onAddSupporting, 
  onRemoveSupporting,
  moments: propMoments,
  readOnly = false,
}: {
  currentMoment: SynchronizedAnalysisFrame;
  selectedCaptures: SelectedCaptureMoment[];
  selectionError?: string;
  onSetPrimary: () => void;
  onAddSupporting: () => void;
  onRemoveSupporting: (id: string) => void;
  moments?: SynchronizedAnalysisFrame[];
  readOnly?: boolean;
}) {
  const currentSelection = selectedCaptures.find(item => item.captureFrameId === currentMoment.id);
  const availableMoments = propMoments || synchronizedFrames;
  const selectedDetails = selectedCaptures.map(selection => ({
    selection,
    moment: availableMoments.find(moment => moment.id === selection.captureFrameId),
  })).filter(item => item.moment !== undefined);

  return (
    <section className="inspector-section space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
        <h3 id="capture-selection-title" className="inspector-header !mb-0">Pilihan Laporan</h3>
        <span className="text-xs font-bold text-text-primary">
          <span className="sr-only">Selected Captures {selectedCaptures.length} / 10</span>
          Tangkapan Dipilih {selectedCaptures.length} / 10
        </span>
      </div>
      <div className="space-y-4 pt-1">
        <p className="text-xs text-text-secondary leading-relaxed">Pilih satu momen Samping + Depan sebagai Utama. Tambahkan hingga sembilan momen Pendukung.</p>
        {!readOnly && (
          <div className="flex gap-2">
            <button aria-label="Jadikan Utama" className="btn btn-primary flex-1 !px-2 !text-[11px]" type="button" onClick={onSetPrimary} disabled={currentSelection?.role === 'primary'}>
              {currentSelection?.role === 'primary' ? 'Tangkapan Utama' : 'Jadikan Utama'}
            </button>
            <button aria-label="Tambah Pendukung" className="btn btn-secondary flex-1 !px-2 !text-[11px]" type="button" onClick={onAddSupporting} disabled={Boolean(currentSelection) || selectedCaptures.length >= 10}>
              {currentSelection?.role === 'supporting' ? 'Tangkapan Pendukung' : 'Tambah Pendukung'}
            </button>
          </div>
        )}
        {selectionError && <p className="text-xs font-semibold text-semantic-danger bg-semantic-danger-soft p-2 rounded-md" role="alert">{selectionError}</p>}
        {selectedDetails.length === 0 ? (
          <p className="text-xs text-text-muted text-center py-4">Belum ada tangkapan laporan yang dipilih. Finalisasi memerlukan satu Utama.</p>
        ) : (
          <ul className="space-y-2">
            {selectedDetails.map(({ selection, moment }) => moment && (
              <li key={selection.captureFrameId} className={`flex items-center justify-between p-2 rounded-md border ${selection.role === 'primary' ? 'border-primary/30 bg-primary-soft/50' : 'border-border-default bg-surface-subtle'}`}>
                <div className="flex flex-col">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${selection.role === 'primary' ? 'text-primary' : 'text-text-muted'}`}>
                    {selection.role === 'primary' ? '★ Utama' : 'Pendukung'}
                  </span>
                  <strong className="font-mono text-xs text-text-primary mt-0.5">Tangkapan #{String(moment.frameIndex).padStart(3, '0')} · {moment.timestampMs} ms</strong>
                </div>
                {!readOnly && selection.role === 'supporting' && (
                  <button type="button" className="text-[11px] font-semibold text-semantic-danger hover:underline px-2" onClick={() => onRemoveSupporting(selection.captureFrameId)} aria-label={`Hapus Tangkapan Pendukung ${moment.frameIndex}`}>
                    Hapus
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
