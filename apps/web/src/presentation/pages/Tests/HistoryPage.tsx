import React, { useState } from 'react';
import type { Page } from '../../navigation';
import type { Test } from '@spray-paragon/domain';
import type { FinalAnalysisReport } from '@spray-paragon/domain';
import { getUserFacingTestStatus } from '@spray-paragon/domain';
import { tests } from '../../../data';
import { Status } from '../../components/ui/Status';
import { Panel } from '../../components/ui/Panel';
import { Table } from '../../components/ui/Table';

export function HistoryPage({ setSelected, setPage, finalReport }: { setSelected: (t: Test) => void; setPage: (p: Page) => void; finalReport: FinalAnalysisReport | null }) {
  const [q, setQ] = useState('');
  const [product, setProduct] = useState('All');
  const [operator, setOperator] = useState('All');
  const [status, setStatus] = useState<string>('All');
  const [date, setDate] = useState<string>('');

  const filtered = tests.filter(t => {
    const userStatus = getUserFacingTestStatus(t, finalReport);
    const haystack = `${t.id} ${t.productName} ${t.sampleId} ${t.operatorName}`.toLowerCase();
    const matchesQuery = haystack.includes(q.toLowerCase());
    const matchesProduct = product === 'All' || t.productName === product;
    const matchesOperator = operator === 'All' || t.operatorName === operator;
    const matchesStatus = status === 'All' || userStatus === status;
    const matchesDate = !date || t.createdAt.startsWith(date);
    return matchesQuery && matchesProduct && matchesOperator && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <label className="block text-sm font-medium">Search <input value={q} onChange={e => setQ(e.target.value)} className="mt-1 w-full rounded-sm border border-border-default px-3 py-2 text-sm" placeholder="Test ID, sample, product, operator..." /></label>
        <label className="block text-sm font-medium">Product <select value={product} onChange={e => setProduct(e.target.value)} className="mt-1 w-full rounded-sm border border-border-default px-3 py-2 text-sm"><option>All</option>{Array.from(new Set(tests.map(t => t.productName))).map(n => <option key={n}>{n}</option>)}</select></label>
        <label className="block text-sm font-medium">Operator <select value={operator} onChange={e => setOperator(e.target.value)} className="mt-1 w-full rounded-sm border border-border-default px-3 py-2 text-sm"><option>All</option>{Array.from(new Set(tests.map(t => t.operatorName))).map(n => <option key={n}>{n}</option>)}</select></label>
        <label className="block text-sm font-medium">Status <select value={status} onChange={e => setStatus(e.target.value)} className="mt-1 w-full rounded-sm border border-border-default px-3 py-2 text-sm"><option>All</option><option>Draft</option><option>Captured</option><option>Ready for Review</option><option>Finalized</option><option>Failed</option></select></label>
        <label className="block text-sm font-medium">Date <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full rounded-sm border border-border-default px-3 py-2 text-sm" /></label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-border-default bg-subtle p-8 text-center"><p className="text-sm text-text-secondary">No tests match the current filters.</p></div>
      ) : (
        <Panel title="Test History">
          <Table>
            <thead className="bg-subtle">
              <tr>
                {['Test ID', 'Date / Time', 'Product', 'Sample ID', 'Operator', 'Status', 'Primary Capture', 'Action'].map(h => (
                  <th className="px-3 py-2 text-left font-semibold text-xs text-text-muted" key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default bg-surface text-xs">
              {filtered.map(t => {
                const userStatus = getUserFacingTestStatus(t, finalReport);
                const isFinal = userStatus === 'Finalized' && finalReport && finalReport.testId === t.id;
                const primaryCaptureText = isFinal
                  ? `#${String(finalReport.primaryCapture.frameIndex).padStart(3, '0')} · ${finalReport.primaryCapture.timestampMs} ms`
                  : '—';

                const actionConfig = userStatus === 'Draft'
                  ? { label: 'Continue setup', page: 'New Test' as Page }
                  : userStatus === 'Finalized'
                  ? { label: 'Open Result', page: 'Result' as Page }
                  : { label: 'Review Analysis', page: 'Analysis' as Page };

                return (
                  <tr key={t.id}>
                    <td className="px-3 py-2 font-mono font-medium">{t.id}</td>
                    <td className="px-3 py-2 text-text-secondary">{new Date(t.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-3 py-2 font-medium">{t.productName}</td>
                    <td className="px-3 py-2 font-mono text-text-secondary">{t.sampleId}</td>
                    <td className="px-3 py-2">{t.operatorName}</td>
                    <td className="px-3 py-2">
                      <Status tone={userStatus === 'Finalized' ? 'success' : userStatus === 'Failed' ? 'danger' : userStatus === 'Ready for Review' ? 'warning' : 'neutral'}>
                        {userStatus}
                      </Status>
                    </td>
                    <td className="px-3 py-2 font-mono text-text-secondary">{primaryCaptureText}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => { setSelected(t); setPage(actionConfig.page); }}
                        className="text-primary hover:underline font-medium"
                      >
                        {actionConfig.label}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Panel>
      )}
    </div>
  );
}
