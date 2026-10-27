import type { KodePengujianRepository } from '../../../application/ports/kodePengujianRepository';
import type { KodePengujian, Sample, TestRun, FixtureScenario, CaptureSession, BatchAnalysisDraft, FinalAnalysisReport } from '@spray-paragon/domain';
import type { CreateKodePengujianInput, KodePengujianParentMetadata, CreateSampleInput, UpdateSampleInput, CreateTestRunInput, UpdateTestRunInput } from '../../../application/ports/kodePengujianRepository';
import type { RemoteSyncPayload, RemoteSyncResponse } from '@spray-paragon/contracts';
import type { db as database } from '../client';
import { kodePengujian, samples, testRuns, finalResults, mediaReferences } from '../schema';
import { eq, and } from 'drizzle-orm';
import { DomainInvariantError } from '@spray-paragon/domain';

function mapKpRow(row: typeof kodePengujian.$inferSelect): KodePengujian {
  return {
    id: row.id,
    status: row.status,
    productId: row.productId,
    productSnapshot: row.productSnapshot,
    defaultRecipeId: row.defaultRecipeId ?? undefined,
    defaultRecipeSnapshot: row.defaultRecipeSnapshot ?? undefined,
    productLot: row.productLot ?? undefined,
    testPeriod: row.testPeriod ?? undefined,
    operatorId: row.operatorId,
    operatorName: row.operatorName,
    calculationStandard: row.calculationStandard ?? undefined,
    storageCondition: row.storageCondition ?? undefined,
    bottlePosition: row.bottlePosition ?? undefined,
    notes: row.notes ?? undefined,
    metadata: row.metadata ?? undefined,
    sync: undefined,
    samples: [],
    testRuns: [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    version: row.version,
  };
}

function mapSampleRow(row: typeof samples.$inferSelect): Sample {
  return {
    id: row.id,
    kodePengujianId: row.kodePengujianId,
    sampleCode: row.sampleCode ?? undefined,
    positionInRun: row.positionInRun,
    storageCondition: row.storageCondition ?? undefined,
    bottlePosition: row.bottlePosition ?? undefined,
    notes: row.notes ?? undefined,
    metadata: row.metadata ?? undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapTestRunRow(row: typeof testRuns.$inferSelect): TestRun {
  return {
    id: row.id,
    kodePengujianId: row.kodePengujianId,
    sampleId: row.sampleId,
    recipeId: row.recipeId,
    recipeSnapshot: row.recipeSnapshot,
    setpoints: row.setpoints,
    fixture: row.fixture as FixtureScenario,
    captureSession: row.captureSession as CaptureSession | undefined,
    analysisDraft: row.analysisDraft as BatchAnalysisDraft | undefined,
    finalReport: row.finalReport as FinalAnalysisReport | undefined,
    failureReason: row.failureReason ?? undefined,
    repetitionIndex: row.repetitionIndex ?? undefined,
    operatorId: row.operatorId,
    operatorName: row.operatorName,
    status: row.status,
    notes: row.notes ?? undefined,
    metadata: row.metadata ?? undefined,
    startedAt: row.startedAt?.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PostgresKodePengujianRepository implements KodePengujianRepository {
  constructor(private dbInstance: typeof database) {}

  async list(): Promise<KodePengujian[]> {
    const kpRows = await this.dbInstance.select().from(kodePengujian).orderBy(kodePengujian.updatedAt);
    const sampleRows = await this.dbInstance.select().from(samples);
    const testRunRows = await this.dbInstance.select().from(testRuns);

    const samplesByKp = new Map<string, Sample[]>();
    for (const s of sampleRows) {
      const arr = samplesByKp.get(s.kodePengujianId) ?? [];
      arr.push(mapSampleRow(s));
      samplesByKp.set(s.kodePengujianId, arr);
    }

    const testRunsByKp = new Map<string, TestRun[]>();
    for (const tr of testRunRows) {
      const arr = testRunsByKp.get(tr.kodePengujianId) ?? [];
      arr.push(mapTestRunRow(tr));
      testRunsByKp.set(tr.kodePengujianId, arr);
    }

    return kpRows.map(row => ({
      ...mapKpRow(row),
      samples: samplesByKp.get(row.id) ?? [],
      testRuns: testRunsByKp.get(row.id) ?? [],
    }));
  }

  async get(id: string): Promise<KodePengujian | null> {
    const [kpRow] = await this.dbInstance.select().from(kodePengujian).where(eq(kodePengujian.id, id)).limit(1);
    if (!kpRow) return null;

    const sampleRows = await this.dbInstance.select().from(samples).where(eq(samples.kodePengujianId, id));
    const testRunRows = await this.dbInstance.select().from(testRuns).where(eq(testRuns.kodePengujianId, id));

    return {
      ...mapKpRow(kpRow),
      samples: sampleRows.map(mapSampleRow),
      testRuns: testRunRows.map(mapTestRunRow),
    };
  }

  async create(input: CreateKodePengujianInput): Promise<KodePengujian> {
    const id = input.id ?? `KP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const now = new Date();

    await this.dbInstance.insert(kodePengujian).values({
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
      createdAt: now,
      updatedAt: now,
      version: 1,
    });

    return {
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
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      version: 1,
    };
  }

  async updateParentMetadata(id: string, patch: Partial<KodePengujianParentMetadata>): Promise<KodePengujian> {
    const [existing] = await this.dbInstance.select().from(kodePengujian).where(eq(kodePengujian.id, id)).limit(1);
    if (!existing) throw new DomainInvariantError(`KodePengujian ${id} not found`);

    const now = new Date();
    const updateData: Partial<typeof kodePengujian.$inferInsert> = {
      ...patch,
      updatedAt: now,
      version: existing.version + 1,
    };

    await this.dbInstance.update(kodePengujian).set(updateData).where(eq(kodePengujian.id, id));
    return this.get(id) as Promise<KodePengujian>;
  }

  async addSample(kpId: string, input: CreateSampleInput): Promise<{ kodePengujian: KodePengujian; sample: Sample }> {
    const [kp] = await this.dbInstance.select().from(kodePengujian).where(eq(kodePengujian.id, kpId)).limit(1);
    if (!kp) throw new DomainInvariantError(`KodePengujian ${kpId} not found`);

    const id = input.id ?? `SMP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const positionInRun = input.positionInRun ?? (await this.dbInstance.select().from(samples).where(eq(samples.kodePengujianId, kpId))).length + 1;
    const now = new Date();

    await this.dbInstance.insert(samples).values({
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
    });

    await this.dbInstance.update(kodePengujian).set({ updatedAt: now, version: kp.version + 1 }).where(eq(kodePengujian.id, kpId));

    const sample = {
      id,
      kodePengujianId: kpId,
      sampleCode: input.sampleCode,
      positionInRun,
      storageCondition: input.storageCondition,
      bottlePosition: input.bottlePosition,
      notes: input.notes,
      metadata: input.metadata,
      status: 'CREATED' as const,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const updatedKp = await this.get(kpId);
    if (!updatedKp) throw new DomainInvariantError(`Failed to reload KodePengujian ${kpId}`);
    return { kodePengujian: updatedKp, sample };
  }

  async updateSample(kpId: string, sampleId: string, patch: Partial<UpdateSampleInput>): Promise<Sample> {
    const [existing] = await this.dbInstance.select().from(samples).where(and(eq(samples.id, sampleId), eq(samples.kodePengujianId, kpId))).limit(1);
    if (!existing) throw new DomainInvariantError(`Sample ${sampleId} not found in KodePengujian ${kpId}`);

    const now = new Date();
    const updateData: Partial<typeof samples.$inferInsert> = {
      ...patch,
      updatedAt: now,
      version: existing.version + 1,
    };

    await this.dbInstance.update(samples).set(updateData).where(eq(samples.id, sampleId));
    const [updated] = await this.dbInstance.select().from(samples).where(eq(samples.id, sampleId)).limit(1);
    return mapSampleRow(updated);
  }

  async addTestRun(kpId: string, input: CreateTestRunInput): Promise<{ kodePengujian: KodePengujian; testRun: TestRun }> {
    const [kp] = await this.dbInstance.select().from(kodePengujian).where(eq(kodePengujian.id, kpId)).limit(1);
    if (!kp) throw new DomainInvariantError(`KodePengujian ${kpId} not found`);

    const id = input.id ?? `TR-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const now = new Date();

    await this.dbInstance.insert(testRuns).values({
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
    });

    await this.dbInstance.update(kodePengujian).set({ updatedAt: now, version: kp.version + 1 }).where(eq(kodePengujian.id, kpId));

    const testRun = {
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
      status: 'PENDING' as const,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const updatedKp = await this.get(kpId);
    if (!updatedKp) throw new DomainInvariantError(`Failed to reload KodePengujian ${kpId}`);
    return { kodePengujian: updatedKp, testRun };
  }

  async updateTestRun(kpId: string, testRunId: string, patch: Partial<UpdateTestRunInput>): Promise<TestRun> {
    const [existing] = await this.dbInstance.select().from(testRuns).where(and(eq(testRuns.id, testRunId), eq(testRuns.kodePengujianId, kpId))).limit(1);
    if (!existing) throw new DomainInvariantError(`TestRun ${testRunId} not found in KodePengujian ${kpId}`);

    // Immutable final report guard
    if (existing.finalReport && patch.finalReport) {
      throw new DomainInvariantError(`TestRun ${testRunId} already has a final report. Finalized results are immutable.`);
    }

    // If status is FINALIZED, allow only metadata/notes updates
    const allowedFinalizedFields = new Set(['notes', 'metadata', 'failureReason']);
    const patchKeys = Object.keys(patch);
    if (existing.status === 'FINALIZED' && patchKeys.some(k => !allowedFinalizedFields.has(k))) {
      throw new DomainInvariantError(`TestRun ${testRunId} is FINALIZED. Cannot update field(s): ${patchKeys.filter(k => !allowedFinalizedFields.has(k)).join(', ')}.`);
    }

    const now = new Date();
    const { startedAt, completedAt, ...restPatch } = patch;
    const updateData: Partial<typeof testRuns.$inferInsert> = {
      ...restPatch,
      ...(startedAt !== undefined ? { startedAt: startedAt ? new Date(startedAt) : null } : {}),
      ...(completedAt !== undefined ? { completedAt: completedAt ? new Date(completedAt) : null } : {}),
      updatedAt: now,
      version: existing.version + 1,
    };

    await this.dbInstance.update(testRuns).set(updateData).where(eq(testRuns.id, testRunId));
    const [updated] = await this.dbInstance.select().from(testRuns).where(eq(testRuns.id, testRunId)).limit(1);
    return mapTestRunRow(updated);
  }

  async updateSyncMetadata(id: string, _syncPatch: Partial<KodePengujian['sync']>): Promise<KodePengujian> {
    const [existing] = await this.dbInstance.select().from(kodePengujian).where(eq(kodePengujian.id, id)).limit(1);
    if (!existing) throw new DomainInvariantError(`KodePengujian ${id} not found`);

    const now = new Date();
    await this.dbInstance.update(kodePengujian).set({ updatedAt: now, version: existing.version + 1 }).where(eq(kodePengujian.id, id));
    return this.get(id) as Promise<KodePengujian>;
  }

  async syncAggregate(payload: RemoteSyncPayload): Promise<RemoteSyncResponse> {
    const { kp: incomingKp, mediaManifest } = payload;
    const [existingRow] = await this.dbInstance.select().from(kodePengujian).where(eq(kodePengujian.id, incomingKp.id)).limit(1);
    const now = new Date();

    if (existingRow) {
      // 1. Optimistic Concurrency check
      const incomingVersion = (incomingKp as unknown as { version?: number }).version;
      if (incomingVersion !== undefined && existingRow.version !== incomingVersion) {
        return {
          success: false,
          conflicts: [{
            entity: 'kodePengujian',
            id: incomingKp.id,
            serverVersion: existingRow.version,
            localVersion: incomingVersion,
            reason: 'KodePengujian has been modified by another client. Please refresh and retry.',
          }],
          error: 'Version conflict',
        };
      }

      // 2. Fetch existing test runs to verify immutability
      const existingTrRows = await this.dbInstance.select().from(testRuns).where(eq(testRuns.kodePengujianId, incomingKp.id));
      const conflicts: Array<{
        entity: 'kodePengujian' | 'sample' | 'testRun';
        id: string;
        serverVersion: unknown;
        localVersion: unknown;
        reason: string;
      }> = [];

      for (const serverTr of existingTrRows) {
        if (serverTr.status === 'FINALIZED') {
          const incomingTr = (incomingKp.testRuns as TestRun[])?.find(t => t.id === serverTr.id);
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

      // 3. Update KodePengujian parent
      await this.dbInstance.update(kodePengujian).set({
        status: incomingKp.status as 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED',
        productLot: incomingKp.productLot,
        testPeriod: incomingKp.testPeriod,
        calculationStandard: incomingKp.calculationStandard,
        storageCondition: incomingKp.storageCondition,
        bottlePosition: incomingKp.bottlePosition,
        notes: incomingKp.notes,
        metadata: incomingKp.metadata,
        updatedAt: now,
        version: existingRow.version + 1,
      }).where(eq(kodePengujian.id, incomingKp.id));

      // 4. Upsert samples
      for (const sample of (incomingKp.samples as Sample[])) {
        const [existingSample] = await this.dbInstance.select().from(samples).where(eq(samples.id, sample.id)).limit(1);
        if (existingSample) {
          await this.dbInstance.update(samples).set({
            sampleCode: sample.sampleCode,
            positionInRun: sample.positionInRun,
            storageCondition: sample.storageCondition,
            bottlePosition: sample.bottlePosition,
            notes: sample.notes,
            metadata: sample.metadata,
            status: sample.status,
            updatedAt: now,
          }).where(eq(samples.id, sample.id));
        } else {
          await this.dbInstance.insert(samples).values({
            id: sample.id,
            kodePengujianId: incomingKp.id,
            sampleCode: sample.sampleCode,
            positionInRun: sample.positionInRun,
            storageCondition: sample.storageCondition,
            bottlePosition: sample.bottlePosition,
            notes: sample.notes,
            metadata: sample.metadata,
            status: sample.status,
            createdAt: sample.createdAt ? new Date(sample.createdAt) : now,
            updatedAt: now,
            version: 1,
          });
        }
      }

      // 5. Upsert testRuns and finalResults
      for (const tr of (incomingKp.testRuns as TestRun[])) {
        const [existingTr] = await this.dbInstance.select().from(testRuns).where(eq(testRuns.id, tr.id)).limit(1);
        if (existingTr) {
          if (existingTr.status === 'FINALIZED') {
            await this.dbInstance.update(testRuns).set({
              notes: tr.notes,
              metadata: tr.metadata,
              failureReason: tr.failureReason,
              updatedAt: now,
            }).where(eq(testRuns.id, tr.id));
          } else {
            await this.dbInstance.update(testRuns).set({
              recipeId: tr.recipeId,
              recipeSnapshot: tr.recipeSnapshot,
              setpoints: tr.setpoints,
              fixture: tr.fixture,
              captureSession: tr.captureSession,
              analysisDraft: tr.analysisDraft,
              finalReport: tr.finalReport,
              failureReason: tr.failureReason,
              status: tr.status,
              notes: tr.notes,
              metadata: tr.metadata,
              startedAt: tr.startedAt ? new Date(tr.startedAt) : null,
              completedAt: tr.completedAt ? new Date(tr.completedAt) : null,
              updatedAt: now,
              version: existingTr.version + 1,
            }).where(eq(testRuns.id, tr.id));
          }
        } else {
          await this.dbInstance.insert(testRuns).values({
            id: tr.id,
            kodePengujianId: incomingKp.id,
            sampleId: tr.sampleId,
            recipeId: tr.recipeId,
            recipeSnapshot: tr.recipeSnapshot,
            setpoints: tr.setpoints,
            fixture: tr.fixture,
            captureSession: tr.captureSession,
            analysisDraft: tr.analysisDraft,
            finalReport: tr.finalReport,
            failureReason: tr.failureReason,
            repetitionIndex: tr.repetitionIndex,
            operatorId: tr.operatorId ?? existingRow.operatorId,
            operatorName: tr.operatorName ?? existingRow.operatorName,
            status: tr.status,
            notes: tr.notes,
            metadata: tr.metadata,
            startedAt: tr.startedAt ? new Date(tr.startedAt) : null,
            completedAt: tr.completedAt ? new Date(tr.completedAt) : null,
            createdAt: tr.createdAt ? new Date(tr.createdAt) : now,
            updatedAt: now,
            version: 1,
          });
        }

        // Final result normalization
        if (tr.status === 'FINALIZED' && tr.finalReport) {
          const [existingFr] = await this.dbInstance.select().from(finalResults).where(eq(finalResults.testRunId, tr.id)).limit(1);
          if (!existingFr) {
            await this.dbInstance.insert(finalResults).values({
              id: `FR-${tr.id}`,
              testRunId: tr.id,
              analysisSource: tr.finalReport.analysisSource,
              perspectives: tr.finalReport.perspectives,
              finalizedBy: tr.finalReport.finalizedBy,
              finalizedAt: new Date(tr.finalReport.finalizedAt),
              sideResult: tr.finalReport.side,
              frontResult: tr.finalReport.front ?? null,
              selectedCaptureReferences: tr.finalReport.supportingCaptures ?? null,
              calibrationSnapshots: {
                side: tr.finalReport.side?.calibration,
                front: tr.finalReport.front?.calibration,
              },
              rawReport: tr.finalReport,
              createdAt: now,
            });
          }
        }
      }
    } else {
      // Create new KP aggregate
      await this.dbInstance.insert(kodePengujian).values({
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
        createdAt: new Date(incomingKp.createdAt),
        updatedAt: now,
        version: 1,
      });

      for (const sample of (incomingKp.samples as Sample[])) {
        await this.dbInstance.insert(samples).values({
          id: sample.id,
          kodePengujianId: incomingKp.id,
          sampleCode: sample.sampleCode,
          positionInRun: sample.positionInRun,
          storageCondition: sample.storageCondition,
          bottlePosition: sample.bottlePosition,
          notes: sample.notes,
          metadata: sample.metadata,
          status: sample.status,
          createdAt: sample.createdAt ? new Date(sample.createdAt) : now,
          updatedAt: now,
          version: 1,
        });
      }

      for (const tr of (incomingKp.testRuns as TestRun[])) {
        await this.dbInstance.insert(testRuns).values({
          id: tr.id,
          kodePengujianId: incomingKp.id,
          sampleId: tr.sampleId,
          recipeId: tr.recipeId,
          recipeSnapshot: tr.recipeSnapshot,
          setpoints: tr.setpoints,
          fixture: tr.fixture,
          captureSession: tr.captureSession,
          analysisDraft: tr.analysisDraft,
          finalReport: tr.finalReport,
          failureReason: tr.failureReason,
          repetitionIndex: tr.repetitionIndex,
          operatorId: tr.operatorId ?? incomingKp.operatorId,
          operatorName: tr.operatorName ?? incomingKp.operatorName,
          status: tr.status,
          notes: tr.notes,
          metadata: tr.metadata,
          startedAt: tr.startedAt ? new Date(tr.startedAt) : null,
          completedAt: tr.completedAt ? new Date(tr.completedAt) : null,
          createdAt: tr.createdAt ? new Date(tr.createdAt) : now,
          updatedAt: now,
          version: 1,
        });

        if (tr.status === 'FINALIZED' && tr.finalReport) {
          await this.dbInstance.insert(finalResults).values({
            id: `FR-${tr.id}`,
            testRunId: tr.id,
            analysisSource: tr.finalReport.analysisSource,
            perspectives: tr.finalReport.perspectives,
            finalizedBy: tr.finalReport.finalizedBy,
            finalizedAt: new Date(tr.finalReport.finalizedAt),
            sideResult: tr.finalReport.side,
            frontResult: tr.finalReport.front ?? null,
            selectedCaptureReferences: tr.finalReport.supportingCaptures ?? null,
            calibrationSnapshots: {
              side: tr.finalReport.side?.calibration,
              front: tr.finalReport.front?.calibration,
            },
            rawReport: tr.finalReport,
            createdAt: now,
          });
        }
      }
    }

    // Persist mediaReferences metadata (manifest only, no binaries)
    if (mediaManifest && mediaManifest.length > 0) {
      for (const media of mediaManifest) {
        const [existingMedia] = await this.dbInstance.select().from(mediaReferences).where(eq(mediaReferences.assetId, media.assetId)).limit(1);
        if (!existingMedia) {
          await this.dbInstance.insert(mediaReferences).values({
            id: `MR-${media.assetId}`,
            testRunId: media.scope.runId,
            assetId: media.assetId,
            kind: media.kind,
            mimeType: media.mimeType,
            sizeBytes: media.sizeBytes,
            capturedAt: media.localCreatedAt ? new Date(media.localCreatedAt) : null,
            createdAt: now,
          });
        }
      }
    }

    return {
      success: true,
      serverUpdatedAt: now.toISOString(),
    };
  }
}