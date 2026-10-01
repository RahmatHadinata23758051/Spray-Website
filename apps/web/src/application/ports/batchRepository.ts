import type { Batch, CreateBatchDraftInput, BatchSetupDraft, BatchAnalysisDraft, FinalAnalysisReport, FixtureScenario, SynchronizedAnalysisFrame } from '@spray-paragon/domain';

export interface BatchRepository {
  getBatch(id: string): Promise<Batch | null>;
  listBatches(): Promise<Batch[]>;
  createBatchDraft(input: CreateBatchDraftInput): Promise<Batch>;
  updateBatchSetupDraft(id: string, patch: Partial<BatchSetupDraft>): Promise<Batch>;
  prepareBatch(id: string): Promise<Batch>;
  startCapture(id: string, scenario?: FixtureScenario): Promise<Batch>;
  updateCaptureSession(id: string, moments: SynchronizedAnalysisFrame[]): Promise<Batch>;
  completeCapture(id: string): Promise<Batch>;
  markReviewRequired(id: string, initialDraft?: BatchAnalysisDraft): Promise<Batch>;
  updateAnalysisDraft(id: string, draft: BatchAnalysisDraft): Promise<Batch>;
  finalizeBatch(id: string, report: FinalAnalysisReport): Promise<Batch>;
  markFailed(id: string, reason: string): Promise<Batch>;
  abortBatch(id: string, reason?: string): Promise<Batch>;
}
