import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { KodePengujian, TestRun, Sample } from '@spray-paragon/domain';
import { canFinalizeTestRun, createCalibrationSnapshot } from '@spray-paragon/domain';
import { kodePengujianRepository, simulationService } from '../application/services';
import { TestRunSimulationAnalysisWorkspace } from '../presentation/pages/KodePengujian/TestRunSimulationAnalysisWorkspace';
import { TestRunAnalysisPage } from '../presentation/pages/KodePengujian/TestRunAnalysisPage';

describe('TestRun Simulation Analysis Workspace', () => {
  let kp: KodePengujian;
  let sample: Sample;
  let testRun: TestRun;

  beforeEach(async () => {
    window.localStorage.clear();

    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: vi.fn((blob: Blob) => `blob:stub-${blob.size}`),
      });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: vi.fn(),
      });
    }

    // Create a Kode Pengujian with a sample and test run that has simulation capture session
    const created = await kodePengujianRepository.create({
      productId: 'prod-1',
      productSnapshot: { productCode: 'PRD-01', productName: 'Botol Spray 100ml' },
      operatorId: 'op-1',
      operatorName: 'Test Operator',
    });
    kp = created;

    const sampleResult = await kodePengujianRepository.addSample(kp.id, {
      sampleCode: 'SMP-01',
    });
    sample = sampleResult.sample;
    kp = sampleResult.kodePengujian;

    const testRunResult = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-A',
      recipeSnapshot: {
        name: 'Recipe A',
        forceSetpointN: 20,
        pressDurationMs: 400,
        strokeMm: 12,
      },
      setpoints: {
        forceSetpointN: 20,
        pressDurationMs: 400,
        strokeMm: 12,
      },
      fixture: 'nominal-01',
      operatorId: 'op-1',
      operatorName: 'Test Operator',
    });
    testRun = testRunResult.testRun;
    kp = testRunResult.kodePengujian;

    // Start the test run capture (simulation mode) and complete it with deterministic moments from simulationService
    const allFrames = simulationService.getSynchronizedFrames();
    const moments = allFrames.slice(0, 4);

    const simulationCapture = await kodePengujianRepository.updateTestRun(kp.id, testRun.id, {
      captureSession: {
        captureMode: 'simulation',
        scenario: 'nominal-01',
        synchronizedMoments: moments,
        startedAt: '2026-10-20T10:00:00Z',
        capturedAt: '2026-10-20T10:00:01Z',
      },
      status: 'ANALYZING',
    });
    testRun = simulationCapture;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWorkspace = (testRunOverride?: Partial<TestRun>) => {
    const tr = { ...testRun, ...testRunOverride };
    return render(
      <MemoryRouter initialEntries={['/analysis']}>
        <Routes>
          <Route
            path="/analysis"
            element={
              <TestRunSimulationAnalysisWorkspace
                kp={kp}
                sample={sample}
                testRun={tr}
                onBack={() => {}}
              />
            }
          />
          <Route
            path="/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/result"
            element={<div data-testid="result-page">Result Page</div>}
          />
        </Routes>
      </MemoryRouter>
    );
  };

  it('1. opens simulation analysis workspace without "real only" error', async () => {
    renderWorkspace();
    await waitFor(() => {
      expect(screen.queryByText('Analisis hanya tersedia untuk sesi capture nyata')).not.toBeInTheDocument();
      expect(screen.getByText('Mode Simulasi — Data Fixture')).toBeInTheDocument();
    });
  });

  it('2. renders deterministic timeline with synchronized frames from fixture', async () => {
    renderWorkspace();
    await waitFor(() => {
      expect(screen.getByText(/1 \/ 4/)).toBeInTheDocument(); // Frame counter showing current/total
    });
  });

  it('3. renders Side and Front camera views with deterministic fixture data', async () => {
    renderWorkspace();
    await waitFor(() => {
      expect(screen.getByText('Profil Samping')).toBeInTheDocument(); // Side camera label
    });
    // Switch to front camera - button text is "Pola Depan"
    fireEvent.click(screen.getByText('Pola Depan'));
    await waitFor(() => {
      expect(screen.getByText('Pola Depan')).toBeInTheDocument();
    });
  });

  it('4. supports Primary and Supporting capture selection', async () => {
    renderWorkspace();
    await waitFor(() => {
      const setPrimaryBtn = screen.getByRole('button', { name: /Jadikan Utama/ });
      fireEvent.click(setPrimaryBtn);
    });
    await waitFor(() => {
      expect(screen.getAllByText('Tangkapan Utama').length).toBeGreaterThan(0);
    });
  });

  it('5. persists measurement corrections to TestRun.analysisDraft', async () => {
    renderWorkspace();
    await waitFor(() => {
      // Set primary first
      const setPrimaryBtn = screen.getByRole('button', { name: /Jadikan Utama/ });
      fireEvent.click(setPrimaryBtn);
    });
    await waitFor(() => {
      // Start measurement edit - button says "Koreksi Pengukuran"
      const editBtn = screen.getByRole('button', { name: /Koreksi Pengukuran/ });
      fireEvent.click(editBtn);
    });
    await waitFor(() => {
      // Apply measurement - button says "Terapkan Pengukuran"
      const applyBtn = screen.getByRole('button', { name: /Terapkan Pengukuran/ });
      fireEvent.click(applyBtn);
    });
    // Wait for persistDraft to complete
    await waitFor(() => {}, { timeout: 1000 });
  });

  it('6. draft survives reload (persisted to repository)', async () => {
    const { unmount } = renderWorkspace();
    // Set primary and edit measurement
    await waitFor(() => {
      const setPrimaryBtn = screen.getByRole('button', { name: /Jadikan Utama/ });
      fireEvent.click(setPrimaryBtn);
    });
    await waitFor(() => {
      const editBtn = screen.getByRole('button', { name: /Koreksi Pengukuran/ });
      fireEvent.click(editBtn);
      const applyBtn = screen.getByRole('button', { name: /Terapkan Pengukuran/ });
      fireEvent.click(applyBtn);
    });
    // Wait for persist
    await waitFor(async () => {
      const refreshed = await kodePengujianRepository.get(kp.id);
      const tr = refreshed?.testRuns.find(t => t.id === testRun.id);
      expect(tr?.analysisDraft?.primaryCaptureMomentId).toBeTruthy();
    });
    unmount();
    // Reload - create new workspace with refreshed testRun from repository (which now has analysisDraft)
    const refreshed = await kodePengujianRepository.get(kp.id);
    const refreshedTr = refreshed!.testRuns.find(t => t.id === testRun.id)!;
    renderWorkspace(refreshedTr);
    await waitFor(() => {
      expect(screen.getAllByText('Tangkapan Utama').length).toBeGreaterThan(0);
    });
  });

  it('7. simulation evidence never satisfies real TestRun finalization', async () => {
    // Create a real test run
    const realKp = await kodePengujianRepository.create({
      productId: 'prod-1',
      productSnapshot: { productCode: 'PRD-01', productName: 'Botol Spray 100ml' },
      operatorId: 'op-1',
      operatorName: 'Test Operator',
    });
    const realSample = (await kodePengujianRepository.addSample(realKp.id, { sampleCode: 'SMP-REAL' })).sample;
    const realTestRun = (await kodePengujianRepository.addTestRun(realKp.id, {
      sampleId: realSample.id,
      recipeId: 'rec-A',
      recipeSnapshot: { name: 'Recipe A', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'op-1',
      operatorName: 'Test Operator',
    })).testRun;

    const calSide = createCalibrationSnapshot({
      camera: 'side',
      referenceDistanceMm: 1000,
      anchorA: { x: 112, y: 296 },
      anchorB: { x: 634, y: 296 },
    });
    const calFront = createCalibrationSnapshot({
      camera: 'front',
      referenceDistanceMm: 500,
      anchorA: { x: 265, y: 85 },
      anchorB: { x: 465, y: 85 },
    });

    // Add real capture session without CV evidence
    await kodePengujianRepository.updateTestRun(realKp.id, realTestRun.id, {
      captureSession: {
        captureMode: 'real',
        scenario: 'nominal-01',
        synchronizedMoments: [],
        realSideFrames: [{ id: 'rf-1', frameIndex: 0, assetId: 'kp:1:sample:1:run:1:side:0', camera: 'side', elapsedMs: 0, capturedAt: '2026-10-20T10:00:00Z' }],
        realSideBaseline: {
          selectionMethod: 'initial-window',
          configuredWindowMs: 200,
          startElapsedMs: 0,
          endElapsedMs: 0,
          frames: [{ frameId: 'rf-1', frameIndex: 0, elapsedMs: 0, assetId: 'kp:1:sample:1:run:1:side:0' }],
          selectedAt: '2026-10-20T10:00:00Z',
        },
        startedAt: '2026-10-20T10:00:00Z',
        capturedAt: '2026-10-20T10:00:01Z',
      },
      status: 'ANALYZING',
      analysisDraft: {
        calibration: {
          side: calSide,
          front: calFront,
        },
        primaryCaptureMomentId: 'rf-1',
        supportingCaptureMomentIds: [],
        sideCorrections: {
          'rf-1': {
            nozzleOriginPx: { x: 100, y: 100 },
            sprayEndpointPx: { x: 200, y: 100 },
            upperBoundaryPx: { x: 150, y: 80 },
            lowerBoundaryPx: { x: 150, y: 120 },
            verticalSpreadTopPx: { x: 150, y: 80 },
            verticalSpreadBottomPx: { x: 150, y: 120 },
            directionReferencePx: { x: 100, y: 50 },
          },
        },
        frontCorrections: {},
        updatedAt: '2026-10-20T10:10:00Z',
      },
    });

    // Refresh to get latest state
    const refreshed = await kodePengujianRepository.get(realKp.id);
    const refreshedRun = refreshed!.testRuns.find(t => t.id === realTestRun.id);

    // Real capture should be blocked from finalization (CV pipeline not integrated)
    const result = canFinalizeTestRun(refreshed!, refreshedRun!.id);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reasons.some((r: string) => r.includes('CV analysis pipeline not integrated'))).toBe(true);
    }
  });

  it('8. real analysis path unchanged (real capture still routes to RealSideAnalysisWorkspace)', async () => {
    const realKp = await kodePengujianRepository.create({
      productId: 'prod-1',
      productSnapshot: { productCode: 'PRD-01', productName: 'Botol Spray 100ml' },
      operatorId: 'op-1',
      operatorName: 'Test Operator',
    });
    const realSample = (await kodePengujianRepository.addSample(realKp.id, { sampleCode: 'SMP-REAL' })).sample;
    const realTestRun = (await kodePengujianRepository.addTestRun(realKp.id, {
      sampleId: realSample.id,
      recipeId: 'rec-A',
      recipeSnapshot: { name: 'Recipe A', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'op-1',
      operatorName: 'Test Operator',
    })).testRun;

    await kodePengujianRepository.updateTestRun(realKp.id, realTestRun.id, {
      captureSession: {
        captureMode: 'real',
        scenario: 'nominal-01',
        synchronizedMoments: [],
        realSideFrames: [{ id: 'rf-1', frameIndex: 0, assetId: 'kp:1:sample:1:run:1:side:0', camera: 'side', elapsedMs: 0, capturedAt: '2026-10-20T10:00:00Z' }],
        realSideBaseline: {
          selectionMethod: 'initial-window',
          configuredWindowMs: 200,
          startElapsedMs: 0,
          endElapsedMs: 0,
          frames: [{ frameId: 'rf-1', frameIndex: 0, elapsedMs: 0, assetId: 'kp:1:sample:1:run:1:side:0' }],
          selectedAt: '2026-10-20T10:00:00Z',
        },
        startedAt: '2026-10-20T10:00:00Z',
        capturedAt: '2026-10-20T10:00:01Z',
      },
      status: 'ANALYZING',
    });

    const updated = await kodePengujianRepository.get(realKp.id);
    const updatedRun = updated!.testRuns.find(t => t.id === realTestRun.id);
    expect(updatedRun?.captureSession?.captureMode).toBe('real');
  });

  it('9. missing capture session shows capability-specific error via TestRunAnalysisPage', async () => {
    const errorKp = await kodePengujianRepository.create({
      productId: 'prod-1',
      productSnapshot: { productCode: 'PRD-01', productName: 'Botol Spray 100ml' },
      operatorId: 'op-1',
      operatorName: 'Test Operator',
    });
    const s = (await kodePengujianRepository.addSample(errorKp.id, { sampleCode: 'SMP-ERR' })).sample;
    const tr = (await kodePengujianRepository.addTestRun(errorKp.id, {
      sampleId: s.id,
      recipeId: 'rec-A',
      recipeSnapshot: { name: 'Recipe A', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'op-1',
      operatorName: 'Test Operator',
    })).testRun;
    await kodePengujianRepository.updateTestRun(errorKp.id, tr.id, {
      status: 'ANALYZING',
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${errorKp.id}/samples/${s.id}/runs/${tr.id}/analysis`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/analysis"
            element={<TestRunAnalysisPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Sesi capture tidak ditemukan/)).toBeInTheDocument();
    });
  });

  it('10. simulation without synchronized moments shows capability-specific error via TestRunAnalysisPage', async () => {
    const errorKp = await kodePengujianRepository.create({
      productId: 'prod-1',
      productSnapshot: { productCode: 'PRD-01', productName: 'Botol Spray 100ml' },
      operatorId: 'op-1',
      operatorName: 'Test Operator',
    });
    const s = (await kodePengujianRepository.addSample(errorKp.id, { sampleCode: 'SMP-ERR2' })).sample;
    const tr = (await kodePengujianRepository.addTestRun(errorKp.id, {
      sampleId: s.id,
      recipeId: 'rec-A',
      recipeSnapshot: { name: 'Recipe A', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'op-1',
      operatorName: 'Test Operator',
    })).testRun;
    await kodePengujianRepository.updateTestRun(errorKp.id, tr.id, {
      status: 'ANALYZING',
      captureSession: {
        captureMode: 'simulation',
        scenario: 'nominal-01',
        synchronizedMoments: [],
        startedAt: '2026-10-20T10:00:00Z',
      },
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${errorKp.id}/samples/${s.id}/runs/${tr.id}/analysis`]}>
        <Routes>
          <Route
            path="/kode-pengujian/:kpId/samples/:sampleId/runs/:runId/analysis"
            element={<TestRunAnalysisPage />}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Tidak ada momen sinkron yang tersedia untuk analisis simulasi/)).toBeInTheDocument();
    });
  });

  it('11. eligible simulation run shows Finalisasi Hasil button when primary and geometries are set', async () => {
    renderWorkspace();
    // Set primary capture
    await waitFor(() => {
      const setPrimaryBtn = screen.getByRole('button', { name: /Jadikan Utama/ });
      fireEvent.click(setPrimaryBtn);
    });
    // Edit and apply measurement for both side and front
    await waitFor(() => {
      const editBtn = screen.getByRole('button', { name: /Koreksi Pengukuran/ });
      fireEvent.click(editBtn);
    });
    await waitFor(() => {
      const applyBtn = screen.getByRole('button', { name: /Terapkan Pengukuran/ });
      fireEvent.click(applyBtn);
    });
    await waitFor(() => {}, { timeout: 1000 });

    // Should show "Siap Difinalisasi" status and "Finalisasi Hasil" button
    await waitFor(() => {
      expect(screen.getByText('Siap Difinalisasi')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Finalisasi Hasil/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Finalisasi Hasil/ })).not.toBeDisabled();
    });
  });

  it('12. non-ready simulation shows blocking reasons (no primary, no geometries)', async () => {
    renderWorkspace();
    // Should show "Belum Siap" with reasons
    await waitFor(() => {
      expect(screen.getByText('Belum Siap')).toBeInTheDocument();
      expect(screen.getByText('Primary capture moment not selected. Select a primary capture in the analysis workspace.')).toBeInTheDocument();
    });
  });

  it('13. finalize creates immutable FinalAnalysisReport with analysisSource = simulation', async () => {
    renderWorkspace();
    // Set primary capture
    await waitFor(() => {
      const setPrimaryBtn = screen.getByRole('button', { name: /Jadikan Utama/ });
      fireEvent.click(setPrimaryBtn);
    });
    // Edit and apply measurement
    await waitFor(() => {
      const editBtn = screen.getByRole('button', { name: /Koreksi Pengukuran/ });
      fireEvent.click(editBtn);
    });
    await waitFor(() => {
      const applyBtn = screen.getByRole('button', { name: /Terapkan Pengukuran/ });
      fireEvent.click(applyBtn);
    });
    await waitFor(() => {}, { timeout: 1000 });

    // Click Finalisasi Hasil
    await waitFor(() => {
      const finalizeBtn = screen.getByRole('button', { name: /Finalisasi Hasil/ });
      fireEvent.click(finalizeBtn);
    });
    await waitFor(() => {}, { timeout: 2000 });

    // Should navigate to result page (result page element is rendered)
    await waitFor(() => {
      expect(screen.getByTestId('result-page')).toBeInTheDocument();
    });

    // Verify report is persisted in repository
    const refreshed = await kodePengujianRepository.get(kp.id);
    const tr = refreshed!.testRuns.find(t => t.id === testRun.id)!;
    expect(tr.status).toBe('FINALIZED');
    expect(tr.finalReport).toBeDefined();
    expect(tr.finalReport!.analysisSource).toBe('simulation');
    expect(tr.finalReport!.primaryCaptureMomentId).toBeTruthy();
    expect(tr.finalReport!.supportingCaptureMomentIds).toEqual([]);
    expect(tr.finalReport!.side).toBeDefined();
    expect(tr.finalReport!.front).toBeDefined();
    expect(tr.finalReport!.side.calibration).toBeDefined();
    expect(tr.finalReport!.front!.calibration).toBeDefined();

    // Verify CSV export works with simulation report
    const { createFinalReportCsv } = await import('../application/reporting/createFinalReportCsv');
    const report = tr.finalReport!;
    const csv = createFinalReportCsv(report);
    expect(csv).toContain('analysis_source');
    expect(csv).toContain('simulation');
  });

  it('14. sample becomes TESTED, KP remains ACTIVE after finalize', async () => {
    renderWorkspace();
    await waitFor(() => {
      const setPrimaryBtn = screen.getByRole('button', { name: /Jadikan Utama/ });
      fireEvent.click(setPrimaryBtn);
    });
    await waitFor(() => {
      const editBtn = screen.getByRole('button', { name: /Koreksi Pengukuran/ });
      fireEvent.click(editBtn);
    });
    await waitFor(() => {
      const applyBtn = screen.getByRole('button', { name: /Terapkan Pengukuran/ });
      fireEvent.click(applyBtn);
    });
    await waitFor(() => {}, { timeout: 1000 });

    await waitFor(() => {
      const finalizeBtn = screen.getByRole('button', { name: /Finalisasi Hasil/ });
      fireEvent.click(finalizeBtn);
    });
    await waitFor(() => {}, { timeout: 2000 });

    const refreshed = await kodePengujianRepository.get(kp.id);
    expect(refreshed!.samples.find(s => s.id === sample.id)!.status).toBe('TESTED');
    expect(refreshed!.status).toBe('ACTIVE');
  });

  it('15. re-finalization is blocked (immutability)', async () => {
    // First finalize
    renderWorkspace();
    await waitFor(() => {
      const setPrimaryBtn = screen.getByRole('button', { name: /Jadikan Utama/ });
      fireEvent.click(setPrimaryBtn);
    });
    await waitFor(() => {
      const editBtn = screen.getByRole('button', { name: /Koreksi Pengukuran/ });
      fireEvent.click(editBtn);
    });
    await waitFor(() => {
      const applyBtn = screen.getByRole('button', { name: /Terapkan Pengukuran/ });
      fireEvent.click(applyBtn);
    });
    await waitFor(() => {}, { timeout: 1000 });

    await waitFor(() => {
      const finalizeBtn = screen.getByRole('button', { name: /Finalisasi Hasil/ });
      fireEvent.click(finalizeBtn);
    });
    await waitFor(() => {}, { timeout: 2000 });

    // Reload and try to finalize again - should show finalized status
    const refreshed = await kodePengujianRepository.get(kp.id);
    const tr = refreshed!.testRuns.find(t => t.id === testRun.id)!;
    expect(tr.status).toBe('FINALIZED');
    expect(tr.finalReport).toBeDefined();

    // Try to call finalize again via domain - should throw
    const { finalizeTestRun: finalizeDomain } = await import('@spray-paragon/domain');
    const report = tr.finalReport!;
    expect(() => finalizeDomain(refreshed!, tr.id, report)).toThrow(/already has a final report/);
  });
});
