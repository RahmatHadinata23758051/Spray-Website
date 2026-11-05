import { z } from 'zod';

/**
 * ============================================================
 * SIDE ANALYSIS CONTRACTS — VERSIONED, TRANSPORT-NEUTRAL
 * ============================================================
 * No binary payloads. All asset references are stable IDs.
 * No silent defaults — every field must be explicitly provided.
 * Versioned at root for forward compatibility.
 * ============================================================
 */

// --- Common primitives ---

export const AssetReferenceSchema = z.object({
  assetId: z.string().min(1),
  frameId: z.string().min(1),
  frameIndex: z.number().int().nonnegative(),
  elapsedMs: z.number().int().nonnegative(),
});

export type AssetReference = z.infer<typeof AssetReferenceSchema>;

export const PointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type Point = z.infer<typeof PointSchema>;

export const SideOrientationSchema = z.enum(['nozzleLeft', 'nozzleRight']);

export type SideOrientation = z.infer<typeof SideOrientationSchema>;

export const CalibrationSnapshotSchema = z.object({
  camera: z.literal('side'),
  sideOrientation: SideOrientationSchema.optional(),
  referenceDistanceMm: z.number().positive(),
  anchorA: PointSchema,
  anchorB: PointSchema,
  scaleMmPerPx: z.number().positive(),
  adjusted: z.boolean().optional(),
  adjustedBy: z.string().optional(),
  adjustedAt: z.string().datetime().optional(),
});

export type CalibrationSnapshot = z.infer<typeof CalibrationSnapshotSchema>;

// --- VERSION 1: Request (Input to CV Pipeline) ---

/**
 * SideAnalysisRequestV1
 *
 * Represents a request for Side camera analysis.
 * Supports multi-frame analysis window (not single-frame only).
 * Baseline frames are pre-spray reference frames for background subtraction.
 */
export const SideAnalysisRequestV1Schema = z.object({
  version: z.literal(1),
  requestId: z.string().uuid(),

  // TestRun identity (hierarchy)
  kodePengujianId: z.string().min(1),
  sampleId: z.string().min(1),
  testRunId: z.string().min(1),

  // Source frames to analyze (one or more; stable window or key frames)
  sourceFrames: z.array(AssetReferenceSchema).min(1),

  // Baseline frames (pre-spray reference for background difference)
  baselineFrames: z.array(AssetReferenceSchema).min(1),

  // Camera orientation
  sideOrientation: SideOrientationSchema,

  // Calibration from analysis draft (nullable — CV may recompute)
  calibration: CalibrationSnapshotSchema.nullable(),

  // Request metadata
  analysisMethodHint: z.string().optional(), // e.g., "plume-seg-v1" — hint only
  requestedAt: z.string().datetime(),
  requestedBy: z.string().min(1), // operator id
});

export type SideAnalysisRequestV1 = z.infer<typeof SideAnalysisRequestV1Schema>;
export type SideAnalysisRequest = SideAnalysisRequestV1;

// --- VERSION 1: Result (Output from CV Pipeline) ---

/**
 * SidePixelGeometrySchema
 * Pixel-space geometry produced by automatic analysis.
 * Drives overlay rendering and calibrated measurement computation.
 */
export const SidePixelGeometrySchema = z.object({
  nozzleOriginPx: PointSchema,
  sprayEndpointPx: PointSchema,
  upperBoundaryPx: PointSchema,
  lowerBoundaryPx: PointSchema,
  verticalSpreadTopPx: PointSchema,
  verticalSpreadBottomPx: PointSchema,
  directionReferencePx: PointSchema,
});

export type SidePixelGeometry = z.infer<typeof SidePixelGeometrySchema>;

/**
 * SideCalibratedMeasurementsSchema
 * Physical measurements derived from geometry + calibration.
 * Only present when calibration is available and valid.
 */
export const SideCalibratedMeasurementsSchema = z.object({
  sprayLengthMm: z.number(),
  sprayAngleDeg: z.number(),
  verticalSpreadMm: z.number(),
  directionOffsetDeg: z.number(),
  spreadPositionMm: z.number().optional(),
});

