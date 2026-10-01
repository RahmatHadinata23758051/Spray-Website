import { describe, it, expect } from 'vitest';
import {
  createBatchDraft,
  prepareBatch,
  startCapture,
  completeCapture,
  markReviewRequired,
  InvalidLifecycleTransitionError,
} from '../batch/index';

describe('@spray-paragon/domain: Pure Domain Invariants', () => {
  const dummyProduct = {
    productCode: 'PRD-01',
    productName: 'Hydra Mist',
  };

  const dummyRecipe = {
    name: 'Standard Spray',
    forceSetpointN: 15,
    pressDurationMs: 400,
    strokeMm: 12,
  };

  it('creates batch draft with initial DRAFT status', () => {
    const batch = createBatchDraft({
      productId: 'p1',
      productSnapshot: dummyProduct,
      recipeId: 'r1',
      recipeSnapshot: dummyRecipe,
      operatorId: 'op1',
      operatorName: 'Operator Name',
      fixture: 'nominal-01',
    });

    expect(batch.status).toBe('DRAFT');
    expect(batch.setupDraft?.productId).toBe('p1');
    expect(batch.setupSnapshot).toBeUndefined();
  });

  it('prepares batch and freezes setup snapshot (DRAFT -> READY)', () => {
    const draft = createBatchDraft({
      productId: 'p1',
      productSnapshot: dummyProduct,
      recipeId: 'r1',
      recipeSnapshot: dummyRecipe,
      operatorId: 'op1',
      operatorName: 'Operator Name',
      fixture: 'nominal-01',
    });

    const ready = prepareBatch(draft);
    expect(ready.status).toBe('READY');
    expect(ready.setupSnapshot).toBeDefined();
    expect(ready.setupSnapshot?.sampleId).toBe(`SMP-${ready.id.replace(/^BAT-/, '')}`);
  });

  it('disallows preparation on non-DRAFT batch', () => {
    const draft = createBatchDraft({
      productId: 'p1',
      productSnapshot: dummyProduct,
      recipeId: 'r1',
      recipeSnapshot: dummyRecipe,
      operatorId: 'op1',
      operatorName: 'Operator Name',
      fixture: 'nominal-01',
    });
    const ready = prepareBatch(draft);

    expect(() => prepareBatch(ready)).toThrow(InvalidLifecycleTransitionError);
  });

  it('transitions READY -> CAPTURING -> PROCESSING -> REVIEW_REQUIRED', () => {
    const draft = createBatchDraft({
      productId: 'p1',
      productSnapshot: dummyProduct,
      recipeId: 'r1',
      recipeSnapshot: dummyRecipe,
      operatorId: 'op1',
      operatorName: 'Operator Name',
      fixture: 'nominal-01',
    });
    const ready = prepareBatch(draft);

    const capturing = startCapture(ready);
    expect(capturing.status).toBe('CAPTURING');
    expect(capturing.captureSession?.scenario).toBe('nominal-01');

    const processing = completeCapture(capturing);
    expect(processing.status).toBe('PROCESSING');
    expect(processing.captureSession?.capturedAt).toBeDefined();

    const reviewRequired = markReviewRequired(processing);
    expect(reviewRequired.status).toBe('REVIEW_REQUIRED');
  });

  it('disallows starting capture directly from DRAFT', () => {
    const draft = createBatchDraft({
      productId: 'p1',
      productSnapshot: dummyProduct,
      recipeId: 'r1',
      recipeSnapshot: dummyRecipe,
      operatorId: 'op1',
      operatorName: 'Operator Name',
      fixture: 'nominal-01',
    });

    expect(() => startCapture(draft)).toThrow(InvalidLifecycleTransitionError);
  });
});
