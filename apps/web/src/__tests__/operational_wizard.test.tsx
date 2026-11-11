import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TestExecutionWizardPage } from '../presentation/pages/KodePengujian/TestExecutionWizardPage';
import { kodePengujianRepository } from '../application/services';
import type { FinalAnalysisReport } from '@spray-paragon/domain';

describe('Operational Test Execution Wizard (Client Flow Alignment)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  const dummyProduct = { productCode: 'PRD-MIST', productName: 'Hydra Mist Aerosol' };
  const dummyRecipe = { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 1500, strokeMm: 10 };

  async function seedTestRun(overrides?: {
    kpOverrides?: Partial<Parameters<typeof kodePengujianRepository.create>[0]>;
    sampleOverrides?: Partial<Parameters<typeof kodePengujianRepository.addSample>[1]>;
    runOverrides?: Partial<Parameters<typeof kodePengujianRepository.addTestRun>[1]>;
  }) {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Operator Paragon',
      productLot: 'LOT-2026-X1',
      storageCondition: 'Suhu Ruang',
      bottlePosition: 'Tegak',
      kuf: 'KUF-HM-01',
      trialObjective: 'Verifikasi stabilitas aktuator',
      benchmark: 'Benchmark Alpha',
      trialType: 'Lab',
      observationObjectives: ['Panjang lintasan', 'Sebaran'],
      ...overrides?.kpOverrides,
    });

    const { sample } = await kodePengujianRepository.addSample(kp.id, {
      sampleCode: 'SMPL-A01',
      storageCondition: 'Suhu Rendah (5°C)', // Override
      bottlePosition: 'Tegak',
      usagePattern: 'Sekali Pakai',
      deviceConfiguration: {
        deviceType: 'Aerosol',
        aerosol: {
          actuatorCode: 'ACT-01',
          canOrBottleCode: 'CAN-150',
          valveCode: 'VLV-01',
          gasRatio: '60:40',
          gasType: 'LPG',
        },
      },
      ...overrides?.sampleOverrides,
    });

    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: dummyRecipe,
      setpoints: {
        forceSetpointN: 25,
        pressDurationMs: 1500,
        strokeMm: 10,
        bottleHeightMm: 130,
        actuatorAreaMm2: 150,
        forceMode: 'Normal',
        normalForcePresetN: 25,
      },
      executionMeasurements: {
        initialGrossWeightG: 145.5,
        initialPressureBar: 4.5,
      },
      fixture: 'nominal-01',
      operatorId: 'op-1',
      operatorName: 'Operator Paragon',
      ...overrides?.runOverrides,
    });

    return { kp, sample, testRun };
  }

  it('renders Step 01 Identifikasi with pre-populated client metadata and override indicator', async () => {
    const { kp, sample, testRun } = await seedTestRun();

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/execute?step=1`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/execute"
            element={<TestExecutionWizardPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    // Verify wizard loaded
    await waitFor(() => {
      expect(screen.getByText(/01\. Identifikasi Sampel & Konteks Studi/i)).toBeInTheDocument();
    });

    // Check fields pre-populated
    expect(screen.getByDisplayValue('Hydra Mist Aerosol')).toBeInTheDocument();
    expect(screen.getByDisplayValue('LOT-2026-X1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('KUF-HM-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('SMPL-A01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Verifikasi stabilitas aktuator')).toBeInTheDocument();

    // Check storage override hint
    expect(screen.getByText(/Override khusus sampel \(Default KP: Suhu Ruang\)/i)).toBeInTheDocument();
  });

  it('navigates through Stepper and handles conditional Device Config in Step 02', async () => {
    const { kp, sample, testRun } = await seedTestRun();

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/execute?step=1`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/execute"
            element={<TestExecutionWizardPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/01\. Identifikasi Sampel/i)).toBeInTheDocument();
    });

    // Click "Selanjutnya" to advance to Step 02
    const nextBtn = screen.getByRole('button', { name: /Selanjutnya/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/02\. Konfigurasi Device \/ Kemasan/i)).toBeInTheDocument();
    });

    // Seed was Aerosol
    expect(screen.getByDisplayValue('ACT-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CAN-150')).toBeInTheDocument();
    expect(screen.getByDisplayValue('VLV-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('60:40')).toBeInTheDocument();

    // Switch to Non-Aerosol
    const nonAerosolBtn = screen.getByRole('button', { name: /Non-Aerosol/i });
    fireEvent.click(nonAerosolBtn);

    // Verify Non-Aerosol conditional fields appear
    expect(screen.getByText(/Spesifikasi Komponen Non-Aerosol/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/BTL-PET-100/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/PMP-FST-18/i)).toBeInTheDocument();
  });

  it('converts Holding Time seconds to ms bidirectionally and supports force modes in Step 03', async () => {
    const { kp, sample, testRun } = await seedTestRun({
      runOverrides: {
        wizardProgress: { step1Completed: true, step2Completed: true },
      },
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/execute?step=3`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/execute"
            element={<TestExecutionWizardPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/03\. Parameter Uji & Sasaran Observasi/i)).toBeInTheDocument();
    });

    // Initial 1500 ms converted to 1.5 s
    const holdingTimeInput = screen.getByDisplayValue('1.5');
    expect(holdingTimeInput).toBeInTheDocument();
    expect(screen.getByText(/Konversi internal mesin: 1500 ms/i)).toBeInTheDocument();

    // Change to 2.25 seconds
    fireEvent.change(holdingTimeInput, { target: { value: '2.25' } });
    expect(screen.getByText(/Konversi internal mesin: 2250 ms/i)).toBeInTheDocument();

    // Check Bottle Height mm (must be in mm per client contract)
    expect(screen.getByDisplayValue('130')).toBeInTheDocument();
    expect(screen.getByText(/dimensi ketinggian botol \(satuan milimeter\)/i)).toBeInTheDocument();

    // Toggle Force Mode: Normal -> Tidak Normal
    const manualForceBtn = screen.getByRole('button', { name: /Tidak Normal \(Manual\)/i });
    fireEvent.click(manualForceBtn);

    expect(screen.getByText(/Gaya Tekan Kustom \(N\)/i)).toBeInTheDocument();
  });

  it('calculates live operational derived metrics in Step 04 and displays provenance tags', async () => {
    const { kp, sample, testRun } = await seedTestRun({
      runOverrides: {
        wizardProgress: { step1Completed: true, step2Completed: true, step3Completed: true },
      },
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/execute?step=4`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/execute"
            element={<TestExecutionWizardPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/04\. Eksekusi Pengujian & Data Lapangan/i)).toBeInTheDocument();
    });

    // Check provenance labels
    expect(screen.getAllByText(/MANUAL/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/HARDWARE/i).length).toBeGreaterThan(0);

    // Enter test measurements:
    // Bobot Awal: 145.5 g, Bobot Akhir: 144.5 g (Discharged mass = 1.000 g)
    // Durasi: 2.0 s (Discharge rate = 0.500 g/s)
    // Tekanan Awal: 4.5 bar, Tekanan Setelah: 4.0 bar (Pressure drop = 0.50 bar)
    // Verify pre-populated initial values
    expect(screen.getByDisplayValue('145.5')).toBeInTheDocument();
    expect(screen.getByDisplayValue('4.5')).toBeInTheDocument();

    const finalWeightInput = screen.getByPlaceholderText(/120.25/i);
    const durationInput = screen.getByPlaceholderText(/1.02/i);
    const finalPressureInput = screen.getByPlaceholderText(/4.2/i);

    fireEvent.change(finalWeightInput, { target: { value: '144.5' } });
    fireEvent.change(durationInput, { target: { value: '2.0' } });
    fireEvent.change(finalPressureInput, { target: { value: '4.0' } });

    // Verify live calculation cards
    await waitFor(() => {
      expect(screen.getAllByText('1.000 g').length).toBeGreaterThan(0);
      expect(screen.getAllByText('0.500 g/s').length).toBeGreaterThan(0);
      expect(screen.getAllByText('0.50 bar').length).toBeGreaterThan(0);
    });

    // Select leakage: Ya / Tidak
    const leakageSelect = screen.getByRole('combobox');
    fireEvent.change(leakageSelect, { target: { value: 'Tidak' } });
    expect(screen.getByText(/Aman \(Tidak Bocor\)/i)).toBeInTheDocument();
  });

  it('persists draft on "Simpan Draf" without requiring completion', async () => {
    const { kp, sample, testRun } = await seedTestRun();

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/execute?step=1`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/execute"
            element={<TestExecutionWizardPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/01\. Identifikasi Sampel/i)).toBeInTheDocument();
    });

    // Edit KUF
    const kufInput = screen.getByDisplayValue('KUF-HM-01');
    fireEvent.change(kufInput, { target: { value: 'KUF-HM-UPDATED' } });

    // Click Simpan Draf
    const saveDraftBtn = screen.getByRole('button', { name: /Simpan Draf/i });
    fireEvent.click(saveDraftBtn);

    await waitFor(() => {
      expect(screen.getByText(/Draf pengujian berhasil disimpan/i)).toBeInTheDocument();
    });

    // Verify persisted in repository
    const reloadedKp = await kodePengujianRepository.get(kp.id);
    expect(reloadedKp?.kuf).toBe('KUF-HM-UPDATED');
  });

  it('locks inputs in read-only mode when TestRun is FINALIZED and displays final results', async () => {
    const { kp, sample, testRun } = await seedTestRun();

    // Finalize the testRun
    await kodePengujianRepository.updateTestRun(kp.id, testRun.id, {
      status: 'FINALIZED',
      operationalDerivedMetrics: {
        dischargedMassG: 1.25,
        dischargeRateGPerS: 0.625,
        pressureDropBar: 0.45,
      },
      finalReport: {
        test: {
          testId: testRun.id,
          sampleId: sample.id,
          operatorId: 'op-1',
          operatorName: 'Operator Paragon',
          recipeId: 'rec-1',
          recipeName: 'Standar 20N',
          fixture: 'nominal-01',
          setpoints: testRun.setpoints,
          executedAt: new Date().toISOString(),
        },
        status: 'FINALIZED',
        perspectives: ['side'],
        primaryCaptureMomentId: 'm-1',
        primaryCapture: {
          frameId: 'f-1',
          frameIndex: 10,
          timestampMs: 300,
          phase: 'stable',
          overlayAsset: 'asset-1',
        },
        analysisSource: 'simulation',
        side: {
          sprayLength: { auto: 245.5, final: 245.5, adjusted: false },
          sprayAngle: { auto: 32.1, final: 32.1, adjusted: false },
          verticalSpread: { auto: 55.0, final: 55.0, adjusted: false },
        },
        operationalMetrics: {
          derived: {
            dischargedMassG: 1.25,
            dischargeRateGPerS: 0.625,
            pressureDropBar: 0.45,
          },
        },
        finalizedBy: 'Operator Paragon',
        finalizedAt: new Date().toISOString(),
      } as unknown as FinalAnalysisReport,
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/execute?step=5`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/execute"
            element={<TestExecutionWizardPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/05\. Ringkasan & Hasil Akhir Pengujian/i)).toBeInTheDocument();
    });

    // Check read-only banner
    expect(screen.getByText(/Mode Pratinjau Terkunci/i)).toBeInTheDocument();

    // Check KPI cards
    expect(screen.getByText('1.250 g')).toBeInTheDocument();
    expect(screen.getByText('0.625 g/s')).toBeInTheDocument();
    expect(screen.getByText('0.45 bar')).toBeInTheDocument();
    expect(screen.getByText('245.5 mm')).toBeInTheDocument();

    // Check Add Replication disabled per client audit
    const addRepBtn = screen.getByRole('button', { name: /\+ Tambah Repetisi/i });
    expect(addRepBtn).toBeDisabled();

    // Check CSV Export button exists
    expect(screen.getByRole('button', { name: /Unduh Hasil \(CSV\)/i })).toBeInTheDocument();
  });

  it('route guard clamps step to 1 when previous steps are incomplete', async () => {
    const { kp, sample, testRun } = await seedTestRun();

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/execute?step=5`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/execute"
            element={<TestExecutionWizardPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    // Operator attempted step 5 directly on uncompleted test run -> clamped to Step 01
    await waitFor(() => {
      expect(screen.getByText(/01\. Identifikasi Sampel & Konteks Studi/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/05\. Ringkasan & Hasil Akhir Pengujian/i)).not.toBeInTheDocument();
  });

  it('formulaNumber round-trips from form to KP on save draft', async () => {
    const { kp, sample, testRun } = await seedTestRun();

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/execute?step=1`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/execute"
            element={<TestExecutionWizardPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/01\. Identifikasi Sampel/i)).toBeInTheDocument();
    });

    const formulaInput = screen.getByPlaceholderText(/FOR-2026-X01/i);
    fireEvent.change(formulaInput, { target: { value: 'FOR-PARAGON-99' } });

    const saveDraftBtn = screen.getByRole('button', { name: /Simpan Draf/i });
    fireEvent.click(saveDraftBtn);

    await waitFor(() => {
      expect(screen.getByText(/Draf pengujian berhasil disimpan/i)).toBeInTheDocument();
    });

    const reloadedKp = await kodePengujianRepository.get(kp.id);
    expect(reloadedKp?.formulaNumber).toBe('FOR-PARAGON-99');
  });

  it('updating test run observation objectives does NOT mutate parent KP default objectives', async () => {
    const { kp, sample, testRun } = await seedTestRun({
      kpOverrides: {
        observationObjectives: ['Panjang lintasan'],
      },
      runOverrides: {
        wizardProgress: { step1Completed: true, step2Completed: true },
        observationObjectives: ['Panjang lintasan'],
      },
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/execute?step=3`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/execute"
            element={<TestExecutionWizardPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/03\. Parameter Uji & Sasaran Observasi/i)).toBeInTheDocument();
    });

    // Toggle on "Sebaran" checkbox
    const sebaranLabel = screen.getByText('Sebaran');
    fireEvent.click(sebaranLabel);

    // Save draft
    const saveDraftBtn = screen.getByRole('button', { name: /Simpan Draf/i });
    fireEvent.click(saveDraftBtn);

    await waitFor(() => {
      expect(screen.getByText(/Draf pengujian berhasil disimpan/i)).toBeInTheDocument();
    });

    // Reload KP and verify default objectives were NOT changed
    const reloadedKp = await kodePengujianRepository.get(kp.id);
    expect(reloadedKp?.observationObjectives).toEqual(['Panjang lintasan']);

    // Reload testRun and verify snapshot received the update
    const reloadedTr = reloadedKp?.testRuns.find(t => t.id === testRun.id);
    expect(reloadedTr?.observationObjectives).toContain('Sebaran');
  });

  it('save draft failure keeps operator on current step and shows error message', async () => {
    const { kp, sample, testRun } = await seedTestRun();

    // Mock updateTestRun to fail
    vi.spyOn(kodePengujianRepository, 'updateTestRun').mockRejectedValueOnce(new Error('Network failure'));

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/execute?step=1`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/execute"
            element={<TestExecutionWizardPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/01\. Identifikasi Sampel/i)).toBeInTheDocument();
    });

    // Click "Selanjutnya" which triggers handleSaveDraft
    const nextBtn = screen.getByRole('button', { name: /Selanjutnya/i });
    fireEvent.click(nextBtn);

    // Error banner displayed
    await waitFor(() => {
      expect(screen.getByText(/Gagal menyimpan draf pengujian/i)).toBeInTheDocument();
    });

    // Must NOT have advanced to Step 02
    expect(screen.getByText(/01\. Identifikasi Sampel/i)).toBeInTheDocument();
    expect(screen.queryByText(/02\. Konfigurasi Device \/ Kemasan/i)).not.toBeInTheDocument();
  });
});
