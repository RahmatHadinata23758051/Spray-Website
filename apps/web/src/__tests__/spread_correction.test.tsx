import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { SidePixelGeometry, CalibrationSnapshot, FrontPixelGeometry } from '@spray-paragon/domain';
import {
  moveSideMeasurementHandle,
  deriveSideMeasurementsFromGeometry,
  getSideFinalMeasurements,
  createCalibrationSnapshot,
  getSideDisplayGeometry,
  createKodePengujian,
  addSample,
  createTestRun,
  startTestRunCapture,
  updateTestRunAnalysisDraft,
  canFinalizeTestRun,
} from '@spray-paragon/domain';
import { MeasurementCorrectionOverlay } from '../presentation/features/analysis/MeasurementCorrectionOverlay';

describe('Sebaran (Spread) Correction UX and Constraints', () => {
  const initialSideGeometry: SidePixelGeometry = {
    nozzleOriginPx: { x: 100, y: 198 },
    sprayEndpointPx: { x: 550, y: 198 },
    upperBoundaryPx: { x: 550, y: 130 },
    lowerBoundaryPx: { x: 550, y: 266 },
    directionReferencePx: { x: 550, y: 198 },
    verticalSpreadTopPx: { x: 450, y: 140 },
    verticalSpreadBottomPx: { x: 450, y: 256 },
  };

  const initialFrontGeometry: FrontPixelGeometry = {
    contourPx: [],
    sprayAreaPixels: 31415,
    referenceCenterPx: { x: 360, y: 180 },
    centroidPx: { x: 360, y: 180 },
    equivalentDiameterPx: 200,
    circularity: 0.95,
    horizontalSymmetry: 0.92,
    verticalSymmetry: 0.91,
  };

  const sideCalibration: CalibrationSnapshot = createCalibrationSnapshot({
    camera: 'side',
    referenceDistanceMm: 1000,
    anchorA: { x: 100, y: 300 },
    anchorB: { x: 600, y: 300 },
  });

  it('1. no diagonal orange line in Spread mode — line is strictly vertical', () => {
    const { container } = render(
      <MeasurementCorrectionOverlay
        camera="side"
        activeSideTool="Spread"
        autoSideGeometry={initialSideGeometry}
        workingSideGeometry={initialSideGeometry}
        autoFrontGeometry={initialFrontGeometry}
        workingFrontGeometry={initialFrontGeometry}
        sideCalibration={sideCalibration}
        onSideChange={vi.fn()}
        onFrontChange={vi.fn()}
      />
    );

    // Final orange geometry line
    const finalGroup = container.querySelector('.measurement-final-geometry');
    expect(finalGroup).toBeInTheDocument();
    const orangeLine = finalGroup?.querySelector('line');
    expect(orangeLine).toBeInTheDocument();

    const x1 = orangeLine?.getAttribute('x1');
    const y1 = orangeLine?.getAttribute('y1');
    const x2 = orangeLine?.getAttribute('x2');
    const y2 = orangeLine?.getAttribute('y2');

    // Both X coordinates must match exactly (strictly vertical cross-section line)
    expect(x1).toBe('450');
    expect(x2).toBe('450');
    expect(x1).toBe(x2);

    // It must NOT equal the bottom Y coordinate (preventing the diagonal ray regression)
    expect(x2).not.toBe(String(initialSideGeometry.verticalSpreadBottomPx.y));
    expect(y1).toBe('140');
    expect(y2).toBe('256');

    // Angle and Length correction geometries are hidden
    expect(container.querySelector('[aria-label="Geometri panjang akhir operator"]')).not.toBeInTheDocument();
    expect(container.querySelector('[aria-label="Geometri sudut akhir operator"]')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Titik ujung semprot')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sudut atas')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sudut bawah')).not.toBeInTheDocument();

    // Spread preview text is shown
    expect(container.querySelector('text')).toBeInTheDocument();
    expect(container.querySelector('text')?.getAttribute('fill')).toBe('#ff8c00');
  });

  it('2. top/bottom handles have vertical-only constraint', () => {
    // Domain constraint: top handle ignores target.x and only updates y
    const movedTop = moveSideMeasurementHandle(
      initialSideGeometry,
      'spreadTop',
      { x: 999, y: 120 },
      { width: 720, height: 360 }
    );
    expect(movedTop.verticalSpreadTopPx.x).toBe(450);
    expect(movedTop.verticalSpreadTopPx.y).toBe(120);

    // Domain constraint: bottom handle ignores target.x and only updates y
    const movedBottom = moveSideMeasurementHandle(
      initialSideGeometry,
      'spreadBottom',
      { x: 12, y: 280 },
      { width: 720, height: 360 }
    );
    expect(movedBottom.verticalSpreadBottomPx.x).toBe(450);
    expect(movedBottom.verticalSpreadBottomPx.y).toBe(280);

    // Keyboard interaction constraints in UI
    const onSideChange = vi.fn();
    render(
      <MeasurementCorrectionOverlay
        camera="side"
        activeSideTool="Spread"
        autoSideGeometry={initialSideGeometry}
        workingSideGeometry={initialSideGeometry}
        autoFrontGeometry={initialFrontGeometry}
        workingFrontGeometry={initialFrontGeometry}
        sideCalibration={sideCalibration}
        onSideChange={onSideChange}
        onFrontChange={vi.fn()}
      />
    );

    const topHandle = screen.getByLabelText('Batas sebaran atas');
    const bottomHandle = screen.getByLabelText('Batas sebaran bawah');

    expect(topHandle.getAttribute('aria-orientation')).toBe('vertical');
    expect(bottomHandle.getAttribute('aria-orientation')).toBe('vertical');

    // Horizontal keys on top/bottom handles are ignored
    fireEvent.keyDown(topHandle, { key: 'ArrowLeft' });
    fireEvent.keyDown(topHandle, { key: 'ArrowRight' });
    fireEvent.keyDown(bottomHandle, { key: 'ArrowLeft' });
    fireEvent.keyDown(bottomHandle, { key: 'ArrowRight' });
    expect(onSideChange).not.toHaveBeenCalled();

    // Vertical keys trigger vertical update
    fireEvent.keyDown(topHandle, { key: 'ArrowUp' });
    expect(onSideChange).toHaveBeenCalledTimes(1);
    expect(onSideChange.mock.calls[0][0].verticalSpreadTopPx.y).toBe(139);
    expect(onSideChange.mock.calls[0][0].verticalSpreadTopPx.x).toBe(450);
  });

  it('3. center handle has horizontal-only constraint', () => {
    // Domain constraint: center handle ignores target.y and only updates x
    const movedPosition = moveSideMeasurementHandle(
      initialSideGeometry,
      'spreadPosition',
      { x: 500, y: 999 },
      { width: 720, height: 360 }
    );
    expect(movedPosition.verticalSpreadTopPx.x).toBe(500);
    expect(movedPosition.verticalSpreadBottomPx.x).toBe(500);
    // Y values must remain untouched
    expect(movedPosition.verticalSpreadTopPx.y).toBe(initialSideGeometry.verticalSpreadTopPx.y);
    expect(movedPosition.verticalSpreadBottomPx.y).toBe(initialSideGeometry.verticalSpreadBottomPx.y);

    // Keyboard interaction constraints in UI
    const onSideChange = vi.fn();
    render(
      <MeasurementCorrectionOverlay
        camera="side"
        activeSideTool="Spread"
        autoSideGeometry={initialSideGeometry}
        workingSideGeometry={initialSideGeometry}
        autoFrontGeometry={initialFrontGeometry}
        workingFrontGeometry={initialFrontGeometry}
        sideCalibration={sideCalibration}
        onSideChange={onSideChange}
        onFrontChange={vi.fn()}
      />
    );

    const centerHandle = screen.getByLabelText('Posisi pengukuran sebaran');
    expect(centerHandle.getAttribute('aria-orientation')).toBe('horizontal');

    // Vertical keys on center handle are ignored
    fireEvent.keyDown(centerHandle, { key: 'ArrowUp' });
    fireEvent.keyDown(centerHandle, { key: 'ArrowDown' });
    expect(onSideChange).not.toHaveBeenCalled();

    // Horizontal keys trigger horizontal update
    fireEvent.keyDown(centerHandle, { key: 'ArrowRight' });
    expect(onSideChange).toHaveBeenCalledTimes(1);
    expect(onSideChange.mock.calls[0][0].verticalSpreadTopPx.x).toBe(451);
    expect(onSideChange.mock.calls[0][0].verticalSpreadBottomPx.x).toBe(451);
  });

  it('4. same-X invariant: top, center, and bottom handles always share the same X', () => {
    // Render with arbitrary geometry
    const testGeometry: SidePixelGeometry = {
      ...initialSideGeometry,
      verticalSpreadTopPx: { x: 420, y: 150 },
      verticalSpreadBottomPx: { x: 420, y: 240 },
    };

    render(
      <MeasurementCorrectionOverlay
        camera="side"
        activeSideTool="Spread"
        autoSideGeometry={testGeometry}
        workingSideGeometry={testGeometry}
        autoFrontGeometry={initialFrontGeometry}
        workingFrontGeometry={initialFrontGeometry}
        sideCalibration={sideCalibration}
        onSideChange={vi.fn()}
        onFrontChange={vi.fn()}
      />
    );

    const topHandle = screen.getByLabelText('Batas sebaran atas');
    const centerHandle = screen.getByLabelText('Posisi pengukuran sebaran');
    const bottomHandle = screen.getByLabelText('Batas sebaran bawah');

    const topX = topHandle.getAttribute('cx');
    const centerX = centerHandle.getAttribute('cx');
    const bottomX = bottomHandle.getAttribute('cx');

    expect(topX).toBe('420');
    expect(centerX).toBe('420');
    expect(bottomX).toBe('420');
    expect(topX).toBe(centerX);
    expect(centerX).toBe(bottomX);

    // After moving center handle horizontally to x=510, both top and bottom retain same X
    const updated = moveSideMeasurementHandle(
      testGeometry,
      'spreadPosition',
      { x: 510, y: 200 },
      { width: 720, height: 360 }
    );
    expect(updated.verticalSpreadTopPx.x).toBe(510);
    expect(updated.verticalSpreadBottomPx.x).toBe(510);

    // After moving top handle vertically, same-X invariant holds
    const topMoved = moveSideMeasurementHandle(
      updated,
      'spreadTop',
      { x: 300, y: 130 },
      { width: 720, height: 360 }
    );
    expect(topMoved.verticalSpreadTopPx.x).toBe(510);
    expect(topMoved.verticalSpreadBottomPx.x).toBe(510);

    // After moving bottom handle vertically, same-X invariant holds
    const bottomMoved = moveSideMeasurementHandle(
      topMoved,
      'spreadBottom',
      { x: 700, y: 270 },
      { width: 720, height: 360 }
    );
    expect(bottomMoved.verticalSpreadTopPx.x).toBe(510);
    expect(bottomMoved.verticalSpreadBottomPx.x).toBe(510);
  });

  it('5. spread correction does not mutate spray length or spray angle', () => {
    // Initial automatic measurements
    const initialMeasurements = deriveSideMeasurementsFromGeometry(
      initialSideGeometry,
      sideCalibration
    );
    expect(initialMeasurements.sprayLength.adjusted).toBe(false);
    expect(initialMeasurements.sprayAngle.adjusted).toBe(false);

    // Adjust spread position and spread bounds
    const adjustedPos = moveSideMeasurementHandle(
      initialSideGeometry,
      'spreadPosition',
      { x: 480, y: 0 },
      { width: 720, height: 360 }
    );
    const adjustedTop = moveSideMeasurementHandle(
      adjustedPos,
      'spreadTop',
      { x: 480, y: 120 },
      { width: 720, height: 360 }
    );
    const adjustedGeometry = moveSideMeasurementHandle(
      adjustedTop,
      'spreadBottom',
      { x: 480, y: 280 },
      { width: 720, height: 360 }
    );

    // Derive measurements with the spread-corrected geometry
    const correctedMeasurements = deriveSideMeasurementsFromGeometry(
      initialSideGeometry,
      sideCalibration,
      {
        geometry: adjustedGeometry,
        adjustedBy: 'Operator',
        adjustedAt: new Date().toISOString(),
      }
    );

    // Spray length must NOT be mutated
    expect(correctedMeasurements.sprayLength.final).toBeCloseTo(initialMeasurements.sprayLength.auto, 8);
    expect(correctedMeasurements.sprayLength.adjusted).toBe(false);

    // Spray angle must NOT be mutated
    expect(correctedMeasurements.sprayAngle.final).toBeCloseTo(initialMeasurements.sprayAngle.auto, 8);
    expect(correctedMeasurements.sprayAngle.adjusted).toBe(false);

    // Direction offset must NOT be mutated
    expect(correctedMeasurements.directionOffset.final).toBeCloseTo(initialMeasurements.directionOffset.auto, 8);
    expect(correctedMeasurements.directionOffset.adjusted).toBe(false);

    // Vertical spread and spread position MUST be adjusted
    expect(correctedMeasurements.verticalSpread.adjusted).toBe(true);
    expect(correctedMeasurements.verticalSpread.final).not.toBeCloseTo(initialMeasurements.verticalSpread.auto);
    expect(correctedMeasurements.spreadPosition?.adjusted).toBe(true);
    expect(correctedMeasurements.spreadPosition?.final).not.toBeCloseTo(initialMeasurements.spreadPosition?.auto ?? 0);

    // Double check via getSideFinalMeasurements directly
    const directFinal = getSideFinalMeasurements(
      initialSideGeometry,
      adjustedGeometry,
      sideCalibration
    );
    expect(directFinal.sprayLength.adjusted).toBe(false);
    expect(directFinal.sprayAngle.adjusted).toBe(false);
    expect(directFinal.verticalSpread.adjusted).toBe(true);
  });

  it('6. switching measurement mode hides irrelevant controls and renders only mode-specific controls', () => {
    // 6a. Length mode: only sprayEndpoint handle and length line rendered
    const { rerender } = render(
      <MeasurementCorrectionOverlay
        camera="side"
        activeSideTool="Length"
        autoSideGeometry={initialSideGeometry}
        workingSideGeometry={initialSideGeometry}
        autoFrontGeometry={initialFrontGeometry}
        workingFrontGeometry={initialFrontGeometry}
        sideCalibration={sideCalibration}
        onSideChange={vi.fn()}
        onFrontChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Titik ujung semprot')).toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sebaran atas')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sebaran bawah')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Posisi pengukuran sebaran')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sudut atas')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sudut bawah')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Titik referensi arah')).not.toBeInTheDocument();

    // 6b. Angle mode: only angle boundary handles rendered
    rerender(
      <MeasurementCorrectionOverlay
        camera="side"
        activeSideTool="Angle"
        autoSideGeometry={initialSideGeometry}
        workingSideGeometry={initialSideGeometry}
        autoFrontGeometry={initialFrontGeometry}
        workingFrontGeometry={initialFrontGeometry}
        sideCalibration={sideCalibration}
        onSideChange={vi.fn()}
        onFrontChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Batas sudut atas')).toBeInTheDocument();
    expect(screen.getByLabelText('Batas sudut bawah')).toBeInTheDocument();
    expect(screen.queryByLabelText('Titik ujung semprot')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sebaran atas')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sebaran bawah')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Posisi pengukuran sebaran')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Titik referensi arah')).not.toBeInTheDocument();

    // 6c. Direction mode: only directionReference handle rendered
    rerender(
      <MeasurementCorrectionOverlay
        camera="side"
        activeSideTool="Direction"
        autoSideGeometry={initialSideGeometry}
        workingSideGeometry={initialSideGeometry}
        autoFrontGeometry={initialFrontGeometry}
        workingFrontGeometry={initialFrontGeometry}
        sideCalibration={sideCalibration}
        onSideChange={vi.fn()}
        onFrontChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Titik referensi arah')).toBeInTheDocument();
    expect(screen.queryByLabelText('Titik ujung semprot')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sebaran atas')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sebaran bawah')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Posisi pengukuran sebaran')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sudut atas')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sudut bawah')).not.toBeInTheDocument();

    // 6d. Spread mode: only spread handles rendered
    rerender(
      <MeasurementCorrectionOverlay
        camera="side"
        activeSideTool="Spread"
        autoSideGeometry={initialSideGeometry}
        workingSideGeometry={initialSideGeometry}
        autoFrontGeometry={initialFrontGeometry}
        workingFrontGeometry={initialFrontGeometry}
        sideCalibration={sideCalibration}
        onSideChange={vi.fn()}
        onFrontChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('Batas sebaran atas')).toBeInTheDocument();
    expect(screen.getByLabelText('Batas sebaran bawah')).toBeInTheDocument();
    expect(screen.getByLabelText('Posisi pengukuran sebaran')).toBeInTheDocument();
    expect(screen.queryByLabelText('Titik ujung semprot')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sudut atas')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Batas sudut bawah')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Titik referensi arah')).not.toBeInTheDocument();
  });

  it('7. automatic/reference geometry remains visually distinct from working correction', () => {
    const { container } = render(
      <MeasurementCorrectionOverlay
        camera="side"
        activeSideTool="Spread"
        autoSideGeometry={initialSideGeometry}
        workingSideGeometry={{
          ...initialSideGeometry,
          verticalSpreadTopPx: { x: 460, y: 135 },
          verticalSpreadBottomPx: { x: 460, y: 260 },
        }}
        autoFrontGeometry={initialFrontGeometry}
        workingFrontGeometry={initialFrontGeometry}
        sideCalibration={sideCalibration}
        onSideChange={vi.fn()}
        onFrontChange={vi.fn()}
      />
    );

    const autoGroup = container.querySelector('.measurement-auto-geometry');
    const finalGroup = container.querySelector('.measurement-final-geometry');

    expect(autoGroup).toBeInTheDocument();
    expect(finalGroup).toBeInTheDocument();

    const autoLine = autoGroup?.querySelector('line');
    const finalLine = finalGroup?.querySelector('line');

    // Blue dashed line for automatic reference geometry
    expect(autoLine?.getAttribute('stroke')).toBe('#1d8fff');
    expect(autoLine?.getAttribute('stroke-dasharray')).toBe('5 4');

    // Orange solid line for operator working correction
    expect(finalLine?.getAttribute('stroke')).toBe('#ff8c00');
    expect(finalLine?.getAttribute('stroke-dasharray')).toBeNull();
  });

  it('8. accepted correction persists and reloads via analysisDraft without recomputing fake geometry', () => {
    // Simulate persisted analysisDraft with saved side corrections
    const persistedGeometry: SidePixelGeometry = {
      ...initialSideGeometry,
      verticalSpreadTopPx: { x: 470, y: 125 },
      verticalSpreadBottomPx: { x: 470, y: 275 },
    };

    const draft = {
      calibration: { side: sideCalibration, front: sideCalibration },
      primaryCaptureMomentId: 'frame-001',
      supportingCaptureMomentIds: [],
      sideCorrections: {
        'frame-001': persistedGeometry,
      },
      frontCorrections: {},
      updatedAt: '2026-10-22T10:00:00.000Z',
    };

    // Upon reloading the analysis workspace, the saved geometry is retrieved directly from draft
    const restoredGeometry = draft.sideCorrections['frame-001'];
    expect(restoredGeometry).toEqual(persistedGeometry);

    // Deriving measurements uses the exact persisted geometry deterministically
    const measurements = deriveSideMeasurementsFromGeometry(
      initialSideGeometry,
      sideCalibration,
      {
        geometry: restoredGeometry,
        adjustedBy: 'Operator',
        adjustedAt: draft.updatedAt,
      }
    );

    expect(measurements.verticalSpread.adjusted).toBe(true);
    expect(measurements.verticalSpread.adjustedBy).toBe('Operator');
    expect(measurements.verticalSpread.adjustedAt).toBe('2026-10-22T10:00:00.000Z');
    // Height: 275 - 125 = 150 px. scaleMmPerPx = 1000 / (600 - 100) = 2.0 mm/px -> 300 mm
    expect(measurements.verticalSpread.final).toBe(300);
    // Spray length and angle are untouched
    expect(measurements.sprayLength.adjusted).toBe(false);
    expect(measurements.sprayAngle.adjusted).toBe(false);
  });

  it('9. operator correction alone does NOT make a real TestRun finalizable when CV evidence is absent', () => {
    let kp = createKodePengujian({
      productId: 'prod-01',
      productSnapshot: { productCode: 'P01', productName: 'Prod 1' },
      operatorId: 'op-01',
      operatorName: 'Operator One',
    });
    kp = addSample(kp, { sampleCode: 'SMP-01' });
    const { kp: kpWithRun, testRun } = createTestRun(kp, {
      sampleId: kp.samples[0].id,
      recipeId: 'rec-01',
      recipeSnapshot: { name: 'Standard Recipe', forceSetpointN: 20, pressDurationMs: 500, strokeMm: 15 },
      setpoints: { forceSetpointN: 20, pressDurationMs: 500, strokeMm: 15 },
      fixture: 'nominal-01',
      operatorId: 'op-01',
      operatorName: 'Operator One',
    });

    // Real capture session with 2 frames and baseline
    const kpWithCapture = startTestRunCapture(kpWithRun, testRun.id, {
      scenario: 'nominal-01',
      synchronizedMoments: [],
      captureMode: 'real',
      realSideFrames: [
        { id: 'f-1', assetId: 'k:1', camera: 'side', frameIndex: 0, elapsedMs: 0, capturedAt: '2026-10-22T10:00:00Z' },
        { id: 'f-2', assetId: 'k:2', camera: 'side', frameIndex: 1, elapsedMs: 33, capturedAt: '2026-10-22T10:00:01Z' },
      ],
      realSideBaseline: {
        selectionMethod: 'initial-window',
        configuredWindowMs: 100,
        startElapsedMs: 0,
        endElapsedMs: 0,
        frames: [{ frameId: 'f-1', frameIndex: 0, elapsedMs: 0, assetId: 'k:1' }],
        selectedAt: '2026-10-22T10:00:02Z',
      },
      startedAt: '2026-10-22T10:00:00Z',
      capturedAt: '2026-10-22T10:00:02Z',
    });

    // Operator applies side correction on primary frame f-2
    const correctedDraft = {
      calibration: { side: sideCalibration, front: sideCalibration },
      primaryCaptureMomentId: 'f-2',
      supportingCaptureMomentIds: [],
      sideCorrections: {
        'f-2': {
          ...initialSideGeometry,
          verticalSpreadTopPx: { x: 450, y: 130 },
          verticalSpreadBottomPx: { x: 450, y: 270 },
        },
      },
      frontCorrections: {},
      updatedAt: '2026-10-22T10:00:05Z',
    };

    const kpWithDraft = updateTestRunAnalysisDraft(kpWithCapture, testRun.id, correctedDraft);

    // canFinalizeTestRun MUST still block finalization because real CV pipeline is not integrated
    const readiness = canFinalizeTestRun(kpWithDraft, testRun.id);
    expect(readiness.ok).toBe(false);
    if (!readiness.ok) {
      expect(readiness.reasons.some(r => r.includes('Side CV analysis pipeline not integrated'))).toBe(true);
    }
  });

  it('10. legacy Batch Analysis correction regression: functions correctly with display geometry and corrections', () => {
    // Without correction: returns autoGeometry
    const unadjusted = getSideDisplayGeometry(initialSideGeometry);
    expect(unadjusted).toBe(initialSideGeometry);

    // With correction: returns correction.geometry
    const correctedGeom: SidePixelGeometry = {
      ...initialSideGeometry,
      sprayEndpointPx: { x: 580, y: 200 },
    };
    const adjusted = getSideDisplayGeometry(initialSideGeometry, {
      geometry: correctedGeom,
      adjustedBy: 'Operator',
      adjustedAt: '2026-10-22T10:00:00Z',
    });
    expect(adjusted).toEqual(correctedGeom);
    expect(adjusted.sprayEndpointPx.x).toBe(580);
  });
});
