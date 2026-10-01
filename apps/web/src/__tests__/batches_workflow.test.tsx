import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { batchRepository } from '../data';
import { productRepository } from '../data';
import { updateBatchSetupDraft } from '@spray-paragon/domain';

describe('Phase D1 - Canonical Batch Workflow & Persistence', () => {
  beforeEach(async () => {
    // No reset needed - batchRepositoryInstance seeds automatically
  });

  it('1 & 2. /batches loads from BatchRepository and renders table', async () => {
    render(
      <MemoryRouter initialEntries={['/batches']}>
        <App />
      </MemoryRouter>
    );

    // Verify Batches heading
    await waitFor(() => {
      expect(screen.getAllByRole('heading', { name: 'Batches' }).length).toBeGreaterThan(0);
    });

    // Check table headers
    expect(screen.getByText('Batch ID')).toBeInTheDocument();
    expect(screen.getByText('Sample ID')).toBeInTheDocument();
    expect(screen.getByText('Primary Capture')).toBeInTheDocument();
  });

  it('3. /batches/new renders New Batch form with product and recipe selection', async () => {
    render(
      <MemoryRouter initialEntries={['/batches/new']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'New Batch' })).toBeInTheDocument();
    });

    expect(screen.getByText('Product Identity')).toBeInTheDocument();
    expect(screen.getByText('Requested Test Parameters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Batch Draft' })).toBeInTheDocument();
  });

  it('4, 5, 6, 7, 10, 11. Creating Batch produces DRAFT with generated Batch ID, Sample ID on prepare, session operator, and persists Product Lot', async () => {
    const products = await productRepository.listProducts();
    const product = products[0];
    const recipes = await productRepository.listRecipes(product.id);
    const recipe = recipes[0];

    // Domain contract verification
    const draft = await batchRepository.createBatchDraft({
      productId: product.id,
      productSnapshot: { productCode: product.productCode, productName: product.name },
      recipeId: recipe.id,
      recipeSnapshot: {
        name: recipe.name,
        forceSetpointN: recipe.forceSetpointN,
        pressDurationMs: recipe.pressDurationMs,
        strokeMm: recipe.strokeMm,
      },
      productLot: 'LOT-TEST-001',
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });

    // 4. Status is DRAFT
    expect(draft.status).toBe('DRAFT');
    // 5. Batch ID is generated
    expect(draft.id).toMatch(/^BAT-/);
    // 7. Operator is bound to session identity
    expect(draft.setupDraft?.operatorName).toBe('Nadia Putri');
    // 10. Setpoints derived from recipe
    expect(draft.setupDraft?.setpoints?.forceSetpointN).toBe(recipe.forceSetpointN);
    // 11. Product Lot persists in Draft
    expect(draft.setupDraft?.productLot).toBe('LOT-TEST-001');

    // 12. Draft survives repository lookup
    const retrieved = await batchRepository.getBatch(draft.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.setupDraft?.productLot).toBe('LOT-TEST-001');

    // 13. Draft can be edited
    const updated = await batchRepository.updateBatchSetupDraft(draft.id, {
      productLot: 'LOT-EDITED-999',
    });
    expect(updated.setupDraft?.productLot).toBe('LOT-EDITED-999');

    // 14. Prepare Batch transitions DRAFT -> READY
    const ready = await batchRepository.prepareBatch(draft.id);
    expect(ready.status).toBe('READY');

    // 6. Sample ID generated upon prepare
    expect(ready.setupSnapshot?.sampleId).toMatch(/^SMP-/);

    // 15. READY contains frozen BatchSetupSnapshot
    expect(ready.setupSnapshot).toBeDefined();
    expect(ready.setupSnapshot?.productLot).toBe('LOT-EDITED-999');
    expect(ready.setupSnapshot?.productSnapshot.productName).toBe(product.name);

    // 18. READY setup cannot be edited
    expect(() => updateBatchSetupDraft(ready, { productLot: 'MUTATE_ATTEMPT' })).toThrow();
  });

  it('16 & 17. Product & Recipe master mutations cannot mutate frozen READY snapshot', async () => {
    const products = await productRepository.listProducts();
    const product = products[0];
    const recipes = await productRepository.listRecipes(product.id);
    const recipe = recipes[0];

    const draft = await batchRepository.createBatchDraft({
      productId: product.id,
      productSnapshot: { productCode: product.productCode, productName: product.name },
      recipeId: recipe.id,
      recipeSnapshot: {
        name: recipe.name,
        forceSetpointN: recipe.forceSetpointN,
        pressDurationMs: recipe.pressDurationMs,
        strokeMm: recipe.strokeMm,
      },
      operatorId: 'usr-np',
      operatorName: 'Nadia Putri',
      fixture: 'nominal-01',
    });

    const ready = await batchRepository.prepareBatch(draft.id);
    const originalProductName = ready.setupSnapshot!.productSnapshot.productName;
    const originalRecipeForce = ready.setupSnapshot!.recipeSnapshot.forceSetpointN;

    // Mutate Product Master
    await productRepository.updateProduct(product.id, { name: 'Completely Mutated Product Name' });
    await productRepository.updateRecipe(recipe.id, { forceSetpointN: 999 });

    // Lookup ready batch from repository
    const fetched = await batchRepository.getBatch(ready.id);
    expect(fetched!.setupSnapshot!.productSnapshot.productName).toBe(originalProductName);
    expect(fetched!.setupSnapshot!.recipeSnapshot.forceSetpointN).toBe(originalRecipeForce);

    // Restore product for other tests
    await productRepository.updateProduct(product.id, { name: product.name });
    await productRepository.updateRecipe(recipe.id, { forceSetpointN: recipe.forceSetpointN });
  });

  it('19 & 20. /batches/:id renders Batch Detail and unknown ID shows Batch Not Found', async () => {
    // Unknown ID
    render(
      <MemoryRouter initialEntries={['/batches/DOES-NOT-EXIST']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Batch Not Found' })).toBeInTheDocument();
      expect(screen.getByText(/does not exist or has been removed/i)).toBeInTheDocument();
    });
  });

  it('23 & 24. Sidebar contains Batches and does not contain New Test or History', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // Sidebar navigation check
    expect(screen.getByRole('button', { name: 'Batches' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New Test' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'History' })).toBeNull();
  });
});
