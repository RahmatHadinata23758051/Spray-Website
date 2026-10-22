import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { KodePengujianPage } from '../presentation/pages/KodePengujian/KodePengujianPage';
import { NewKodePengujianPage } from '../presentation/pages/KodePengujian/NewKodePengujianPage';
import { KodePengujianDetailPage } from '../presentation/pages/KodePengujian/KodePengujianDetailPage';
import { App } from '../App';
import type { FinalAnalysisReport } from '@spray-paragon/domain';
import {
  kodePengujianRepository,
  productRepository,
  batchRepository,
} from '../application/services';

describe('Phase P2 — Minimal Kode Pengujian UI & Hierarchy', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('1. KP list renders persisted KPs and displays correct progress', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      productLot: 'LOT-ALPHA-99',
      testPeriod: 'Minggu 1',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-01' });
    await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-02' });

    render(
      <MemoryRouter initialEntries={['/kode-pengujian']}>
        <Routes>
          <Route path="/kode-pengujian" element={<KodePengujianPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(kp.id)).toBeInTheDocument();
    expect(screen.getByText('Hydra Mist')).toBeInTheDocument();
    expect(screen.getByText('PRD-MIST')).toBeInTheDocument();
    expect(screen.getByText('LOT-ALPHA-99')).toBeInTheDocument();
    expect(screen.getByText('2 Sampel')).toBeInTheDocument();
    expect(screen.getByText(/0 dari 2 sampel diuji/)).toBeInTheDocument();
  });

  it('2. creates Kode Pengujian through NewKodePengujianPage and navigates to detail', async () => {
    const user = userEvent.setup();
    await productRepository.listProducts();

    render(
      <MemoryRouter initialEntries={['/kode-pengujian/new']}>
        <Routes>
          <Route path="/kode-pengujian/new" element={<NewKodePengujianPage />} />
          <Route
            path="/kode-pengujian/:kpId"
            element={<KodePengujianDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByRole('heading', { name: 'Identitas Produk' })
    ).toBeInTheDocument();

    // Fill in lot and test period
    await user.type(
      screen.getByPlaceholderText('Contoh: LOT-2026-X1'),
      'LOT-NEW-2026'
    );
    await user.type(
      screen.getByPlaceholderText('Contoh: Minggu 42 - Stabilitas'),
      'Bulan 1'
    );
    await user.type(
      screen.getByPlaceholderText('Contoh: Gudang 25°C'),
      'Ruang 25C'
    );
    await user.type(
      screen.getByPlaceholderText('Contoh: Tegak / Terbalik'),
      'Tegak'
    );

    // Click submit
    await user.click(
      screen.getByRole('button', { name: 'Buat Kode Pengujian' })
    );

    // Should navigate to detail and render the created KP
    expect(await screen.findByText('LOT-NEW-2026')).toBeInTheDocument();
    expect(screen.getByText('Ruang 25C')).toBeInTheDocument();
    expect(screen.getByText('Tegak')).toBeInTheDocument();
  });

  it('3. adds multiple Samples to a Kode Pengujian and shows auto-increment position', async () => {
    const user = userEvent.setup();
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      productLot: 'LOT-SMP',
      operatorId: 'usr-1',
      operatorName: 'Op',
      storageCondition: 'Warehouse 25C',
      bottlePosition: 'Standing',
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId"
            element={<KodePengujianDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(kp.id)).toBeInTheDocument();
    expect(screen.getByText('Belum ada sampel. Klik "+ Tambah Sampel" untuk menambahkan botol sampel.')).toBeInTheDocument();

    // Add Sample 1
    await user.click(screen.getByRole('button', { name: '+ Tambah Sampel' }));
    expect(screen.getByText('Tambah Botol Sampel')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/Contoh: SMP-/), 'BOTOL-A');
    await user.click(screen.getByRole('button', { name: 'Simpan Sampel' }));

    expect(await screen.findByText('BOTOL-A')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();

    // Add Sample 2
    await user.click(screen.getByRole('button', { name: '+ Tambah Sampel' }));
    await user.type(screen.getByPlaceholderText(/Contoh: SMP-/), 'BOTOL-B');
    await user.click(screen.getByRole('button', { name: 'Simpan Sampel' }));

    expect(await screen.findByText('BOTOL-B')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('4. displays effective sample context: parent default vs sample override', async () => {
    const user = userEvent.setup();
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Op',
      storageCondition: 'Kamar 20C',
      bottlePosition: 'Tegak',
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId"
            element={<KodePengujianDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByText(kp.id);

    // Sample 1: Uses parent defaults (no override)
    await user.click(screen.getByRole('button', { name: '+ Tambah Sampel' }));
    await user.type(screen.getByPlaceholderText(/Contoh: SMP-/), 'SMP-DEFAULT');
    await user.click(screen.getByRole('button', { name: 'Simpan Sampel' }));

    expect(await screen.findByText('SMP-DEFAULT')).toBeInTheDocument();
    // Use getAllByText since "Kamar 20C" and "Tegak" appear in both header context and sample table
    expect(screen.getAllByText('Kamar 20C').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Tegak').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('(override)')).not.toBeInTheDocument();

    // Sample 2: Overrides storage condition
    await user.click(screen.getByRole('button', { name: '+ Tambah Sampel' }));
    await user.type(screen.getByPlaceholderText(/Contoh: SMP-/), 'SMP-OVEN');
    await user.type(screen.getByPlaceholderText(/Default: Kamar 20C/), 'Oven 45C');
    await user.click(screen.getByRole('button', { name: 'Simpan Sampel' }));

    expect(await screen.findByText('SMP-OVEN')).toBeInTheDocument();
    expect(screen.getByText('Oven 45C')).toBeInTheDocument();
    expect(screen.getByText('(override)')).toBeInTheDocument();
  });

  it('5. creates TestRun for selected Sample and allows different Recipes in same KP', async () => {
    const user = userEvent.setup();
    const products = await productRepository.listProducts();
    const p = products[0];
    const recipes = await productRepository.listRecipes(p.id);

    const kp = await kodePengujianRepository.create({
      productId: p.id,
      productSnapshot: { productCode: p.productCode, productName: p.name },
      defaultRecipeId: recipes[0]?.id,
      operatorId: 'usr-1',
      operatorName: 'Op',
    });

    // Add two samples
    await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-RUN-1' });
    await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-RUN-2' });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId"
            element={<KodePengujianDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(kp.id)).toBeInTheDocument();

    // S1 is auto-selected, click "+ Tambah Pengujian"
    expect(await screen.findByText(/Pengujian untuk Sampel #1/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Tambah Pengujian Sekarang' }));

    expect(screen.getByText('Tambah Pengujian Baru (Test Run)')).toBeInTheDocument();
    // Select first recipe
    await user.type(screen.getByPlaceholderText('Contoh: 1, 2, 3...'), '1');
    await user.click(screen.getByRole('button', { name: 'Tambah Pengujian' }));

    // TestRun should now appear under Sample 1
    expect(await screen.findByText(/Repetisi #1/)).toBeInTheDocument();

    // Now select Sample 2 by clicking on row
    await user.click(screen.getByText('SMP-RUN-2'));
    expect(await screen.findByText(/Pengujian untuk Sampel #2/)).toBeInTheDocument();
    expect(screen.getByText('Belum ada eksekusi pengujian untuk sampel ini.')).toBeInTheDocument();

    // Add TestRun with second recipe if available
    await user.click(screen.getByRole('button', { name: '+ Tambah Pengujian Sekarang' }));
    if (recipes.length > 1) {
      fireEvent.change(screen.getByRole('combobox'), {
        target: { value: recipes[1].id },
      });
    }
    await user.type(screen.getByPlaceholderText('Contoh: 1, 2, 3...'), '2');
    await user.click(screen.getByRole('button', { name: 'Tambah Pengujian' }));

    expect(await screen.findByText(/Repetisi #2/)).toBeInTheDocument();
  });

  it('6. app sidebar includes Kode Pengujian as primary workflow, Batch removed from primary nav', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    // Sidebar navigation check - Kode Pengujian is now the primary workflow
    const kpNavBtn = await screen.findByRole('button', { name: 'Kode Pengujian' });
    expect(kpNavBtn).toBeInTheDocument();

    // Legacy Batch is removed from primary sidebar navigation
    expect(screen.queryByRole('button', { name: 'Batch' })).not.toBeInTheDocument();

    // Click Kode Pengujian in sidebar
    await userEvent.click(kpNavBtn);
    expect(await screen.findByText(/Buat Kode Pengujian/)).toBeInTheDocument();
  });

  it('7. legacy Batch routes remain fully operational', async () => {
    const legacyBatch = await batchRepository.createBatchDraft({
      productId: 'p-legacy',
      productSnapshot: { productCode: 'LEG-1', productName: 'Legacy Item' },
      recipeId: 'r-leg',
      recipeSnapshot: { name: 'Std', forceSetpointN: 10, pressDurationMs: 200, strokeMm: 5 },
      operatorId: 'op-1',
      operatorName: 'Op',
      fixture: 'nominal-01',
      productLot: 'LOT-LEGACY-ROUTE',
    });

    render(
      <MemoryRouter initialEntries={[`/batches/${legacyBatch.id}`]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(legacyBatch.id)).toBeInTheDocument();
    expect(await screen.findByDisplayValue('LOT-LEGACY-ROUTE')).toBeInTheDocument();
  });

  it('8. KP can be created without default Recipe', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/kode-pengujian/new']}>
        <Routes>
          <Route path="/kode-pengujian/new" element={<NewKodePengujianPage />} />
          <Route path="/kode-pengujian/:kpId" element={<KodePengujianDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Identitas Produk' })).toBeInTheDocument();
    expect(screen.getByText('Metodologi Default (Opsional)')).toBeInTheDocument();

    // Fill only product and lot, leave recipe unselected
    await user.type(screen.getByPlaceholderText('Contoh: LOT-2026-X1'), 'LOT-NO-RECIPE');
    await user.click(screen.getByRole('button', { name: 'Buat Kode Pengujian' }));

    // Should navigate to detail without default recipe
    expect(await screen.findByText('LOT-NO-RECIPE')).toBeInTheDocument();
    // Metodologi Default should show — (but check the specific grid cell for it)
    const metodeDefaultCells = screen.getAllByText('—');
    // At least the Metodologi Default cell should show —
    expect(metodeDefaultCells.length).toBeGreaterThanOrEqual(1);
  });

  it('9. TestRun can choose Recipe different from parent default', async () => {
    const user = userEvent.setup();
    const products = await productRepository.listProducts();
    const p = products[0];
    const recipes = await productRepository.listRecipes(p.id);
    expect(recipes.length).toBeGreaterThan(1); // Need at least 2 recipes

    // Create KP with first recipe as default
    const kp = await kodePengujianRepository.create({
      productId: p.id,
      productSnapshot: { productCode: p.productCode, productName: p.name },
      defaultRecipeId: recipes[0].id,
      operatorId: 'usr-1',
      operatorName: 'Op',
    });

    await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-DIFF' });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}`]}>
        <Routes>
          <Route path="/kode-pengujian/:kpId" element={<KodePengujianDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(kp.id)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Tambah Pengujian Sekarang' }));
    expect(screen.getByText('Tambah Pengujian Baru (Test Run)')).toBeInTheDocument();

    // Select second recipe (different from parent default)
    await user.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: recipes[1].id } });
    await user.type(screen.getByPlaceholderText('Contoh: 1, 2, 3...'), '1');
    await user.click(screen.getByRole('button', { name: 'Tambah Pengujian' }));

    // TestRun should show second recipe name
    expect(await screen.findByText(recipes[1].name)).toBeInTheDocument();
  });

  it('10. Sample shows "Sudah Diuji" only after FINALIZED test run', async () => {
    const products = await productRepository.listProducts();
    const product = products[0];
    const recipes = await productRepository.listRecipes(product.id);

    const kp = await kodePengujianRepository.create({
      productId: product.id,
      productSnapshot: { productCode: product.productCode, productName: product.name },
      operatorId: 'usr-1',
      operatorName: 'Op',
    });

    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-STATUS' });

    // Add a test run (PENDING)
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: recipes[0].id,
      recipeSnapshot: { name: recipes[0].name, forceSetpointN: recipes[0].forceSetpointN, pressDurationMs: recipes[0].pressDurationMs, strokeMm: recipes[0].strokeMm },
      setpoints: { forceSetpointN: recipes[0].forceSetpointN, pressDurationMs: recipes[0].pressDurationMs, strokeMm: recipes[0].strokeMm },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Op',
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}`]}>
        <Routes>
          <Route path="/kode-pengujian/:kpId" element={<KodePengujianDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(kp.id)).toBeInTheDocument();
    // Sample should show "Dibuat" (CREATED) - not tested yet because run is PENDING
    expect(screen.getByText('Dibuat')).toBeInTheDocument();
    expect(screen.queryByText('Sudah Diuji')).not.toBeInTheDocument();

    unmount();

    // Now finalize the test run
    await kodePengujianRepository.updateTestRun(kp.id, testRun.id, {
      status: 'FINALIZED',
      finalReport: {
        testId: testRun.id,
        side: { measurements: [], stats: {}, overlays: [] },
        front: { measurements: [], stats: {}, overlays: [] },
        merged: { measurements: [], stats: {} },
        calibrated: true,
        finalizedAt: new Date().toISOString(),
        operatorId: 'usr-1',
        operatorName: 'Op',
      } as unknown as FinalAnalysisReport,
    });

    // Reload the page
    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}`]}>
        <Routes>
          <Route path="/kode-pengujian/:kpId" element={<KodePengujianDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Sudah Diuji')).toBeInTheDocument();
  });
});
