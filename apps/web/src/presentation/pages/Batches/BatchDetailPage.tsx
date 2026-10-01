import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { batchRepository } from '../../../data';
import type { Batch } from '@spray-paragon/domain';
import { Status } from '../../components/ui/Status';
import { Panel } from '../../components/ui/Panel';

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
    return <div className="p-4 text-sm text-text-secondary">Loading batch {batchId}...</div>;
  }

  if (!batch) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Batch Not Found</h1>
        <p className="text-sm text-text-secondary">The batch {batchId} does not exist or has been removed.</p>
        <button onClick={() => navigate('/batches')} className="text-sm font-medium text-primary hover:underline">
          &larr; Return to Batches
        </button>
      </div>
    );
  }

  const isDraft = batch.status === 'DRAFT';
  const setup = batch.setupSnapshot || batch.setupDraft;
  if (!setup) return <div>Invalid batch data (missing setup)</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div>
          <button onClick={() => navigate('/batches')} className="text-xs font-semibold text-text-muted hover:text-text-primary mb-1 inline-block">
            &larr; Back to Batches
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">{batch.id}</h1>
            <Status tone={batch.status === 'FINALIZED' ? 'success' : batch.status === 'FAILED' || batch.status === 'ABORTED' ? 'danger' : batch.status === 'DRAFT' ? 'neutral' : 'warning'}>
              {batch.status}
            </Status>
          </div>
        </div>
        
        {isDraft && (
          <button 
            onClick={handlePrepareBatch}
            className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          >
            Prepare Batch
          </button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Panel title={isDraft ? "Editable Setup Draft" : "Setup Snapshot (Read-Only)"}>
            <div className="p-4 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Product</div>
                  <div className="mt-0.5 text-sm font-medium text-text-primary">{setup.productSnapshot?.productName}</div>
                  <div className="text-xs text-text-secondary">{setup.productSnapshot?.productCode}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Recipe</div>
                  <div className="mt-0.5 text-sm font-medium text-text-primary">{setup.recipeSnapshot?.name}</div>
                  <div className="text-xs text-text-secondary">
                    Force: {setup.recipeSnapshot?.forceSetpointN}N, {setup.recipeSnapshot?.pressDurationMs}ms, {setup.recipeSnapshot?.strokeMm}mm
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Product Lot</label>
                  {isDraft ? (
                    <input 
                      type="text" 
                      value={productLot} 
                      onChange={e => setProductLot(e.target.value)} 
                      onBlur={handleUpdateDraft}
                      placeholder="Enter lot..."
                      className="w-full max-w-[200px] block rounded-sm border border-border-subtle bg-bg-surface px-2 py-1 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  ) : (
                    <div className="text-sm font-medium text-text-primary">{setup.productLot || '—'}</div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Sample ID</label>
                  <div className="text-sm font-mono text-text-primary">
                    {'sampleId' in setup ? String((setup as { sampleId?: string }).sampleId ?? '—') : 'Generated upon prepare'}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Notes</label>
                {isDraft ? (
                  <textarea 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    onBlur={handleUpdateDraft}
                    rows={2}
                    className="w-full rounded-sm border border-border-subtle bg-bg-surface px-2 py-1 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                ) : (
                  <div className="text-sm text-text-primary whitespace-pre-wrap">{setup.notes || '—'}</div>
                )}
              </div>
            </div>
          </Panel>
          
          {batch.status === 'READY' && (
            <div className="rounded-sm border border-emerald-500/20 bg-emerald-50/50 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-emerald-800">Batch is ready for capture</h3>
                <p className="mt-1 text-xs text-emerald-700">The hardware is standing by. All setup parameters are frozen.</p>
              </div>
              <button
                onClick={() => navigate(`/batches/${batch.id}/capture`)}
                className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              >
                Start / Open Capture
              </button>
            </div>
          )}
          
          {batch.status === 'CAPTURING' && (
            <div className="rounded-sm border border-amber-500/20 bg-amber-50/50 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-800">Capture in Progress</h3>
                <p className="mt-1 text-xs text-amber-700">Data acquisition is currently underway.</p>
              </div>
              <button
                onClick={() => navigate(`/batches/${batch.id}/capture`)}
                className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              >
                Continue Capture
              </button>
            </div>
          )}

          {batch.status === 'PROCESSING' && (
            <div className="rounded-sm border border-amber-500/20 bg-amber-50/50 p-4">
              <h3 className="text-sm font-bold text-amber-800">Processing Capture Data</h3>
              <p className="mt-1 text-xs text-amber-700">Analysis pipeline is aligning captured high-speed frames.</p>
            </div>
          )}

          {batch.status === 'REVIEW_REQUIRED' && (
            <div className="rounded-sm border border-blue-500/20 bg-blue-50/50 p-4">
              <h3 className="text-sm font-bold text-blue-800">Capture complete</h3>
              <p className="mt-1 text-xs text-blue-700">Analysis review required. Spatial geometry ready for verification.</p>
            </div>
          )}
          
          {batch.status === 'FINALIZED' && (
            <div className="rounded-sm border border-blue-500/20 bg-blue-50/50 p-4">
              <h3 className="text-sm font-bold text-blue-800">Batch is finalized</h3>
              <p className="mt-1 text-xs text-blue-700">Detailed result view will be migrated in future phases.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Context Summary">
            <div className="p-4 space-y-4 text-sm">
              <div>
                <div className="text-text-muted text-xs">Operator</div>
                <div className="font-medium text-text-primary">{setup.operatorName}</div>
              </div>
              <div>
                <div className="text-text-muted text-xs">Created</div>
                <div className="text-text-primary">
                  {new Date(batch.createdAt).toLocaleString()}
                </div>
              </div>
              {'preparedAt' in setup && (setup as { preparedAt?: string }).preparedAt && (
                <div>
                  <div className="text-text-muted text-xs">Prepared</div>
                  <div className="text-text-primary">
                    {new Date(String((setup as { preparedAt?: string }).preparedAt)).toLocaleString()}
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
