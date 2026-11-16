import React from 'react';
import type { ModelTestRun } from '../types';
import { FormSection } from '../../../components/ui/FormSection';
import { FormField } from '../../../components/ui/FormField';
import { Star, Download } from 'lucide-react';

interface Step05ModelResultProps {
  data: ModelTestRun;
  onChange: (patch: Partial<ModelTestRun>) => void;
  isReadOnly?: boolean;
}

export function Step05ModelResult({ data, onChange, isReadOnly = false }: Step05ModelResultProps) {
  const primaryIndex = data.selectedPrimaryFrameIndex ?? 0;
  const primaryFrame = data.frames && data.frames[primaryIndex];
  const supportingFrames = (data.selectedSupportingFrameIndexes || [])
    .map((idx) => data.frames[idx])
    .filter(Boolean);

  const handleDownloadCsv = () => {
    const headers = ['ID Pengujian', 'Produk', 'Formula', 'Tipe Kemasan', 'Versi Model', 'Total Frame', 'Durasi (s)', 'Frame Utama', 'Confidence', 'Catatan Evaluasi'];
    const row = [
      data.id,
      data.productName,
      data.formulaNumber,
      data.deviceType,
      data.modelVersion,
      data.frames.length,
      data.videoMetadata?.durationSeconds || 0,
      `Frame #${primaryIndex} (${primaryFrame?.timestampMs || 0}ms)`,
      `${((primaryFrame?.confidence || 0) * 100).toFixed(1)}%`,
      `"${(data.evaluationNotes || '').replace(/"/g, '""')}"`,
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), row.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${data.id}_evaluasi_model.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">05. Hasil</h2>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="btn btn-secondary !min-h-[30px] px-3 text-xs font-medium flex items-center gap-1.5"
        >
          <Download size={13} />
          Ekspor CSV
        </button>
      </div>

      {/* Grid Ringkasan Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface border border-border-default rounded-md p-4 text-xs">
        <div>
          <span className="text-[11px] text-text-muted block">ID pengujian</span>
          <span className="font-mono font-semibold text-text-primary mt-0.5 block">{data.id}</span>
        </div>
        <div>
          <span className="text-[11px] text-text-muted block">Produk</span>
          <span className="font-medium text-text-primary mt-0.5 block">{data.productName} ({data.formulaNumber})</span>
        </div>
        <div>
          <span className="text-[11px] text-text-muted block">Kemasan</span>
          <span className="font-medium text-text-primary mt-0.5 block">
            {data.deviceType} &middot; {data.deviceType === 'Aerosol' ? data.aerosolSpec.actuatorCode : data.nonAerosolSpec.pumpCode}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-text-muted block">Versi model</span>
          <span className="font-mono font-medium text-primary mt-0.5 block">{data.modelVersion}</span>
        </div>
      </div>

      {/* Primary Frame Display */}
      {primaryFrame ? (
        <div className="rounded-md border border-border-default bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold text-text-primary">
                <Star size={14} className="text-amber-400 fill-amber-400" />
                Frame utama
              </span>
              <span className="text-border-strong">&middot;</span>
              <span className="font-mono text-xs text-text-secondary">
                #{primaryIndex} &middot; {primaryFrame.timestampMs} ms
              </span>
            </div>
            <div className="font-mono text-xs text-semantic-success font-medium">
              Confidence: {((primaryFrame.confidence || 0) * 100).toFixed(1)}%
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <span className="text-[11px] text-text-muted font-medium">Asli</span>
              <div className="border border-border-default rounded bg-black flex items-center justify-center p-1 h-44">
                <img
                  src={primaryFrame.originalImageUrl}
                  alt="Citra Asli"
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-text-muted font-medium">Mask</span>
              <div className="border border-border-default rounded bg-black flex items-center justify-center p-1 h-44">
                <img
                  src={primaryFrame.maskImageUrl}
                  alt="Mask Segmentasi"
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-text-muted font-medium">Overlay</span>
              <div className="border border-border-default rounded bg-black flex items-center justify-center p-1 h-44">
                <img
                  src={primaryFrame.overlayImageUrl}
                  alt="Overlay Plume"
                  className="max-h-full max-w-full object-contain rounded"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-md border border-border-default bg-surface text-center text-xs text-text-muted">
          Belum ada frame yang diekstrak.
        </div>
      )}

      {/* Supporting Frames */}
      {supportingFrames.length > 0 && (
        <div className="rounded-md border border-border-default bg-surface p-4 space-y-3">
          <div className="text-xs font-semibold text-text-primary">
            Frame pendukung ({supportingFrames.length})
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {supportingFrames.map((sf, sIdx) => (
              <div key={sIdx} className="space-y-1 border border-border-subtle rounded p-1.5 bg-surface-subtle">
                <img src={sf.overlayImageUrl} alt={`Supporting ${sIdx}`} className="h-20 w-full object-contain bg-black rounded" />
                <div className="flex justify-between font-mono text-[10px] text-text-muted">
                  <span>#{sf.frameIndex}</span>
                  <span>{sf.timestampMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evaluation Feedback Section */}
      <FormSection title="Catatan evaluasi">
        <FormField label="Catatan" className="col-span-full">
          <textarea
            value={data.evaluationNotes || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange({ evaluationNotes: e.target.value })}
            placeholder="Catatan evaluasi segmentasi atau koreksi."
            rows={3}
            disabled={isReadOnly}
            className="w-full text-xs rounded-md border border-border-default bg-surface p-2.5 text-text-primary placeholder:text-text-muted outline-none focus:border-primary disabled:bg-surface-subtle disabled:cursor-not-allowed"
          />
        </FormField>
      </FormSection>
    </div>
  );
}
