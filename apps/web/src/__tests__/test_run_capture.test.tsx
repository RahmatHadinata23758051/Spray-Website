import React from 'react';
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import {
  kodePengujianRepository,
  captureAssetStore,
  batchRepository,
} from '../application/services';
import {
  buildTestRunCaptureAssetId,
  buildCaptureAssetId,
} from '../application/captureAssets';
import { BATCH_STORAGE_KEY } from '../data/local/batchRepository';

describe('Phase P3A — TestRun Capture Bridge', () => {
  beforeAll(() => {
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:stub' });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
    }
  });

  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    // Clean up navigation interceptor from previous tests
    if (typeof window !== 'undefined') {
      delete window.__spraybot_on_nav_attempt;
      delete window.__spraybot_navigation_blocker;
    }
    vi.restoreAllMocks();
  });

  it('1. PENDING TestRun in KodePengujianDetailPage has "Mulai Pengujian" action navigating to capture route', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-A' });
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    expect(testRun.status).toBe('PENDING');

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}`]}>
        <App />
      </MemoryRouter>
    );

    const startBtn = await screen.findByRole('button', { name: /Mulai Pengujian/i });
    expect(startBtn).toBeInTheDocument();

    fireEvent.click(startBtn);

    // Verify it navigated to the contextual capture route
    expect(await screen.findByText(/Mode kamera nyata — Side only|Mode simulasi/i)).toBeInTheDocument();
    expect(screen.getByText(testRun.id)).toBeInTheDocument();
  });

  it('2. renders full hierarchical context on capture route (KP, Sample effective context, Recipe setpoints)', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      storageCondition: 'Suhu Ruang 25°C',
      bottlePosition: 'Tegak',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    // Sample overrides bottle position
    const { sample } = await kodePengujianRepository.addSample(kp.id, {
      sampleCode: 'SMP-OVERRIDE',
      bottlePosition: 'Miring 45°',
    });

    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 30N', forceSetpointN: 30, pressDurationMs: 500, strokeMm: 15 },
      setpoints: { forceSetpointN: 30, pressDurationMs: 500, strokeMm: 15 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(kp.id)).toBeInTheDocument();
    expect(screen.getByText('SMP-OVERRIDE')).toBeInTheDocument();
    expect(screen.getByText(testRun.id)).toBeInTheDocument();
    expect(screen.getByText('Standar 30N')).toBeInTheDocument();
    // Inherited from parent
    expect(screen.getByText(/Kondisi Simpan: Suhu Ruang 25°C/)).toBeInTheDocument();
    // Overridden by sample
    expect(screen.getByText(/Posisi Botol: Miring 45°/)).toBeInTheDocument();
    // Setpoints
    expect(screen.getByText(/30 N · 500 ms · 15 mm/)).toBeInTheDocument();
  });

  it('3. blocks invalid hierarchy: cross-parent mismatch and non-existent IDs show error state', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const { sample: sample1 } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-1' });
    const { sample: sample2 } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-2' });

    // testRun belongs to sample1
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample1.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    // Attempting to access testRun with sample2 in the URL must be rejected
    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample2.id}/runs/${testRun.id}/capture`]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Kesalahan Akuisisi/i })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`Pengujian ${testRun.id} tidak ditemukan untuk Sampel ${sample2.id}`, 'i'))).toBeInTheDocument();
  });

  it('4. persists simulated capture to TestRun.captureSession with status CAPTURING without creating a Batch', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-01' });
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
        <App />
      </MemoryRouter>
    );

    const simBtn = await screen.findByRole('button', { name: /Mulai Simulasi/i });
    fireEvent.click(simBtn);

    // Verify status updated in repository
    await waitFor(async () => {
      const refreshed = await kodePengujianRepository.get(kp.id);
      const tr = refreshed?.testRuns.find(t => t.id === testRun.id);
      expect(tr?.status).toBe('CAPTURING');
      expect(tr?.captureSession).toBeDefined();
      expect(tr?.captureSession?.captureMode).toBe('simulation');
    });

    // Verify NO legacy Batch was created in localStorage
    expect(window.localStorage.getItem(BATCH_STORAGE_KEY)).toBeNull();
  });

  it('5. asset key generation uses immutable namespace kp:{kpId}:sample:{sampleId}:run:{runId}:side:{frameIndex} and does not collide', async () => {
    const key1 = buildTestRunCaptureAssetId('KP-2026-001', 'SMP-001', 'TR-001', 0);
    const key2 = buildTestRunCaptureAssetId('KP-2026-001', 'SMP-001', 'TR-001', 1);
    const keyRunB = buildTestRunCaptureAssetId('KP-2026-001', 'SMP-001', 'TR-002', 0);
    const keySampleB = buildTestRunCaptureAssetId('KP-2026-001', 'SMP-002', 'TR-001', 0);
    const legacyKey = buildCaptureAssetId('BAT-2026-001', 0);

    expect(key1).toBe('kp:KP-2026-001:sample:SMP-001:run:TR-001:side:000');
    expect(key2).toBe('kp:KP-2026-001:sample:SMP-001:run:TR-001:side:001');
    expect(keyRunB).toBe('kp:KP-2026-001:sample:SMP-001:run:TR-002:side:000');
    expect(keySampleB).toBe('kp:KP-2026-001:sample:SMP-002:run:TR-001:side:000');

    // All keys are unique
    const set = new Set([key1, key2, keyRunB, keySampleB, legacyKey]);
    expect(set.size).toBe(5);
  });

  it('6. TestRun A capture does not mutate or affect TestRun B under the same KP', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-01' });
    const { testRun: runA } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });
    const { testRun: runB } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-2',
      recipeSnapshot: { name: 'Heavy 40N', forceSetpointN: 40, pressDurationMs: 600, strokeMm: 15 },
      setpoints: { forceSetpointN: 40, pressDurationMs: 600, strokeMm: 15 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    // Start capture on runA
    await kodePengujianRepository.updateTestRun(kp.id, runA.id, {
      status: 'CAPTURING',
      captureSession: {
        scenario: 'nominal-01',
        synchronizedMoments: [],
        startedAt: new Date().toISOString(),
        captureMode: 'real',
        realSideFrames: [
          {
            id: 'real-side-000',
            frameIndex: 0,
            capturedAt: new Date().toISOString(),
            elapsedMs: 0,
            camera: 'side',
            assetId: buildTestRunCaptureAssetId(kp.id, sample.id, runA.id, 0),
          },
        ],
      },
    });

    const updatedKp = await kodePengujianRepository.get(kp.id);
    const updatedRunA = updatedKp?.testRuns.find(t => t.id === runA.id);
    const updatedRunB = updatedKp?.testRuns.find(t => t.id === runB.id);

    expect(updatedRunA?.status).toBe('CAPTURING');
    expect(updatedRunA?.captureSession?.realSideFrames).toHaveLength(1);

    expect(updatedRunB?.status).toBe('PENDING');
    expect(updatedRunB?.captureSession).toBeUndefined();
  });

  it('7. reload restores persisted real Side frames and baseline on TestRun', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-01' });
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const assetId0 = buildTestRunCaptureAssetId(kp.id, sample.id, testRun.id, 0);
    const assetId1 = buildTestRunCaptureAssetId(kp.id, sample.id, testRun.id, 1);

    // Save binaries to store
    await captureAssetStore.save(assetId0, { kind: 'testRun', kpId: kp.id, sampleId: sample.id, runId: testRun.id }, new Blob(['blob-0'], { type: 'image/jpeg' }));
    await captureAssetStore.save(assetId1, { kind: 'testRun', kpId: kp.id, sampleId: sample.id, runId: testRun.id }, new Blob(['blob-1'], { type: 'image/jpeg' }));

    // Persist to repository
    await kodePengujianRepository.updateTestRun(kp.id, testRun.id, {
      status: 'CAPTURING',
      captureSession: {
        scenario: 'nominal-01',
        synchronizedMoments: [],
        startedAt: new Date().toISOString(),
        captureMode: 'real',
        realSideFrames: [
          { id: 'f-0', frameIndex: 0, capturedAt: new Date().toISOString(), elapsedMs: 0, camera: 'side', assetId: assetId0 },
          { id: 'f-1', frameIndex: 1, capturedAt: new Date().toISOString(), elapsedMs: 100, camera: 'side', assetId: assetId1 },
        ],
        realSideBaseline: {
          selectionMethod: 'initial-window',
          configuredWindowMs: 200,
          startElapsedMs: 0,
          endElapsedMs: 100,
          frames: [
            { frameId: 'f-0', frameIndex: 0, elapsedMs: 0, assetId: assetId0 },
          ],
          selectedAt: new Date().toISOString(),
        },
      },
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(/2 frame Side/i)).toBeInTheDocument();
    expect(screen.getByText(/1 frame · 0–100 ms/i)).toBeInTheDocument();
  });

  it('8. legacy Batch capture regression: /batches/:batchId/capture still works cleanly', async () => {
    const batch = await batchRepository.createBatchDraft({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
      fixture: 'nominal-01',
    });

    await batchRepository.prepareBatch(batch.id);

    render(
      <MemoryRouter initialEntries={[`/batches/${batch.id}/capture`]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(batch.id)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mulai Simulasi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mulai Pengambilan/i })).toBeInTheDocument();
  });

  describe('Phase P4 — Capture Save Policy & Unsaved Data Guard', () => {
    it('9. review mode (default) does not accept capture automatically and shows Simpan, Ulangi, Buang actions', async () => {
      const kp = await kodePengujianRepository.create({
        productId: 'p-1',
        productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });
      const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-REV' });
      const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sample.id,
        recipeId: 'rec-1',
        recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        fixture: 'nominal-01',
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });

      render(
        <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
          <App />
        </MemoryRouter>
      );

      // Verify default policy is 'Tinjau sebelum menyimpan' (review)
      expect(await screen.findByRole('button', { name: /Tinjau sebelum menyimpan/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Simpan otomatis/i })).toBeInTheDocument();

      // Start simulation
      const simBtn = await screen.findByRole('button', { name: /Mulai Simulasi/i }, { timeout: 15000 });
      fireEvent.click(simBtn);

      // Wait for simulation to complete and enter pending review state
      const saveBtn = await screen.findByRole('button', { name: /^Simpan$/i }, { timeout: 15000 });
      expect(saveBtn).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /Ulangi Pengambilan/i }, { timeout: 15000 })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: /^Buang$/i }, { timeout: 15000 })).toBeInTheDocument();

      // In review mode, completed capture is in pending state: TestRun.captureSession must NOT be persisted as accepted yet
      const refreshedKp = await kodePengujianRepository.get(kp.id);
      const tr = refreshedKp?.testRuns.find(t => t.id === testRun.id);
      // It is not finalized or accepted with synchronizedMoments
      expect(tr?.captureSession?.synchronizedMoments?.length ?? 0).toBe(0);
    });

    it('10. clicking Simpan in review mode persists captureSession to repository', async () => {
      const kp = await kodePengujianRepository.create({
        productId: 'p-1',
        productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });
      const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-SAVE' });
      const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sample.id,
        recipeId: 'rec-1',
        recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        fixture: 'nominal-01',
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });

      render(
        <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
          <App />
        </MemoryRouter>
      );

      const simBtn = await screen.findByRole('button', { name: /Mulai Simulasi/i });
      fireEvent.click(simBtn);

      const saveBtn = await screen.findByRole('button', { name: /^Simpan$/i }, { timeout: 15000 });
      fireEvent.click(saveBtn);

      // After clicking Simpan, captureSession is persisted
      await waitFor(async () => {
        const refreshedKp = await kodePengujianRepository.get(kp.id);
        const tr = refreshedKp?.testRuns.find(t => t.id === testRun.id);
        expect(tr?.captureSession).toBeDefined();
        expect(tr?.captureSession?.captureMode).toBe('simulation');
        expect(tr?.captureSession?.synchronizedMoments?.length).toBeGreaterThan(0);
      });
    });

    it('11. Retake (Ulangi Pengambilan) clears pending capture and returns to ready state', async () => {
      const kp = await kodePengujianRepository.create({
        productId: 'p-1',
        productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });
      const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-RETAKE' });
      const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sample.id,
        recipeId: 'rec-1',
        recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        fixture: 'nominal-01',
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });

      render(
        <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
          <App />
        </MemoryRouter>
      );

      fireEvent.click(await screen.findByRole('button', { name: /Mulai Simulasi/i }));

      const retakeBtn = await screen.findByRole('button', { name: /Ulangi Pengambilan/i }, { timeout: 15000 });
      fireEvent.click(retakeBtn);

      // Returns to ready capture state with start buttons
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Mulai Simulasi/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Simpan$/i })).not.toBeInTheDocument();
      });

      // Repository remains clean (status PENDING, no accepted captureSession)
      const refreshedKp = await kodePengujianRepository.get(kp.id);
      const tr = refreshedKp?.testRuns.find(t => t.id === testRun.id);
      expect(tr?.status).toBe('PENDING');
      expect(tr?.captureSession).toBeUndefined();
    });

    it('12. Discard (Buang) removes pending data and resets test run state', async () => {
      const kp = await kodePengujianRepository.create({
        productId: 'p-1',
        productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });
      const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-DISCARD' });
      const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sample.id,
        recipeId: 'rec-1',
        recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        fixture: 'nominal-01',
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });

      render(
        <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
          <App />
        </MemoryRouter>
      );

      fireEvent.click(await screen.findByRole('button', { name: /Mulai Simulasi/i }));

      const discardBtn = await screen.findByRole('button', { name: /^Buang$/i }, { timeout: 15000 });
      fireEvent.click(discardBtn);

      // Returns to initial PENDING state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Mulai Simulasi/i })).toBeInTheDocument();
      });
      const refreshedKp = await kodePengujianRepository.get(kp.id);
      const tr = refreshedKp?.testRuns.find(t => t.id === testRun.id);
      expect(tr?.status).toBe('PENDING');
      expect(tr?.captureSession).toBeUndefined();
    });

    it('13. auto mode persists capture automatically on completion and does NOT auto-navigate', async () => {
      const kp = await kodePengujianRepository.create({
        productId: 'p-1',
        productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });
      const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-AUTO' });
      const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sample.id,
        recipeId: 'rec-1',
        recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        fixture: 'nominal-01',
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });

      render(
        <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
          <App />
        </MemoryRouter>
      );

      // Switch to auto mode
      const autoBtn = await screen.findByRole('button', { name: /Simpan otomatis/i });
      fireEvent.click(autoBtn);

      // Start simulation
      fireEvent.click(screen.getByRole('button', { name: /Mulai Simulasi/i }));

      // In auto mode, upon completion it automatically saves to repository without operator clicking Simpan
      await waitFor(async () => {
        const refreshedKp = await kodePengujianRepository.get(kp.id);
        const tr = refreshedKp?.testRuns.find(t => t.id === testRun.id);
        expect(tr?.captureSession?.synchronizedMoments?.length).toBeGreaterThan(0);
        expect(tr?.status).toBe('CAPTURING');
      }, { timeout: 15000 });

      // Stays on capture page, does not auto-navigate to analysis
      expect(screen.getByText(/Linimasa Tangkapan/i)).toBeInTheDocument();
    });

    it('14. unsaved internal navigation triggers confirmation modal', async () => {
      const kp = await kodePengujianRepository.create({
        productId: 'p-1',
        productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });
      const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-NAV' });
      const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sample.id,
        recipeId: 'rec-1',
        recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        fixture: 'nominal-01',
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });

      render(
        <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
          <App />
        </MemoryRouter>
      );

      fireEvent.click(await screen.findByRole('button', { name: /Mulai Simulasi/i }));

      // Wait for pending capture in review mode
      await screen.findByRole('button', { name: /^Simpan$/i }, { timeout: 15000 });

      // Try to navigate via in-page "Kembali ke Kode Pengujian" button
      const backBtn = screen.getByRole('button', { name: /Kembali ke Kode Pengujian/i });
      fireEvent.click(backBtn);

      // Navigation confirmation modal should appear
      const navModalHeading = await screen.findByRole('heading', { name: /Hasil pengambilan data belum disimpan\./i });
      expect(navModalHeading).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Simpan & Keluar/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Keluar Tanpa Menyimpan/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Batal/i })).toBeInTheDocument();
    });

    it('15. beforeunload is active during pending capture and removed after save', async () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const kp = await kodePengujianRepository.create({
        productId: 'p-1',
        productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });
      const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-UNLOAD' });
      const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sample.id,
        recipeId: 'rec-1',
        recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        fixture: 'nominal-01',
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });

      render(
        <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
          <App />
        </MemoryRouter>
      );

      fireEvent.click(await screen.findByRole('button', { name: /Mulai Simulasi/i }));

      const saveBtn = await screen.findByRole('button', { name: /^Simpan$/i }, { timeout: 15000 });

      // Beforeunload was added when pendingCapture became true
      expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

      // Click save
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
      });
    });

    it('16. Save & Exit in confirmation modal persists session then navigates', async () => {
      const kp = await kodePengujianRepository.create({
        productId: 'p-1',
        productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });
      const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-SAVE-EXIT' });
      const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sample.id,
        recipeId: 'rec-1',
        recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        fixture: 'nominal-01',
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });

      render(
        <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
          <App />
        </MemoryRouter>
      );

      fireEvent.click(await screen.findByRole('button', { name: /Mulai Simulasi/i }));
      await screen.findByRole('button', { name: /^Simpan$/i }, { timeout: 15000 });

      // Click "Kembali ke Kode Pengujian" to trigger modal
      fireEvent.click(screen.getByRole('button', { name: /Kembali ke Kode Pengujian/i }));
      const saveAndExitBtn = await screen.findByRole('button', { name: /Simpan & Keluar/i });
      fireEvent.click(saveAndExitBtn);

      // Verify persisted in repository
      await waitFor(async () => {
        const refreshedKp = await kodePengujianRepository.get(kp.id);
        const tr = refreshedKp?.testRuns.find(t => t.id === testRun.id);
        expect(tr?.captureSession?.synchronizedMoments?.length).toBeGreaterThan(0);
      });
      // Navigated to KP detail page
      expect(await screen.findByText(/Sampel Pengujian/i)).toBeInTheDocument();
    });

    it('17. Discard & Exit in confirmation modal discards data and navigates', async () => {
      const kp = await kodePengujianRepository.create({
        productId: 'p-1',
        productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });
      const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-DISC-EXIT' });
      const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sample.id,
        recipeId: 'rec-1',
        recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        fixture: 'nominal-01',
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });

      render(
        <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
          <App />
        </MemoryRouter>
      );

      fireEvent.click(await screen.findByRole('button', { name: /Mulai Simulasi/i }));
      await screen.findByRole('button', { name: /^Simpan$/i }, { timeout: 15000 });

      // Click "Kembali ke Kode Pengujian" to trigger modal
      fireEvent.click(screen.getByRole('button', { name: /Kembali ke Kode Pengujian/i }));
      const discardAndExitBtn = await screen.findByRole('button', { name: /Keluar Tanpa Menyimpan/i });
      fireEvent.click(discardAndExitBtn);

      // Verify reset in repository
      await waitFor(async () => {
        const refreshedKp = await kodePengujianRepository.get(kp.id);
        const tr = refreshedKp?.testRuns.find(t => t.id === testRun.id);
        expect(tr?.status).toBe('PENDING');
        expect(tr?.captureSession).toBeUndefined();
      });
      // Navigated to KP detail page
      expect(await screen.findByText(/Sampel Pengujian/i)).toBeInTheDocument();
    });

    it('18. Cancel (Batal) in confirmation modal closes modal and remains on capture page', async () => {
      const kp = await kodePengujianRepository.create({
        productId: 'p-1',
        productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });
      const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-CANCEL' });
      const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sample.id,
        recipeId: 'rec-1',
        recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        fixture: 'nominal-01',
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });

      render(
        <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/capture`]}>
          <App />
        </MemoryRouter>
      );

      fireEvent.click(await screen.findByRole('button', { name: /Mulai Simulasi/i }));
      await screen.findByRole('button', { name: /^Simpan$/i }, { timeout: 15000 });

      // Click "Kembali ke Kode Pengujian" to trigger modal
      fireEvent.click(screen.getByRole('button', { name: /Kembali ke Kode Pengujian/i }));
      const cancelBtn = await screen.findByRole('button', { name: /^Batal$/i });
      fireEvent.click(cancelBtn);

      // Modal closed, stays on capture page with pending buttons
      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: /Hasil pengambilan data belum disimpan\./i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^Simpan$/i })).toBeInTheDocument();
      });
    });

    it('19. no orphan assets: discarding real capture cleans up temporary assets for testRun scope', async () => {
      const kp = await kodePengujianRepository.create({
        productId: 'p-1',
        productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });
      const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-ASSET-CLEAN' });
      const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sample.id,
        recipeId: 'rec-1',
        recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        fixture: 'nominal-01',
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });

      const assetId = buildTestRunCaptureAssetId(kp.id, sample.id, testRun.id, 0);
      const scope = { kind: 'testRun' as const, kpId: kp.id, sampleId: sample.id, runId: testRun.id };

      // Pretend an asset was stored during a session
      await captureAssetStore.save(assetId, scope, new Blob(['temp-data'], { type: 'image/jpeg' }));
      expect(await captureAssetStore.get(assetId)).not.toBeNull();

      // Deleting scope clears asset
      await captureAssetStore.deleteScope(scope);
      expect(await captureAssetStore.get(assetId)).toBeNull();
    });

    it('20. no cross-TestRun deletion: cleaning scope for Run A does not touch Run B assets', async () => {
      const kp = await kodePengujianRepository.create({
        productId: 'p-1',
        productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });
      const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-ISOLATION' });
      const { testRun: runA } = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sample.id,
        recipeId: 'rec-1',
        recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        fixture: 'nominal-01',
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });
      const { testRun: runB } = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sample.id,
        recipeId: 'rec-2',
        recipeSnapshot: { name: 'Heavy 40N', forceSetpointN: 40, pressDurationMs: 600, strokeMm: 15 },
        setpoints: { forceSetpointN: 40, pressDurationMs: 600, strokeMm: 15 },
        fixture: 'nominal-01',
        operatorId: 'usr-1',
        operatorName: 'Operator One',
      });

      const assetA = buildTestRunCaptureAssetId(kp.id, sample.id, runA.id, 0);
      const assetB = buildTestRunCaptureAssetId(kp.id, sample.id, runB.id, 0);

      const scopeA = { kind: 'testRun' as const, kpId: kp.id, sampleId: sample.id, runId: runA.id };
      const scopeB = { kind: 'testRun' as const, kpId: kp.id, sampleId: sample.id, runId: runB.id };

      await captureAssetStore.save(assetA, scopeA, new Blob(['data-a'], { type: 'image/jpeg' }));
      await captureAssetStore.save(assetB, scopeB, new Blob(['data-b'], { type: 'image/jpeg' }));

      // Clean Run A scope
      await captureAssetStore.deleteScope(scopeA);

      // Run A asset is gone, Run B asset is preserved
      expect(await captureAssetStore.get(assetA)).toBeNull();
      expect(await captureAssetStore.get(assetB)).not.toBeNull();
    });
  });
});