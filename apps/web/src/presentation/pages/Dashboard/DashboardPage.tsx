import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Batch } from '@spray-paragon/domain';
import { batchRepository } from '../../../application/services';
import { Status } from '../../components/ui/Status';
import { Panel } from '../../components/ui/Panel';
import { Table } from '../../components/ui/Table';
import { formatStatus } from '../../utils/formatters';

const getProductName = (b: Batch) => b.setupSnapshot?.productSnapshot.productName ?? b.setupDraft?.productSnapshot?.productName ?? '—';
const getSampleId = (b: Batch) => b.setupSnapshot?.sampleId ?? '—';
const getOperatorName = (b: Batch) => b.setupSnapshot?.operatorName ?? b.setupDraft?.operatorName ?? '—';

export function DashboardPage() {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    batchRepository.listBatches().then(res => {
      if (!active) return;
      // Sort newest first
      setBatches(res.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      setLoading(false);
    }).catch(e => {
      console.error(e);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const latestBatch = batches[0];
  const awaitingReview = batches.filter(b => b.status === 'REVIEW_REQUIRED' || b.status === 'PROCESSING');
  const finalizedBatches = batches.filter(b => b.status === 'FINALIZED');

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">Memuat dasbor...</div>;
  }

  const navigateToBatch = (batch: Batch) => {
    if (batch.status === 'DRAFT') {
      navigate(`/batches/${batch.id}`);
    } else if (batch.status === 'READY' || batch.status === 'CAPTURING') {
      navigate(`/batches/${batch.id}/capture`);
    } else if (batch.status === 'REVIEW_REQUIRED' || batch.status === 'PROCESSING') {
      navigate(`/batches/${batch.id}/analysis`);
    } else if (batch.status === 'FINALIZED') {
      navigate(`/batches/${batch.id}/result`);
    } else {
      navigate(`/batches/${batch.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end border-b border-border-subtle pb-4">
        <button 
          onClick={() => navigate('/batches/new')} 
          className="btn btn-primary shadow-sm"
        >
          Batch Baru
        </button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <Panel title="Batch Terkini" className="h-full">
          {!latestBatch ? (
            <p className="text-sm text-text-muted">Belum ada data batch.</p>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-xl font-bold text-text-primary tracking-tight">{latestBatch.id}</div>
                  <div className="mt-1 text-base font-semibold text-text-secondary">{getProductName(latestBatch)}</div>
                  <div className="mt-0.5 font-mono text-xs font-semibold text-text-muted">{getSampleId(latestBatch)}</div>
                </div>
                <Status tone={latestBatch.status === 'FINALIZED' ? 'success' : latestBatch.status === 'FAILED' ? 'danger' : latestBatch.status === 'REVIEW_REQUIRED' ? 'warning' : 'neutral'}>
                  {formatStatus(latestBatch.status)}
                </Status>
              </div>

              <div className="grid grid-cols-2 gap-4 border-y border-border-subtle py-4 text-sm">
                <div>
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">Dibuat</div>
                  <div className="font-semibold text-text-primary mt-1">
                    {new Date(latestBatch.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">Operator</div>
                  <div className="font-semibold text-text-primary mt-1">{getOperatorName(latestBatch)}</div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => navigateToBatch(latestBatch)}
                  className="btn btn-secondary w-full"
                >
                  {latestBatch.status === 'FINALIZED' ? 'Buka Hasil' : latestBatch.status === 'DRAFT' ? 'Lanjutkan Setup' : latestBatch.status === 'REVIEW_REQUIRED' ? 'Tinjau Analisis' : 'Lihat Detail Batch'}
                </button>
              </div>
            </div>
          )}
        </Panel>

        <Panel title={`Perlu Ditinjau (${awaitingReview.length})`} className="h-full">
          {awaitingReview.length === 0 ? (
            <p className="text-sm text-text-muted">Tidak ada batch yang menunggu tinjauan.</p>
          ) : (
            <div className="divide-y divide-border-subtle max-h-[340px] overflow-y-auto -mx-4 -mb-4 px-4">
              {awaitingReview.map(b => {
                return (
                  <div key={b.id} className="flex items-center justify-between py-3.5 gap-4">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-bold text-text-primary tracking-tight">{b.id}</div>
                      <div className="truncate text-xs font-medium text-text-secondary mt-0.5">{getProductName(b)}</div>
                      <div className="text-[11px] font-semibold text-text-muted mt-0.5">{new Date(b.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <button
                      onClick={() => navigateToBatch(b)}
                      className="btn btn-secondary !min-h-8 !px-3 !py-1 text-xs shrink-0"
                    >
                      Tinjau
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Riwayat Finalisasi Terkini">
        {finalizedBatches.length === 0 ? (
          <p className="text-sm text-text-muted">Belum ada batch yang difinalisasi.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>ID Batch</th>
                <th>Produk</th>
                <th>Operator</th>
                <th>Waktu Finalisasi</th>
                <th>Tangkapan Utama</th>
                <th className="text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {finalizedBatches.slice(0, 10).map(b => {
                const isFinal = !!b.finalReport;
                const finalizedAtText = isFinal
                  ? new Date(b.finalReport!.finalizedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : '—';
                const primaryCaptureText = isFinal
                  ? b.finalReport!.primaryCaptureMomentId
                  : '—';

                return (
                  <tr key={b.id}>
                    <td className="font-mono font-bold">{b.id}</td>
                    <td className="font-medium text-text-secondary">{getProductName(b)}</td>
                    <td className="font-medium">{getOperatorName(b)}</td>
                    <td className="text-text-muted">{finalizedAtText}</td>
                    <td className="font-mono text-text-secondary">{primaryCaptureText}</td>
                    <td className="text-right">
                      <button
                        onClick={() => navigateToBatch(b)}
                        className="btn btn-tertiary !min-h-8 !px-3 !py-1 text-xs"
                      >
                        Buka Hasil
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Panel>
    </div>
  );
}
