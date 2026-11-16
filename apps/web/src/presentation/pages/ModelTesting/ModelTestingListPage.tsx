import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { modelTestingRepository } from './modelTestingRepository';
import type { ModelTestRun } from './types';
import { Table } from '../../components/ui/Table';
import { Status } from '../../components/ui/Status';
import { fmt } from '../../utils/formatters';
import { Plus } from 'lucide-react';

export function ModelTestingListPage() {
  const [items, setItems] = useState<ModelTestRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    modelTestingRepository.list().then((data) => {
      if (!active) return;
      setItems(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.productName.toLowerCase().includes(q) ||
      item.formulaNumber.toLowerCase().includes(q) ||
      item.modelVersion.toLowerCase().includes(q) ||
      (item.videoMetadata?.fileName?.toLowerCase() || '').includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Table & Controls */}
      <div className="rounded-md border border-border-default bg-surface shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-border-subtle bg-surface">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="text-xs font-medium text-text-secondary">
              {filteredItems.length} Pengujian
            </div>
            <input
              type="text"
              placeholder="Cari ID, produk, formula..."
              className="form-input !h-8 w-[260px] text-xs font-normal"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Link
            to="/uji-model/new"
            className="btn btn-primary !min-h-[30px] px-3.5 text-xs font-medium flex items-center gap-1.5"
          >
            <Plus size={14} />
            Uji Baru
          </Link>
        </div>

        {loading ? (
          <div className="p-6 text-center text-xs text-text-secondary">
            Memuat data pengujian...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-10 px-4 space-y-2.5">
            <div className="text-xs text-text-secondary">Belum ada data pengujian model.</div>
            <Link
              to="/uji-model/new"
              className="btn btn-primary !min-h-[28px] px-3 text-xs font-medium inline-flex items-center gap-1"
            >
              <Plus size={13} />
              Uji Baru
            </Link>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <th>ID Uji</th>
                <th>Waktu</th>
                <th>Produk</th>
                <th>Versi Model</th>
                <th>Kemasan</th>
                <th>Video</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-surface">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-surface-subtle transition-colors cursor-pointer"
                  onClick={() => navigate(`/uji-model/${item.id}/execute`)}
                >
                  <td className="font-mono font-medium text-primary">
                    <Link
                      to={`/uji-model/${item.id}/execute`}
                      onClick={(e) => e.stopPropagation()}
                      className="hover:underline"
                    >
                      {item.id}
                    </Link>
                  </td>
                  <td className="text-text-secondary text-xs">{fmt.date(item.createdAt)}</td>
                  <td>
                    <div className="font-medium text-text-primary text-xs">{item.productName}</div>
                    <div className="font-mono text-[11px] text-text-muted">{item.formulaNumber}</div>
                  </td>
                  <td className="font-mono text-xs text-primary">{item.modelVersion}</td>
                  <td className="text-xs text-text-secondary">{item.deviceType}</td>
                  <td className="text-xs">
                    {item.videoMetadata ? (
                      <div>
                        <span className="font-medium text-text-primary">{item.videoMetadata.fileName}</span>
                        <div className="font-mono text-[10px] text-text-muted">
                          {item.frames?.length || 0} frame &middot; {item.videoMetadata.durationSeconds}s
                        </div>
                      </div>
                    ) : (
                      <span className="text-text-muted text-[11px]">Belum diunggah</span>
                    )}
                  </td>
                  <td>
                    <Status tone={item.status === 'FINALIZED' ? 'success' : item.status === 'REVIEW' ? 'warning' : 'info'}>
                      {item.status === 'FINALIZED' ? 'Selesai' : item.status === 'REVIEW' ? 'Ditinjau' : 'Draf'}
                    </Status>
                  </td>
                  <td className="text-right">
                    <Link
                      to={`/uji-model/${item.id}/execute`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-primary font-medium hover:underline"
                    >
                      Buka
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
