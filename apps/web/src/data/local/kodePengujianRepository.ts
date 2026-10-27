import type {
  KodePengujianRepository,
  CreateKodePengujianInput,
  KodePengujianParentMetadata,
  CreateSampleInput,
  UpdateSampleInput,
  CreateTestRunInput,
  UpdateTestRunInput,
} from '../../application/ports/kodePengujianRepository';
import type { KodePengujian, Sample, TestRun, Batch } from '@spray-paragon/domain';
import {
  createKodePengujian,
  addSample,
  createTestRun,
  adaptBatchToKodePengujian,
  DomainInvariantError,
} from '@spray-paragon/domain';
import {
  KodePengujianNotFoundError,
  SampleNotFoundError,
  TestRunNotFoundError,
} from '../../application/ports/kodePengujianRepository';
import { BATCH_STORAGE_KEY } from './batchRepository';

export const KP_STORAGE_KEY = 'spraybot.kodePengujian.v1';

function readKpAll(): KodePengujian[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const data = window.localStorage.getItem(KP_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      console.warn('KodePengujian LocalStorage data is not an array. Resetting.');
      return [];
    }
    return parsed;
  } catch (e) {
    console.warn('Error parsing KodePengujian from LocalStorage, returning empty list.', e);
    return [];
  }
}

function writeKpAll(kps: KodePengujian[]): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(KP_STORAGE_KEY, JSON.stringify(kps));
  } catch (e) {
    console.warn('Error saving KodePengujian to LocalStorage.', e);
  }
}

