import { buildRealSideAnalysisInput, buildTestRunRealSideAnalysisInput } from '@spray-paragon/domain';
import type { Batch, RealSideAnalysisInput, RealSideCaptureFrameMetadata, RealSideBaselineSelection, KodePengujian, TestRunRealSideAnalysisInput, CaptureVideoMetadata } from '@spray-paragon/domain';
import type { CaptureAssetStore } from './ports/captureAssetStore';

/**
 * Deterministic, stable asset key. Deterministic keys make a replacement
 * capture overwrite superseded binaries instead of accumulating orphans.
 */
export function buildCaptureAssetId(batchId: string, frameIndex: number): string {
  return `${batchId}:side:${String(frameIndex).padStart(3, '0')}`;
}

/**
 * Builds a deterministic asset ID for a TestRun capture within a KodePengujian.
 * Format: kp:{kpId}:sample:{sampleId}:run:{runId}:side:{frameIndex:03d}
 * Ensures no collision between multiple runs in one KP or between samples.
 */
export function buildTestRunCaptureAssetId(
  kpId: string,
  sampleId: string,
  runId: string,
  frameIndex: number
): string {
  return `kp:${kpId}:sample:${sampleId}:run:${runId}:side:${String(frameIndex).padStart(3, '0')}`;
}

/**
 * Builds a deterministic asset ID for the TestRun side camera video recording.
 * Format: kp:{kpId}:sample:{sampleId}:run:{runId}:side:video
 * Single video per capture event.
 */
export function buildTestRunVideoAssetId(
  kpId: string,
  sampleId: string,
  runId: string
): string {
  return `kp:${kpId}:sample:${sampleId}:run:${runId}:side:video`;
}

export type ResolvedSideAnalysisFrame = {
  assetId: string;
  frameId: string;
  frameIndex: number;
  elapsedMs: number;
  blob: Blob;
};

export type ResolvedBaselineFrame = ResolvedSideAnalysisFrame;

export type PreparedRealSideAnalysis = {
  batchId: string;
  frames: ResolvedSideAnalysisFrame[];
  baseline: ResolvedBaselineFrame[];
  input: RealSideAnalysisInput;
};

export type TestRunPreparedRealSideAnalysis = {
  kodePengujianId: string;
  sampleId: string;
  testRunId: string;
  frames: ResolvedSideAnalysisFrame[];
  baseline: ResolvedBaselineFrame[];
  input: TestRunRealSideAnalysisInput;
};

export type AnalysisPreparationResult =
  | { ok: true; prepared: PreparedRealSideAnalysis }
  | { ok: false; error: string; missingFrameAssetIds: string[]; missingBaselineAssetIds: string[] };

export type TestRunAnalysisPreparationResult =
  | { ok: true; prepared: TestRunPreparedRealSideAnalysis }
  | { ok: false; error: string; missingFrameAssetIds: string[]; missingBaselineAssetIds: string[] };

/**
 * Application-level bridge between persisted capture metadata and binaries.
 * Future Analysis resolves frames through this, never through blob: URLs.
 */
export class CaptureAssetResolver {
  private readonly store: CaptureAssetStore;

  constructor(store: CaptureAssetStore) {
    this.store = store;
  }

  resolveBlob(frame: Pick<RealSideCaptureFrameMetadata, 'assetId'>): Promise<Blob | null> {
    if (!frame.assetId) return Promise.resolve(null);
    return this.store.get(frame.assetId);
  }

  /**
   * Resolves a persisted video asset by its metadata.
   */
  async resolveVideoBlob(video: Pick<CaptureVideoMetadata, 'assetId'>): Promise<Blob | null> {
    if (!video.assetId) return null;
    return this.store.get(video.assetId);
  }

  /**
   * Future Side CV entry point: baseline metadata in, ordered frame binaries
   * out. Frames whose asset is missing are skipped rather than failing the
   * whole baseline, so callers can compare resolved count against expected.
   * No compositing, averaging, or subtraction happens here.
   */
  async resolveBaselineBlobs(baseline: RealSideBaselineSelection): Promise<ResolvedBaselineFrame[]> {
    const resolved: ResolvedBaselineFrame[] = [];
    for (const frame of baseline.frames) {
      const blob = await this.store.get(frame.assetId);
      if (!blob) continue;
      resolved.push({ assetId: frame.assetId, frameId: frame.frameId, frameIndex: frame.frameIndex, elapsedMs: frame.elapsedMs, blob });
    }
    return resolved;
  }

