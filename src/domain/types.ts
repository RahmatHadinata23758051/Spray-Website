import { z } from 'zod';
import type { Product, TestRecipe } from './product';

export type Camera = 'side' | 'front';
export type TestStatus = 'complete' | 'failed' | 'running';
export type CapturePhase = 'pre-spray' | 'build-up' | 'stable' | 'decay' | 'complete';
export type CapturePhaseV2 = 'pre_spray' | 'build_up' | 'stable' | 'decay';
export type SyncStatus = 'synced' | 'partial' | 'invalid';
export type FixtureScenario = 'nominal-01' | 'direction-offset-01' | 'pattern-asymmetry-01' | 'alignment-review-01';

export const fixtureScenarioSchema = z.enum(['nominal-01', 'direction-offset-01', 'pattern-asymmetry-01', 'alignment-review-01']);

export const analysisFrameSchema = z.object({
  id: z.string().min(1),
  camera: z.enum(['side', 'front']),
  frameIndex: z.number().nonnegative(),
  timestampMs: z.number().nonnegative(),
  phase: z.enum(['pre_spray', 'build_up', 'stable', 'decay']),
  assets: z.object({
    original: z.string().min(1),
    mask: z.string().min(1),
    overlay: z.string().min(1),
  }),
});

export const synchronizedAnalysisFrameSchema = z.object({
  id: z.string().min(1),
  frameIndex: z.number().nonnegative(),
  timestampMs: z.number().nonnegative(),
  phase: z.enum(['pre_spray', 'build_up', 'stable', 'decay']),
  side: analysisFrameSchema,
  front: analysisFrameSchema,
  syncStatus: z.enum(['synced', 'partial', 'invalid']),
  timestampDeltaMs: z.number(),
  recommended: z.boolean().optional(),
});

export const productSnapshotSchema = z.object({
  productCode: z.string().min(1),
  productName: z.string().min(1),
});

export const recipeSnapshotSchema = z.object({
  name: z.string().min(1),
  forceSetpointN: z.number().positive(),
  pressDurationMs: z.number().positive(),
  strokeMm: z.number().positive(),
});

export const testSchema = z.object({
  id: z.string().min(1),
  fixture: fixtureScenarioSchema,
  productId: z.string().optional(),
  productSnapshot: productSnapshotSchema.optional(),
  productName: z.string().min(1),
  sampleId: z.string().min(1),
  productionBatch: z.string().optional(),
  recipeId: z.string().optional(),
  recipeSnapshot: recipeSnapshotSchema.optional(),
  operatorId: z.string().optional(),
  operatorName: z.string().min(1),
  config: z.object({ forceSetpointN: z.number().positive(), pressDurationMs: z.number().positive(), strokeMm: z.number().positive() }),
  status: z.enum(['complete', 'failed', 'running']),
  createdAt: z.string(),
  source: z.enum(['fixture', 'machine']).default('fixture'),
});
export const analysisSchema = z.object({
  fixture: fixtureScenarioSchema,
  analysisWindow: z.object({ startMs: z.number().nonnegative(), endMs: z.number().positive() }),
  side: z.object({ sprayLengthMm: z.number(), sprayAngleDeg: z.number(), maxVerticalSpreadMm: z.number(), directionOffsetDeg: z.number() }),
  front: z.object({ sprayAreaMm2: z.number(), equivalentDiameterMm: z.number(), circularity: z.number(), centroidOffsetXmm: z.number(), centroidOffsetYmm: z.number(), horizontalSymmetry: z.number(), verticalSymmetry: z.number() }),
  temporal: z.object({ sprayLengthMeanMm: z.number(), sprayLengthStdDevMm: z.number(), sprayAngleMeanDeg: z.number(), sprayAngleStdDevDeg: z.number() }),
});

export interface Test {
  id: string;
  sampleId: string;
  productId?: string;
  productSnapshot?: { productCode: string; productName: string };
  productName: string;
  recipeId?: string;
  recipeSnapshot?: { name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  productionBatch?: string;
  operatorId?: string;
  operatorName: string;
  createdAt: string;
  source?: 'fixture' | 'machine';
  fixture: FixtureScenario;
  config: { forceSetpointN: number; pressDurationMs: number; strokeMm: number };
  status: TestStatus;
}

export interface CreateTestSessionInput {
  product: Product;
  recipe: TestRecipe;
  productionBatch?: string;
  operatorId: string;
  operatorName: string;
  fixture: FixtureScenario;
  notes?: string;
}

export type FirmwareSetpoints = {
  targetForceN: number;
  targetDurationMs: number;
  targetStrokeMm: number;
};

export type FutureMachineTelemetry = {
  actualForceN: number;
  actualDurationMs: number;
  actualStrokeMm: number;
  actuatorPositionMm: number;
  machineState: string;
  safetyState: string;
  timestamp: string;
};

export interface Frame {
  frameIndex: number;
  timestampMs: number;
  phase: CapturePhase;
}

export interface AnalysisFrame {
  id: string;
  camera: Camera;
  frameIndex: number;
  timestampMs: number;
  phase: CapturePhaseV2;
  assets: {
    original: string;
    mask: string;
    overlay: string;
  };
}

export interface SynchronizedAnalysisFrame {
  id: string;
  frameIndex: number;
  timestampMs: number;
  phase: CapturePhaseV2;
  side: AnalysisFrame;
  front: AnalysisFrame;
  syncStatus: SyncStatus;
  timestampDeltaMs: number;
  recommended?: boolean;
}

export interface Analysis {
  fixture: FixtureScenario;
  analysisWindow: { startMs: number; endMs: number };
  side: {
    sprayLengthMm: number;
    sprayAngleDeg: number;
    maxVerticalSpreadMm: number;
    directionOffsetDeg: number;
  };
  front: {
    sprayAreaMm2: number;
    equivalentDiameterMm: number;
    circularity: number;
    centroidOffsetXmm: number;
    centroidOffsetYmm: number;
    horizontalSymmetry: number;
    verticalSymmetry: number;
  };
  temporal: {
    sprayLengthMeanMm: number;
    sprayLengthStdDevMm: number;
    sprayAngleMeanDeg: number;
    sprayAngleStdDevDeg: number;
  };
}
