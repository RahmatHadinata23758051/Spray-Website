import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { batchRepository } from '../../../application/services';
import type { Batch } from '@spray-paragon/domain';
import { Status } from '../../components/ui/Status';
import { Panel } from '../../components/ui/Panel';
import { formatStatus } from '../../utils/formatters';

export function BatchDetailPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit draft state
  const [productLot, setProductLot] = useState('');
  const [notes, setNotes] = useState('');
  
  const loadBatch = useCallback(async () => {
    if (!batchId) return;
    try {
      const b = await batchRepository.getBatch(batchId);
      setBatch(b);
      if (b && b.status === 'DRAFT' && b.setupDraft) {
        setProductLot(b.setupDraft.productLot || '');
        setNotes(b.setupDraft.notes || '');
      }
    } catch (e) {
      console.error(e);
      setBatch(null);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    let active = true;
    if (active) loadBatch();
    return () => { active = false; };
  }, [loadBatch]);

  const handleUpdateDraft = async () => {
    if (!batch || batch.status !== 'DRAFT') return;
    try {
      await batchRepository.updateBatchSetupDraft(batch.id, { productLot, notes });
      await loadBatch();
    } catch (e) {
      console.error("Failed to update draft", e);
    }
  };

  const handlePrepareBatch = async () => {
    if (!batch || batch.status !== 'DRAFT') return;
    try {
      // Ensure latest changes are saved first
      await batchRepository.updateBatchSetupDraft(batch.id, { productLot, notes });
      const readyBatch = await batchRepository.prepareBatch(batch.id);
      setBatch(readyBatch);
    } catch (e) {
      console.error("Failed to prepare batch", e);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">Memuat batch {batchId}...</div>;
  }

  if (!batch) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Batch Tidak Ditemukan</h1>
        <p className="text-sm text-text-secondary">Batch {batchId} tidak ada atau telah dihapus.</p>
        <button onClick={() => navigate('/batches')} className="text-sm font-medium text-primary hover:underline">
          &larr; Kembali ke Batch
        </button>
      </div>
    );
  }

  const isDraft = batch.status === 'DRAFT';
  const setup = batch.setupSnapshot || batch.setupDraft;
  if (!setup) return <div>Data batch tidak valid (setup hilang)</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div>
          <button 
            onClick={() => navigate('/batches')} 
            className="text-xs font-semibold text-text-muted hover:text-text-primary mb-1.5 flex items-center gap-1 transition-colors"
          >
            <span>&larr;</span> <span>Kembali ke Batch</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary font-mono">{batch.id}</h1>
            <Status tone={batch.status === 'FINALIZED' ? 'success' : batch.status === 'FAILED' || batch.status === 'ABORTED' ? 'danger' : batch.status === 'DRAFT' ? 'neutral' : 'warning'}>
              {formatStatus(batch.status)}
            </Status>
          </div>
        </div>
        
        {isDraft && (
          <button 
            onClick={handlePrepareBatch}
            className="btn btn-primary"
          >
            Siapkan Batch
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Primary Lifecycle Next Action Card */}
          {batch.status === 'READY' && (
            <div className="rounded-panel border border-border-default bg-surface p-5 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-semantic-success flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-semantic-success" />
                  Siap untuk akuisisi
                </div>
                <h3 className="text-base font-bold text-text-primary mt-1">Batch siap untuk pengambilan data</h3>
                <p className="mt-0.5 text-xs text-text-secondary">Sistem siap. Parameter pengujian telah dikunci.</p>
              </div>
              <button
                onClick={() => navigate(`/batches/${batch.id}/capture`)}
                aria-label="Mulai / Buka Pengambilan"
                className="btn btn-primary shrink-0"
              >
                Mulai / Buka Pengambilan
              </button>
            </div>
          )}
          
          {batch.status === 'CAPTURING' && (
            <div className="rounded-panel border border-border-default bg-surface p-5 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-semantic-warning flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-semantic-warning animate-pulse" />
                  Pengambilan data berlangsung
                </div>
                <h3 className="text-base font-bold text-text-primary mt-1">Pengambilan Data Berlangsung</h3>
                <p className="mt-0.5 text-xs text-text-secondary">Akuisisi data sedang berlangsung.</p>
              </div>
              <button
                onClick={() => navigate(`/batches/${batch.id}/capture`)}
                className="btn btn-primary shrink-0"
              >
                Lanjutkan Pengambilan
              </button>
            </div>
          )}

          {batch.status === 'PROCESSING' && (
            <div className="rounded-panel border border-border-default bg-surface p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-semantic-warning flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-semantic-warning animate-pulse" />
                Pemrosesan pipeline
              </div>
              <h3 className="text-base font-bold text-text-primary mt-1">Memproses Data Tangkapan</h3>
              <p className="mt-0.5 text-xs text-text-secondary">Pipeline analisis sedang menyelaraskan frame kecepatan tinggi.</p>
            </div>
          )}

          {batch.status === 'REVIEW_REQUIRED' && (
            <div className="rounded-panel border border-border-default bg-surface p-5 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Perlu ditinjau
                </div>
                <h3 className="text-base font-bold text-text-primary mt-1">Pengambilan data selesai</h3>
                <p className="mt-0.5 text-xs text-text-secondary">Tinjauan analisis diperlukan. Geometri spasial siap untuk verifikasi.</p>
              </div>
              <button
                onClick={() => navigate(`/batches/${batch.id}/analysis`)}
                aria-label="Tinjau Analisis"
                className="btn btn-primary shrink-0"
              >
                Tinjau Analisis
              </button>
            </div>
          )}
          
          {batch.status === 'FINALIZED' && (
            <div className="rounded-panel border border-border-default bg-surface p-5 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-semantic-success flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-semantic-success" />
                  Riwayat final
                </div>
                <h3 className="text-base font-bold text-text-primary mt-1">Batch telah difinalisasi</h3>
                <p className="mt-0.5 text-xs text-text-secondary">Data engineering yang tidak dapat diubah dan pengukuran tersedia.</p>
              </div>
              <button
                onClick={() => navigate(`/batches/${batch.id}/result`)}
                aria-label="Lihat Hasil"
                className="btn btn-primary shrink-0"
              >
                Lihat Hasil
              </button>
            </div>
          )}

          <Panel title={isDraft ? "Pengaturan Batch" : "Snapshot Setup (Hanya-Baca)"}>
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-text-muted">PRODUK</div>
                  <div className="mt-1 text-base font-bold text-text-primary">{setup.productSnapshot?.productName}</div>
                  <div className="text-xs font-semibold text-text-muted mt-0.5">{setup.productSnapshot?.productCode}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-text-muted">Resep Pengujian</div>
                  <div className="mt-1 text-base font-bold text-text-primary">{setup.recipeSnapshot?.name}</div>
                  <div className="mt-0.5 text-xs font-mono font-semibold text-text-secondary">
                    Gaya: {setup.recipeSnapshot?.forceSetpointN} N · Durasi: {setup.recipeSnapshot?.pressDurationMs} ms · Langkah: {setup.recipeSnapshot?.strokeMm} mm
                  </div>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 border-t border-border-subtle pt-5">
                <div className="form-group">
                  <label className="form-label">Lot Produk</label>
                  {isDraft ? (
                    <input 
                      type="text" 
                      value={productLot} 
                      onChange={e => setProductLot(e.target.value)} 
                      onBlur={handleUpdateDraft}
                      placeholder="Masukkan lot..."
                      className="form-input max-w-[260px]"
                    />
                  ) : (
                    <div className="font-mono text-sm font-bold text-text-primary">{setup.productLot || '—'}</div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Sample ID</label>
                  <div className="font-mono text-sm font-bold text-text-primary">
                    {'sampleId' in setup ? String((setup as { sampleId?: string }).sampleId ?? '—') : 'Belum dibuat'}
                  </div>
                </div>
              </div>

              <div className="border-t border-border-subtle pt-5">
                <div className="form-group">
                  <label className="form-label">Catatan</label>
                  {isDraft ? (
                    <textarea 
                      value={notes} 
                      onChange={e => setNotes(e.target.value)} 
                      onBlur={handleUpdateDraft}
                      rows={3}
                      placeholder="Tambahkan catatan..."
                      className="form-textarea"
                    />
                  ) : (
                    <div className="text-sm text-text-primary whitespace-pre-wrap">{setup.notes || '—'}</div>
                  )}
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Informasi Batch">
            <div className="space-y-4 text-sm">
              <div className="border-b border-border-subtle pb-3">
                <div className="text-xs font-bold uppercase tracking-wider text-text-muted">Operator</div>
                <div className="font-semibold text-text-primary mt-1">{setup.operatorName}</div>
              </div>
              <div className="border-b border-border-subtle pb-3">
                <div className="text-xs font-bold uppercase tracking-wider text-text-muted">DIBUAT</div>
                <div className="font-semibold text-text-primary mt-1">
                  {new Date(batch.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {'preparedAt' in setup && (setup as { preparedAt?: string }).preparedAt && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-text-muted">Prepared</div>
                  <div className="font-semibold text-text-primary mt-1">
                    {new Date(String((setup as { preparedAt?: string }).preparedAt)).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
