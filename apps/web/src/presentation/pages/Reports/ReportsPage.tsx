import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Batch } from '@spray-paragon/domain';
import { createFinalReportCsv } from '../../../application/reporting/createFinalReportCsv';
import { batchRepository } from '../../../application/services';
import { Table } from '../../components/ui/Table';

export function ReportsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    batchRepository.listBatches().then(data => {
      if (!active) return;
      const finalized = data
        .filter(b => b.status === 'FINALIZED' && b.finalReport)
        .sort((a, b) => new Date(b.finalReport!.finalizedAt).getTime() - new Date(a.finalReport!.finalizedAt).getTime());
      setBatches(finalized);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleExport = (batch: Batch) => {
    if (!batch.finalReport) return;
    setExportingId(batch.id);
    const csv = createFinalReportCsv(batch.finalReport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spraybot-report-${batch.id}-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setTimeout(() => setExportingId(null), 800);
  };

  const filteredBatches = batches.filter(batch => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const pCode = batch.finalReport?.test.product.productCode ?? '';
      const pName = batch.finalReport?.test.product.productName ?? '';
      const sampleId = batch.finalReport?.test.sampleId ?? '';
      const operator = batch.finalReport?.test.operator ?? '';
      
      return (
        batch.id.toLowerCase().includes(q) ||
        pCode.toLowerCase().includes(q) ||
        pName.toLowerCase().includes(q) ||
        sampleId.toLowerCase().includes(q) ||
        operator.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 flex flex-col h-full pb-8">
      {loading ? (
        <div className="p-4 text-sm text-text-secondary">Memuat laporan...</div>
      ) : (
        <div className="surface-panel surface-panel-large flex flex-col flex-1">
          <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-sm font-semibold text-text-primary">
                {filteredBatches.length} Laporan
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  placeholder="Cari ID, Produk, Sampel, Operator..." 
                  className="form-input !min-h-[36px] w-[300px] text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Table>
            <thead>
              <tr>
                <th>ID Batch</th>
                <th>Produk</th>
                <th>ID Sampel</th>
                <th>Operator</th>
                <th>Difinalisasi</th>
                <th>Tangkapan Utama</th>
                <th className="text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="bg-surface">
              {filteredBatches.map((batch) => {
                const report = batch.finalReport!;
                const pCode = report.test.product.productCode;
                const pName = report.test.product.productName;
                const sampleId = report.test.sampleId;
                const operator = report.test.operator;
                const captureInfo = `#${String(report.primaryCapture.frameIndex).padStart(3, '0')}`;
                
                return (
                  <tr key={batch.id}>
                    <td className="font-mono font-bold tracking-tight text-text-primary">{batch.id}</td>
                    <td>
                      <div className="font-semibold text-text-primary">{pName}</div>
                      <div className="text-xs font-semibold text-text-muted mt-0.5">{pCode}</div>
                    </td>
                    <td className="font-mono text-text-secondary font-semibold">{sampleId}</td>
                    <td className="font-medium text-text-primary">{operator}</td>
                    <td className="text-text-secondary">{new Date(report.finalizedAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="font-mono text-primary font-bold text-xs">{captureInfo}</td>
                    <td className="text-right flex items-center justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/batches/${batch.id}/result`)}
                        className="btn btn-secondary !min-h-8 !px-3 !py-1 text-xs"
                      >
                        Buka Hasil
                      </button>
                      <button 
                        onClick={() => handleExport(batch)}
                        disabled={exportingId === batch.id}
                        className="btn btn-secondary !min-h-8 !px-3 !py-1 text-xs"
                      >
                        {exportingId === batch.id ? 'Mengekspor...' : 'Ekspor CSV'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs font-medium text-text-muted">
                    {batches.length === 0 
                      ? 'Tidak ada laporan yang telah difinalisasi.'
                      : 'Tidak ada laporan yang sesuai dengan filter.'}
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
