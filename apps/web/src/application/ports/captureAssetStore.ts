/**
 * Stable binary reference. This is an asset key only; it must never be a
 * blob: URL, data URL, or serialized binary payload.
 */
export type CaptureAssetId = string;

export interface CaptureAssetStore {
  save(assetId: CaptureAssetId, batchId: string, blob: Blob): Promise<void>;
  get(assetId: CaptureAssetId): Promise<Blob | null>;
  delete(assetId: CaptureAssetId): Promise<void>;
  deleteBatch(batchId: string): Promise<void>;
}
