import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { BatchesPage } from '../presentation/pages/Batches/BatchesPage';
import { batchRepository } from '../data/local/batchRepositoryInstance';

describe('Batches Filter & Search - 12 required test cases', () => {
  beforeEach(async () => {
    // Ensure repository has seeded batches
    const current = await batchRepository.listBatches();
    if (current.length === 0) {
      await new Promise(r => setTimeout(r, 50));
    }
  });

  // 1. default shows all
  it('1. default shows all matching batches', async () => {
    render(
      <MemoryRouter>
        <BatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Memuat batch...')).not.toBeInTheDocument();
    });

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(4);
    expect(screen.getByText(/4 Batch/)).toBeInTheDocument();
  });

  // 2. FINALIZED / Final
  it('2. filters by FINALIZED correctly using domain value', async () => {
    render(
      <MemoryRouter>
        <BatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Memuat batch...')).not.toBeInTheDocument();
    });

    const user = userEvent.setup();
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'FINALIZED');

    await waitFor(() => {
      expect(screen.getByText('1 Batch')).toBeInTheDocument();
      const cells = screen.getAllByRole('cell');
      const cellTexts = cells.map(c => c.textContent);
      expect(cellTexts).toContain('Final');
      expect(cellTexts).not.toContain('Siap');
      expect(cellTexts).not.toContain('Pengambilan Data');
    });
  });

  // 3. REVIEW_REQUIRED / Perlu Ditinjau
  it('3. filters by REVIEW_REQUIRED / Perlu Ditinjau', async () => {
    render(
      <MemoryRouter>
        <BatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Memuat batch...')).not.toBeInTheDocument();
    });

    const user = userEvent.setup();
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'REVIEW_REQUIRED');

    await waitFor(() => {
      expect(screen.getByText('Tidak ada batch yang sesuai dengan filter.')).toBeInTheDocument();
      const cells = screen.getAllByRole('cell');
      const cellTexts = cells.map(c => c.textContent);
      expect(cellTexts).not.toContain('Siap');
      expect(cellTexts).not.toContain('Final');
    });
  });

  // 4. READY / Siap
  it('4. filters by READY / Siap', async () => {
    render(
      <MemoryRouter>
        <BatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Memuat batch...')).not.toBeInTheDocument();
    });

    const user = userEvent.setup();
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'READY');

    await waitFor(() => {
      expect(screen.getByText('2 Batch')).toBeInTheDocument();
      const cells = screen.getAllByRole('cell');
      const cellTexts = cells.map(c => c.textContent);
      expect(cellTexts).toContain('Siap');
      expect(cellTexts).not.toContain('Final');
      expect(cellTexts).not.toContain('Pengambilan Data');
    });
  });

  // 5. CAPTURING / Pengambilan Data
  it('5. filters by CAPTURING / Pengambilan Data', async () => {
    render(
      <MemoryRouter>
        <BatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Memuat batch...')).not.toBeInTheDocument();
    });

    const user = userEvent.setup();
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'CAPTURING');

    await waitFor(() => {
      expect(screen.getByText('1 Batch')).toBeInTheDocument();
      const cells = screen.getAllByRole('cell');
      const cellTexts = cells.map(c => c.textContent);
      expect(cellTexts).toContain('Pengambilan Data');
      expect(cellTexts).not.toContain('Siap');
      expect(cellTexts).not.toContain('Final');
    });
  });

  // 6. empty status result
  it('6. empty status result shows concise message', async () => {
    render(
      <MemoryRouter>
        <BatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Memuat batch...')).not.toBeInTheDocument();
    });

    const user = userEvent.setup();
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'FAILED');

    await waitFor(() => {
      expect(screen.getByText('Tidak ada batch yang sesuai dengan filter.')).toBeInTheDocument();
      expect(screen.getByText('0 Batch')).toBeInTheDocument();
    });
  });

  // 7. search alone
  it('7. search alone filters across ID, Product, Sample, Operator', async () => {
    render(
      <MemoryRouter>
        <BatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Memuat batch...')).not.toBeInTheDocument();
    });

    const user = userEvent.setup();
    const input = screen.getByPlaceholderText('Cari ID, Produk, Sampel...');
    await user.type(input, 'Ahmad Rizki');

    await waitFor(() => {
      const cells = screen.getAllByRole('cell');
      const cellTexts = cells.map(c => c.textContent);
      expect(cellTexts).toContain('Ahmad Rizki');
      expect(cellTexts).not.toContain('Nadia Putri');
    });
  });

  // 8. status alone
  it('8. status alone narrows correctly', async () => {
    render(
      <MemoryRouter>
        <BatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Memuat batch...')).not.toBeInTheDocument();
    });

    const user = userEvent.setup();
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'READY');

    await waitFor(() => {
      expect(screen.getByText('2 Batch')).toBeInTheDocument();
    });
  });

  // 9. search + status together
  it('9. search + status together compose filters', async () => {
    render(
      <MemoryRouter>
        <BatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Memuat batch...')).not.toBeInTheDocument();
    });

    const user = userEvent.setup();
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'FINALIZED');

    const input = screen.getByPlaceholderText('Cari ID, Produk, Sampel...');
    await user.type(input, 'NonExistentXYZ');

    await waitFor(() => {
      expect(screen.getByText('Tidak ada batch yang sesuai dengan filter.')).toBeInTheDocument();
      expect(screen.getByText('0 Batch')).toBeInTheDocument();
    });
  });

  // 10. reset to Semua Status restores rows
  it('10. reset to Semua Status restores rows', async () => {
    render(
      <MemoryRouter>
        <BatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Memuat batch...')).not.toBeInTheDocument();
    });

    const user = userEvent.setup();
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'READY');

    await waitFor(() => {
      expect(screen.getByText('2 Batch')).toBeInTheDocument();
    });

    await user.selectOptions(select, '');

    await waitFor(() => {
      expect(screen.getByText(/4 Batch/)).toBeInTheDocument();
      expect(screen.getAllByRole('row').length).toBeGreaterThan(4);
    });
  });

  // 11. filtering does not mutate repository data
  it('11. filtering does not mutate repository data', async () => {
    const originalBatches = await batchRepository.listBatches();
    const originalCount = originalBatches.length;

    render(
      <MemoryRouter>
        <BatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Memuat batch...')).not.toBeInTheDocument();
    });

    const user = userEvent.setup();
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'FAILED');

    await waitFor(() => {
      expect(screen.getByText('0 Batch')).toBeInTheDocument();
    });

    const afterBatches = await batchRepository.listBatches();
    expect(afterBatches.length).toBe(originalCount);
  });

  // 12. translated display labels do not affect domain comparisons
  it('12. translated display labels do not affect domain comparisons', async () => {
    render(
      <MemoryRouter>
        <BatchesPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText('Memuat batch...')).not.toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const options = Array.from(select.options);
    
    // Domain values should be English enum symbols, labels should be Indonesian
    const readyOpt = options.find(o => o.value === 'READY');
    expect(readyOpt).toBeDefined();
    expect(readyOpt?.text).toBe('Siap');

    const draftOpt = options.find(o => o.value === 'DRAFT');
    expect(draftOpt).toBeDefined();
    expect(draftOpt?.text).toBe('Draf');

    const finalizedOpt = options.find(o => o.value === 'FINALIZED');
    expect(finalizedOpt).toBeDefined();
    expect(finalizedOpt?.text).toBe('Final');
  });
});
