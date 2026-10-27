import type { KodePengujianRepository } from '../../application/ports/kodePengujianRepository';
import type {
  KodePengujian,
  Sample,
  TestRun,
} from '@spray-paragon/domain';
import type {
  CreateKodePengujianInput,
  KodePengujianParentMetadata,
  CreateSampleInput,
  UpdateSampleInput,
  CreateTestRunInput,
  UpdateTestRunInput,
} from '../../application/ports/kodePengujianRepository';
import type { RemoteSyncPayload, RemoteSyncResponse } from '@spray-paragon/contracts';
import { DomainInvariantError } from '@spray-paragon/domain';

export class MemoryKodePengujianRepository implements KodePengujianRepository {
  private kps = new Map<string, KodePengujian & { version: number }>();

  async list(): Promise<KodePengujian[]> {
    return Array.from(this.kps.values());
  }

  async get(id: string): Promise<KodePengujian | null> {
    return this.kps.get(id) ?? null;
  }

  async create(input: CreateKodePengujianInput): Promise<KodePengujian> {
    const id = input.id ?? `KP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const kp: KodePengujian & { version: number } = {
      id,
      status: 'ACTIVE',
      productId: input.productId,
      productSnapshot: input.productSnapshot,
      defaultRecipeId: input.defaultRecipeId,
      defaultRecipeSnapshot: input.defaultRecipeSnapshot,
      productLot: input.productLot,
      testPeriod: input.testPeriod,
      operatorId: input.operatorId,
      operatorName: input.operatorName,
      calculationStandard: input.calculationStandard,
      storageCondition: input.storageCondition,
      bottlePosition: input.bottlePosition,
      notes: input.notes,
      metadata: input.metadata,
      sync: undefined,
      samples: [],
      testRuns: [],
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    this.kps.set(id, kp);
    return kp;
  }

  async updateParentMetadata(id: string, patch: Partial<KodePengujianParentMetadata>): Promise<KodePengujian> {
    const existing = this.kps.get(id);
    if (!existing) throw new DomainInvariantError(`KodePengujian ${id} not found`);

    const now = new Date().toISOString();
    const updated: KodePengujian & { version: number } = {
      ...existing,
      ...patch,
      updatedAt: now,
      version: existing.version + 1,
    };

    this.kps.set(id, updated);
    return updated;
  }

  async addSample(kpId: string, input: CreateSampleInput): Promise<{ kodePengujian: KodePengujian; sample: Sample }> {
    const kp = this.kps.get(kpId);
    if (!kp) throw new DomainInvariantError(`KodePengujian ${kpId} not found`);

    const id = input.id ?? `SMP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const now = new Date().toISOString();
    const positionInRun = input.positionInRun ?? (kp.samples.length + 1);

    const sample: Sample & { version: number } = {
      id,
      kodePengujianId: kpId,
      sampleCode: input.sampleCode,
      positionInRun,
      storageCondition: input.storageCondition,
      bottlePosition: input.bottlePosition,
      notes: input.notes,
      metadata: input.metadata,
      status: 'CREATED',
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    const updatedKp: KodePengujian & { version: number } = {
      ...kp,
      samples: [...kp.samples, sample],
      updatedAt: now,
      version: kp.version + 1,
    };

    this.kps.set(kpId, updatedKp);
    return { kodePengujian: updatedKp, sample };
  }

  async updateSample(kpId: string, sampleId: string, patch: Partial<UpdateSampleInput>): Promise<Sample> {
    const kp = this.kps.get(kpId);
    if (!kp) throw new DomainInvariantError(`KodePengujian ${kpId} not found`);

    const sampleIndex = kp.samples.findIndex(s => s.id === sampleId);
    if (sampleIndex === -1) throw new DomainInvariantError(`Sample ${sampleId} not found in KodePengujian ${kpId}`);

    const existingSample = kp.samples[sampleIndex] as Sample & { version?: number };
    const now = new Date().toISOString();

    const updatedSample: Sample & { version: number } = {
      ...existingSample,
      ...patch,
      updatedAt: now,
      version: (existingSample.version ?? 1) + 1,
    };

    const updatedSamples = [...kp.samples];
    updatedSamples[sampleIndex] = updatedSample;

    this.kps.set(kpId, {
      ...kp,
      samples: updatedSamples,
      updatedAt: now,
      version: kp.version + 1,
    });

    return updatedSample;
  }

  async addTestRun(kpId: string, input: CreateTestRunInput): Promise<{ kodePengujian: KodePengujian; testRun: TestRun }> {
    const kp = this.kps.get(kpId);
    if (!kp) throw new DomainInvariantError(`KodePengujian ${kpId} not found`);

    const id = input.id ?? `TR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const testRun: TestRun & { version: number } = {
      id,
      kodePengujianId: kpId,
      sampleId: input.sampleId,
      recipeId: input.recipeId,
      recipeSnapshot: input.recipeSnapshot,
      setpoints: input.setpoints,
      fixture: input.fixture,
      operatorId: input.operatorId,
      operatorName: input.operatorName,
      repetitionIndex: input.repetitionIndex,
      notes: input.notes,
      metadata: input.metadata,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    const updatedKp: KodePengujian & { version: number } = {
      ...kp,
      testRuns: [...kp.testRuns, testRun],
      updatedAt: now,
      version: kp.version + 1,
    };

    this.kps.set(kpId, updatedKp);
    return { kodePengujian: updatedKp, testRun };
  }

  async updateTestRun(kpId: string, testRunId: string, patch: Partial<UpdateTestRunInput>): Promise<TestRun> {
    const kp = this.kps.get(kpId);
    if (!kp) throw new DomainInvariantError(`KodePengujian ${kpId} not found`);

    const trIndex = kp.testRuns.findIndex(t => t.id === testRunId);
    if (trIndex === -1) throw new DomainInvariantError(`TestRun ${testRunId} not found in KodePengujian ${kpId}`);

    const existingTr = kp.testRuns[trIndex] as TestRun & { version?: number };

    // Immutable final report guard
    if (existingTr.finalReport && patch.finalReport) {
      throw new DomainInvariantError(`TestRun ${testRunId} already has a final report. Finalized results are immutable.`);
    }

    // If status is FINALIZED, allow only metadata/notes updates
    const allowedFinalizedFields = new Set(['notes', 'metadata', 'failureReason']);
    const patchKeys = Object.keys(patch);
    if (existingTr.status === 'FINALIZED' && patchKeys.some(k => !allowedFinalizedFields.has(k))) {
      throw new DomainInvariantError(`TestRun ${testRunId} is FINALIZED. Cannot update field(s): ${patchKeys.filter(k => !allowedFinalizedFields.has(k)).join(', ')}.`);
    }

    const now = new Date().toISOString();
    const updatedTr: TestRun & { version: number } = {
      ...existingTr,
      ...patch,
      updatedAt: now,
      version: (existingTr.version ?? 1) + 1,
    };

    const updatedTestRuns = [...kp.testRuns];
    updatedTestRuns[trIndex] = updatedTr;

    this.kps.set(kpId, {
      ...kp,
      testRuns: updatedTestRuns,
      updatedAt: now,
      version: kp.version + 1,
    });

    return updatedTr;
  }

  async updateSyncMetadata(id: string, syncPatch: Partial<KodePengujian['sync']>): Promise<KodePengujian> {
    const kp = this.kps.get(id);
    if (!kp) throw new DomainInvariantError(`KodePengujian ${id} not found`);

    const now = new Date().toISOString();
    const updated: KodePengujian & { version: number } = {
      ...kp,
      sync: {
        status: syncPatch?.status ?? 'pending',
        localUpdatedAt: kp.updatedAt,
        ...syncPatch,
      },
      updatedAt: now,
      version: kp.version + 1,
    };

    this.kps.set(id, updated);
    return updated;
  }

  async syncAggregate(payload: RemoteSyncPayload): Promise<RemoteSyncResponse> {
    const { kp: incomingKp } = payload;
    const existing = this.kps.get(incomingKp.id);
    const now = new Date().toISOString();
    const incomingSamples = incomingKp.samples as Sample[];
    const incomingTestRuns = incomingKp.testRuns as TestRun[];
    const incomingVersion = (incomingKp as unknown as { version?: number }).version;

    if (existing) {
      if (incomingVersion !== undefined && existing.version !== incomingVersion) {
        return {
          success: false,
          conflicts: [{
            entity: 'kodePengujian',
            id: incomingKp.id,
            serverVersion: existing.version,
            localVersion: incomingVersion,
            reason: 'KodePengujian has been modified by another client. Please refresh and retry.',
          }],
          error: 'Version conflict',
        };
      }

      const conflicts: Array<{
        entity: 'kodePengujian' | 'sample' | 'testRun';
        id: string;
        serverVersion: unknown;
        localVersion: unknown;
        reason: string;
      }> = [];

      for (const serverTr of existing.testRuns) {
        if (serverTr.status === 'FINALIZED') {
          const incomingTr = incomingTestRuns.find(t => t.id === serverTr.id);
          if (!incomingTr) {
            conflicts.push({
              entity: 'testRun',
              id: serverTr.id,
              serverVersion: serverTr,
              localVersion: null,
              reason: `Finalized TestRun ${serverTr.id} cannot be removed.`,
            });
          } else if (incomingTr.status !== 'FINALIZED') {
            conflicts.push({
              entity: 'testRun',
              id: serverTr.id,
              serverVersion: serverTr,
              localVersion: incomingTr,
              reason: `Finalized TestRun ${serverTr.id} is immutable and cannot be reverted or demoted.`,
            });
          } else if (
            serverTr.finalReport &&
            incomingTr.finalReport &&
            JSON.stringify(serverTr.finalReport) !== JSON.stringify(incomingTr.finalReport)
          ) {
            conflicts.push({
              entity: 'testRun',
              id: serverTr.id,
              serverVersion: serverTr.finalReport,
              localVersion: incomingTr.finalReport,
              reason: `Finalized report for TestRun ${serverTr.id} cannot be altered.`,
            });
          }
        }
      }

      if (conflicts.length > 0) {
        return {
          success: false,
          conflicts,
          error: `Sync conflict: ${conflicts.map(c => c.reason).join('; ')}`,
        };
      }

      // Merge: update parent, upsert samples, upsert testRuns
      const updatedKp: KodePengujian & { version: number } = {
        ...existing,
        status: incomingKp.status as 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED',
        productLot: incomingKp.productLot ?? existing.productLot,
        testPeriod: incomingKp.testPeriod ?? existing.testPeriod,
        calculationStandard: incomingKp.calculationStandard ?? existing.calculationStandard,
        storageCondition: incomingKp.storageCondition ?? existing.storageCondition,
        bottlePosition: incomingKp.bottlePosition ?? existing.bottlePosition,
        notes: incomingKp.notes ?? existing.notes,
        metadata: incomingKp.metadata ?? existing.metadata,
        samples: incomingSamples,
        testRuns: incomingTestRuns,
        updatedAt: now,
        version: existing.version + 1,
      };

      this.kps.set(incomingKp.id, updatedKp);

      return {
        success: true,
        serverUpdatedAt: now,
      };
    } else {
      // Create new
      const newKp: KodePengujian & { version: number } = {
        id: incomingKp.id,
        status: incomingKp.status as 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED',
        productId: incomingKp.productId,
        productSnapshot: incomingKp.productSnapshot,
        defaultRecipeId: incomingKp.defaultRecipeId,
        defaultRecipeSnapshot: incomingKp.defaultRecipeSnapshot,
        productLot: incomingKp.productLot,
        testPeriod: incomingKp.testPeriod,
        operatorId: incomingKp.operatorId,
        operatorName: incomingKp.operatorName,
        calculationStandard: incomingKp.calculationStandard,
        storageCondition: incomingKp.storageCondition,
        bottlePosition: incomingKp.bottlePosition,
        notes: incomingKp.notes,
        metadata: incomingKp.metadata,
        samples: incomingSamples,
        testRuns: incomingTestRuns,
        createdAt: incomingKp.createdAt,
        updatedAt: now,
        version: 1,
      };
      this.kps.set(incomingKp.id, newKp);

      return {
        success: true,
        serverUpdatedAt: now,
      };
    }
  }
}