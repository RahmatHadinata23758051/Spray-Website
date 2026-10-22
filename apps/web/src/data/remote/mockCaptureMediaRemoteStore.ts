import type { CaptureMediaRemoteStore } from '../../application/ports/sync';

export class MockCaptureMediaRemoteStore implements CaptureMediaRemoteStore {
  private online = true;
  private uploadStatus = new Map<string, 'pending' | 'uploading' | 'completed' | 'failed'>();
  private registeredAssets = new Set<string>();

  setOnline(status: boolean) {
    this.online = status;
  }

  async isOnline(): Promise<boolean> {
    return this.online;
  }

  async register(assets: Array<{
    assetId: string;
    mimeType: string;
    sizeBytes: number;
  }>): Promise<Record<string, string>> {
    if (!this.online) {
      throw new Error('Remote media store unavailable (offline)');
    }

    const uploadUrls: Record<string, string> = {};
    for (const asset of assets) {
      this.registeredAssets.add(asset.assetId);
      this.uploadStatus.set(asset.assetId, 'pending');
      // Mock presigned URL - in real implementation this would be a real S3 presigned URL
      uploadUrls[asset.assetId] = `https://mock-storage.example.com/upload/${asset.assetId}?presigned=1`;
    }
    return uploadUrls;
  }

  async confirmUpload(assetId: string): Promise<void> {
    if (!this.online) {
      throw new Error('Remote media store unavailable (offline)');
    }
    if (!this.registeredAssets.has(assetId)) {
      throw new Error(`Asset ${assetId} not registered`);
    }
    this.uploadStatus.set(assetId, 'completed');
  }

  async getUploadStatus(assetId: string): Promise<'pending' | 'uploading' | 'completed' | 'failed'> {
    if (!this.online) {
      return 'failed';
    }
    return this.uploadStatus.get(assetId) ?? 'failed';
  }

  clear() {
    this.uploadStatus.clear();
    this.registeredAssets.clear();
  }

  isRegistered(assetId: string): boolean {
    return this.registeredAssets.has(assetId);
  }
}