import { LocalStorageBatchRepository } from './batchRepository';
import { createBatchDraft, prepareBatch, Batch } from '../domain/batch';
import { tests } from './mockSpraybotRepository';

export const batchRepository = new LocalStorageBatchRepository();

// Seed initial batches if empty to give the user something to look at
batchRepository.listBatches().then(existingBatches => {
  if (existingBatches.length === 0) {
    const seeds: Batch[] = tests.map((t, idx) => {
      let batch = createBatchDraft({
        id: `BAT-${t.id.replace('TST-', '')}`,
        productId: t.productId || 'prd-fm100',
        productSnapshot: t.productSnapshot || { productCode: 'PRD-FM100', productName: t.productName },
        recipeId: t.recipeId || 'rcp-fm-standard',
        recipeSnapshot: t.recipeSnapshot || { name: 'Standard Spray Test', forceSetpointN: t.config.forceSetpointN, pressDurationMs: t.config.pressDurationMs, strokeMm: t.config.strokeMm },
        setpoints: t.config,
        operatorId: t.operatorId || 'usr-np',
        operatorName: t.operatorName,
        fixture: t.fixture,
      }, t.createdAt);
      batch = prepareBatch(batch, t.createdAt);
      
      // Make one capturing, one ready, others finalized (fake)
      if (idx === 0) {
        batch.status = 'READY';
      } else if (idx === 1) {
        batch.status = 'CAPTURING';
      } else if (idx === 2) {
        batch.status = 'FINALIZED'; // We won't fully hydrate the report yet since the user won't open it in D1
      }
      return batch;
    });
    batchRepository.seed(seeds);
  }
}).catch(console.error);
