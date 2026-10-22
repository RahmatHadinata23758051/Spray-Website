import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { kodePengujianRepository } from '../../../application/services';
import type { KodePengujian } from '@spray-paragon/domain';
import { Status } from '../../components/ui/Status';
import { Table } from '../../components/ui/Table';
import { fmt } from '../../utils/formatters';

const kpStatusLabels: Record<string, string> = {
  DRAFT: 'Draf',
  ACTIVE: 'Aktif',
  CLOSED: 'Selesai',
  ARCHIVED: 'Diarsipkan',
};

function formatKpStatus(status: string): string {
  return kpStatusLabels[status] || status;
}

function getKpStatusTone(status: string): 'neutral' | 'info' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'DRAFT':
      return 'neutral';
    case 'ACTIVE':
      return 'warning';
    case 'CLOSED':
      return 'success';
    case 'ARCHIVED':
      return 'neutral';
    default:
      return 'info';
  }
}

const syncStatusLabels: Record<string, string> = {
  local: 'Lokal',
  pending: 'Menunggu',
  synced: 'Tersinkron',
  failed: 'Gagal',
};

function getSyncStatusTone(status: string): 'neutral' | 'info' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'synced':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'danger';
    case 'local':
    default:
      return 'neutral';
  }
}

export function KodePengujianPage() {
  const [items, setItems] = useState<KodePengujian[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    kodePengujianRepository.list().then((data) => {
      if (!active) return;
      setItems(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredItems = items.filter((kp) => {
    if (statusFilter && kp.status !== statusFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const pCode = kp.productSnapshot?.productCode?.toLowerCase() || '';
      const pName = kp.productSnapshot?.productName?.toLowerCase() || '';
      const lot = kp.productLot?.toLowerCase() || '';
      const operator = kp.operatorName?.toLowerCase() || '';
      const id = kp.id.toLowerCase();

      return (
        id.includes(q) ||
        pCode.includes(q) ||
        pName.includes(q) ||
        lot.includes(q) ||
        operator.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="p-4 text-sm text-text-secondary">Memuat kode pengujian...</div>
      ) : (
        <div className="surface-panel surface-panel-large">
          <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-sm font-semibold text-text-primary">
                {filteredItems.length} Kode Pengujian
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Cari ID, Produk, Lot, Operator..."
                  className="form-input !min-h-[36px] w-[280px] text-sm"
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
                  <option value="ACTIVE">Aktif</option>
                  <option value="CLOSED">Selesai</option>
                  <option value="ARCHIVED">Diarsipkan</option>
                </select>
              </div>
            </div>
            <Link
              to="/kode-pengujian/new"
              aria-label="Buat Kode Pengujian"
              className="btn btn-primary !min-h-[36px] px-4"
            >
              Buat Kode Pengujian
            </Link>
          </div>

          <Table>
            <thead>
              <tr>
                <th>ID Pengujian</th>
                <th>Waktu</th>
                <th>Produk / Formula</th>
                <th>Lot / Referensi</th>
                <th>Periode Uji</th>
                <th>Sampel</th>
                <th>Progres Pengujian</th>
                <th>Status</th>
                <th>Sinkronisasi</th>
                <th className="text-right">Tindakan</th>
              </tr>
            </thead>
            <tbody className="bg-surface">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-text-muted text-sm">
                    {searchQuery || statusFilter
                      ? 'Tidak ada kode pengujian yang cocok dengan filter.'
                      : 'Belum ada kode pengujian. Buat kode pengujian baru untuk memulai.'}
                  </td>
                </tr>
              ) : (
                filteredItems.map((kp) => {
                  const sampleCount = kp.samples?.length || 0;
                  const finalizedCount = kp.testRuns?.filter((t) => t.status === 'FINALIZED').length || 0;
                  const testedSamples = kp.samples?.filter(
                    (s) => kp.testRuns?.some((t) => t.sampleId === s.id && t.status === 'FINALIZED')
                  ).length || 0;

                  const progressText =
                    sampleCount === 0
                      ? 'Belum ada sampel'
                      : `${testedSamples} dari ${sampleCount} sampel diuji (${finalizedCount} selesai)`;

                  return (
                    <tr
                      key={kp.id}
                      className="hover:bg-surface-subtle transition-colors cursor-pointer"
                      onClick={() => navigate(`/kode-pengujian/${kp.id}`)}
                    >
                      <td className="font-mono font-bold text-primary">
                        <Link
                          to={`/kode-pengujian/${kp.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                        >
                          {kp.id}
                        </Link>
                      </td>
                      <td className="text-text-secondary text-xs">{fmt.date(kp.createdAt)}</td>
                      <td>
                        <div className="font-semibold text-text-primary text-xs">
                          {kp.productSnapshot?.productName || '—'}
                        </div>
                        <div className="font-mono text-[11px] text-text-muted">
                          {kp.productSnapshot?.productCode || '—'}
                        </div>
                      </td>
                      <td className="font-mono text-xs">{kp.productLot || '—'}</td>
                      <td className="text-xs text-text-secondary">{kp.testPeriod || '—'}</td>
                      <td className="text-xs font-semibold">{sampleCount} Sampel</td>
                      <td className="text-xs text-text-secondary">
                        <span className="inline-block px-2 py-0.5 rounded bg-surface-subtle text-text-primary font-medium text-[11px]">
                          {progressText}
                        </span>
                      </td>
                      <td>
                        <Status tone={getKpStatusTone(kp.status)}>
                          {formatKpStatus(kp.status)}
                        </Status>
                      </td>
                      <td>
                        <Status tone={getSyncStatusTone(kp.sync?.status || 'local')}>
                          {syncStatusLabels[kp.sync?.status || 'local'] || 'Lokal'}
                        </Status>
                      </td>
                      <td className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/kode-pengujian/${kp.id}`}
                          className="btn btn-secondary !min-h-[30px] px-3 text-xs"
                        >
                          Buka
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}
