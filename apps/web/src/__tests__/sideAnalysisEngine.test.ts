import { describe, it, expect } from 'vitest';
import type { SideAnalysisRequest, SideAnalysisResponse } from '@spray-paragon/contracts';
import {
  type SideAnalysisEngine,
  SideAnalysisError,
  UnavailableSideAnalysisEngine,
} from '../application/ports/sideAnalysisEngine';

describe('SideAnalysisEngine Port (P7A)', () => {
  const sampleRequest: SideAnalysisRequest = {
    version: 1,
    requestId: '416b251b-c7be-4395-9ff0-cf1719b60161',
    kodePengujianId: 'KP-2026-001',
    sampleId: 'SMP-001',
    testRunId: 'TR-001',
    sourceFrames: [
      {
        assetId: 'kp:KP-2026-001:sample:SMP-001:run:TR-001:side:010',
        frameId: 'FRM-010',
        frameIndex: 10,
        elapsedMs: 200,
      },
    ],
    baselineFrames: [
      {
        assetId: 'kp:KP-2026-001:sample:SMP-001:run:TR-001:side:000',
        frameId: 'FRM-000',
        frameIndex: 0,
        elapsedMs: 0,
      },
    ],
    sideOrientation: 'nozzleLeft',
    calibration: {
      camera: 'side',
      sideOrientation: 'nozzleLeft',
      referenceDistanceMm: 100,
      anchorA: { x: 0, y: 0 },
      anchorB: { x: 100, y: 0 },
      scaleMmPerPx: 1.0,
      adjusted: false,
    },
    requestedAt: new Date().toISOString(),
    requestedBy: 'operator-1',
  };

  it('UnavailableSideAnalysisEngine reports isAvailable() as false', async () => {
    const engine = new UnavailableSideAnalysisEngine();
    expect(await engine.isAvailable()).toBe(false);
  });

  it('UnavailableSideAnalysisEngine throws SERVICE_UNAVAILABLE on analyze()', async () => {
    const engine = new UnavailableSideAnalysisEngine();
    await expect(engine.analyze(sampleRequest)).rejects.toThrow(
      /Side analysis service not configured/
    );

    try {
      await engine.analyze(sampleRequest);
    } catch (err) {
      expect(err).toBeInstanceOf(SideAnalysisError);
      if (err instanceof SideAnalysisError) {
        expect(err.code).toBe('SERVICE_UNAVAILABLE');
      }
    }
  });

  it('Test stub implementation satisfies the port interface without runtime wiring', async () => {
    // Local test-only stub demonstrating how unit/integration tests will supply mock responses
    class TestStubSideAnalysisEngine implements SideAnalysisEngine {
      async isAvailable(): Promise<boolean> {
        return true;
      }

      async analyze(request: SideAnalysisRequest): Promise<SideAnalysisResponse> {
        return {
          version: 1,
          requestId: request.requestId,
          results: request.sourceFrames.map((frame) => ({
            sourceFrame: frame,
            analysisMethod: 'test-stub-v1',
            analysisVersion: '1.0.0',
            geometry: {
              nozzleOriginPx: { x: 10, y: 50 },
              sprayEndpointPx: { x: 150, y: 50 },
              upperBoundaryPx: { x: 100, y: 30 },
              lowerBoundaryPx: { x: 100, y: 70 },
              verticalSpreadTopPx: { x: 100, y: 20 },
              verticalSpreadBottomPx: { x: 100, y: 80 },
              directionReferencePx: { x: 150, y: 50 },
            },
            measurements: {
              sprayLengthMm: 45.0,
              sprayAngleDeg: 28.5,
              verticalSpreadMm: 22.0,
              directionOffsetDeg: 0.0,
            },
            segmentation: {
              maskAssetId: `${frame.assetId}:mask`,
            },
            quality: {
              qcStatus: 'passed',
            },
            calibrationUsed: {
              referenceDistanceMm: 100,
              anchorA: { x: 0, y: 0 },
              anchorB: { x: 100, y: 0 },
              scaleMmPerPx: 1.0,
              wasAutoRecalibrated: false,
            },
            warnings: [],
            producedAt: new Date().toISOString(),
          })),
          warnings: [],
          completedAt: new Date().toISOString(),
        };
      }
    }

    const testEngine = new TestStubSideAnalysisEngine();
    expect(await testEngine.isAvailable()).toBe(true);

    const response = await testEngine.analyze(sampleRequest);
    expect(response.version).toBe(1);
    expect(response.requestId).toBe(sampleRequest.requestId);
    expect(response.results).toHaveLength(1);
    expect(response.results[0].analysisMethod).toBe('test-stub-v1');
    expect(response.results[0].measurements?.sprayLengthMm).toBe(45.0);
  });

  it('SideAnalysisError preserves error code and cause', () => {
    const cause = new Error('Socket timeout');
    const err = new SideAnalysisError(
      'Analysis request timed out',
      'PIPELINE_ERROR',
      cause,
      { timeoutMs: 5000 }
    );

    expect(err.name).toBe('SideAnalysisError');
    expect(err.code).toBe('PIPELINE_ERROR');
    expect(err.cause).toBe(cause);
    expect(err.details).toEqual({ timeoutMs: 5000 });
  });
});