function readLegacyBatches(): Batch[] {
  try {
    const data = window.localStorage.getItem(BATCH_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function isLegacyAlreadyRepresented(legacyBatch: Batch, kpStore: KodePengujian[]): boolean {
  const kpId = legacyBatch.id.replace(/^BAT-/, 'KP-');
  return kpStore.some(kp => kp.id === kpId || kp.id === legacyBatch.id || (kp.metadata?.legacyBatchId === legacyBatch.id));
}

export class LocalStorageKodePengujianRepository implements KodePengujianRepository {
  async list(): Promise<KodePengujian[]> {
    const kpStore = readKpAll();
    const legacyBatches = readLegacyBatches();
    const adaptedLegacy: KodePengujian[] = [];

    for (const batch of legacyBatches) {
      if (!isLegacyAlreadyRepresented(batch, kpStore)) {
        try {
          const adapted = adaptBatchToKodePengujian(batch);
          adaptedLegacy.push(adapted.kodePengujian);
        } catch {
          // Ignore batches that can't be adapted
        }
      }
    }

    const merged = [...kpStore, ...adaptedLegacy];
    merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return merged;
  }

  async get(id: string): Promise<KodePengujian | null> {
    // First check KP store
    const kpStore = readKpAll();
    let found = kpStore.find(kp => kp.id === id);
    if (found) return found;

    // Fallback: check legacy batches
    const legacyBatches = readLegacyBatches();
    const legacyBatch = legacyBatches.find(b => b.id === id || b.id.replace(/^BAT-/, 'KP-') === id);
    if (legacyBatch) {
      try {
        const adapted = adaptBatchToKodePengujian(legacyBatch);
        return adapted.kodePengujian;
      } catch {
        return null;
      }
    }

    return null;
  }

  async create(input: CreateKodePengujianInput): Promise<KodePengujian> {
    const kps = readKpAll();
    const kp = createKodePengujian(input);
    if (kps.some(existing => existing.id === kp.id)) {
      throw new DomainInvariantError(`KodePengujian with id ${kp.id} already exists.`);
    }
    kps.push(kp);
    writeKpAll(kps);
    return kp;
  }

  async updateParentMetadata(id: string, patch: Partial<KodePengujianParentMetadata>): Promise<KodePengujian> {
    const kps = readKpAll();
    let index = kps.findIndex(kp => kp.id === id);
    if (index < 0) {
      // Try to find in legacy and promote
      const legacyBatches = readLegacyBatches();
      const legacyBatch = legacyBatches.find(b => b.id === id || b.id.replace(/^BAT-/, 'KP-') === id);
      if (legacyBatch) {
        const adapted = adaptBatchToKodePengujian(legacyBatch);
        const promoted = { ...adapted.kodePengujian, ...patch, updatedAt: new Date().toISOString() };
        kps.push(promoted);
        writeKpAll(kps);
        return promoted;
      }
      throw new KodePengujianNotFoundError(id);
    }
    const kp = kps[index];
    const updated: KodePengujian = {
      ...kp,
      ...patch,
      id: kp.id,
      samples: kp.samples,
      testRuns: kp.testRuns,
      createdAt: kp.createdAt,
      updatedAt: new Date().toISOString(),
    };
    kps[index] = updated;
    writeKpAll(kps);
    return updated;
  }

  async addSample(kpId: string, input: CreateSampleInput): Promise<{ kodePengujian: KodePengujian; sample: Sample }> {
    const kps = readKpAll();
    let index = kps.findIndex(kp => kp.id === kpId);
    if (index < 0) {
      // Try to find in legacy and promote
      const legacyBatches = readLegacyBatches();
      const legacyBatch = legacyBatches.find(b => b.id === kpId || b.id.replace(/^BAT-/, 'KP-') === kpId);
      if (legacyBatch) {
        const adapted = adaptBatchToKodePengujian(legacyBatch);
        const promotedKp = { ...adapted.kodePengujian };
        const updatedKp = addSample(promotedKp, input);
        const newSample = updatedKp.samples[updatedKp.samples.length - 1];
        kps.push(updatedKp);
        writeKpAll(kps);
        return { kodePengujian: updatedKp, sample: newSample };
      }
      throw new KodePengujianNotFoundError(kpId);
    }
    const kp = kps[index];
    const updatedKp = addSample(kp, input);
    const newSample = updatedKp.samples[updatedKp.samples.length - 1];
    kps[index] = updatedKp;
    writeKpAll(kps);
    return { kodePengujian: updatedKp, sample: newSample };
  }

  async updateSample(kpId: string, sampleId: string, patch: Partial<UpdateSampleInput>): Promise<Sample> {
    const kps = readKpAll();
    let kpIndex = kps.findIndex(kp => kp.id === kpId);
    if (kpIndex < 0) {
      // Try to find in legacy and promote
      const legacyBatches = readLegacyBatches();
      const legacyBatch = legacyBatches.find(b => b.id === kpId || b.id.replace(/^BAT-/, 'KP-') === kpId);
      if (legacyBatch) {
        const adapted = adaptBatchToKodePengujian(legacyBatch);
        const promotedKp = { ...adapted.kodePengujian };
        const sampleIndex = promotedKp.samples.findIndex(s => s.id === sampleId);
        if (sampleIndex < 0) throw new SampleNotFoundError(kpId, sampleId);
        const sample = promotedKp.samples[sampleIndex];
        const updatedSample: Sample = {
          ...sample,
          ...patch,
          id: sample.id,
          kodePengujianId: sample.kodePengujianId,
          positionInRun: sample.positionInRun,
          status: patch.status ?? sample.status,
          createdAt: sample.createdAt,
          updatedAt: new Date().toISOString(),
        };
        const updatedKp: KodePengujian = {
          ...promotedKp,
          samples: promotedKp.samples.map((s, i) => i === sampleIndex ? updatedSample : s),
          updatedAt: new Date().toISOString(),
        };
        kps.push(updatedKp);
        writeKpAll(kps);
        return updatedSample;
      }
      throw new KodePengujianNotFoundError(kpId);
    }
    const kp = kps[kpIndex];
    const sampleIndex = kp.samples.findIndex(s => s.id === sampleId);
    if (sampleIndex < 0) throw new SampleNotFoundError(kpId, sampleId);
    const sample = kp.samples[sampleIndex];
    const updatedSample: Sample = {
      ...sample,
      ...patch,
      id: sample.id,
      kodePengujianId: sample.kodePengujianId,
      positionInRun: sample.positionInRun,
      status: patch.status ?? sample.status,
      createdAt: sample.createdAt,
      updatedAt: new Date().toISOString(),
    };
    const updatedKp: KodePengujian = {
      ...kp,
      samples: kp.samples.map((s, i) => i === sampleIndex ? updatedSample : s),
      updatedAt: new Date().toISOString(),
    };
    kps[kpIndex] = updatedKp;
    writeKpAll(kps);
    return updatedSample;
  }

  async addTestRun(kpId: string, input: CreateTestRunInput): Promise<{ kodePengujian: KodePengujian; testRun: TestRun }> {
    const kps = readKpAll();
    let index = kps.findIndex(kp => kp.id === kpId);
    if (index < 0) {
      // Try to find in legacy and promote
      const legacyBatches = readLegacyBatches();
      const legacyBatch = legacyBatches.find(b => b.id === kpId || b.id.replace(/^BAT-/, 'KP-') === kpId);
      if (legacyBatch) {
        const adapted = adaptBatchToKodePengujian(legacyBatch);
        const promotedKp = { ...adapted.kodePengujian };
        const { kp: updatedKp, testRun } = createTestRun(promotedKp, input);
        kps.push(updatedKp);
        writeKpAll(kps);
        return { kodePengujian: updatedKp, testRun };
      }
      throw new KodePengujianNotFoundError(kpId);
    }
    const kp = kps[index];
    const { kp: updatedKp, testRun } = createTestRun(kp, input);
    kps[index] = updatedKp;
    writeKpAll(kps);
    return { kodePengujian: updatedKp, testRun };
  }

  async updateTestRun(kpId: string, testRunId: string, patch: Partial<UpdateTestRunInput>): Promise<TestRun> {
    const kps = readKpAll();
    let kpIndex = kps.findIndex(kp => kp.id === kpId);
    if (kpIndex < 0) {
      // Try to find in legacy and promote
      const legacyBatches = readLegacyBatches();
      const legacyBatch = legacyBatches.find(b => b.id === kpId || b.id.replace(/^BAT-/, 'KP-') === kpId);
      if (legacyBatch) {
        const adapted = adaptBatchToKodePengujian(legacyBatch);
        const promotedKp = { ...adapted.kodePengujian };
        const trIndex = promotedKp.testRuns.findIndex(t => t.id === testRunId);
        if (trIndex < 0) throw new TestRunNotFoundError(kpId, testRunId);
        const tr = promotedKp.testRuns[trIndex];
        this.assertTestRunPatchAllowed(tr, patch);
        const updatedTr = this.applyTestRunPatch(tr, patch);
        const updatedKp: KodePengujian = {
          ...promotedKp,
          samples: updatedTr.status === 'FINALIZED'
            ? promotedKp.samples.map(s => s.id === updatedTr.sampleId ? { ...s, status: 'TESTED' as const, updatedAt: new Date().toISOString() } : s)
            : promotedKp.samples,
          testRuns: promotedKp.testRuns.map((t, i) => i === trIndex ? updatedTr : t),
          updatedAt: new Date().toISOString(),
        };
        kps.push(updatedKp);
        writeKpAll(kps);
        return updatedTr;
      }
      throw new KodePengujianNotFoundError(kpId);
    }
    const kp = kps[kpIndex];
    const trIndex = kp.testRuns.findIndex(t => t.id === testRunId);
    if (trIndex < 0) throw new TestRunNotFoundError(kpId, testRunId);
    const tr = kp.testRuns[trIndex];

    this.assertTestRunPatchAllowed(tr, patch);

    const updatedTr = this.applyTestRunPatch(tr, patch);

    const updatedKp: KodePengujian = {
      ...kp,
      samples: updatedTr.status === 'FINALIZED'
        ? kp.samples.map(s => s.id === updatedTr.sampleId ? { ...s, status: 'TESTED' as const, updatedAt: new Date().toISOString() } : s)
        : kp.samples,
      testRuns: kp.testRuns.map((t, i) => i === trIndex ? updatedTr : t),
      updatedAt: new Date().toISOString(),
    };
    kps[kpIndex] = updatedKp;
    writeKpAll(kps);
    return updatedTr;
  }

  async updateSyncMetadata(id: string, syncPatch: Partial<KodePengujian['sync']>): Promise<KodePengujian> {
    const kps = readKpAll();
    const kpIndex = kps.findIndex(kp => kp.id === id);
    if (kpIndex < 0) {
      throw new KodePengujianNotFoundError(id);
    }
    const kp = kps[kpIndex];
    const now = new Date().toISOString();
    const currentSync = kp.sync ?? { status: 'local', localUpdatedAt: kp.updatedAt, retryCount: 0 };
    const updatedKp: KodePengujian = {
      ...kp,
      sync: {
        ...currentSync,
        ...syncPatch,
        localUpdatedAt: now,
      },
      updatedAt: now,
    };
    kps[kpIndex] = updatedKp;
    writeKpAll(kps);
    return updatedKp;
  }

  private assertTestRunPatchAllowed(tr: TestRun, patch: Partial<UpdateTestRunInput>): void {
    if (tr.finalReport && patch.finalReport) {
      throw new DomainInvariantError(`TestRun ${tr.id} already has a final report. Finalized results are immutable.`);
    }

    const allowedFinalizedFields = new Set(['notes', 'metadata', 'failureReason']);
    const patchKeys = Object.keys(patch);
    if (tr.status === 'FINALIZED' && patchKeys.some(k => !allowedFinalizedFields.has(k))) {
      throw new DomainInvariantError(`TestRun ${tr.id} is FINALIZED. Cannot update field(s): ${patchKeys.filter(k => !allowedFinalizedFields.has(k)).join(', ')}.`);
    }
  }

  private applyTestRunPatch(tr: TestRun, patch: Partial<UpdateTestRunInput>): TestRun {
    return {
      ...tr,
      ...patch,
      id: tr.id,
      kodePengujianId: tr.kodePengujianId,
      sampleId: tr.sampleId,
      recipeId: tr.recipeId,
      recipeSnapshot: tr.recipeSnapshot,
      setpoints: tr.setpoints,
      fixture: tr.fixture,
      operatorId: tr.operatorId,
      operatorName: tr.operatorName,
      repetitionIndex: tr.repetitionIndex,
      createdAt: tr.createdAt,
      updatedAt: new Date().toISOString(),
      finalReport: patch.finalReport ?? tr.finalReport,
    };
  }
}