import type { Batch } from './index';
import type { Test } from '../types/index';

export function batchToTest(batch: Batch): Test {
  const snapshot = batch.setupSnapshot;
  const draft = batch.setupDraft;
  const productId = snapshot?.productId || draft?.productId || 'prd-default';
  const productName = snapshot?.productSnapshot.productName || draft?.productSnapshot?.productName || 'Unknown Product';
  const recipeId = snapshot?.recipeId || draft?.recipeId;
  const sampleId = snapshot?.sampleId || `SMP-${batch.id}`;
  const operatorName = snapshot?.operatorName || draft?.operatorName || 'Unknown Operator';
  const operatorId = snapshot?.operatorId || draft?.operatorId;
  const setpoints = snapshot?.setpoints || draft?.setpoints || { forceSetpointN: 30, pressDurationMs: 800, strokeMm: 8 };
  const fixture = snapshot?.fixture || draft?.fixture || 'nominal-01';
  const productionBatch = snapshot?.productLot || draft?.productLot;

  let status: Test['status'] = 'running';
  if (batch.status === 'FINALIZED' || batch.status === 'REVIEW_REQUIRED') {
    status = 'complete';
  } else if (batch.status === 'FAILED' || batch.status === 'ABORTED') {
    status = 'failed';
  }

  return {
    id: batch.id,
    sampleId,
    productId,
    productSnapshot: snapshot?.productSnapshot || draft?.productSnapshot,
    productName,
    recipeId: recipeId || 'rcp-default',
    recipeSnapshot: snapshot?.recipeSnapshot || draft?.recipeSnapshot,
    productionBatch,
    operatorId: operatorId || 'usr-unknown',
    operatorName,
    config: setpoints,
    status,
    fixture: fixture,
    source: 'fixture',
    createdAt: batch.createdAt,
  };
}