import type {
  SyncService,
  SyncResult,
  KodePengujianRemoteRepository,
  CaptureMediaRemoteStore,
} from '../ports/sync';
import type { KodePengujianRepository } from '../ports/kodePengujianRepository';
import type { CaptureAssetStore } from '../ports/captureAssetStore';
import type { RemoteMediaDescriptor, RemoteSyncPayload } from '@spray-paragon/contracts';
import type { SyncMetadata } from '@spray-paragon/domain';

export class DefaultSyncService implements SyncService {
  constructor(
    private readonly localKpRepo: KodePengujianRepository,
    private readonly remoteKpRepo: KodePengujianRemoteRepository,
    private readonly remoteMediaStore: CaptureMediaRemoteStore,
    private readonly localAssetStore: CaptureAssetStore,
  ) {}

  async queueSync(kpId: string): Promise<void> {
    const kp = await this.localKpRepo.get(kpId);
    if (!kp) return;

    await this.localKpRepo.updateSyncMetadata(kpId, {
      status: 'pending',
      retryCount: (kp.sync?.retryCount ?? 0) + 1,
    });
  }

  async getSyncStatus(kpId: string): Promise<SyncMetadata | null> {
    const kp = await this.localKpRepo.get(kpId);
    if (!kp?.sync) return null;
    // Ensure required fields are present for the return type
    return {
      status: kp.sync.status,
      localUpdatedAt: kp.sync.localUpdatedAt,
      serverUpdatedAt: kp.sync.serverUpdatedAt,
      lastSyncError: kp.sync.lastSyncError,
      retryCount: kp.sync.retryCount ?? 0,
    };
  }

  async syncKodePengujian(kpId: string): Promise<SyncResult> {
    const kp = await this.localKpRepo.get(kpId);
    if (!kp) {
      return {
        success: false,
        syncMetadata: {
          status: 'failed',
          localUpdatedAt: new Date().toISOString(),
          lastSyncError: `KodePengujian ${kpId} not found`,
          retryCount: 0,
        },
        conflicts: [],
        error: `KodePengujian ${kpId} not found`,
      };
    }

    // Step 1: Collect Media Manifest from all test runs without reading or embedding blobs
    const mediaManifest: RemoteMediaDescriptor[] = [];
    for (const tr of kp.testRuns) {
      const session = tr.captureSession;
      if (!session) continue;

      // Real side frames
      if (session.realSideFrames && session.realSideFrames.length > 0) {
        for (const frame of session.realSideFrames) {
          if (!frame.assetId) continue;
          mediaManifest.push({
            assetId: frame.assetId,
            kind: 'frame',
            mimeType: 'image/jpeg',
            sizeBytes: 1024 * 50, // estimated if not explicit in frame metadata
            scope: {
              kind: 'testRun',
              kpId: kp.id,
              sampleId: tr.sampleId,
              runId: tr.id,
            },
            localCreatedAt: frame.capturedAt,
          });
        }
      }

      // Real side video
      const video = session.video || session.realSideVideo;
      if (video && video.assetId) {
        mediaManifest.push({
          assetId: video.assetId,
          kind: 'video',
          mimeType: video.mimeType,
          sizeBytes: video.sizeBytes ?? 1024 * 500,
          scope: {
            kind: 'testRun',
            kpId: kp.id,
            sampleId: tr.sampleId,
            runId: tr.id,
          },
          localCreatedAt: video.startedAt,
        });
      }
    }

    const now = new Date().toISOString();

    // Step 2: Check remote connectivity
    const isOnline = await this.remoteKpRepo.isOnline();
    if (!isOnline) {
      const pendingSync: SyncMetadata = {
        status: 'pending',
        localUpdatedAt: kp.updatedAt,
        lastSyncError: 'Server tidak terjangkau (offline). Data tersimpan lokal.',
        retryCount: (kp.sync?.retryCount ?? 0) + 1,
      };
      await this.localKpRepo.updateSyncMetadata(kpId, pendingSync);
      return {
        success: false,
        syncMetadata: pendingSync,
        conflicts: [],
        error: pendingSync.lastSyncError,
      };
    }

    // Step 3: Construct sync payload (NO binary blobs, only manifest + metadata)
    const currentSync: SyncMetadata = kp.sync ?? {
      status: 'pending',
      localUpdatedAt: kp.updatedAt,
      retryCount: 0,
    };

    const payload: RemoteSyncPayload = {
      kp: {
        id: kp.id,
        status: kp.status,
        productId: kp.productId,
        productSnapshot: kp.productSnapshot,
        defaultRecipeId: kp.defaultRecipeId,
        defaultRecipeSnapshot: kp.defaultRecipeSnapshot,
        productLot: kp.productLot,
        testPeriod: kp.testPeriod,
        operatorId: kp.operatorId,
        operatorName: kp.operatorName,
        calculationStandard: kp.calculationStandard,
        storageCondition: kp.storageCondition,
        bottlePosition: kp.bottlePosition,
        notes: kp.notes,
        metadata: kp.metadata,
        samples: kp.samples as unknown as unknown[],
        testRuns: kp.testRuns as unknown as unknown[],
        createdAt: kp.createdAt,
        updatedAt: kp.updatedAt,
        sync: currentSync,
      },
      mediaManifest,
      pushedAt: now,
    };

    // Step 4: Push to remote repository
    const response = await this.remoteKpRepo.push(payload);

    if (!response.success) {
      const failedSync: SyncMetadata = {
        status: 'failed',
        localUpdatedAt: kp.updatedAt,
        lastSyncError: response.error ?? 'Gagal sinkronisasi ke server',
        retryCount: (kp.sync?.retryCount ?? 0) + 1,
      };
      await this.localKpRepo.updateSyncMetadata(kpId, failedSync);
      return {
        success: false,
        syncMetadata: failedSync,
        conflicts: (response.conflicts ?? []).map(c => ({
          entity: c.entity,
          id: c.id,
          serverVersion: c.serverVersion,
          localVersion: c.localVersion,
          reason: c.reason,
        })),
        error: response.error,
      };
    }

    // Step 5: Register media manifest if present
    let mediaUploadUrls: Record<string, string> | undefined;
    if (mediaManifest.length > 0) {
      try {
        mediaUploadUrls = await this.remoteMediaStore.register(
          mediaManifest.map(m => ({
            assetId: m.assetId,
            mimeType: m.mimeType,
            sizeBytes: m.sizeBytes,
          }))
        );
      } catch (err) {
        console.warn('Media registration failed, metadata synced successfully', err);
      }
    }

    // Step 6: Mark as synced locally
    const syncedMetadata: SyncMetadata = {
      status: 'synced',
      localUpdatedAt: kp.updatedAt,
      serverUpdatedAt: response.serverUpdatedAt ?? now,
      lastSyncError: undefined,
      retryCount: 0,
    };

    await this.localKpRepo.updateSyncMetadata(kpId, syncedMetadata);

    return {
      success: true,
      syncMetadata: syncedMetadata,
      conflicts: [],
      mediaUploadUrls,
    };
  }
}