import 'fake-indexeddb/auto';
import React from 'react';
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import type { RemoteSyncPayload } from '@spray-paragon/contracts';
import type { FinalAnalysisReport } from '@spray-paragon/domain';
import {
  kodePengujianRepository,
  captureAssetStore,
  remoteKodePengujianRepository,
  remoteCaptureMediaStore,
  syncService,
} from '../application/services';
import { buildTestRunCaptureAssetId, buildTestRunVideoAssetId } from '../application/captureAssets';

describe('Phase P6 — Hybrid Architecture Foundation & Sync Boundary', () => {
  beforeAll(() => {
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:stub' });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
    }
  });

  beforeEach(async () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    remoteKodePengujianRepository.clear();
    remoteCaptureMediaStore.clear();
    remoteKodePengujianRepository.setOnline(true);
    remoteCaptureMediaStore.setOnline(true);
    vi.restoreAllMocks();
  });

  it('1. local workflow succeeds while remote is unavailable (offline)', async () => {
    remoteKodePengujianRepository.setOnline(false);

    // Create KP locally
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    expect(kp.sync?.status).toBe('local');

    // Add sample & test run
    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-OFFLINE-1' });
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    // Save capture data locally
    const frameAssetId = buildTestRunCaptureAssetId(kp.id, sample.id, testRun.id, 0);
    await captureAssetStore.save(
      frameAssetId,
      { kind: 'testRun', kpId: kp.id, sampleId: sample.id, runId: testRun.id },
      new Blob(['offline-frame'], { type: 'image/jpeg' }),
      'frame'
    );

    const updatedTr = await kodePengujianRepository.updateTestRun(kp.id, testRun.id, {
      status: 'CAPTURING',
      captureSession: {
        scenario: 'nominal-01',
        synchronizedMoments: [],
        startedAt: new Date().toISOString(),
        captureMode: 'real',
        realSideFrames: [
          {
            id: 'fr-0',
            frameIndex: 0,
            capturedAt: new Date().toISOString(),
            elapsedMs: 0,
            camera: 'side',
            assetId: frameAssetId,
          },
        ],
      },
    });

    expect(updatedTr.captureSession?.realSideFrames?.length).toBe(1);

    // Attempt sync while offline: does not crash or throw unhandled error
    const syncResult = await syncService.syncKodePengujian(kp.id);
    expect(syncResult.success).toBe(false);
    expect(syncResult.syncMetadata.status).toBe('pending');
    expect(syncResult.error).toContain('offline');

    // Local data remains completely intact
    const storedKp = await kodePengujianRepository.get(kp.id);
    expect(storedKp?.sync?.status).toBe('pending');
    expect(storedKp?.testRuns[0].captureSession?.realSideFrames?.length).toBe(1);
    const storedAsset = await captureAssetStore.get(frameAssetId);
    expect(storedAsset).not.toBeNull();
  });

  it('2. accepted TestRun becomes pending sync upon queueSync', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    expect(kp.sync?.status).toBe('local');

    // Simulate queueSync after accepted capture save
    await syncService.queueSync(kp.id);

    const refreshed = await kodePengujianRepository.get(kp.id);
    expect(refreshed?.sync?.status).toBe('pending');
    expect(refreshed?.sync?.retryCount).toBe(1);
  });

  it('3. finalized result cannot be overwritten by stale remote data or conflict', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });
    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-FINAL' });
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    // Finalize the test run locally and push to remote
    await kodePengujianRepository.updateTestRun(kp.id, testRun.id, {
      status: 'FINALIZED',
      finalReport: {
        status: 'finalized',
        analysisSource: 'real',
        perspectives: ['side'],
        test: {
          testId: testRun.id,
          sampleId: sample.id,
          product: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
          recipe: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
          operator: 'Operator One',
          testTimestamp: new Date().toISOString(),
          setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
        },
        testId: testRun.id,
        primaryCaptureMomentId: 'fr-0',
        supportingCaptureMomentIds: [],
        primaryCapture: { frameIndex: 0, timestampMs: 0, phase: 'stable' },
        side: {
          sprayLengthMm: 50.0,
          sprayAngleDeg: 45.2,
          verticalSpreadMm: 10.0,
          measurements: [],
          stats: {},
          overlays: [],
          frameId: 'fr-0',
          frame: {
            frameId: 'fr-0',
            frameIndex: 0,
            timestampMs: 0,
            phase: 'stable',
            overlayAsset: '',
            measurements: [],
          },
          calibration: {
            camera: 'side',
            referenceDistanceMm: 100,
            anchorA: { x: 0, y: 0 },
            anchorB: { x: 100, y: 0 },
          },
          autoGeometry: {
            nozzleOriginPx: { x: 0, y: 0 },
            sprayEndpointPx: { x: 0, y: 0 },
            upperBoundaryPx: { x: 0, y: 0 },
            lowerBoundaryPx: { x: 0, y: 0 },
            verticalSpreadTopPx: { x: 0, y: 0 },
            verticalSpreadBottomPx: { x: 0, y: 0 },
            directionReferencePx: { x: 0, y: 0 },
          },
          finalGeometry: {
            nozzleOriginPx: { x: 0, y: 0 },
            sprayEndpointPx: { x: 0, y: 0 },
            upperBoundaryPx: { x: 0, y: 0 },
            lowerBoundaryPx: { x: 0, y: 0 },
            verticalSpreadTopPx: { x: 0, y: 0 },
            verticalSpreadBottomPx: { x: 0, y: 0 },
            directionReferencePx: { x: 0, y: 0 },
          },
        },
        supportingCaptures: [],
      } as unknown as FinalAnalysisReport,
    });

    // First sync succeeds
    const firstSync = await syncService.syncKodePengujian(kp.id);
    expect(firstSync.success).toBe(true);
    expect(firstSync.syncMetadata.status).toBe('synced');

    // Now simulate an invalid/conflicting local modification attempting to demote or alter FINALIZED run
    // Using a direct low-level payload with altered report
    const conflictingPayload = {
      kp: {
        ...kp,
        testRuns: [
          {
            ...testRun,
            status: 'CAPTURING', // attempting to demote finalized run!
          },
        ],
        sync: { status: 'pending' as const, localUpdatedAt: new Date().toISOString() },
      },
      mediaManifest: [],
      pushedAt: new Date().toISOString(),
    };

    const pushResult = await remoteKodePengujianRepository.push(conflictingPayload as unknown as RemoteSyncPayload);
    expect(pushResult.success).toBe(false);
    expect(pushResult.conflicts?.length).toBeGreaterThan(0);
    expect(pushResult.conflicts?.[0].reason).toContain('immutable and cannot be reverted');
  });

  it('4. sync success updates state to synced and records server timestamp', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const result = await syncService.syncKodePengujian(kp.id);
    expect(result.success).toBe(true);
    expect(result.syncMetadata.status).toBe('synced');
    expect(result.syncMetadata.serverUpdatedAt).toBeDefined();

    const storedKp = await kodePengujianRepository.get(kp.id);
    expect(storedKp?.sync?.status).toBe('synced');
    expect(storedKp?.sync?.serverUpdatedAt).toBeDefined();
    expect(storedKp?.sync?.lastSyncError).toBeUndefined();
  });

  it('5. sync failure preserves local data and records error', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });
    await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-FAIL' });

    // Simulate remote rejection by taking remote offline
    remoteKodePengujianRepository.setOnline(false);

    const result = await syncService.syncKodePengujian(kp.id);
    expect(result.success).toBe(false);
    expect(result.syncMetadata.status).toBe('pending');
    expect(result.syncMetadata.lastSyncError).toBeDefined();

    // Verify local data is not deleted or cleared
    const storedKp = await kodePengujianRepository.get(kp.id);
    expect(storedKp?.samples.length).toBe(1);
    expect(storedKp?.samples[0].sampleCode).toBe('SMP-FAIL');
  });

  it('6. video and frame references queue in manifest without binary entering JSON', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-MIST', productName: 'Hydra Mist' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });
    const { sample } = await kodePengujianRepository.addSample(kp.id, { sampleCode: 'SMP-MEDIA' });
    const { testRun } = await kodePengujianRepository.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-1',
      recipeSnapshot: { name: 'Standar 20N', forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 400, strokeMm: 12 },
      fixture: 'nominal-01',
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    const frameAssetId = buildTestRunCaptureAssetId(kp.id, sample.id, testRun.id, 0);
    const videoAssetId = buildTestRunVideoAssetId(kp.id, sample.id, testRun.id);

    // Save actual binary blobs into IndexedDB
    await captureAssetStore.save(
      frameAssetId,
      { kind: 'testRun', kpId: kp.id, sampleId: sample.id, runId: testRun.id },
      new Blob(['raw-frame-binary'], { type: 'image/jpeg' }),
      'frame'
    );
    await captureAssetStore.save(
      videoAssetId,
      { kind: 'testRun', kpId: kp.id, sampleId: sample.id, runId: testRun.id },
      new Blob(['raw-video-binary-stream'], { type: 'video/webm' }),
      'video'
    );

    // Attach metadata referencing asset IDs
    await kodePengujianRepository.updateTestRun(kp.id, testRun.id, {
      captureSession: {
        scenario: 'nominal-01',
        synchronizedMoments: [],
        startedAt: new Date().toISOString(),
        captureMode: 'real',
        realSideFrames: [
          {
            id: 'fr-0',
            frameIndex: 0,
            capturedAt: new Date().toISOString(),
            elapsedMs: 0,
            camera: 'side',
            assetId: frameAssetId,
          },
        ],
        video: {
          assetId: videoAssetId,
          camera: 'side',
          mimeType: 'video/webm',
          durationMs: 3000,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          sizeBytes: 24000,
        },
      },
    });

    // Spy on remote push to inspect exact wire payload
    const pushSpy = vi.spyOn(remoteKodePengujianRepository, 'push');

    const result = await syncService.syncKodePengujian(kp.id);
    expect(result.success).toBe(true);

    expect(pushSpy).toHaveBeenCalled();
    const payload = pushSpy.mock.calls[0][0];

    // Assert manifest contains both frame and video
    expect(payload.mediaManifest.length).toBe(2);
    const frameEntry = payload.mediaManifest.find(m => m.kind === 'frame');
    const videoEntry = payload.mediaManifest.find(m => m.kind === 'video');
    expect(frameEntry?.assetId).toBe(frameAssetId);
    expect(videoEntry?.assetId).toBe(videoAssetId);

    // Strict boundary assertion: JSON wire payload must never contain blobs or base64 data URLs
    const jsonString = JSON.stringify(payload);
    expect(jsonString).not.toContain('data:image/');
    expect(jsonString).not.toContain('data:video/');
    expect(jsonString).not.toContain('raw-frame-binary');
    expect(jsonString).not.toContain('raw-video-binary-stream');
    expect(jsonString).not.toContain('blob:');

    // Both binaries still resolve safely from local store
    expect(await captureAssetStore.get(frameAssetId)).not.toBeNull();
    expect(await captureAssetStore.get(videoAssetId)).not.toBeNull();
  });

  it('7. one KP sync does not affect another KP', async () => {
    const kpA = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-A', productName: 'Product A' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });
    const kpB = await kodePengujianRepository.create({
      productId: 'p-2',
      productSnapshot: { productCode: 'PRD-B', productName: 'Product B' },
      operatorId: 'usr-2',
      operatorName: 'Operator Two',
    });

    expect(kpA.sync?.status).toBe('local');
    expect(kpB.sync?.status).toBe('local');

    // Sync only KP-A
    const resultA = await syncService.syncKodePengujian(kpA.id);
    expect(resultA.success).toBe(true);

    const storedA = await kodePengujianRepository.get(kpA.id);
    const storedB = await kodePengujianRepository.get(kpB.id);

    expect(storedA?.sync?.status).toBe('synced');
    expect(storedB?.sync?.status).toBe('local');
  });

  it('8. manual "Sinkronkan" action in KodePengujianDetailPage triggers sync and updates badge', async () => {
    const kp = await kodePengujianRepository.create({
      productId: 'p-1',
      productSnapshot: { productCode: 'PRD-UI', productName: 'Product UI' },
      operatorId: 'usr-1',
      operatorName: 'Operator One',
    });

    render(
      <MemoryRouter initialEntries={[`/kode-pengujian/${kp.id}`]}>
        <App />
      </MemoryRouter>
    );

    // Initial state: badge says "Lokal" and button "Sinkronkan" is available
    expect(await screen.findByText('Lokal')).toBeInTheDocument();
    const syncButton = screen.getByRole('button', { name: /Sinkronkan/i });
    expect(syncButton).toBeInTheDocument();

    // Click "Sinkronkan"
    fireEvent.click(syncButton);

    // Transitions to "Tersinkron"
    expect(await screen.findByText('Tersinkron')).toBeInTheDocument();

    const stored = await kodePengujianRepository.get(kp.id);
    expect(stored?.sync?.status).toBe('synced');
  });
});