export type SideCalibratedMeasurements = z.infer<typeof SideCalibratedMeasurementsSchema>;

/**
 * SegmentationEvidenceSchema
 * Reference to segmentation mask asset.
 * Does NOT embed binary data.
 */
export const SegmentationEvidenceSchema = z.object({
  maskAssetId: z.string().min(1),
  // Optional polygon hint for fast overlay without loading mask
  polygonHint: z.array(PointSchema).optional(),
});

export type SegmentationEvidence = z.infer<typeof SegmentationEvidenceSchema>;

/**
 * QualityMetricsSchema
 * Quality metadata from automatic analysis.
 * No generic confidence=0..1 until CV team defines semantics.
 * Uses explicit status + optional method-specific metrics.
 */
export const QualityMetricsSchema = z.object({
  qcStatus: z.enum(['pending', 'passed', 'failed']),
  // Method-specific quality indicators (e.g., IoU, detectionScore, snr)
  metrics: z.record(z.number()).optional(),
  issues: z.array(z.string()).optional(),
});

export type QualityMetrics = z.infer<typeof QualityMetricsSchema>;

/**
 * CalibrationUsedSchema
 * Records the calibration actually used by the CV pipeline.
 * May differ from input if pipeline performs auto-recalibration.
 */
export const CalibrationUsedSchema = z.object({
  referenceDistanceMm: z.number().positive(),
  anchorA: PointSchema,
  anchorB: PointSchema,
  scaleMmPerPx: z.number().positive(),
  wasAutoRecalibrated: z.boolean(),
});

export type CalibrationUsed = z.infer<typeof CalibrationUsedSchema>;

/**
 * SideAutomaticAnalysisResultSchema
 * Single automatic analysis result for one source frame.
 * The pipeline returns an array of these (one per source frame).
 */
export const SideAutomaticAnalysisResultSchema = z.object({
  // Source frame identity (matches request)
  sourceFrame: AssetReferenceSchema,

  // Method provenance — OUTPUT side (what actually ran)
  analysisMethod: z.string().min(1),
  analysisVersion: z.string().min(1),

  // Pixel geometry (always present)
  geometry: SidePixelGeometrySchema,

  // Calibrated measurements (present when calibration valid)
  measurements: SideCalibratedMeasurementsSchema.nullable(),

  // Segmentation evidence (present when pipeline produces mask)
  segmentation: SegmentationEvidenceSchema.nullable(),

  // Quality
  quality: QualityMetricsSchema,

  // Calibration actually used
  calibrationUsed: CalibrationUsedSchema,

  // Warnings from pipeline
  warnings: z.array(z.string()).optional(),

  // Timestamp
  producedAt: z.string().datetime(),
});

export type SideAutomaticAnalysisResult = z.infer<typeof SideAutomaticAnalysisResultSchema>;

/**
 * SideAnalysisResponseV1Schema
 * Top-level response containing results for all requested source frames.
 */
export const SideAnalysisResponseV1Schema = z.object({
  version: z.literal(1),
  requestId: z.string().uuid(), // echoes request
  results: z.array(SideAutomaticAnalysisResultSchema).min(1),
  // Pipeline-level warnings (not per-frame)
  warnings: z.array(z.string()).optional(),
  completedAt: z.string().datetime(),
});

export type SideAnalysisResponseV1 = z.infer<typeof SideAnalysisResponseV1Schema>;
export type SideAnalysisResponse = SideAnalysisResponseV1;

// --- Validation helpers ---

export function validateSideAnalysisRequest(input: unknown): SideAnalysisRequest {
  return SideAnalysisRequestV1Schema.parse(input);
}

export function validateSideAnalysisResponse(input: unknown): SideAnalysisResponse {
  return SideAnalysisResponseV1Schema.parse(input);
}

// --- Type guards for domain interop ---

export function isSideAnalysisRequest(input: unknown): input is SideAnalysisRequest {
  return SideAnalysisRequestV1Schema.safeParse(input).success;
}

export function isSideAnalysisResponse(input: unknown): input is SideAnalysisResponse {
  return SideAnalysisResponseV1Schema.safeParse(input).success;
}