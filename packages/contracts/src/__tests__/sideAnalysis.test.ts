import { describe, it, expect } from 'vitest';
import {
  SideAnalysisRequestV1Schema,
  SideAnalysisResponseV1Schema,
  SideAutomaticAnalysisResultSchema,
  validateSideAnalysisRequest,
  validateSideAnalysisResponse,
} from '../sideAnalysis';

describe('SideAnalysis Contracts (P7A)', () => {
  const validRequest = {
    version: 1,
    requestId: '123e4567-e89b-12d3-a456-426614174000',
    kodePengujianId: 'KP-2026-001',
    sampleId: 'SMP-001',
    testRunId: 'TR-001',
    sourceFrames: [
      {
        assetId: 'kp:KP-2026-001:sample:SMP-001:run:TR-001:side:012',
        frameId: 'FRM-012',
        frameIndex: 12,
        elapsedMs: 240,
      },
    ],
    baselineFrames: [
      {
        assetId: 'kp:KP-2026-001:sample:SMP-001:run:TR-001:side:000',
        frameId: 'FRM-000',
        frameIndex: 0,
        elapsedMs: 0,
      },
      {
        assetId: 'kp:KP-2026-001:sample:SMP-001:run:TR-001:side:001',
        frameId: 'FRM-001',
        frameIndex: 1,
        elapsedMs: 20,
      },
    ],
    sideOrientation: 'nozzleLeft' as const,
    calibration: {
      camera: 'side' as const,
      sideOrientation: 'nozzleLeft' as const,
      referenceDistanceMm: 100,
      anchorA: { x: 10, y: 20 },
      anchorB: { x: 110, y: 20 },
      scaleMmPerPx: 1.0,
      adjusted: false,
    },
    analysisMethodHint: 'plume-seg-v1',
    requestedAt: new Date().toISOString(),
    requestedBy: 'operator-1',
  };

  const validSingleResult = {
    sourceFrame: {
      assetId: 'kp:KP-2026-001:sample:SMP-001:run:TR-001:side:012',
      frameId: 'FRM-012',
      frameIndex: 12,
      elapsedMs: 240,
    },
    analysisMethod: 'plume-segmentation-cv',
    analysisVersion: '1.2.0',
    geometry: {
      nozzleOriginPx: { x: 50, y: 100 },
      sprayEndpointPx: { x: 250, y: 100 },
      upperBoundaryPx: { x: 200, y: 60 },
      lowerBoundaryPx: { x: 200, y: 140 },
      verticalSpreadTopPx: { x: 200, y: 50 },
      verticalSpreadBottomPx: { x: 200, y: 150 },
      directionReferencePx: { x: 250, y: 100 },
    },
    measurements: {
      sprayLengthMm: 52.4,
      sprayAngleDeg: 35.2,
      verticalSpreadMm: 28.1,
      directionOffsetDeg: 0.8,
      spreadPositionMm: 40.0,
    },
    segmentation: {
      maskAssetId: 'kp:KP-2026-001:sample:SMP-001:run:TR-001:side:012:mask',
      polygonHint: [
        { x: 50, y: 100 },
        { x: 200, y: 60 },
        { x: 250, y: 100 },
        { x: 200, y: 140 },
      ],
    },
    quality: {
      qcStatus: 'passed' as const,
      metrics: {
        iou: 0.94,
        contrastRatio: 3.5,
      },
    },
    calibrationUsed: {
      referenceDistanceMm: 100,
      anchorA: { x: 10, y: 20 },
      anchorB: { x: 110, y: 20 },
      scaleMmPerPx: 1.0,
      wasAutoRecalibrated: false,
    },
    warnings: [],
    producedAt: new Date().toISOString(),
  };

  const validResponse = {
    version: 1 as const,
    requestId: '123e4567-e89b-12d3-a456-426614174000',
    results: [validSingleResult],
    warnings: [],
    completedAt: new Date().toISOString(),
  };

  describe('SideAnalysisRequestV1Schema', () => {
    it('accepts valid request with all fields', () => {
      const parsed = SideAnalysisRequestV1Schema.parse(validRequest);
      expect(parsed.version).toBe(1);
      expect(parsed.sourceFrames).toHaveLength(1);
      expect(parsed.baselineFrames).toHaveLength(2);
      expect(parsed.calibration?.scaleMmPerPx).toBe(1.0);
    });

    it('accepts multi-frame source request (not single-frame only)', () => {
      const multiFrameRequest = {
        ...validRequest,
        sourceFrames: [
          validRequest.sourceFrames[0],
          {
            assetId: 'kp:KP-2026-001:sample:SMP-001:run:TR-001:side:013',
            frameId: 'FRM-013',
            frameIndex: 13,
            elapsedMs: 260,
          },
        ],
      };
      const parsed = SideAnalysisRequestV1Schema.parse(multiFrameRequest);
      expect(parsed.sourceFrames).toHaveLength(2);
    });

    it('accepts null calibration (CV may recompute or work uncalibrated)', () => {
      const uncalibrated = {
        ...validRequest,
        calibration: null,
      };
      const parsed = SideAnalysisRequestV1Schema.parse(uncalibrated);
      expect(parsed.calibration).toBeNull();
    });

    it('rejects version mismatch', () => {
      expect(() =>
        SideAnalysisRequestV1Schema.parse({ ...validRequest, version: 2 })
      ).toThrow();
    });

    it('rejects empty sourceFrames (must have at least 1)', () => {
      expect(() =>
        SideAnalysisRequestV1Schema.parse({ ...validRequest, sourceFrames: [] })
      ).toThrow();
    });

    it('rejects empty baselineFrames (must have at least 1 for background diff)', () => {
      expect(() =>
        SideAnalysisRequestV1Schema.parse({ ...validRequest, baselineFrames: [] })
      ).toThrow();
    });

    it('rejects invalid UUID requestId', () => {
      expect(() =>
        SideAnalysisRequestV1Schema.parse({ ...validRequest, requestId: 'not-a-uuid' })
      ).toThrow();
    });

    it('rejects negative frameIndex or elapsedMs', () => {
      expect(() =>
        SideAnalysisRequestV1Schema.parse({
          ...validRequest,
          sourceFrames: [
            {
              ...validRequest.sourceFrames[0],
              frameIndex: -1,
            },
          ],
        })
      ).toThrow();
    });
  });

  describe('SideAutomaticAnalysisResultSchema & SideAnalysisResponseV1Schema', () => {
    it('accepts valid single result', () => {
      const parsed = SideAutomaticAnalysisResultSchema.parse(validSingleResult);
      expect(parsed.analysisMethod).toBe('plume-segmentation-cv');
      expect(parsed.geometry.nozzleOriginPx).toEqual({ x: 50, y: 100 });
      expect(parsed.measurements?.sprayLengthMm).toBe(52.4);
      expect(parsed.segmentation?.maskAssetId).toBe(
        'kp:KP-2026-001:sample:SMP-001:run:TR-001:side:012:mask'
      );
      expect(parsed.quality.qcStatus).toBe('passed');
    });

    it('accepts null measurements when calibration is unavailable', () => {
      const uncalibratedResult = {
        ...validSingleResult,
        measurements: null,
      };
      const parsed = SideAutomaticAnalysisResultSchema.parse(uncalibratedResult);
      expect(parsed.measurements).toBeNull();
    });

    it('accepts null segmentation when mask is not generated', () => {
      const noMaskResult = {
        ...validSingleResult,
        segmentation: null,
      };
      const parsed = SideAutomaticAnalysisResultSchema.parse(noMaskResult);
      expect(parsed.segmentation).toBeNull();
    });

    it('rejects missing geometry points (no silent default)', () => {
      const invalidGeometry = {
        ...validSingleResult,
        geometry: {
          nozzleOriginPx: { x: 50, y: 100 },
          // missing sprayEndpointPx and others
        },
      };
      expect(() =>
        SideAutomaticAnalysisResultSchema.parse(invalidGeometry)
      ).toThrow();
    });

    it('rejects invalid qcStatus', () => {
      const invalidQC = {
        ...validSingleResult,
        quality: {
          qcStatus: 'unknown',
        },
      };
      expect(() =>
        SideAutomaticAnalysisResultSchema.parse(invalidQC)
      ).toThrow();
    });

    it('does not accept binary mask data (must be assetId reference)', () => {
      // maskAssetId must be a string identifier, not an object or Buffer
      const withBuffer = {
        ...validSingleResult,
        segmentation: {
          maskAssetId: 12345, // invalid type
        },
      };
      expect(() =>
        SideAutomaticAnalysisResultSchema.parse(withBuffer)
      ).toThrow();
    });

    it('validates full SideAnalysisResponse', () => {
      const parsed = SideAnalysisResponseV1Schema.parse(validResponse);
      expect(parsed.version).toBe(1);
      expect(parsed.results).toHaveLength(1);
      expect(parsed.requestId).toBe(validRequest.requestId);
    });

    it('helper functions validateSideAnalysisRequest and Response work', () => {
      expect(validateSideAnalysisRequest(validRequest).version).toBe(1);
      expect(validateSideAnalysisResponse(validResponse).version).toBe(1);
    });
  });
});