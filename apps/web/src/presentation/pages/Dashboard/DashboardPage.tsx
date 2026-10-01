import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Batch } from '@spray-paragon/domain';
import { batchRepository } from '../../../application/services';
import { Status } from '../../components/ui/Status';
import { Panel } from '../../components/ui/Panel';
import { Table } from '../../components/ui/Table';

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
    return <div className="p-4 text-sm text-text-secondary">Loading dashboard...</div>;
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
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="text-xs text-text-muted flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span>Simulation environment · Hardware not connected</span>
        </div>
        <button 
          onClick={() => navigate('/batches/new')} 
          className="rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          New Batch
        </button>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1.1fr_.9fr]">
        <Panel title="Current / Latest Batch">
          {!latestBatch ? (
            <p className="p-4 text-sm text-text-secondary">No batches yet.</p>
          ) : (
            <div className="space-y-4 p-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-lg font-bold text-text-primary">{latestBatch.id}</div>
                  <div className="text-sm font-medium text-text-secondary">{getProductName(latestBatch)}</div>
                  <div className="font-mono text-xs text-text-muted">{getSampleId(latestBatch)}</div>
                </div>
                <Status tone={latestBatch.status === 'FINALIZED' ? 'success' : latestBatch.status === 'FAILED' ? 'danger' : latestBatch.status === 'REVIEW_REQUIRED' ? 'warning' : 'neutral'}>
                  {latestBatch.status === 'REVIEW_REQUIRED' ? 'Ready for Review' : latestBatch.status.charAt(0) + latestBatch.status.slice(1).toLowerCase().replace('_', ' ')}
                </Status>
              </div>

              <div className="grid grid-cols-2 gap-4 border-y border-border-subtle py-3 text-xs">
                <div>
                  <span className="text-text-muted">Created</span>
                  <div className="font-medium text-text-primary mt-0.5">
                    {new Date(latestBatch.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div>
                  <span className="text-text-muted">Operator</span>
                  <div className="font-medium text-text-primary mt-0.5">{getOperatorName(latestBatch)}</div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => navigateToBatch(latestBatch)}
                  className="w-full rounded-sm bg-primary py-2 text-xs font-semibold text-white hover:bg-primary-hover"
                >
                  {latestBatch.status === 'FINALIZED' ? 'View Result' : latestBatch.status === 'DRAFT' ? 'Continue Setup' : latestBatch.status === 'REVIEW_REQUIRED' ? 'Review Analysis' : 'View Batch'}
                </button>
              </div>
            </div>
          )}
        </Panel>

        <Panel title={`Awaiting review (${awaitingReview.length})`}>
          {awaitingReview.length === 0 ? (
            <p className="p-4 text-sm text-text-secondary">No batches are waiting for review.</p>
          ) : (
            <div className="divide-y divide-border-subtle max-h-[300px] overflow-y-auto">
              {awaitingReview.map(b => {
                return (
                  <div key={b.id} className="flex items-center justify-between py-2.5 px-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold text-text-primary">{b.id}</div>
                      <div className="truncate text-xs text-text-secondary">{getProductName(b)}</div>
                      <div className="text-[11px] text-text-muted">Ready for Review · {new Date(b.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <button
                      onClick={() => navigateToBatch(b)}
                      className="ml-3 shrink-0 rounded-sm border border-border-default bg-white px-2.5 py-1 text-xs font-medium text-primary hover:bg-subtle"
                    >
                      Review
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Recent Finalized Batches">
        {finalizedBatches.length === 0 ? (
          <p className="p-4 text-sm text-text-secondary">No finalized batches.</p>
        ) : (
          <Table>
            <thead className="bg-subtle">
              <tr>
                {['Batch ID', 'Product', 'Operator', 'Finalized', 'Primary Capture', 'Action'].map(h => (
                  <th className="px-3 py-2 text-left font-semibold text-xs text-text-muted" key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default bg-surface text-xs">
              {finalizedBatches.slice(0, 10).map(b => {
                const isFinal = !!b.finalReport;
                const finalizedAtText = isFinal
                  ? new Date(b.finalReport!.finalizedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : '—';
                const primaryCaptureText = isFinal
                  ? b.finalReport!.primaryCaptureMomentId
                  : '—';

                return (
                  <tr key={b.id}>
                    <td className="px-3 py-2 font-mono font-medium">{b.id}</td>
                    <td className="px-3 py-2">{getProductName(b)}</td>
                    <td className="px-3 py-2">{getOperatorName(b)}</td>
                    <td className="px-3 py-2 text-text-secondary">{finalizedAtText}</td>
                    <td className="px-3 py-2 font-mono text-text-secondary">{primaryCaptureText}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => navigateToBatch(b)}
                        className="text-primary hover:underline font-medium"
                      >
                        Open Result
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
