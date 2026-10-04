import React, { useState } from 'react';
import { Status } from '../../components/ui/Status';

const MOCK_USERS = [
  {
    id: 'usr_001',
    name: 'Nadia Putri',
    role: 'Operator',
    email: 'operator@local.test',
    auth: 'Local Session',
    status: 'active',
    lastActive: '2026-10-02T12:00:00.000Z',
    initials: 'NP',
    color: 'bg-primary-soft text-primary'
  },
  {
    id: 'usr_002',
    name: 'R&D Analyst',
    role: 'Analyst',
    email: 'analyst@local.test',
    auth: 'Local Session',
    status: 'active',
    lastActive: '2026-10-02T11:00:00.000Z',
    initials: 'RA',
    color: 'bg-semantic-success-soft text-semantic-success'
  },
  {
    id: 'usr_003',
    name: 'Quality Lead',
    role: 'Manager',
    email: 'qa.lead@local.test',
    auth: 'SAML SSO',
    status: 'inactive',
    lastActive: '2026-09-29T12:00:00.000Z',
    initials: 'QL',
    color: 'bg-semantic-warning-soft text-semantic-warning'
  }
];

export function UsersPage() {
  const [query, setQuery] = useState('');

  const filtered = MOCK_USERS.filter(u => `${u.name} ${u.role} ${u.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border-default bg-surface px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            placeholder="Cari pengguna..." 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            className="w-64 rounded-input border border-border-default bg-surface-subtle px-3 py-1.5 text-sm font-medium text-text-primary outline-none transition-colors focus:border-primary focus:bg-surface focus:ring-1 focus:ring-primary"
          />
        </div>
        <button type="button" className="btn btn-primary shadow-sm" disabled>
          + Tambah Pengguna
        </button>
      </div>

      <div className="flex-1 table-shell min-h-0">
        <table className="w-full text-sm">
          <thead className="bg-surface sticky top-0 z-10 shadow-[0_1px_0_var(--border-default)]">
            <tr>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-text-muted text-[11px]">Pengguna</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-text-muted text-[11px]">Peran</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-text-muted text-[11px]">Autentikasi</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-text-muted text-[11px]">Status</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-text-muted text-[11px]">Terakhir Aktif</th>
              <th className="px-4 py-3 text-right font-bold uppercase tracking-wider text-text-muted text-[11px]">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle bg-surface">
            {filtered.map(user => (
              <tr key={user.id} className="transition-colors hover:bg-surface-subtle group">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${user.color} font-bold text-xs`}>
                      {user.initials}
                    </div>
                    <div>
                      <div className="font-bold text-text-primary tracking-tight">{user.name}</div>
                      <div className="text-[11px] font-mono text-text-muted mt-0.5">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 font-semibold text-text-secondary">{user.role}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-text-muted">{user.auth}</td>
                <td className="px-4 py-2.5">
                  <Status tone={user.status === 'active' ? 'success' : 'neutral'}>
                    {user.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </Status>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-text-muted">
                  {new Date(user.lastActive).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button type="button" className="text-xs font-semibold text-primary hover:underline" disabled>Kelola</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm font-medium text-text-muted">
                  Tidak ada pengguna yang cocok dengan pencarian Anda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
