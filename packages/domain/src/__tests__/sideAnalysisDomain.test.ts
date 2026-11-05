import { describe, it, expect } from 'vitest';
import type {
  SideAutomaticAnalysisResult,
  SidePixelGeometry,
  SideFinalMeasurements,
  AnalysisDraft,
} from '../index';

describe('Domain: Automatic vs Correction Model (P7A)', () => {
  const autoGeometry: SidePixelGeometry = {
    nozzleOriginPx: { x: 50, y: 100 },
    sprayEndpointPx: { x: 250, y: 100 },
    upperBoundaryPx: { x: 200, y: 60 },
    lowerBoundaryPx: { x: 200, y: 140 },
    verticalSpreadTopPx: { x: 200, y: 50 },
    verticalSpreadBottomPx: { x: 200, y: 150 },
    directionReferencePx: { x: 250, y: 100 },
  };

  const autoMeasurements: SideFinalMeasurements = {
    sprayLength: { auto: 52.4, final: 52.4, adjusted: false },
    sprayAngle: { auto: 35.2, final: 35.2, adjusted: false },
    verticalSpread: { auto: 28.1, final: 28.1, adjusted: false },
    directionOffset: { auto: 0.8, final: 0.8, adjusted: false },
    spreadPosition: { auto: 40.0, final: 40.0, adjusted: false },
  };

  const automaticResult: SideAutomaticAnalysisResult = {
    sourceFrame: {
      frameId: 'FRM-015',
      frameIndex: 15,
      elapsedMs: 300,
      assetId: 'kp:KP-01:sample:S01:run:TR01:side:015',
    },
    analysisMethod: 'plume-seg-v1',
    analysisVersion: '1.2.0',
    geometry: autoGeometry,
    measurements: autoMeasurements,
    segmentation: {
      maskAssetId: 'kp:KP-01:sample:S01:run:TR01:side:015:mask',
    },
    quality: {
      qcStatus: 'passed',
      metrics: { confidenceScore: 0.92 },
    },
    calibrationUsed: {
      referenceDistanceMm: 100,
      anchorA: { x: 10, y: 20 },
      anchorB: { x: 110, y: 20 },
      scaleMmPerPx: 1.0,
      wasAutoRecalibrated: false,
    },
    warnings: [],
    producedAt: '2026-10-27T10:00:00.000Z',
  };

  const correctedGeometry: SidePixelGeometry = {
    ...autoGeometry,
    sprayEndpointPx: { x: 260, y: 100 }, // operator adjusted endpoint +10px
  };

  it('preserves clear separation between automatic analysis and operator corrections in AnalysisDraft', () => {
    const draft: AnalysisDraft = {
      calibration: {
        side: {
          camera: 'side',
          referenceDistanceMm: 100,
          anchorA: { x: 10, y: 20 },
          anchorB: { x: 110, y: 20 },
          scaleMmPerPx: 1.0,
          adjusted: false,
        },
        front: {
          camera: 'front',
          referenceDistanceMm: 100,
          anchorA: { x: 0, y: 0 },
          anchorB: { x: 100, y: 0 },
          scaleMmPerPx: 1.0,
          adjusted: false,
        },
      },
      primaryCaptureMomentId: 'FRM-015',
      supportingCaptureMomentIds: [],
      // Automatic analysis from pipeline:
      sideAutomaticAnalysis: {
        'FRM-015': automaticResult,
      },
      // Operator corrections:
      sideCorrections: {
        'FRM-015': correctedGeometry,
      },
      frontCorrections: {},
      updatedAt: '2026-10-27T10:05:00.000Z',
    };

    // 1. Automatic analysis evidence is intact
    expect(draft.sideAutomaticAnalysis?.['FRM-015']).toBeDefined();
    expect(draft.sideAutomaticAnalysis?.['FRM-015'].analysisMethod).toBe('plume-seg-v1');
    expect(draft.sideAutomaticAnalysis?.['FRM-015'].geometry.sprayEndpointPx.x).toBe(250);

    // 2. Operator correction is stored separately
    expect(draft.sideCorrections['FRM-015'].sprayEndpointPx.x).toBe(260);

    // 3. Modifying operator correction does not mutate automatic evidence
    expect(draft.sideAutomaticAnalysis?.['FRM-015'].geometry.sprayEndpointPx.x).not.toBe(
      draft.sideCorrections['FRM-015'].sprayEndpointPx.x
    );
  });

  it('detects stale automatic analysis when source frame asset does not match current capture', () => {
    const currentCaptureFrame = {
      frameId: 'FRM-015',
      frameIndex: 15,
      elapsedMs: 300,
      assetId: 'kp:KP-01:sample:S01:run:TR01:side:015:REPLACEMENT', // user recaptured
    };

    const isStale =
      automaticResult.sourceFrame.assetId !== currentCaptureFrame.assetId;

    expect(isStale).toBe(true);
  });

  it('allows draft without sideAutomaticAnalysis for backward compatibility', () => {
    const legacyDraft: AnalysisDraft = {
      calibration: {
        side: {
          camera: 'side',
          referenceDistanceMm: 100,
          anchorA: { x: 0, y: 0 },
          anchorB: { x: 100, y: 0 },
          scaleMmPerPx: 1.0,
          adjusted: false,
        },
        front: {
          camera: 'front',
          referenceDistanceMm: 100,
          anchorA: { x: 0, y: 0 },
          anchorB: { x: 100, y: 0 },
          scaleMmPerPx: 1.0,
          adjusted: false,
        },
      },
      primaryCaptureMomentId: 'MOMENT-001',
      supportingCaptureMomentIds: [],
      sideCorrections: {},
      frontCorrections: {},
      updatedAt: '2026-10-27T00:00:00.000Z',
    };

    expect(legacyDraft.sideAutomaticAnalysis).toBeUndefined();
    expect(legacyDraft.sideCorrections).toEqual({});
  });
});