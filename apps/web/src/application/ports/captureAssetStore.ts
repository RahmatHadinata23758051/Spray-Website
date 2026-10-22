/**
 * Stable binary reference. This is an asset key only; it must never be a
 * blob: URL, data URL, or serialized binary payload.
 */
export type CaptureAssetId = string;

export type CaptureAssetKind = 'frame' | 'video';

/**
 * Capture scope identifies the logical owner of a set of capture assets.
 * Supports both legacy Batch and new KodePengujian/TestRun hierarchies.
 */
export type CaptureScope =
  | { kind: 'batch'; batchId: string }
  | { kind: 'testRun'; kpId: string; sampleId: string; runId: string };

export interface CaptureAssetStore {
  save(assetId: CaptureAssetId, scope: CaptureScope | string, blob: Blob, kind?: CaptureAssetKind): Promise<void>;
  get(assetId: CaptureAssetId): Promise<Blob | null>;
  delete(assetId: CaptureAssetId): Promise<void>;
  deleteScope(scope: CaptureScope | string): Promise<void>;
  /** Legacy alias for deleteScope({ kind: 'batch', batchId }) */
  deleteBatch(batchId: string): Promise<void>;
}
