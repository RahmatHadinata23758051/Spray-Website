import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { batchRepository } from '../../../application/services';
import type { Batch } from '@spray-paragon/domain';
import { Status } from '../../components/ui/Status';
import { Table } from '../../components/ui/Table';
import { formatStatus } from '../../utils/formatters';

export function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    batchRepository.listBatches().then((data) => {
      if (!active) return;
      // Sort newest first
      setBatches(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const filteredBatches = batches.filter(batch => {
    // Status filter (domain value)
    if (statusFilter && batch.status !== statusFilter) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const pCode = batch.setupSnapshot?.productSnapshot.productCode ?? batch.setupDraft?.productSnapshot?.productCode ?? '';
      const pName = batch.setupSnapshot?.productSnapshot.productName ?? batch.setupDraft?.productSnapshot?.productName ?? '';
      const sampleId = batch.setupSnapshot?.sampleId ?? '';
      const operator = batch.setupSnapshot?.operatorName ?? batch.setupDraft?.operatorName ?? '';
      
      const matchesSearch = 
        batch.id.toLowerCase().includes(q) ||
        pCode.toLowerCase().includes(q) ||
        pName.toLowerCase().includes(q) ||
        sampleId.toLowerCase().includes(q) ||
        operator.toLowerCase().includes(q);
        
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="p-4 text-sm text-text-secondary">Memuat batch...</div>
      ) : (
        <div className="surface-panel surface-panel-large">
          <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-sm font-semibold text-text-primary">
                {filteredBatches.length} Batch
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  placeholder="Cari ID, Produk, Sampel..." 
                  className="form-input !min-h-[36px] w-[260px] text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select 
                  className="form-select !min-h-[36px] w-[160px] text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Semua Status</option>
                  <option value="DRAFT">Draf</option>
                  <option value="READY">Siap</option>
                  <option value="CAPTURING">Pengambilan Data</option>
                  <option value="PROCESSING">Diproses</option>
                  <option value="REVIEW_REQUIRED">Perlu Ditinjau</option>
                  <option value="FINALIZED">Final</option>
                  <option value="FAILED">Gagal</option>
                  <option value="ABORTED">Dibatalkan</option>
                </select>
              </div>
            </div>
            <Link 
              to="/batches/new" 
              aria-label="Batch Baru"
              className="btn btn-primary !min-h-[36px] px-4"
            >
              Batch Baru
            </Link>
          </div>

          <Table>
            <thead>
              <tr>
                <th>ID Batch</th>
                <th>Waktu</th>
                <th>Produk</th>
                <th>ID Sampel</th>
                <th>Operator</th>
                <th>Status</th>
                <th>Tangkapan Utama</th>
                <th className="text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="bg-surface">
              {filteredBatches.map((batch) => {
                const pCode = batch.setupSnapshot?.productSnapshot.productCode ?? batch.setupDraft?.productSnapshot?.productCode ?? '—';
                const pName = batch.setupSnapshot?.productSnapshot.productName ?? batch.setupDraft?.productSnapshot?.productName ?? '—';
                const sampleId = batch.setupSnapshot?.sampleId ?? '—';
                const operator = batch.setupSnapshot?.operatorName ?? batch.setupDraft?.operatorName ?? '—';
                const captureInfo = batch.status === 'FINALIZED' ? 'Lihat Laporan' : '—';
                
                return (
                  <tr key={batch.id}>
                    <td className="font-mono font-bold tracking-tight text-text-primary">{batch.id}</td>
                    <td className="text-text-secondary">{new Date(batch.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>
                      <div className="font-semibold text-text-primary">{pName}</div>
                      <div className="text-xs font-semibold text-text-muted mt-0.5">{pCode}</div>
                    </td>
                    <td className="font-mono text-text-secondary font-semibold">{sampleId}</td>
                    <td className="font-medium text-text-primary">{operator}</td>
                    <td>
                      <Status tone={batch.status === 'FINALIZED' ? 'success' : batch.status === 'FAILED' || batch.status === 'ABORTED' ? 'danger' : batch.status === 'DRAFT' ? 'neutral' : 'warning'}>
                        {formatStatus(batch.status)}
                      </Status>
                    </td>
                    <td className="font-mono text-text-secondary text-xs">{captureInfo}</td>
                    <td className="text-right">
                      <button 
                        onClick={() => navigate(`/batches/${batch.id}`)}
                        aria-label={batch.status === 'DRAFT' ? 'Lanjutkan Draf' : 'Buka Batch'}
                        className="btn btn-secondary !min-h-8 !px-3 !py-1 text-xs"
                      >
                        {batch.status === 'DRAFT' ? 'Lanjutkan Draf' : 'Buka Batch'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-text-muted">
                    {batches.length === 0 
                      ? 'Belum ada batch. Buat batch baru untuk memulai pengujian.'
                      : 'Tidak ada batch yang sesuai dengan filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
