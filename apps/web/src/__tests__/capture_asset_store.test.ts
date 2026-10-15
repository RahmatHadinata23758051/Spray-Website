import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { IndexedDbCaptureAssetStore } from '../data/local/indexedDbCaptureAssetStore';
import { CaptureAssetResolver } from '../application/captureAssets';
import {
  createBatchDraft,
  prepareBatch,
  startCapture,
  updateRealCaptureSession,
} from '@spray-paragon/domain';
import type { RealSideAnalysisInput, RealSideBaselineSelection } from '@spray-paragon/domain';

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('Phase 4 — capture asset store', () => {
  beforeAll(() => {
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:stub' });
    }
  });

  it('saves and resolves a Blob binary', async () => {
    const store = new IndexedDbCaptureAssetStore();
    const source = new Blob(['frame-bytes-000'], { type: 'image/jpeg' });
    await store.save('bat-save:side:000', 'bat-save', source);

    const resolved = await store.get('bat-save:side:000');
    expect(resolved).toBeInstanceOf(Blob);
    expect(resolved?.type).toBe('image/jpeg');
    expect(await readBlobText(resolved as Blob)).toBe('frame-bytes-000');
  });

  it('resolves the same frame from a reconstructed store instance (reload)', async () => {
    const first = new IndexedDbCaptureAssetStore();
    await first.save('bat-reload:side:000', 'bat-reload', new Blob(['durable-frame'], { type: 'image/jpeg' }));

    // A new instance stands in for the store rebuilt after navigation/reload.
    const second = new IndexedDbCaptureAssetStore();
    const resolved = await second.get('bat-reload:side:000');
    expect(await readBlobText(resolved as Blob)).toBe('durable-frame');
  });

  it('resolves frames through the application resolver without ObjectURL state', async () => {
    const store = new IndexedDbCaptureAssetStore();
    const resolver = new CaptureAssetResolver(store);
    await store.save('bat-resolve:side:001', 'bat-resolve', new Blob(['resolved-frame'], { type: 'image/jpeg' }));

    const blob = await resolver.resolveBlob({ assetId: 'bat-resolve:side:001' });
    expect(await readBlobText(blob as Blob)).toBe('resolved-frame');
  });

  it('returns null for missing, unindexed, or unreadable assets', async () => {
    const store = new IndexedDbCaptureAssetStore();
    const resolver = new CaptureAssetResolver(store);

    expect(await store.get('bat-none:side:000')).toBeNull();
    expect(await resolver.resolveBlob({ assetId: undefined })).toBeNull();
    expect(await resolver.resolveBlob({ assetId: 'bat-none:side:999' })).toBeNull();
  });

  it('deletes a single asset and every asset of a batch', async () => {
    const store = new IndexedDbCaptureAssetStore();
    await store.save('bat-del:side:000', 'bat-del', new Blob(['a']));
    await store.save('bat-del:side:001', 'bat-del', new Blob(['b']));
    await store.save('bat-keep:side:000', 'bat-keep', new Blob(['c']));

    await store.delete('bat-del:side:000');
    expect(await store.get('bat-del:side:000')).toBeNull();
    expect(await store.get('bat-del:side:001')).not.toBeNull();

    await store.deleteBatch('bat-del');
    expect(await store.get('bat-del:side:001')).toBeNull();
    expect(await store.get('bat-keep:side:000')).not.toBeNull();
    await store.deleteBatch('bat-keep');
  });

  describe('Phase 5 — baseline asset resolution', () => {
    it('resolves an ordered list of blobs from baseline metadata without ObjectURLs', async () => {
      const store = new IndexedDbCaptureAssetStore();
      const resolver = new CaptureAssetResolver(store);

      await store.save('bat-base:side:000', 'bat-base', new Blob(['base-0'], { type: 'image/jpeg' }));
      await store.save('bat-base:side:001', 'bat-base', new Blob(['base-1'], { type: 'image/jpeg' }));
      await store.save('bat-base:side:002', 'bat-base', new Blob(['base-2'], { type: 'image/jpeg' }));

      const baseline: RealSideBaselineSelection = {
        selectionMethod: 'initial-window',
        configuredWindowMs: 500,
        startElapsedMs: 0,
        endElapsedMs: 200,
        selectedAt: '2026-10-15T10:00:00.000Z',
        frames: [
          { frameId: 'f-0', frameIndex: 0, elapsedMs: 0, assetId: 'bat-base:side:000' },
          { frameId: 'f-1', frameIndex: 1, elapsedMs: 100, assetId: 'bat-base:side:001' },
          { frameId: 'f-2', frameIndex: 2, elapsedMs: 200, assetId: 'bat-base:side:002' },
        ],
      };

      const resolved = await resolver.resolveBaselineBlobs(baseline);
      expect(resolved).toHaveLength(3);
      expect(resolved.map((frame) => frame.frameIndex)).toEqual([0, 1, 2]);
      expect(resolved.map((frame) => frame.elapsedMs)).toEqual([0, 100, 200]);
      expect(await readBlobText(resolved[0].blob)).toBe('base-0');
      expect(await readBlobText(resolved[1].blob)).toBe('base-1');
      expect(await readBlobText(resolved[2].blob)).toBe('base-2');
    });

    it('gracefully skips missing or corrupt assets without rejecting the whole baseline', async () => {
      const store = new IndexedDbCaptureAssetStore();
      const resolver = new CaptureAssetResolver(store);

      // Only asset 001 exists; 000 is missing.
      await store.save('bat-missing:side:001', 'bat-missing', new Blob(['base-1-only']));

      const baseline: RealSideBaselineSelection = {
        selectionMethod: 'manual-range',
        configuredWindowMs: 200,
        startElapsedMs: 0,
        endElapsedMs: 200,
        selectedAt: '2026-10-15T10:00:00.000Z',
        frames: [
          { frameId: 'f-0', frameIndex: 0, elapsedMs: 0, assetId: 'bat-missing:side:000' },
          { frameId: 'f-1', frameIndex: 1, elapsedMs: 100, assetId: 'bat-missing:side:001' },
        ],
      };

      const resolved = await resolver.resolveBaselineBlobs(baseline);
      expect(resolved).toHaveLength(1);
      expect(resolved[0].frameIndex).toBe(1);
      expect(resolved[0].assetId).toBe('bat-missing:side:001');
      expect(await readBlobText(resolved[0].blob)).toBe('base-1-only');
    });
  });

  describe('Phase 6 — real Side analysis preparation', () => {
    const baseline = (assetPrefix: string): RealSideBaselineSelection => ({
      selectionMethod: 'initial-window',
      configuredWindowMs: 200,
      startElapsedMs: 0,
      endElapsedMs: 200,
      selectedAt: '2026-10-15T10:00:00.000Z',
      frames: [
        { frameId: 'f-0', frameIndex: 0, elapsedMs: 0, assetId: `${assetPrefix}:side:000` },
        { frameId: 'f-1', frameIndex: 1, elapsedMs: 100, assetId: `${assetPrefix}:side:001` },
        { frameId: 'f-2', frameIndex: 2, elapsedMs: 200, assetId: `${assetPrefix}:side:002` },
      ],
    });

    const input = (assetPrefix: string): RealSideAnalysisInput => ({
      batchId: assetPrefix,
      captureMode: 'real',
      frames: [
        { frameId: 'f-0', frameIndex: 0, elapsedMs: 0, assetId: `${assetPrefix}:side:000` },
        { frameId: 'f-1', frameIndex: 1, elapsedMs: 100, assetId: `${assetPrefix}:side:001` },
        { frameId: 'f-2', frameIndex: 2, elapsedMs: 200, assetId: `${assetPrefix}:side:002` },
      ],
      baseline: baseline(assetPrefix),
      sideOrientation: 'nozzleLeft',
      calibration: null,
    });

    async function seed(store: IndexedDbCaptureAssetStore, assetPrefix: string) {
      for (let i = 0; i < 3; i += 1) {
        await store.save(`${assetPrefix}:side:00${i}`, assetPrefix, new Blob([`${assetPrefix}-${i}`], { type: 'image/jpeg' }));
      }
    }

    it('resolves ordered frames and completes baseline resolution', async () => {
      const store = new IndexedDbCaptureAssetStore();
      const resolver = new CaptureAssetResolver(store);
      await seed(store, 'bat-ready');

      const result = await resolver.prepareRealSideAnalysis(input('bat-ready'));
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.prepared.frames.map((frame) => frame.frameIndex)).toEqual([0, 1, 2]);
        expect(result.prepared.frames.map((frame) => frame.elapsedMs)).toEqual([0, 100, 200]);
        expect(result.prepared.baseline.map((frame) => frame.frameIndex)).toEqual([0, 1, 2]);
        expect(await readBlobText(result.prepared.frames[1].blob)).toBe('bat-ready-1');
        expect(await readBlobText(result.prepared.baseline[2].blob)).toBe('bat-ready-2');
      }
    });

    it('blocks preparation and reports the exact missing frame asset', async () => {
      const store = new IndexedDbCaptureAssetStore();
      const resolver = new CaptureAssetResolver(store);
      await seed(store, 'bat-frame-missing');
      await store.delete('bat-frame-missing:side:001');

      const result = await resolver.prepareRealSideAnalysis(input('bat-frame-missing'));
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.missingFrameAssetIds).toEqual(['bat-frame-missing:side:001']);
        // Frame 001 is also in the baseline, so it is reported in both.
        expect(result.missingBaselineAssetIds).toEqual(['bat-frame-missing:side:001']);
        expect(result.error).toMatch(/Analysis preparation blocked/);
      }
    });

    it('blocks preparation when a baseline asset cannot be resolved', async () => {
      const store = new IndexedDbCaptureAssetStore();
      const resolver = new CaptureAssetResolver(store);
      await seed(store, 'bat-base-missing');

      // Frames resolve, but the baseline references a separate asset that was never written.
      const stale: RealSideAnalysisInput = {
        ...input('bat-base-missing'),
        baseline: {
          ...baseline('bat-base-missing'),
          frames: [{ frameId: 'b-0', frameIndex: 0, elapsedMs: 0, assetId: 'bat-base-missing:baseline:000' }],
        },
      };

      const result = await resolver.prepareRealSideAnalysis(stale);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.missingFrameAssetIds).toEqual([]);
        expect(result.missingBaselineAssetIds).toEqual(['bat-base-missing:baseline:000']);
        expect(result.error).toMatch(/baseline frame asset/);
      }
    });

    it('prepares directly from a persisted real capture batch', async () => {
      const store = new IndexedDbCaptureAssetStore();
      const resolver = new CaptureAssetResolver(store);
      const batchId = 'BAT-REAL-PREP';

      const draft = createBatchDraft({
        productId: 'p1',
        productSnapshot: { productCode: 'PRD-01', productName: 'Hydra Mist' },
        recipeId: 'r1',
        recipeSnapshot: { name: 'Standard Spray', forceSetpointN: 15, pressDurationMs: 400, strokeMm: 12 },
        operatorId: 'op1',
        operatorName: 'Operator Name',
        fixture: 'nominal-01',
      });
      const frames = [0, 1, 2].map((index) => ({
        id: `real-side-${String(index).padStart(3, '0')}`,
        frameIndex: index,
        capturedAt: new Date(Date.UTC(2026, 9, 15, 10, 0, 0, index * 100)).toISOString(),
        elapsedMs: index * 100,
        camera: 'side' as const,
        assetId: `${batchId}:side:${String(index).padStart(3, '0')}`,
      }));
      const realBatch = updateRealCaptureSession(startCapture(prepareBatch(draft)), frames);

      // Real capture ids are generated, so seed using the persisted assetIds.
      for (const frame of realBatch.captureSession!.realSideFrames!) {
        await store.save(frame.assetId as string, realBatch.id, new Blob([`frame-${frame.frameIndex}`]));
      }

      const result = await resolver.prepareBatchAnalysis(realBatch);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.prepared.input.frames.map((frame) => frame.frameIndex)).toEqual([0, 1, 2]);
        expect(result.prepared.baseline).toHaveLength(3);
      }
    });
  });
});
