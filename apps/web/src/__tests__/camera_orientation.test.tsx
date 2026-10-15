import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  createCalibrationSnapshot,
  createSideMeasurements,
  createFrontMeasurements,
  DEFAULT_SIDE_ORIENTATION,
  deriveSideMeasurementsFromGeometry,
  mirrorSideGeometry,
  moveSideMeasurementHandle,
  resolveSideOrientation,
  sideSprayDirection,
  type Frame,
  type SidePixelGeometry,
} from '@spray-paragon/domain';
import { AnalysisOverlay } from '../presentation/features/analysis/AnalysisOverlay';
import { getPixelGeometry } from '../data';

describe('Phase 2 — Camera & Spray Orientation', () => {
  const dummyFrame: Frame = {
    frameIndex: 28,
    timestampMs: 280,
    phase: 'stable',
  };

  const leftGeometry = getPixelGeometry(28, 'nominal-01', 'nozzleLeft');
  const rightGeometry = getPixelGeometry(28, 'nominal-01', 'nozzleRight');

  const defaultCalibration = createCalibrationSnapshot({
    camera: 'side',
    referenceDistanceMm: 1000,
    anchorA: { x: 112, y: 296 },
    anchorB: { x: 634, y: 296 },
  });

  const explicitLeftCalibration = createCalibrationSnapshot({
    camera: 'side',
    sideOrientation: 'nozzleLeft',
    referenceDistanceMm: 1000,
    anchorA: { x: 112, y: 296 },
    anchorB: { x: 634, y: 296 },
  });

  const explicitRightCalibration = createCalibrationSnapshot({
    camera: 'side',
    sideOrientation: 'nozzleRight',
    referenceDistanceMm: 1000,
    anchorA: { x: 112, y: 296 },
    anchorB: { x: 634, y: 296 },
  });

  const dummySideMeasurements = createSideMeasurements({
    sprayLengthMm: 462,
    sprayAngleDeg: 18.4,
    maxVerticalSpreadMm: 148,
    directionOffsetDeg: 0.8,
  });

  const dummyFrontMeasurements = createFrontMeasurements({
    sprayAreaMm2: 12000,
    equivalentDiameterMm: 123,
    circularity: 0.85,
    centroidOffsetXmm: 0,
    centroidOffsetYmm: 0,
    horizontalSymmetry: 0.95,
    verticalSymmetry: 0.95,
  });

  it('resolves backward-compatible default orientation to nozzleLeft', () => {
    expect(DEFAULT_SIDE_ORIENTATION).toBe('nozzleLeft');
    expect(resolveSideOrientation(defaultCalibration)).toBe('nozzleLeft');
    expect(resolveSideOrientation(undefined)).toBe('nozzleLeft');
    expect(resolveSideOrientation(explicitLeftCalibration)).toBe('nozzleLeft');
    expect(resolveSideOrientation(explicitRightCalibration)).toBe('nozzleRight');
    expect(sideSprayDirection('nozzleLeft')).toBe(1);
    expect(sideSprayDirection('nozzleRight')).toBe(-1);
  });

  it('mirrors side pixel geometry cleanly while preserving measurement invariants', () => {
    const raw: SidePixelGeometry = {
      nozzleOriginPx: { x: 112, y: 204 },
      sprayEndpointPx: { x: 353, y: 196 },
      upperBoundaryPx: { x: 594, y: 151 },
      lowerBoundaryPx: { x: 574, y: 226 },
      verticalSpreadTopPx: { x: 594, y: 151 },
      verticalSpreadBottomPx: { x: 594, y: 228 },
      directionReferencePx: { x: 353, y: 204 },
    };

    const mirrored = mirrorSideGeometry(raw);

    // Coordinate assertions
    expect(mirrored.nozzleOriginPx).toEqual({ x: 720 - 112, y: 204 });
    expect(mirrored.sprayEndpointPx).toEqual({ x: 720 - 353, y: 196 });
    expect(mirrored.verticalSpreadTopPx).toEqual({ x: 720 - 594, y: 151 });
    expect(mirrored.directionReferencePx).toEqual({ x: 720 - 353, y: 204 });

    // Measurement invariant assertions: length, angle, vertical spread, spread position
    const leftVals = deriveSideMeasurementsFromGeometry(raw, defaultCalibration);
    const rightVals = deriveSideMeasurementsFromGeometry(mirrored, explicitRightCalibration);

    expect(rightVals.sprayLength.auto).toBeCloseTo(leftVals.sprayLength.auto, 8);
    expect(rightVals.sprayAngle.auto).toBeCloseTo(leftVals.sprayAngle.auto, 8);
    expect(rightVals.verticalSpread.auto).toBeCloseTo(leftVals.verticalSpread.auto, 8);
    expect(rightVals.directionOffset.auto).toBeCloseTo(leftVals.directionOffset.auto, 8);
    expect(rightVals.spreadPosition?.auto).toBeCloseTo(leftVals.spreadPosition?.auto ?? 0, 8);
  });

  it('clamps handle dragging in the correct downstream direction for both orientations', () => {
    const rawLeft = leftGeometry.side;
    const rawRight = rightGeometry.side;

    // For nozzleLeft, spray goes right: clamping to x < nozzle.x + 10 prevents invalid backward drag
    const draggedLeftPastNozzle = moveSideMeasurementHandle(
      rawLeft,
      'sprayEndpoint',
      { x: rawLeft.nozzleOriginPx.x - 50, y: rawLeft.nozzleOriginPx.y },
      { width: 720, height: 360 },
      'nozzleLeft',
    );
    expect(draggedLeftPastNozzle.sprayEndpointPx.x).toBe(rawLeft.nozzleOriginPx.x + 10);

    // For nozzleRight, spray goes left: clamping to x > nozzle.x - 10 prevents invalid backward drag
    const draggedRightPastNozzle = moveSideMeasurementHandle(
      rawRight,
      'sprayEndpoint',
      { x: rawRight.nozzleOriginPx.x + 50, y: rawRight.nozzleOriginPx.y },
      { width: 720, height: 360 },
      'nozzleRight',
    );
    expect(draggedRightPastNozzle.sprayEndpointPx.x).toBe(rawRight.nozzleOriginPx.x - 10);

    // Spread position clamping respects downstream orientation
    const leftSpreadClamped = moveSideMeasurementHandle(
      rawLeft,
      'spreadPosition',
      { x: 0, y: 0 },
      { width: 720, height: 360 },
      'nozzleLeft',
    );
    expect(leftSpreadClamped.verticalSpreadTopPx.x).toBe(rawLeft.nozzleOriginPx.x + 10);

    const rightSpreadClamped = moveSideMeasurementHandle(
      rawRight,
      'spreadPosition',
      { x: 720, y: 0 },
      { width: 720, height: 360 },
      'nozzleRight',
    );
    expect(rightSpreadClamped.verticalSpreadTopPx.x).toBe(rawRight.nozzleOriginPx.x - 10);
  });

  it('renders nozzleLeft overlay without mirroring coordinates', () => {
    const { container } = render(
      <AnalysisOverlay
        camera="side"
        mode="Overlay"
        frame={dummyFrame}
        calibration={explicitLeftCalibration}
        sideGeometry={leftGeometry.side}
        frontGeometry={leftGeometry.front}
        sideMeasurements={dummySideMeasurements}
        frontMeasurements={dummyFrontMeasurements}
      />,
    );

    const lengthLine = screen.getByTestId('side-display-length-line');
    expect(lengthLine.getAttribute('x1')).toBe(String(leftGeometry.side.nozzleOriginPx.x));
    expect(lengthLine.getAttribute('x2')).toBe(String(leftGeometry.side.sprayEndpointPx.x));

    // Direction line points to the right (x2="650")
    const directionLine = screen.getByTestId('side-direction-line');
    expect(directionLine.getAttribute('x1')).toBe(String(leftGeometry.side.nozzleOriginPx.x));
    expect(directionLine.getAttribute('x2')).toBe('650');

    // Angle text placed to the right of nozzle
    const angleText = container.querySelector('text[x="212"]');
    expect(angleText).not.toBeNull();
  });

  it('renders nozzleRight overlay correctly with nozzle on the right and spray directed left', () => {
    const { container } = render(
      <AnalysisOverlay
        camera="side"
        mode="Overlay"
        frame={dummyFrame}
        calibration={explicitRightCalibration}
        sideGeometry={rightGeometry.side}
        frontGeometry={rightGeometry.front}
        sideMeasurements={dummySideMeasurements}
        frontMeasurements={dummyFrontMeasurements}
      />,
    );

    const lengthLine = screen.getByTestId('side-display-length-line');
    expect(lengthLine.getAttribute('x1')).toBe(String(rightGeometry.side.nozzleOriginPx.x));
    expect(lengthLine.getAttribute('x2')).toBe(String(rightGeometry.side.sprayEndpointPx.x));
    expect(Number(lengthLine.getAttribute('x1'))).toBeGreaterThan(Number(lengthLine.getAttribute('x2')));

    // Direction line points to the left (x2="70")
    const directionLine = screen.getByTestId('side-direction-line');
    expect(directionLine.getAttribute('x1')).toBe(String(rightGeometry.side.nozzleOriginPx.x));
    expect(directionLine.getAttribute('x2')).toBe('70');

    // Angle text placed to the left of the nozzle (x="508")
    const angleText = container.querySelector('text[x="508"]');
    expect(angleText).not.toBeNull();
  });
});
