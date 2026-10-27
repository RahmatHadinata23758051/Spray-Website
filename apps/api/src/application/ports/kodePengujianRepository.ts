import type {
  KodePengujian,
  Sample,
  TestRun,
  FixtureScenario,
  CaptureSession,
  BatchAnalysisDraft,
  FinalAnalysisReport,
} from '@spray-paragon/domain';
import type { RemoteSyncPayload, RemoteSyncResponse } from '@spray-paragon/contracts';

export interface CreateKodePengujianInput {
  productId: string;
  productSnapshot: { productCode: string; productName: string };
  defaultRecipeId?: string;
  defaultRecipeSnapshot?: { name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  productLot?: string;
  testPeriod?: string;
  operatorId: string;
  operatorName: string;
  calculationStandard?: string;
  storageCondition?: string;
  bottlePosition?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  id?: string;
}

export interface KodePengujianParentMetadata {
  productLot?: string;
  testPeriod?: string;
  calculationStandard?: string;
  storageCondition?: string;
  bottlePosition?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  defaultRecipeId?: string;
  defaultRecipeSnapshot?: { name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number };
}

export interface CreateSampleInput {
  sampleCode?: string;
  positionInRun?: number;
  storageCondition?: string;
  bottlePosition?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  id?: string;
}

export interface UpdateSampleInput {
  sampleCode?: string;
  storageCondition?: string;
  bottlePosition?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  status?: 'CREATED' | 'TESTED' | 'EXCLUDED';
}

export interface CreateTestRunInput {
  sampleId: string;
  recipeId: string;
  recipeSnapshot: { name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  setpoints: { forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  fixture: FixtureScenario;
  operatorId: string;
  operatorName: string;
  repetitionIndex?: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  id?: string;
}

export interface UpdateTestRunInput {
  captureSession?: CaptureSession;
  analysisDraft?: BatchAnalysisDraft;
  finalReport?: FinalAnalysisReport;
  failureReason?: string;
  status?: 'PENDING' | 'CAPTURING' | 'ANALYZING' | 'REVIEW_REQUIRED' | 'FINALIZED' | 'FAILED' | 'ABORTED';
  notes?: string;
  metadata?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
}

export interface KodePengujianRepository {
  list(): Promise<KodePengujian[]>;
  get(id: string): Promise<KodePengujian | null>;
  create(input: CreateKodePengujianInput): Promise<KodePengujian>;
  updateParentMetadata(id: string, patch: Partial<KodePengujianParentMetadata>): Promise<KodePengujian>;
  addSample(kpId: string, input: CreateSampleInput): Promise<{ kodePengujian: KodePengujian; sample: Sample }>;
  updateSample(kpId: string, sampleId: string, patch: Partial<UpdateSampleInput>): Promise<Sample>;
  addTestRun(kpId: string, input: CreateTestRunInput): Promise<{ kodePengujian: KodePengujian; testRun: TestRun }>;
  updateTestRun(kpId: string, testRunId: string, patch: Partial<UpdateTestRunInput>): Promise<TestRun>;
  updateSyncMetadata(id: string, sync: Partial<KodePengujian['sync']>): Promise<KodePengujian>;
  syncAggregate(payload: RemoteSyncPayload): Promise<RemoteSyncResponse>;
}