  /**
   * Prepares inputs for future Side CV processing. Every requested frame asset
   * and every baseline frame asset MUST resolve; missing assets fail the whole
   * preparation with explicit asset IDs instead of silently continuing with partials.
   */
  async prepareRealSideAnalysis(input: RealSideAnalysisInput): Promise<AnalysisPreparationResult> {
    const missingFrameAssetIds: string[] = [];
    const resolvedFrames: ResolvedSideAnalysisFrame[] = [];

    for (const frame of input.frames) {
      const blob = await this.store.get(frame.assetId);
      if (!blob) {
        missingFrameAssetIds.push(frame.assetId);
      } else {
        resolvedFrames.push({ assetId: frame.assetId, frameId: frame.frameId, frameIndex: frame.frameIndex, elapsedMs: frame.elapsedMs, blob });
      }
    }

    const missingBaselineAssetIds: string[] = [];
    const resolvedBaseline: ResolvedBaselineFrame[] = [];

    if (input.baseline) {
      for (const baselineFrame of input.baseline.frames) {
        const blob = await this.store.get(baselineFrame.assetId);
        if (!blob) {
          missingBaselineAssetIds.push(baselineFrame.assetId);
        } else {
          resolvedBaseline.push({ assetId: baselineFrame.assetId, frameId: baselineFrame.frameId, frameIndex: baselineFrame.frameIndex, elapsedMs: baselineFrame.elapsedMs, blob });
        }
      }
    }

    if (missingFrameAssetIds.length > 0 || missingBaselineAssetIds.length > 0) {
      const reasons: string[] = [];
      if (missingFrameAssetIds.length > 0) {
        reasons.push(`${missingFrameAssetIds.length} captured Side frame asset(s) could not be resolved`);
      }
      if (missingBaselineAssetIds.length > 0) {
        reasons.push(`${missingBaselineAssetIds.length} baseline frame asset(s) could not be resolved`);
      }
      return {
        ok: false,
        error: `Analysis preparation blocked: ${reasons.join('; ')}.`,
        missingFrameAssetIds,
        missingBaselineAssetIds,
      };
    }

    return {
      ok: true,
      prepared: {
        batchId: input.batchId,
        frames: resolvedFrames,
        baseline: resolvedBaseline,
        input,
      },
    };
  }

  /**
   * Convenience bridge from a persisted Batch domain model to prepared Side CV inputs.
   */
  async prepareBatchAnalysis(batch: Batch): Promise<AnalysisPreparationResult> {
    const inputResult = buildRealSideAnalysisInput(batch);
    if (!inputResult.ok) {
      return {
        ok: false,
        error: inputResult.error,
        missingFrameAssetIds: [],
        missingBaselineAssetIds: [],
      };
    }
    return this.prepareRealSideAnalysis(inputResult.input);
  }

  /**
   * Convenience bridge from a persisted TestRun domain model to prepared Side CV inputs.
   */
  async prepareTestRunAnalysis(kp: KodePengujian, testRunId: string): Promise<TestRunAnalysisPreparationResult> {
    const inputResult = buildTestRunRealSideAnalysisInput(kp, testRunId);
    if (!inputResult.ok) {
      return {
        ok: false,
        error: inputResult.error,
        missingFrameAssetIds: [],
        missingBaselineAssetIds: [],
      };
    }
    const batchCompatibleInput: RealSideAnalysisInput = {
      batchId: inputResult.input.testRunId,
      captureMode: inputResult.input.captureMode,
      frames: inputResult.input.frames,
      baseline: inputResult.input.baseline,
      sideOrientation: inputResult.input.sideOrientation,
      calibration: inputResult.input.calibration,
    };
    const result = await this.prepareRealSideAnalysis(batchCompatibleInput);
    if (!result.ok) return result;
    return {
      ok: true,
      prepared: {
        kodePengujianId: inputResult.input.kodePengujianId,
        sampleId: inputResult.input.sampleId,
        testRunId: inputResult.input.testRunId,
        frames: result.prepared.frames,
        baseline: result.prepared.baseline,
        input: inputResult.input,
      },
    };
  }
}
