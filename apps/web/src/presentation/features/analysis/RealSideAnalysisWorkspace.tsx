import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Batch, SelectedCaptureMoment } from '@spray-paragon/domain';
import {
  addSupportingAnalysisCapture,
  removeSupportingCapture,
  setPrimaryAnalysisCapture,
} from '@spray-paragon/domain';
import type { ResolvedSideAnalysisFrame } from '../../../application/captureAssets';
import { captureAssetResolver } from '../../../application/services';
import { Status } from '../../components/ui/Status';
import { formatStatus } from '../../utils/formatters';
import type { ViewMode } from './types';

type Preparation =
  | { status: 'loading' }
  | { status: 'ready'; frames: ResolvedSideAnalysisFrame[]; baselineFrameIds: string[]; objectUrls: Record<string, string> }
  | { status: 'error'; message: string; missingFrameAssetIds: string[]; missingBaselineAssetIds: string[] };

/**
 * Side-only analysis workspace for real captures. Front is explicitly absent;
 * no mask, overlay, measurement, phase label, or synchronized moment is fabricated.
 */
export function RealSideAnalysisWorkspace({ batch, onBack }: { batch: Batch; onBack: () => void }) {
  const [preparation, setPreparation] = useState<Preparation>({ status: 'loading' });
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>('Original');
  const [camera, setCamera] = useState<'side' | 'front'>('side');
  const [selectedCaptures, setSelectedCaptures] = useState<SelectedCaptureMoment[]>([]);
  const [selectionError, setSelectionError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const objectUrls: Record<string, string> = {};
    const release = () => Object.values(objectUrls).forEach((url) => URL.revokeObjectURL(url));

    void (async () => {
      const result = await captureAssetResolver.prepareBatchAnalysis(batch);
      if (cancelled) return;
      if (!result.ok) {
        setPreparation({ status: 'error', message: result.error, missingFrameAssetIds: result.missingFrameAssetIds, missingBaselineAssetIds: result.missingBaselineAssetIds });
        return;
      }
      for (const frame of result.prepared.frames) objectUrls[frame.frameId] = URL.createObjectURL(frame.blob);
      setPreparation({
        status: 'ready',
        frames: result.prepared.frames,
        baselineFrameIds: result.prepared.input.baseline?.frames.map((frame) => frame.frameId) ?? [],
        objectUrls,
      });
      setSelectedFrameId((current) => current ?? result.prepared.frames[0]?.frameId ?? null);
    })();

    return () => {
      cancelled = true;
      release();
    };
  }, [batch]);

  const frames = preparation.status === 'ready' ? preparation.frames : [];
  const currentFrame = frames.find((frame) => frame.frameId === selectedFrameId) ?? frames[0];
  const baselineSet = useMemo(() => new Set(preparation.status === 'ready' ? preparation.baselineFrameIds : []), [preparation]);

  const currentSelection = selectedCaptures.find((selection) => selection.captureFrameId === currentFrame?.frameId);

  const handleSetPrimary = useCallback(() => {
    if (!currentFrame) return;
    const result = setPrimaryAnalysisCapture(selectedCaptures, currentFrame.frameId, 'Operator', new Date().toISOString());
    setSelectedCaptures(result.selected);
    setSelectionError(result.error);
  }, [currentFrame, selectedCaptures]);

  const handleAddSupporting = useCallback(() => {
    if (!currentFrame) return;
    const result = addSupportingAnalysisCapture(selectedCaptures, currentFrame.frameId, 'Operator', new Date().toISOString());
    setSelectedCaptures(result.selected);
    setSelectionError(result.error);
  }, [currentFrame, selectedCaptures]);

  const handleRemoveSupporting = useCallback((frameId: string) => {
    const result = removeSupportingCapture(selectedCaptures, frameId);
    setSelectedCaptures(result.selected);
    setSelectionError(result.error);
  }, [selectedCaptures]);

  const selectedCount = selectedCaptures.length;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between rounded-panel border border-border-default bg-surface px-4 py-3 shadow-sm text-sm">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 font-mono font-bold text-text-primary">Batch: {batch.id}</div>
          <div className="h-4 w-px bg-border-strong hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-mono font-bold text-[11px] uppercase tracking-wider">Mode</span>
            <span className="font-mono font-bold text-text-primary">SAMPING SAJA</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-mono font-bold text-[11px] uppercase tracking-wider">Frame</span>
            <span className="font-mono font-bold text-text-primary">{frames.length > 0 ? `${(currentFrame?.frameIndex ?? 0) + 1} / ${frames.length}` : '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-mono font-bold text-[11px] uppercase tracking-wider">Waktu</span>
            <span className="font-mono font-bold text-text-primary">{currentFrame ? `${currentFrame.elapsedMs} ms` : '—'}</span>
          </div>
          <Status tone="warning">{formatStatus(batch.status)}</Status>
        </div>
        <button onClick={onBack} className="text-xs font-semibold hover:text-primary transition-colors text-text-secondary flex items-center gap-1 shrink-0">
          <span>&larr;</span> Kembali ke Detail
        </button>
      </div>

      <div className="flex-1 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="flex flex-col bg-workbench rounded-panel overflow-hidden border border-workbench-border shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-workbench-raised px-4 py-2.5 border-b border-workbench-border">
            <div className="flex gap-2">
              <button
                onClick={() => setCamera('side')}
                aria-label="kamera samping"
                aria-pressed={camera === 'side'}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${camera === 'side' ? 'bg-workbench border border-workbench-border text-white shadow-sm' : 'text-workbench-muted hover:text-white hover:bg-workbench'}`}
              >
                <span className="h-2 w-2 rounded-full bg-camera-side" />
                Profil Samping
              </button>
              <button
                onClick={() => setCamera('front')}
                aria-label="kamera depan"
                aria-pressed={camera === 'front'}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${camera === 'front' ? 'bg-workbench border border-workbench-border text-white shadow-sm' : 'text-workbench-muted hover:text-white hover:bg-workbench'}`}
              >
                <span className="h-2 w-2 rounded-full bg-camera-front" />
                Pola Depan
              </button>
            </div>
            {camera === 'side' && (
              <div className="flex items-center p-0.5 rounded-lg bg-[#080f18] border border-workbench-border">
                {(['Original', 'Mask', 'Overlay'] as ViewMode[]).map((value) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    aria-pressed={mode === value}
                    className={`rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all ${mode === value ? 'bg-workbench-raised text-white shadow-sm border border-workbench-border' : 'text-workbench-muted hover:text-white'}`}
                  >
                    {value === 'Original' ? 'Citra Asli' : value}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="analysis-viewport bg-[#080f18] relative w-full flex items-center justify-center border-b border-workbench-border" data-testid="real-side-viewport">
            {preparation.status === 'loading' && <p className="text-sm text-workbench-muted">Menyiapkan aset analisis Samping…</p>}

            {preparation.status === 'error' && (
              <div role="alert" className="max-w-xl px-6 text-center">
                <p className="text-sm font-bold text-semantic-danger">Persiapan analisis diblokir</p>
                <p className="mt-1 text-xs text-workbench-muted">{preparation.message}</p>
                {(preparation.missingFrameAssetIds.length > 0 || preparation.missingBaselineAssetIds.length > 0) && (
                  <ul className="mt-3 space-y-1 text-left text-[11px] font-mono text-workbench-muted">
                    {preparation.missingFrameAssetIds.map((assetId) => <li key={`f-${assetId}`}>Frame: {assetId}</li>)}
                    {preparation.missingBaselineAssetIds.map((assetId) => <li key={`b-${assetId}`}>Baseline: {assetId}</li>)}
                  </ul>
                )}
              </div>
            )}

            {preparation.status === 'ready' && camera === 'front' && (
              <div className="max-w-md px-6 text-center" data-testid="front-unavailable">
                <p className="text-sm font-bold text-white">Kamera Depan tidak tersedia</p>
                <p className="mt-1 text-xs text-workbench-muted">Sesi ini hanya menangkap Kamera Samping. Tidak ada frame Depan yang dibuat.</p>
              </div>
            )}

            {preparation.status === 'ready' && camera === 'side' && currentFrame && (
              <>
                <div className="absolute top-3 left-3 z-10 text-[11px] font-mono font-bold text-workbench-text tracking-wide bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded border border-workbench-border/60 flex items-center gap-2 shadow-sm">
                  <span className="text-white uppercase">SAMPING</span>
                  <span className="text-workbench-muted">•</span>
                  <span>#{String(currentFrame.frameIndex).padStart(3, '0')}</span>
                  <span className="text-workbench-muted">•</span>
                  <span>{currentFrame.elapsedMs} ms</span>
                  {baselineSet.has(currentFrame.frameId) && <><span className="text-workbench-muted">•</span><span className="text-primary">Baseline</span></>}
                </div>
                <img
                  src={preparation.objectUrls[currentFrame.frameId]}
                  alt={`Frame Samping ${currentFrame.frameIndex} pada ${currentFrame.elapsedMs} ms`}
                  className="h-full w-full object-contain"
                />
                {mode !== 'Original' && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center" data-testid="analysis-result-unavailable">
                    <div className="max-w-md px-6 text-center">
                      <p className="text-sm font-bold text-white">Hasil analisis belum tersedia</p>
                      <p className="mt-1 text-xs text-workbench-muted">Mode {mode} menunggu integrasi pipeline CV Samping. Citra asli tetap dapat ditinjau.</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-4 py-3 bg-workbench-raised">
            <div className="analysis-timeline">
              <div className="timeline-header">
                <span>Linimasa akuisisi Samping</span>
                <span>
                  <strong className="font-mono">Tangkapan #{String((currentFrame?.frameIndex ?? 0) + 1).padStart(3, '0')}</strong> · <strong className="font-mono">{frames.length > 0 ? `${(currentFrame?.frameIndex ?? 0) + 1} dari ${frames.length}` : '—'}</strong> · <strong className="font-mono">{currentFrame ? `${currentFrame.elapsedMs} ms` : '—'}</strong>
                </span>
              </div>
              <div className="timeline-bars" role="list">
                {frames.map((frame) => (
                  <button
                    key={frame.frameId}
                    onClick={() => setSelectedFrameId(frame.frameId)}
                    role="listitem"
                    className={`timeline-frame ${baselineSet.has(frame.frameId) ? 'timeline-stable' : ''} ${frame.frameId === currentFrame?.frameId ? 'timeline-current' : ''}`}
                    title={`Tangkapan #${frame.frameIndex} · ${frame.elapsedMs} ms${baselineSet.has(frame.frameId) ? ' · Baseline' : ''}`}
                    aria-label={`Tangkapan ${frame.frameIndex}, ${frame.elapsedMs} milidetik${baselineSet.has(frame.frameId) ? ', Baseline' : ''}`}
                    aria-pressed={frame.frameId === currentFrame?.frameId}
                    data-testid={`real-timeline-frame-${frame.frameIndex}`}
                  />
                ))}
              </div>
              <div className="timeline-footer">
                <span>{frames.length} frame Samping nyata · waktu aktual capture</span>
                <span>Baseline ditandai; fase spray tidak dilabeli otomatis</span>
              </div>
            </div>
          </div>
        </div>

        <aside className="inspector-panel">
          <section className="inspector-section space-y-3">
            <h3 className="inspector-header">Pengukuran (Samping)</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Hasil analisis Samping belum tersedia. Pengukuran akan diisi oleh pipeline CV setelah integrasi eksternal.
            </p>
            <div className="rounded-md border border-border-default bg-surface-subtle px-3 py-2 text-[11px] font-mono text-text-muted">
              Masukkan: {frames.length} frame Samping nyata · baseline {baselineSet.size} frame
            </div>
          </section>

          <section className="inspector-section space-y-3">
            <h3 className="inspector-header">Kamera Depan</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Tidak ditangkap pada sesi ini. Tidak ada frame atau pengukuran Depan yang ditampilkan.
            </p>
          </section>

          <section className="inspector-section space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <h3 className="inspector-header !mb-0">Pilihan Laporan</h3>
              <span className="text-xs font-bold text-text-primary">Tangkapan Dipilih {selectedCount} / 10</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">Pilih satu frame Samping sebagai Utama. Tambahkan hingga sembilan frame Pendukung.</p>
            <div className="flex gap-2">
              <button aria-label="Jadikan Utama" className="btn btn-primary flex-1 !px-2 !text-[11px]" type="button" onClick={handleSetPrimary} disabled={!currentFrame || currentSelection?.role === 'primary'}>
                {currentSelection?.role === 'primary' ? 'Tangkapan Utama' : 'Jadikan Utama'}
              </button>
              <button aria-label="Tambah Pendukung" className="btn btn-secondary flex-1 !px-2 !text-[11px]" type="button" onClick={handleAddSupporting} disabled={!currentFrame || Boolean(currentSelection) || selectedCount >= 10}>
                {currentSelection?.role === 'supporting' ? 'Tangkapan Pendukung' : 'Tambah Pendukung'}
              </button>
            </div>
            {selectionError && <p className="text-xs font-semibold text-semantic-danger bg-semantic-danger-soft p-2 rounded-md" role="alert">{selectionError}</p>}
            {selectedCaptures.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">Belum ada tangkapan laporan yang dipilih.</p>
            ) : (
              <ul className="space-y-2">
                {selectedCaptures.map((selection) => {
                  const frame = frames.find((candidate) => candidate.frameId === selection.captureFrameId);
                  return (
                    <li key={selection.captureFrameId} className={`flex items-center justify-between p-2 rounded-md border ${selection.role === 'primary' ? 'border-primary/30 bg-primary-soft/50' : 'border-border-default bg-surface-subtle'}`}>
                      <div className="flex flex-col">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${selection.role === 'primary' ? 'text-primary' : 'text-text-muted'}`}>
                          {selection.role === 'primary' ? '★ Utama' : 'Pendukung'}
                        </span>
                        <strong className="font-mono text-xs text-text-primary mt-0.5">Tangkapan #{String(frame?.frameIndex ?? 0).padStart(3, '0')} · {frame?.elapsedMs ?? 0} ms</strong>
                      </div>
                      {selection.role === 'supporting' && (
                        <button type="button" className="text-[11px] font-semibold text-semantic-danger hover:underline px-2" onClick={() => handleRemoveSupporting(selection.captureFrameId)} aria-label={`Hapus Tangkapan Pendukung ${frame?.frameIndex ?? 0}`}>
                          Hapus
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
