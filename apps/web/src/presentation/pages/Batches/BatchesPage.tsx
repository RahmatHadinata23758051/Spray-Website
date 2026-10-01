import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { batchRepository } from '../../../application/services';
import type { Batch } from '@spray-paragon/domain';
import { Status } from '../../components/ui/Status';
import { Table } from '../../components/ui/Table';

export function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">Batches</h1>
        <Link 
          to="/batches/new" 
          className="rounded-sm bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          + New Batch
        </Link>
      </div>

      {loading ? (
        <div className="p-4 text-sm text-text-secondary">Loading batches...</div>
      ) : (
        <Table>
          <thead>
            <tr>
              <th>Batch ID</th>
              <th>Date / Time</th>
              <th>Product</th>
              <th>Sample ID</th>
              <th>Operator</th>
              <th>Status</th>
              <th>Primary Capture</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => {
              const pCode = batch.setupSnapshot?.productSnapshot.productCode ?? batch.setupDraft?.productSnapshot?.productCode ?? '—';
              const pName = batch.setupSnapshot?.productSnapshot.productName ?? batch.setupDraft?.productSnapshot?.productName ?? '—';
              const sampleId = batch.setupSnapshot?.sampleId ?? '—';
              const operator = batch.setupSnapshot?.operatorName ?? batch.setupDraft?.operatorName ?? '—';
              
              // Only finalized batches with reports would show a moment ID.
              // We'll show "—" for now since report is not yet fetched in this view by default.
              const captureInfo = batch.status === 'FINALIZED' ? 'View Report' : '—';
              
              return (
                <tr key={batch.id}>
                  <td className="font-mono">{batch.id}</td>
                  <td>{new Date(batch.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <div className="font-medium text-text-primary">{pName}</div>
                    <div className="text-text-muted">{pCode}</div>
                  </td>
                  <td className="font-mono">{sampleId}</td>
                  <td>{operator}</td>
                  <td>
                    <Status tone={batch.status === 'FINALIZED' ? 'success' : batch.status === 'FAILED' || batch.status === 'ABORTED' ? 'danger' : batch.status === 'DRAFT' ? 'neutral' : 'warning'}>
                      {batch.status}
                    </Status>
                  </td>
                  <td>{captureInfo}</td>
                  <td className="text-right text-sm">
                    <button 
                      onClick={() => navigate(`/batches/${batch.id}`)}
                      className="font-medium text-primary hover:text-primary-hover"
                    >
                      {batch.status === 'DRAFT' ? 'Continue Setup' : 'Open Batch'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {batches.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-text-muted">
                  No batches found. Create a new batch to get started.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
