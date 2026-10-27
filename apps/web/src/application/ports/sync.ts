import type { KodePengujian, SyncMetadata } from '@spray-paragon/domain';
import type { RemoteSyncPayload, RemoteSyncResponse } from '@spray-paragon/contracts';

/**
 * Port for remote persistence of KodePengujian aggregates.
 * Implementations handle network I/O, retries, and conflict resolution.
 */
export interface KodePengujianRemoteRepository {
  /**
   * Push a full KodePengujian aggregate (metadata + media manifest) to remote.
   * Returns server timestamp on success, or conflict details on failure.
   */
  push(payload: RemoteSyncPayload): Promise<RemoteSyncResponse>;

  /**
   * Fetch the latest server version of a KodePengujian (for conflict detection).
   * Optional: used when online and wanting to check freshness before push.
   */
  fetch(id: string): Promise<{ kp: KodePengujian; serverUpdatedAt: string } | null>;

  /**
   * Check if remote is reachable.
   */
  isOnline(): Promise<boolean>;

  /**
   * Test helper: Clear all mock server state.
   */
  clear(): void;

  /**
   * Test helper: Set online/offline status for testing.
   */
  setOnline(status: boolean): void;
}

/**
 * Port for remote media asset management.
 * Handles registration, upload URL generation, and status checking.
 * Never receives binary blobs directly - only asset IDs and metadata.
 */
export interface CaptureMediaRemoteStore {
  /**
   * Register media assets that will be uploaded.
   * Returns per-asset upload URLs (presigned or direct).
   */
  register(assets: Array<{
    assetId: string;
    mimeType: string;
    sizeBytes: number;
  }>): Promise<Record<string, string>>; // assetId -> uploadUrl

  /**
   * Confirm upload completion for an asset.
   */
  confirmUpload(assetId: string): Promise<void>;

  /**
   * Check upload status for an asset.
   */
  getUploadStatus(assetId: string): Promise<'pending' | 'uploading' | 'completed' | 'failed'>;

  /**
   * Check if remote media store is reachable.
   */
  isOnline(): Promise<boolean>;
}

/**
 * Conflict information for manual resolution.
 */
export interface SyncConflict {
  entity: 'kodePengujian' | 'sample' | 'testRun';
  id: string;
  serverVersion: unknown;
  localVersion: unknown;
  reason: string;
}

/**
 * Result of a sync operation.
 */
export interface SyncResult {
  success: boolean;
  syncMetadata: SyncMetadata;
  conflicts: SyncConflict[];
  mediaUploadUrls?: Record<string, string>;
  error?: string;
}

/**
 * High-level sync service that orchestrates KodePengujian + media sync.
 * Application layer decides WHEN to sync (after save/finalize, or manual).
 */
export interface SyncService {
  /**
   * Queue a KodePengujian for sync (marks as pending locally).
   * Does NOT wait for network - non-blocking.
   */
  queueSync(kpId: string): Promise<void>;

  /**
   * Execute sync for a specific KodePengujian.
   * Blocks until complete or failed.
   */
  syncKodePengujian(kpId: string): Promise<SyncResult>;

  /**
   * Get sync status for a KodePengujian.
   */
  getSyncStatus(kpId: string): Promise<SyncMetadata | null>;
}

export class KodePengujianNotFoundError extends Error {
  constructor(id: string) {
    super(`KodePengujian ${id} not found`);
    this.name = 'KodePengujianNotFoundError';
  }
}

export class SyncConflictError extends Error {
  constructor(public conflicts: SyncConflict[]) {
    super(`Sync conflict: ${conflicts.map(c => `${c.entity} ${c.id}`).join(', ')}`);
    this.name = 'SyncConflictError';
  }
}

export class RemoteUnavailableError extends Error {
  constructor(message = 'Remote server unavailable') {
    super(message);
    this.name = 'RemoteUnavailableError';
  }
}