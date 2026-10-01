import { BatchRepository, Batch, CreateBatchDraftInput, BatchSetupDraft, BatchAnalysisDraft, createBatchDraft, updateBatchSetupDraft, prepareBatch, startCapture, updateCaptureSession, completeCapture, markReviewRequired, updateAnalysisDraft, finalizeBatch, markFailed, abortBatch, BatchNotFoundError } from '../domain/batch';
import type { FixtureScenario, SynchronizedAnalysisFrame } from '../domain/types';
import type { FinalAnalysisReport } from '../domain/analysis';

export const BATCH_STORAGE_KEY = 'spraybot.batches.v1';

export class LocalStorageBatchRepository implements BatchRepository {
  private inMemoryFallback: Map<string, Batch> | null = null;
  private readonly storageKey: string;

  constructor(storageKey = BATCH_STORAGE_KEY) {
    this.storageKey = storageKey;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = window.localStorage.getItem(this.storageKey);
        if (!data) {
          window.localStorage.setItem(this.storageKey, JSON.stringify([]));
        } else {
          // Verify we can parse it
          JSON.parse(data);
        }
      } catch (e) {
        console.warn('LocalStorage corrupted or inaccessible. Falling back to in-memory store.', e);
        this.inMemoryFallback = new Map();
      }
    } else {
      this.inMemoryFallback = new Map();
    }
  }

  private readAll(): Batch[] {
    if (this.inMemoryFallback) {
      return Array.from(this.inMemoryFallback.values());
    }
    try {
      const data = window.localStorage.getItem(this.storageKey);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        console.warn('LocalStorage data is not an array. Resetting.');
        return [];
      }
      return parsed;
    } catch (e) {
      console.warn('Error parsing batches from LocalStorage, returning empty list.', e);
      return [];
    }
  }

  private writeAll(batches: Batch[]): void {
    if (this.inMemoryFallback) {
      this.inMemoryFallback.clear();
      batches.forEach(b => this.inMemoryFallback!.set(b.id, b));
      return;
    }
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(batches));
    } catch (e) {
      console.warn('Error saving batches to LocalStorage.', e);
    }
  }

  async getBatch(id: string): Promise<Batch | null> {
    const batches = this.readAll();
    return batches.find(b => b.id === id) || null;
  }

  async listBatches(): Promise<Batch[]> {
    return this.readAll();
  }

  private async saveMutated(batch: Batch): Promise<Batch> {
    const batches = this.readAll();
    const index = batches.findIndex(b => b.id === batch.id);
    if (index >= 0) {
      batches[index] = batch;
    } else {
      batches.push(batch);
    }
    this.writeAll(batches);
    return batch;
  }

  async createBatchDraft(input: CreateBatchDraftInput): Promise<Batch> {
    const batch = createBatchDraft(input);
    return this.saveMutated(batch);
  }

  async updateBatchSetupDraft(id: string, patch: Partial<BatchSetupDraft>): Promise<Batch> {
    const batch = await this.getBatch(id);
    if (!batch) throw new BatchNotFoundError(id);
    const updated = updateBatchSetupDraft(batch, patch);
    return this.saveMutated(updated);
  }

  async prepareBatch(id: string): Promise<Batch> {
    const batch = await this.getBatch(id);
    if (!batch) throw new BatchNotFoundError(id);
    const prepared = prepareBatch(batch);
    return this.saveMutated(prepared);
  }

  async startCapture(id: string, scenario?: FixtureScenario): Promise<Batch> {
    const batch = await this.getBatch(id);
    if (!batch) throw new BatchNotFoundError(id);
    const started = startCapture(batch, scenario);
    return this.saveMutated(started);
  }

  async updateCaptureSession(id: string, moments: SynchronizedAnalysisFrame[]): Promise<Batch> {
    const batch = await this.getBatch(id);
    if (!batch) throw new BatchNotFoundError(id);
    const updated = updateCaptureSession(batch, moments);
    return this.saveMutated(updated);
  }

  async completeCapture(id: string): Promise<Batch> {
    const batch = await this.getBatch(id);
    if (!batch) throw new BatchNotFoundError(id);
    const completed = completeCapture(batch);
    return this.saveMutated(completed);
  }

  async markReviewRequired(id: string, initialDraft?: BatchAnalysisDraft): Promise<Batch> {
    const batch = await this.getBatch(id);
    if (!batch) throw new BatchNotFoundError(id);
    const reviewed = markReviewRequired(batch, initialDraft);
    return this.saveMutated(reviewed);
  }

  async updateAnalysisDraft(id: string, draft: BatchAnalysisDraft): Promise<Batch> {
    const batch = await this.getBatch(id);
    if (!batch) throw new BatchNotFoundError(id);
    const updated = updateAnalysisDraft(batch, draft);
    return this.saveMutated(updated);
  }

  async finalizeBatch(id: string, report: FinalAnalysisReport): Promise<Batch> {
    const batch = await this.getBatch(id);
    if (!batch) throw new BatchNotFoundError(id);
    const finalized = finalizeBatch(batch, report);
    return this.saveMutated(finalized);
  }

  async markFailed(id: string, reason: string): Promise<Batch> {
    const batch = await this.getBatch(id);
    if (!batch) throw new BatchNotFoundError(id);
    const failed = markFailed(batch, reason);
    return this.saveMutated(failed);
  }

  async abortBatch(id: string, reason?: string): Promise<Batch> {
    const batch = await this.getBatch(id);
    if (!batch) throw new BatchNotFoundError(id);
    const aborted = abortBatch(batch, reason);
    return this.saveMutated(aborted);
  }

  seed(batches: Batch[], force = false): void {
    const current = this.readAll();
    if (force || current.length === 0) {
      this.writeAll(batches);
    }
  }
}
