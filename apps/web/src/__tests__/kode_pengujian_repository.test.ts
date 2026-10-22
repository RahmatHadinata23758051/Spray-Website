import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  LocalStorageKodePengujianRepository,
  KP_STORAGE_KEY,
} from '../data/local/kodePengujianRepository';
import { LocalStorageBatchRepository } from '../data/local/batchRepository';
import { getEffectiveSampleContext, DomainInvariantError } from '@spray-paragon/domain';
import { KodePengujianNotFoundError } from '../application/ports/kodePengujianRepository';
import type { FinalAnalysisReport } from '@spray-paragon/domain';

describe('LocalStorageKodePengujianRepository (P1C)', () => {
  let repo: LocalStorageKodePengujianRepository;

  const dummyProduct = {
    productCode: 'PRD-MIST-01',
    productName: 'Hydra Mist 50ml',
  };

  const dummyRecipeA = {
    name: 'Standard Methodology A',
    forceSetpointN: 15,
    pressDurationMs: 400,
    strokeMm: 12,
  };

  const dummyRecipeB = {
    name: 'High-Force Methodology B',
    forceSetpointN: 25,
    pressDurationMs: 600,
    strokeMm: 14,
  };

  const dummySetpointsA = {
    forceSetpointN: 15,
    pressDurationMs: 400,
    strokeMm: 12,
  };

  const dummySetpointsB = {
    forceSetpointN: 25,
    pressDurationMs: 600,
    strokeMm: 14,
  };

  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    repo = new LocalStorageKodePengujianRepository();
  });

  afterEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('1. creates KodePengujian, persists to LocalStorage, and reloads across instances', async () => {
    const created = await repo.create({
      productId: 'p-hydra',
      productSnapshot: dummyProduct,
      productLot: 'LOT-2026-X1',
      testPeriod: 'Week 42 - Stability',
      operatorId: 'op-alpha',
      operatorName: 'Dr. Nata',
      calculationStandard: 'ISO-SPRAY-2026',
      notes: 'Initial lot release testing',
      defaultRecipeId: 'r-std',
      defaultRecipeSnapshot: dummyRecipeA,
      storageCondition: 'Warehouse 25C',
      bottlePosition: 'Upright',
    });

    expect(created.id).toMatch(/^KP-/);
    expect(created.status).toBe('DRAFT');

    // Verify stored JSON in localStorage
    const rawStored = window.localStorage.getItem(KP_STORAGE_KEY);
    expect(rawStored).toBeTruthy();
    const parsed = JSON.parse(rawStored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(created.id);

    // Verify reload with a new repository instance
    const repo2 = new LocalStorageKodePengujianRepository();
    const fetched = await repo2.get(created.id);
    expect(fetched).toBeDefined();
    expect(fetched!.productLot).toBe('LOT-2026-X1');
    expect(fetched!.operatorName).toBe('Dr. Nata');
    expect(fetched!.storageCondition).toBe('Warehouse 25C');
  });

  it('2. adds multiple Samples to a KodePengujian and persists them', async () => {
    const kp = await repo.create({
      productId: 'p-hydra',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Operator',
      storageCondition: 'Room Temp 25C',
      bottlePosition: 'Upright',
    });

    const s1 = await repo.addSample(kp.id, { sampleCode: 'BOTTLE-001', storageCondition: 'Chamber 40C' });
    const s2 = await repo.addSample(kp.id, { sampleCode: 'BOTTLE-002', bottlePosition: 'Inverted' });
    const s3 = await repo.addSample(kp.id, { sampleCode: 'BOTTLE-003' });

    expect(s1.sample.sampleCode).toBe('BOTTLE-001');
    expect(s1.sample.positionInRun).toBe(1);
    expect(s2.sample.positionInRun).toBe(2);
    expect(s3.sample.positionInRun).toBe(3);

    const reloaded = await repo.get(kp.id);
    expect(reloaded!.samples).toHaveLength(3);
    expect(reloaded!.samples.map(s => s.sampleCode)).toEqual(['BOTTLE-001', 'BOTTLE-002', 'BOTTLE-003']);
  });

  it('3. adds TestRun to correct Sample and updates Sample status', async () => {
    const kp = await repo.create({
      productId: 'p-hydra',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Operator',
    });

    const { sample } = await repo.addSample(kp.id, { sampleCode: 'BOTTLE-01' });

    const { testRun } = await repo.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-std',
      recipeSnapshot: dummyRecipeA,
      setpoints: dummySetpointsA,
      fixture: 'nominal-01',
      operatorId: 'op-1',
      operatorName: 'Operator',
    });

    expect(testRun.id).toMatch(/^TR-/);
    expect(testRun.sampleId).toBe(sample.id);
    expect(testRun.kodePengujianId).toBe(kp.id);
    expect(testRun.status).toBe('PENDING');

    const reloaded = await repo.get(kp.id);
    expect(reloaded!.testRuns).toHaveLength(1);
    expect(reloaded!.testRuns[0].id).toBe(testRun.id);
  });

  it('4. supports different recipes across TestRuns on different or same samples', async () => {
    const kp = await repo.create({
      productId: 'p-hydra',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Operator',
    });

    const s1 = await repo.addSample(kp.id, { sampleCode: 'BOTTLE-01' });
    const s2 = await repo.addSample(kp.id, { sampleCode: 'BOTTLE-02' });

    const r1 = await repo.addTestRun(kp.id, {
      sampleId: s1.sample.id,
      recipeId: 'rec-A',
      recipeSnapshot: dummyRecipeA,
      setpoints: dummySetpointsA,
      fixture: 'nominal-01',
      operatorId: 'op-1',
      operatorName: 'Op A',
    });

    const r2 = await repo.addTestRun(kp.id, {
      sampleId: s2.sample.id,
      recipeId: 'rec-B',
      recipeSnapshot: dummyRecipeB,
      setpoints: dummySetpointsB,
      fixture: 'direction-offset-01',
      operatorId: 'op-2',
      operatorName: 'Op B',
    });

    expect(r1.testRun.recipeSnapshot.name).toBe('Standard Methodology A');
    expect(r1.testRun.setpoints.forceSetpointN).toBe(15);
    expect(r2.testRun.recipeSnapshot.name).toBe('High-Force Methodology B');
    expect(r2.testRun.setpoints.forceSetpointN).toBe(25);

    const reloaded = await repo.get(kp.id);
    expect(reloaded!.testRuns[0].recipeSnapshot.forceSetpointN).toBe(15);
    expect(reloaded!.testRuns[1].recipeSnapshot.forceSetpointN).toBe(25);
  });

  it('5. resolves parent default fallback vs Sample override without mutating Sample record', async () => {
    const kp = await repo.create({
      productId: 'p-hydra',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Operator',
      storageCondition: 'Warehouse 25C',
      bottlePosition: 'Standing',
    });

    // Sample 1 specifies its own storageCondition, but leaves bottlePosition empty
    const s1 = await repo.addSample(kp.id, {
      sampleCode: 'SMP-1',
      storageCondition: 'Chamber 40C',
    });

    // Sample 2 specifies no overrides
    const s2 = await repo.addSample(kp.id, {
      sampleCode: 'SMP-2',
    });

    // Verify sample records do NOT copy parent values
    expect(s1.sample.storageCondition).toBe('Chamber 40C');
    expect(s1.sample.bottlePosition).toBeUndefined();
    expect(s2.sample.storageCondition).toBeUndefined();
    expect(s2.sample.bottlePosition).toBeUndefined();

    // Verify effective context resolver
    const eff1 = getEffectiveSampleContext(s1.sample, kp);
    expect(eff1.storageCondition).toBe('Chamber 40C'); // overridden
    expect(eff1.bottlePosition).toBe('Standing'); // parent fallback

    const eff2 = getEffectiveSampleContext(s2.sample, kp);
    expect(eff2.storageCondition).toBe('Warehouse 25C'); // parent fallback
    expect(eff2.bottlePosition).toBe('Standing'); // parent fallback
  });

  it('6. rejects invalid cross-parent TestRun creation', async () => {
    const kpA = await repo.create({
      productId: 'prod-A',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Op',
    });
    const kpB = await repo.create({
      productId: 'prod-B',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Op',
    });

    const { sample: sampleA } = await repo.addSample(kpA.id, { sampleCode: 'BOTTLE-A' });

    // Attempting to create a TestRun in kpB referencing sampleA from kpA must throw
    await expect(
      repo.addTestRun(kpB.id, {
        sampleId: sampleA.id,
        recipeId: 'rec-1',
        recipeSnapshot: dummyRecipeA,
        setpoints: dummySetpointsA,
        fixture: 'nominal-01',
        operatorId: 'op-1',
        operatorName: 'Op',
      })
    ).rejects.toThrow(DomainInvariantError);
  });

  it('7. prevents overwriting or mutating a finalized TestRun', async () => {
    const kp = await repo.create({
      productId: 'p-hydra',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Operator',
    });

    const { sample } = await repo.addSample(kp.id, { sampleCode: 'BOTTLE-01' });

    const { testRun } = await repo.addTestRun(kp.id, {
      sampleId: sample.id,
      recipeId: 'rec-std',
      recipeSnapshot: dummyRecipeA,
      setpoints: dummySetpointsA,
      fixture: 'nominal-01',
      operatorId: 'op-1',
      operatorName: 'Operator',
    });

    const fakeReport = {
      status: 'finalized',
      testId: testRun.id,
      finalizedBy: 'QC Lead',
      finalizedAt: '2026-10-20T12:00:00Z',
    } as unknown as FinalAnalysisReport;

    // Finalize the test run
    const finalized = await repo.updateTestRun(kp.id, testRun.id, {
      status: 'FINALIZED',
      finalReport: fakeReport,
      completedAt: '2026-10-20T12:00:00Z',
    });
    expect(finalized.status).toBe('FINALIZED');
    expect(finalized.finalReport).toBeDefined();

    // Invariant 1: Overwriting finalReport must throw
    await expect(
      repo.updateTestRun(kp.id, testRun.id, {
        finalReport: { ...fakeReport, finalizedBy: 'Malicious' } as unknown as FinalAnalysisReport,
      })
    ).rejects.toThrow(DomainInvariantError);

    // Invariant 2: Mutating captureSession on a finalized run must throw
    await expect(
      repo.updateTestRun(kp.id, testRun.id, {
        status: 'CAPTURING',
      })
    ).rejects.toThrow(DomainInvariantError);

    // Allowing metadata/notes update is permitted
    const updated = await repo.updateTestRun(kp.id, testRun.id, {
      notes: 'Reviewed and approved by QA manager.',
    });
    expect(updated.notes).toBe('Reviewed and approved by QA manager.');
    expect(updated.status).toBe('FINALIZED');
  });

  it('8. dual-read: legacy Batch data in spraybot.batches.v1 is surfaced through adapter', async () => {
    // Populate spraybot.batches.v1 with a legacy Batch
    const batchRepo = new LocalStorageBatchRepository();
    const batch = await batchRepo.createBatchDraft({
      productId: 'p-legacy',
      productSnapshot: dummyProduct,
      recipeId: 'rec-legacy',
      recipeSnapshot: dummyRecipeA,
      operatorId: 'op-legacy',
      operatorName: 'Legacy Operator',
      fixture: 'nominal-01',
      productLot: 'LOT-LEGACY-01',
      storageCondition: 'Legacy Ambient',
      bottlePosition: 'Upright',
      testPeriod: 'Month-1',
    });
    await batchRepo.prepareBatch(batch.id);

    // The KodePengujianRepository should surface this legacy batch via dual-read
    const list = await repo.list();
    const expectedKpId = batch.id.replace(/^BAT-/, 'KP-');
    const found = list.find(k => k.id === expectedKpId);

    expect(found).toBeDefined();
    expect(found!.productId).toBe('p-legacy');
    expect(found!.productLot).toBe('LOT-LEGACY-01');
    expect(found!.samples).toHaveLength(1);
    expect(found!.testRuns).toHaveLength(1);

    // Direct get should also find it
    const direct = await repo.get(expectedKpId);
    expect(direct).toBeDefined();
    expect(direct!.id).toBe(expectedKpId);
  });

  it('9. dual-read: new and legacy data do not create duplicated entries in list()', async () => {
    // 1. Create a legacy Batch
    const batchRepo = new LocalStorageBatchRepository();
    const batch = await batchRepo.createBatchDraft({
      productId: 'p-legacy',
      productSnapshot: dummyProduct,
      recipeId: 'rec-legacy',
      recipeSnapshot: dummyRecipeA,
      operatorId: 'op-legacy',
      operatorName: 'Legacy Operator',
      fixture: 'nominal-01',
      productLot: 'LOT-LEGACY-01',
    });

    const expectedKpId = batch.id.replace(/^BAT-/, 'KP-');

    // 2. Also explicitly create a new KodePengujian with the same ID in the new store
    await repo.create({
      id: expectedKpId,
      productId: 'p-modern',
      productSnapshot: dummyProduct,
      operatorId: 'op-modern',
      operatorName: 'Modern Operator',
    });

    // 3. list() must NOT return duplicate entries for expectedKpId
    const all = await repo.list();
    const matching = all.filter(k => k.id === expectedKpId);
    expect(matching).toHaveLength(1);
    // The modern one from spraybot.kodePengujian.v1 takes precedence
    expect(matching[0].productId).toBe('p-modern');
  });

  it('10. aggregate-safe parent metadata update works as expected', async () => {
    const kp = await repo.create({
      productId: 'p-hydra',
      productSnapshot: dummyProduct,
      operatorId: 'op-1',
      operatorName: 'Operator',
      productLot: 'LOT-OLD',
    });

    const updated = await repo.updateParentMetadata(kp.id, {
      productLot: 'LOT-NEW',
      notes: 'Updated notes',
    });

    expect(updated.productLot).toBe('LOT-NEW');
    expect(updated.notes).toBe('Updated notes');
    expect(updated.id).toBe(kp.id);

    const reloaded = await repo.get(kp.id);
    expect(reloaded!.productLot).toBe('LOT-NEW');
  });

  it('11. throws appropriate not found errors', async () => {
    await expect(repo.updateParentMetadata('KP-NONEXISTENT', { notes: 'x' })).rejects.toThrow(KodePengujianNotFoundError);
    await expect(repo.addSample('KP-NONEXISTENT', {})).rejects.toThrow(KodePengujianNotFoundError);
    await expect(repo.updateSample('KP-NONEXISTENT', 'SMP-1', {})).rejects.toThrow(KodePengujianNotFoundError);
    await expect(repo.addTestRun('KP-NONEXISTENT', {
      sampleId: 'SMP-1',
      recipeId: 'r1',
      recipeSnapshot: dummyRecipeA,
      setpoints: dummySetpointsA,
      fixture: 'nominal-01',
      operatorId: 'op1',
      operatorName: 'Op',
    })).rejects.toThrow(KodePengujianNotFoundError);
  });
});
