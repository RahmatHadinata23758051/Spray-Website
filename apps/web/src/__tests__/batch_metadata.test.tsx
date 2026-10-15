import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NewBatchPage } from '../presentation/pages/Batches/NewBatchPage';
import { BatchDetailPage } from '../presentation/pages/Batches/BatchDetailPage';
import { batchRepository } from '../application/services';

describe('Batch Test Metadata - UI & Integration', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('renders and submits test context metadata in NewBatchPage', async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(batchRepository, 'createBatchDraft');

    render(
      <MemoryRouter initialEntries={['/batches/new']}>
        <Routes>
          <Route path="/batches/new" element={<NewBatchPage />} />
          <Route path="/batches/:batchId" element={<div>Detail Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Konteks Pengujian' })).toBeInTheDocument();
    expect(screen.getByLabelText('Kondisi Penyimpanan')).toBeInTheDocument();
    expect(screen.getByLabelText('Posisi Botol')).toBeInTheDocument();
    expect(screen.getByLabelText('Periode Pengujian')).toBeInTheDocument();
    expect(screen.getByLabelText('Pengulangan Ke-')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Kondisi Penyimpanan'), '40C 75% RH');
    await user.type(screen.getByLabelText('Posisi Botol'), 'horizontal');
    await user.type(screen.getByLabelText('Periode Pengujian'), 'M1');
    await user.type(screen.getByLabelText('Pengulangan Ke-'), '3');

    await user.click(screen.getByRole('button', { name: 'Buat Draf Batch' }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          storageCondition: '40C 75% RH',
          bottlePosition: 'horizontal',
          testPeriod: 'M1',
          repetition: 3,
        })
      );
    });

    createSpy.mockRestore();
  });

  it('displays test context metadata in BatchDetailPage and carries it into snapshot when prepared', async () => {
    const user = userEvent.setup();
    const batch = await batchRepository.createBatchDraft({
      productId: 'prd-1',
      productSnapshot: { productCode: 'PRD-1', productName: 'Mist' },
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Std', forceSetpointN: 20, pressDurationMs: 500, strokeMm: 10 },
      operatorId: 'op-1',
      operatorName: 'Operator',
      fixture: 'nominal-01',
      productLot: 'LOT-CLIENT-A',
      storageCondition: '25C ambient',
      bottlePosition: 'tegak',
      testPeriod: 'Minggu 1',
      repetition: 1,
    });

    render(
      <MemoryRouter initialEntries={[`/batches/${batch.id}`]}>
        <Routes>
          <Route path="/batches/:batchId" element={<BatchDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByDisplayValue('25C ambient')).toBeInTheDocument();
    expect(screen.getByDisplayValue('tegak')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Minggu 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1')).toBeInTheDocument();

    // Prepare batch freezes into snapshot
    await user.click(screen.getByRole('button', { name: 'Siapkan Batch' }));

    await waitFor(() => {
      expect(screen.getByText('25C ambient')).toBeInTheDocument();
      expect(screen.getByText('tegak')).toBeInTheDocument();
      expect(screen.getByText('Minggu 1')).toBeInTheDocument();
      expect(screen.getByText('Ke-1')).toBeInTheDocument();
    });
  });
});
