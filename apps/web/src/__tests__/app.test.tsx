import { describe, it, expect } from 'vitest';
import { tests, analyses, synchronizedFrames, fmt, FixtureTestRepository, FixtureAnalysisRepository, getPixelGeometry } from '../data';
import { testSchema, analysisSchema, synchronizedAnalysisFrameSchema } from '@spray-paragon/domain';
import { FixtureProductRepository } from '../data';
import { createTestSession, nextSampleId, nextTestId } from '@spray-paragon/domain';
import { createFinalReportCsv } from '../App';
import { addSupportingCapture, adjustCalibration, calculateScaleMmPerPx, calibratedGridSpacingPx, canFinalize, correctMeasurement, createCalibrationSnapshot, createFinalAnalysisReport, createFrontMeasurements, createMeasurementValue, createSideMeasurements, deriveFrontMeasurementsFromGeometry, deriveSideMeasurementsFromGeometry, getPrimary, getUserFacingTestStatus, moveCalibrationAnchor, moveFrontMeasurementHandle, moveSideMeasurementHandle, pixelDistanceToMm, pointDistanceToMm, removeSupportingCapture, selectMeasurementValue, setPrimaryCapture, translateCalibrationWithinBounds, updateCalibrationGeometry } from '@spray-paragon/domain';

describe('Spraybot Core Fixtures & Formatters', () => {
  it('has deterministic test fixtures', () => {
    expect(tests).toHaveLength(4);
    expect(tests[0].id).toBe('TST-24-0618');
  });

  it('has deterministic analysis fixtures', () => {
    const a = analyses['nominal-01'];
    expect(a.side.sprayAngleDeg).toBe(18.4);
    expect(a.front.circularity).toBe(0.86);
    expect(a).not.toHaveProperty('rear');
  });

  it('provides deterministic synchronized Side and Front capture moments', () => {
    expect(synchronizedFrames).toHaveLength(60);
    const moment = synchronizedFrames[28];
    expect(moment.id).toBe('cap-028');
    expect(moment.recommended).toBe(true);
    expect(moment.syncStatus).toBe('synced');
    expect(moment.timestampDeltaMs).toBe(0);
    expect(moment.side.camera).toBe('side');
    expect(moment.front.camera).toBe('front');
    expect(moment.side.frameIndex).toBe(moment.front.frameIndex);
    expect(moment.side.timestampMs).toBe(moment.front.timestampMs);
    expect(moment.timestampMs).toBe(moment.side.timestampMs);
  });

  it('keeps all current mock capture moments synchronized and schema-valid', () => {
    synchronizedFrames.forEach(moment => {
      expect(() => synchronizedAnalysisFrameSchema.parse(moment)).not.toThrow();
      expect(moment.syncStatus).toBe('synced');
      expect(moment.side.phase).toBe(moment.phase);
      expect(moment.front.phase).toBe(moment.phase);
    });
  });

  it('formats metrics properly', () => {
    expect(fmt.cm(724)).toBe('72.4 cm');
    expect(fmt.deg(41.8)).toBe('41.8°');
    expect(fmt.area(18420)).toBe('18420 mm²');
  });
});

describe('Domain contracts (Zod)', () => {
  it('validates all test fixtures against schema', () => {
    tests.forEach(t => expect(() => testSchema.parse(t)).not.toThrow());
  });

  it('validates all analysis fixtures against schema', () => {
    Object.values(analyses).forEach(a => expect(() => analysisSchema.parse(a)).not.toThrow());
  });

  it('rejects invalid test data', () => {
    expect(() => testSchema.parse({ ...tests[0], config: { forceSetpointN: -1, pressDurationMs: 850, strokeMm: 8.5 } })).toThrow();
  });
});

describe('Analysis traceability domain', () => {
  it('calculates physical scale from known distance and calibration anchors', () => {
    expect(calculateScaleMmPerPx(1000, { x: 0, y: 0 }, { x: 800, y: 0 })).toBe(1.25);
    expect(() => calculateScaleMmPerPx(1000, { x: 12, y: 8 }, { x: 12, y: 8 })).toThrow('Calibration anchors must not overlap');
  });

  it('recalculates scale when anchors or reference distance change during calibration adjustment', () => {
    const initial = createCalibrationSnapshot({
      camera: 'side',
      referenceDistanceMm: 1000,
      anchorA: { x: 100, y: 200 },
      anchorB: { x: 900, y: 200 },
    });
    expect(initial.scaleMmPerPx).toBe(1.25);

    const updated = adjustCalibration(
      initial,
      { anchorB: { x: 700, y: 200 } },
      'Nadia Putri',
      '2026-09-29T14:35:00Z',
    );
    expect(updated.scaleMmPerPx).toBe(1000 / 600);
    expect(updated.adjusted).toBe(true);
    expect(updated.adjustedBy).toBe('Nadia Putri');
    expect(updated.adjustedAt).toBe('2026-09-29T14:35:00Z');
  });

  it('preserves measurement correction state independently when calibration changes', () => {
    const automatic = createMeasurementValue(462);
    const correctedMeasurement = correctMeasurement(automatic, 471, 'Nadia Putri', '2026-09-29T14:12:00Z');
    const initialCalibration = createCalibrationSnapshot({
      camera: 'side',
      referenceDistanceMm: 1000,
      anchorA: { x: 100, y: 200 },
      anchorB: { x: 900, y: 200 },
    });

    const updatedCalibration = adjustCalibration(
      initialCalibration,
      { referenceDistanceMm: 1200 },
      'Nadia Putri',
      '2026-09-29T14:36:00Z',
    );

    expect(correctedMeasurement.final).toBe(471);
    expect(correctedMeasurement.auto).toBe(462);
    expect(updatedCalibration.referenceDistanceMm).toBe(1200);
    expect(updatedCalibration.scaleMmPerPx).toBe(1.5);
  });

  it('preserves automatic values and calibration scale when a measurement is corrected', () => {
    const measurements = createSideMeasurements({ sprayLengthMm: 462, sprayAngleDeg: 18.4, maxVerticalSpreadMm: 148, directionOffsetDeg: 0.8 });
    const calibration = createCalibrationSnapshot({ camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 100, y: 200 }, anchorB: { x: 900, y: 200 } });
    const initialScale = calibration.scaleMmPerPx;
    const automatic = measurements.sprayLength;
    const corrected = correctMeasurement(automatic, 471, 'Nadia Putri', '2026-09-29T14:12:00Z');

    expect(corrected).toEqual({
      auto: 462,
      final: 471,
      adjusted: true,
      adjustedBy: 'Nadia Putri',
      adjustedAt: '2026-09-29T14:12:00Z',
    });
    expect(automatic).toEqual({ auto: 462, final: 462, adjusted: false });
    expect(calibration.scaleMmPerPx).toBe(initialScale);
  });

  it('creates an immutable final report snapshot with shared capture and per-camera calibration', () => {
    const primary = synchronizedFrames[28];
    const sideCalibration = createCalibrationSnapshot({ camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 100, y: 200 }, anchorB: { x: 900, y: 200 } });
    const frontCalibration = createCalibrationSnapshot({ camera: 'front', referenceDistanceMm: 500, anchorA: { x: 300, y: 50 }, anchorB: { x: 300, y: 450 }, adjusted: true, adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:10:00Z' });
    const sprayLength = correctMeasurement(createMeasurementValue(462), 471, 'Nadia Putri', '2026-09-29T14:12:00Z');
    const report = createFinalAnalysisReport({
      test: tests[0],
      primaryCaptureMoment: primary,
      supportingCaptureMoments: [synchronizedFrames[26], synchronizedFrames[27]],
      side: {
        sprayLength,
        sprayAngle: createMeasurementValue(18.4),
        verticalSpread: createMeasurementValue(148),
        directionOffset: createMeasurementValue(0.8),
      },
      front: {
        sprayArea: createMeasurementValue(19240),
        equivalentDiameter: createMeasurementValue(156),
        circularity: createMeasurementValue(0.86),
        centroidOffsetX: createMeasurementValue(2.1),
        centroidOffsetY: createMeasurementValue(-1.4),
        horizontalSymmetry: createMeasurementValue(0.94),
        verticalSymmetry: createMeasurementValue(0.91),
      },
      sideCalibration,
      frontCalibration,
      sideAutoGeometry: getPixelGeometry(28, 'nominal-01').side,
      sideFinalGeometry: getPixelGeometry(28, 'nominal-01').side,
      frontAutoGeometry: getPixelGeometry(28, 'nominal-01').front,
      frontFinalGeometry: getPixelGeometry(28, 'nominal-01').front,
      finalizedBy: 'Nadia Putri',
      finalizedAt: '2026-09-29T14:15:00Z',
    });

    sprayLength.final = 999;
    sideCalibration.anchorB.x = 400;

    expect(report.primaryCaptureMomentId).toBe('cap-028');
    expect(report.primaryCapture).toEqual({ frameIndex: 28, timestampMs: 1400, phase: 'stable' });
    expect(report.side.frameId).toBe('side-028');
    expect(report.front.frameId).toBe('front-028');
    expect(report.supportingCaptureMomentIds).toEqual(['cap-026', 'cap-027']);
    expect(report.side.sprayLength).toMatchObject({ auto: 462, final: 471, adjusted: true });
    expect(report.side.calibration.anchorB.x).toBe(900);
    expect(report.front.calibration.adjusted).toBe(true);
  });
});

describe('Synchronized capture selection domain', () => {
  const selectedBy = 'Nadia Putri';
  const selectedAt = '2026-09-29T14:20:00Z';

  it('selects exactly one explicit Tangkapan Utama Moment', () => {
    const first = setPrimaryCapture([], synchronizedFrames[28], selectedBy, selectedAt).selected;
    const second = setPrimaryCapture(first, synchronizedFrames[29], selectedBy, selectedAt).selected;

    expect(getPrimary(second)?.captureFrameId).toBe('cap-029');
    expect(second.filter(item => item.role === 'primary')).toHaveLength(1);
    expect(second.find(item => item.captureFrameId === 'cap-028')?.role).toBe('supporting');
  });

  it('adds and removes Supporting Capture Moments without removing Primary', () => {
    const withPrimary = setPrimaryCapture([], synchronizedFrames[28], selectedBy, selectedAt).selected;
    const withSupporting = addSupportingCapture(withPrimary, synchronizedFrames[27], selectedBy, selectedAt).selected;
    const removed = removeSupportingCapture(withSupporting, 'cap-027').selected;
    const removePrimary = removeSupportingCapture(withSupporting, 'cap-028');

    expect(withSupporting).toHaveLength(2);
    expect(removed).toHaveLength(1);
    expect(removed[0].captureFrameId).toBe('cap-028');
    expect(removePrimary.error).toContain('Cannot remove the Primary');
    expect(removePrimary.selected).toEqual(withSupporting);
  });

  it('prevents more than 10 selected synchronized capture moments', () => {
    let selected = setPrimaryCapture([], synchronizedFrames[20], selectedBy, selectedAt).selected;
    for (let i = 21; i < 30; i += 1) {
      selected = addSupportingCapture(selected, synchronizedFrames[i], selectedBy, selectedAt).selected;
    }
    const overflow = addSupportingCapture(selected, synchronizedFrames[30], selectedBy, selectedAt);

    expect(selected).toHaveLength(10);
    expect(overflow.selected).toHaveLength(10);
    expect(overflow.error).toBe('Maximum 10 capture moments already selected');
  });

  it('uses correct total for a 60-moment sequence', () => {
    expect(synchronizedFrames).toHaveLength(60);
    expect(synchronizedFrames.length).toBe(60);
    const firstIndex = synchronizedFrames[0].frameIndex;
    const lastIndex = synchronizedFrames[59].frameIndex;
    expect(firstIndex).toBe(0);
    expect(lastIndex).toBe(59);
    // Human-readable ordinal: frame 28 is "29 of 60", never "28 / 59"
    expect(synchronizedFrames[28].frameIndex + 1).toBe(29);
  });

  it('promotes existing Supporting to Primary instead of silently removing captures at max capacity', () => {
    let selected = setPrimaryCapture([], synchronizedFrames[20], selectedBy, selectedAt).selected;
    for (let i = 21; i < 30; i += 1) {
      selected = addSupportingCapture(selected, synchronizedFrames[i], selectedBy, selectedAt).selected;
    }
    expect(selected).toHaveLength(10);

    // Promote existing Supporting (#25) to Primary — should swap, count stays 10
    const promoted = setPrimaryCapture(selected, synchronizedFrames[25], selectedBy, selectedAt);
    expect(promoted.selected).toHaveLength(10);
    expect(promoted.error).toBeUndefined();
    expect(getPrimary(promoted.selected)?.captureFrameId).toBe('cap-025');
    expect(promoted.selected.find(s => s.captureFrameId === 'cap-020')?.role).toBe('supporting');

    // Set an unselected frame as Primary at max capacity — must reject
    const rejected = setPrimaryCapture(selected, synchronizedFrames[35], selectedBy, selectedAt);
    expect(rejected.selected).toHaveLength(10);
    expect(rejected.error).toBe('Maximum 10 captures selected. Remove a supporting capture first.');
    expect(getPrimary(rejected.selected)?.captureFrameId).toBe('cap-020');
  });

  it('rejects partial or invalid capture moments for Primary and Supporting roles', () => {
    const partial = { ...synchronizedFrames[28], syncStatus: 'partial' as const, timestampDeltaMs: 12 };
    const invalid = { ...synchronizedFrames[29], syncStatus: 'invalid' as const, timestampDeltaMs: 40 };

    const primaryResult = setPrimaryCapture([], partial, selectedBy, selectedAt);
    const supportingResult = addSupportingCapture([], invalid, selectedBy, selectedAt);

    expect(primaryResult.selected).toEqual([]);
    expect(primaryResult.error).toBe('Only synchronized capture moments may be selected');
    expect(supportingResult.selected).toEqual([]);
    expect(supportingResult.error).toBe('Only synchronized capture moments may be selected');
  });

  it('requires a Tangkapan Utama Moment before finalization', () => {
    const supportingOnly = addSupportingCapture([], synchronizedFrames[27], selectedBy, selectedAt).selected;
    const withPrimary = setPrimaryCapture(supportingOnly, synchronizedFrames[28], selectedBy, selectedAt).selected;

    expect(canFinalize([])).toBe(false);
    expect(canFinalize(supportingOnly)).toBe(false);
    expect(canFinalize(withPrimary)).toBe(true);

    const report = createFinalAnalysisReport({
      test: tests[0],
      primaryCaptureMoment: synchronizedFrames[28],
      supportingCaptureMoments: [synchronizedFrames[27]],
      side: createSideMeasurements({ sprayLengthMm: 462, sprayAngleDeg: 18.4, maxVerticalSpreadMm: 148, directionOffsetDeg: 0.8 }),
      front: createFrontMeasurements({ sprayAreaMm2: 19240, equivalentDiameterMm: 156, circularity: 0.86, centroidOffsetXmm: 2.1, centroidOffsetYmm: -1.4, horizontalSymmetry: 0.94, verticalSymmetry: 0.91 }),
      sideCalibration: createCalibrationSnapshot({ camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 112, y: 296 }, anchorB: { x: 634, y: 296 } }),
      frontCalibration: createCalibrationSnapshot({ camera: 'front', referenceDistanceMm: 400, anchorA: { x: 200, y: 180 }, anchorB: { x: 360, y: 180 } }),
      sideAutoGeometry: getPixelGeometry(28, 'nominal-01').side,
      sideFinalGeometry: getPixelGeometry(28, 'nominal-01').side,
      frontAutoGeometry: getPixelGeometry(28, 'nominal-01').front,
      frontFinalGeometry: getPixelGeometry(28, 'nominal-01').front,
      finalizedBy: 'Nadia Putri',
      finalizedAt: '2026-09-29T14:45:00Z',
    });

    expect(report.primaryCaptureMomentId).toBe('cap-028');
    expect(report.primaryCapture.frameIndex).toBe(28);
    expect(report.primaryCapture.timestampMs).toBe(1400);
    expect(report.supportingCaptureMomentIds).toEqual(['cap-027']);
  });
});

describe('Calibrated pixel measurement pipeline', () => {
  const geometry = getPixelGeometry(28, 'nominal-01');
  const sideBefore = createCalibrationSnapshot({ camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 112, y: 296 }, anchorB: { x: 634, y: 296 } });
  const sideAfter = adjustCalibration(sideBefore, { anchorB: { x: 682, y: 296 } }, 'Nadia Putri', '2026-09-29T14:35:00Z');
  const frontBefore = createCalibrationSnapshot({ camera: 'front', referenceDistanceMm: 500, anchorA: { x: 265, y: 85 }, anchorB: { x: 465, y: 85 } });
  const frontAfter = adjustCalibration(frontBefore, { anchorB: { x: 505, y: 85 } }, 'Nadia Putri', '2026-09-29T14:35:00Z');
  const sideBeforeValues = deriveSideMeasurementsFromGeometry(geometry.side, sideBefore);
  const sideAfterValues = deriveSideMeasurementsFromGeometry(geometry.side, sideAfter);
  const frontBeforeValues = deriveFrontMeasurementsFromGeometry(geometry.front, frontBefore);
  const frontAfterValues = deriveFrontMeasurementsFromGeometry(geometry.front, frontAfter);

  it('converts pixel and point distances through the current calibration', () => {
    expect(pixelDistanceToMm(100, sideBefore.scaleMmPerPx)).toBeCloseTo(191.57, 2);
    expect(pointDistanceToMm({ x: 0, y: 0 }, { x: 100, y: 0 }, sideBefore)).toBeCloseTo(191.57, 2);
  });

  it('changing calibration changes spray length and vertical spread', () => {
    expect(sideAfterValues.sprayLength.auto).not.toBeCloseTo(sideBeforeValues.sprayLength.auto);
    expect(sideAfterValues.verticalSpread.auto).not.toBeCloseTo(sideBeforeValues.verticalSpread.auto);
  });

  it('changing calibration changes equivalent diameter and centroid offsets', () => {
    expect(frontAfterValues.equivalentDiameter.auto).not.toBeCloseTo(frontBeforeValues.equivalentDiameter.auto);
    expect(frontAfterValues.centroidOffsetX.auto).not.toBeCloseTo(frontBeforeValues.centroidOffsetX.auto);
    expect(frontAfterValues.centroidOffsetY.auto).not.toBeCloseTo(frontBeforeValues.centroidOffsetY.auto);
  });

  it('uses squared calibration scale for spray area', () => {
    const expected = geometry.front.sprayAreaPixels * frontAfter.scaleMmPerPx * frontAfter.scaleMmPerPx;
    expect(frontAfterValues.sprayArea.auto).toBeCloseTo(expected, 6);
    expect(frontAfterValues.sprayArea.auto / frontBeforeValues.sprayArea.auto).toBeCloseTo((frontAfter.scaleMmPerPx / frontBefore.scaleMmPerPx) ** 2, 6);
  });

  it('keeps circularity and angle unchanged under uniform calibration scale', () => {
    expect(frontAfterValues.circularity.auto).toBe(frontBeforeValues.circularity.auto);
    expect(sideAfterValues.sprayAngle.auto).toBeCloseTo(sideBeforeValues.sprayAngle.auto, 8);
  });

  it('changes physical grid spacing when calibration changes', () => {
    expect(calibratedGridSpacingPx(100, sideAfter)).not.toBeCloseTo(calibratedGridSpacingPx(100, sideBefore));
    expect(calibratedGridSpacingPx(100, sideAfter)).toBeCloseTo(57, 4);
  });

  it('uses one selector for viewport and inspector display values', () => {
    const viewportValue = selectMeasurementValue(sideAfterValues.sprayLength);
    const inspectorValue = selectMeasurementValue(sideAfterValues.sprayLength);
    expect(viewportValue).toBe(inspectorValue);
  });

  it('keeps pixel corrections calibrated after scale changes', () => {
    const pixelCorrection = 5 / sideBefore.scaleMmPerPx;
    const correctedBefore = deriveSideMeasurementsFromGeometry(geometry.side, sideBefore, { sprayLength: pixelCorrection, adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' });
    const correctedAfter = deriveSideMeasurementsFromGeometry(geometry.side, sideAfter, { sprayLength: pixelCorrection, adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' });
    expect(correctedBefore.sprayLength.final - correctedBefore.sprayLength.auto).toBeCloseTo(5, 6);
    expect(correctedAfter.sprayLength.final - correctedAfter.sprayLength.auto).not.toBeCloseTo(5, 6);
    expect(correctedAfter.sprayLength.adjusted).toBe(true);
  });

  it('moves anchor B to change scale and live calibrated measurements', () => {
    const working = moveCalibrationAnchor(sideBefore, 'anchorB', { x: 682, y: 296 }, { width: 720, height: 360 });
    const liveValues = deriveSideMeasurementsFromGeometry(geometry.side, working);
    expect(working.scaleMmPerPx).toBeCloseTo(1.754386, 6);
    expect(liveValues.sprayLength.auto).not.toBeCloseTo(sideBeforeValues.sprayLength.auto);
    expect(working.adjusted).toBe(false);
  });

  it('translates both anchors without changing scale', () => {
    const translated = translateCalibrationWithinBounds(sideBefore, { x: 20, y: -30 }, { width: 720, height: 360 });
    expect(translated.anchorA).toEqual({ x: 132, y: 266 });
    expect(translated.anchorB).toEqual({ x: 654, y: 266 });
    expect(translated.scaleMmPerPx).toBeCloseTo(sideBefore.scaleMmPerPx, 10);
  });

  it('constrains anchors and translated ruler to viewport bounds', () => {
    const anchorAtEdge = moveCalibrationAnchor(sideBefore, 'anchorA', { x: -50, y: 500 }, { width: 720, height: 360 });
    expect(anchorAtEdge.anchorA).toEqual({ x: 0, y: 360 });
    const translated = translateCalibrationWithinBounds(sideBefore, { x: 500, y: 500 }, { width: 720, height: 360 });
    expect(translated.anchorB).toEqual({ x: 720, y: 360 });
    expect(translated.anchorA.x).toBe(198);
  });

  it('working geometry updates preserve previous audit metadata until apply', () => {
    const saved = adjustCalibration(sideBefore, { anchorB: { x: 650, y: 296 } }, 'Previous Operator', '2026-09-29T13:00:00Z');
    const working = updateCalibrationGeometry(saved, { anchorB: { x: 682, y: 296 } });
    expect(working.adjustedBy).toBe('Previous Operator');
    expect(working.adjustedAt).toBe('2026-09-29T13:00:00Z');
    const applied = adjustCalibration(working, {}, 'Nadia Putri', '2026-09-29T14:35:00Z');
    expect(applied.adjustedBy).toBe('Nadia Putri');
    expect(applied.adjustedAt).toBe('2026-09-29T14:35:00Z');
  });

  it('keeps Side and Front calibration snapshots independent', () => {
    const editedSide = moveCalibrationAnchor(sideBefore, 'anchorB', { x: 682, y: 296 }, { width: 720, height: 360 });
    expect(editedSide.scaleMmPerPx).not.toBe(sideBefore.scaleMmPerPx);
    expect(frontBefore.scaleMmPerPx).toBe(2.5);
    expect(frontBefore.anchorB).toEqual({ x: 465, y: 85 });
  });

  it('calibration geometry helpers do not modify measurement correction state', () => {
    const corrections = { sprayLength: 2.5, adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' };
    moveCalibrationAnchor(sideBefore, 'anchorB', { x: 682, y: 296 }, { width: 720, height: 360 });
    expect(corrections).toEqual({ sprayLength: 2.5, adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' });
  });

  it('derives Side final values from durable corrected pixel geometry', () => {
    const corrected = moveSideMeasurementHandle(geometry.side, 'sprayEndpoint', { x: geometry.side.sprayEndpointPx.x + 30, y: geometry.side.sprayEndpointPx.y }, { width: 720, height: 360 });
    const values = deriveSideMeasurementsFromGeometry(geometry.side, sideBefore, { geometry: corrected, adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' });
    expect(values.sprayLength.auto).toBeCloseTo(sideBeforeValues.sprayLength.auto, 8);
    expect(values.sprayLength.final).not.toBeCloseTo(values.sprayLength.auto);
    expect(values.sprayLength.adjusted).toBe(true);
    expect(corrected.nozzleOriginPx).toEqual(geometry.side.nozzleOriginPx);
  });

  it('updates spread and angle from Side handles while preserving calibration scale', () => {
    const positioned = moveSideMeasurementHandle(geometry.side, 'spreadPosition', { x: 600, y: 0 }, { width: 720, height: 360 });
    const spread = moveSideMeasurementHandle(positioned, 'spreadBottom', { x: positioned.verticalSpreadBottomPx.x, y: 260 }, { width: 720, height: 360 });
    const angled = moveSideMeasurementHandle(spread, 'upperAngle', { x: 580, y: 110 }, { width: 720, height: 360 });
    const values = deriveSideMeasurementsFromGeometry(geometry.side, sideBefore, { geometry: angled, adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' });
    expect(values.verticalSpread.final).not.toBeCloseTo(values.verticalSpread.auto);
    expect(values.sprayAngle.final).not.toBeCloseTo(values.sprayAngle.auto);
    expect(sideBefore.scaleMmPerPx).toBeCloseTo(1000 / 522, 10);
    expect(angled.verticalSpreadTopPx.x).toBe(600);
  });

  it('recalculates corrected physical values after calibration changes without moving corrected pixels', () => {
    const corrected = moveSideMeasurementHandle(geometry.side, 'sprayEndpoint', { x: 620, y: 200 }, { width: 720, height: 360 });
    const before = deriveSideMeasurementsFromGeometry(geometry.side, sideBefore, { geometry: corrected, adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' });
    const after = deriveSideMeasurementsFromGeometry(geometry.side, sideAfter, { geometry: corrected, adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' });
    expect(after.sprayLength.final).not.toBeCloseTo(before.sprayLength.final);
    expect(corrected.sprayEndpointPx).toEqual({ x: 620, y: 200 });
  });

  it('moves Front centroid and diameter through corrected pixel geometry', () => {
    const centroid = moveFrontMeasurementHandle(geometry.front, 'centroid', { x: 390, y: 175 }, { width: 720, height: 360 });
    const diameter = moveFrontMeasurementHandle(centroid, 'diameterRight', { x: centroid.referenceCenterPx.x + 140, y: centroid.referenceCenterPx.y }, { width: 720, height: 360 });
    const values = deriveFrontMeasurementsFromGeometry(geometry.front, frontBefore, { geometry: diameter, adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' });
    expect(values.centroidOffsetX.final).not.toBeCloseTo(values.centroidOffsetX.auto);
    expect(values.equivalentDiameter.final).not.toBeCloseTo(values.equivalentDiameter.auto);
    expect(values.circularity.final).toBe(values.circularity.auto);
  });

  it('clamps measurement handles and prevents spread crossing', () => {
    const endpoint = moveSideMeasurementHandle(geometry.side, 'sprayEndpoint', { x: 900, y: -40 }, { width: 720, height: 360 });
    const position = moveSideMeasurementHandle(geometry.side, 'spreadPosition', { x: 900, y: 0 }, { width: 720, height: 360 });
    const top = moveSideMeasurementHandle(geometry.side, 'spreadTop', { x: 0, y: 350 }, { width: 720, height: 360 });
    expect(endpoint.sprayEndpointPx).toEqual({ x: 720, y: 0 });
    expect(position.verticalSpreadTopPx.x).toBe(710);
    expect(top.verticalSpreadTopPx.y).toBeLessThan(top.verticalSpreadBottomPx.y);
  });

  it('snapshots recalculated calibrated values in the final report', () => {
    const report = createFinalAnalysisReport({
      test: tests[0],
      primaryCaptureMoment: synchronizedFrames[28],
      supportingCaptureMoments: [],
      side: sideAfterValues,
      front: frontAfterValues,
      sideCalibration: sideAfter,
      frontCalibration: frontAfter,
      sideAutoGeometry: getPixelGeometry(28, 'nominal-01').side,
      sideFinalGeometry: getPixelGeometry(28, 'nominal-01').side,
      frontAutoGeometry: getPixelGeometry(28, 'nominal-01').front,
      frontFinalGeometry: getPixelGeometry(28, 'nominal-01').front,
      finalizedBy: 'Nadia Putri',
      finalizedAt: '2026-09-29T14:45:00Z',
    });
    expect(report.side.sprayLength.auto).toBeCloseTo(sideAfterValues.sprayLength.auto, 8);
    expect(report.front.sprayArea.auto).toBeCloseTo(frontAfterValues.sprayArea.auto, 8);
    expect(report.side.calibration.scaleMmPerPx).toBe(sideAfter.scaleMmPerPx);
  });
});

describe('Fixture repositories', () => {
  it('FixtureTestRepository.getAll returns validated tests', async () => {
    const repo = new FixtureTestRepository();
    const all = await repo.getAll();
    expect(all).toHaveLength(4);
    expect(all[0].id).toBe('TST-24-0618');
  });

  it('FixtureTestRepository.getById finds by id', async () => {
    const repo = new FixtureTestRepository();
    const t = await repo.getById('TST-24-0618');
    expect(t).not.toBeNull();
    expect(t?.productName).toBe('Fine Mist 100 mL');
  });

  it('FixtureAnalysisRepository.getByFixture returns validated analysis', async () => {
    const repo = new FixtureAnalysisRepository();
    const a = await repo.getByFixture('nominal-01');
    expect(a.side.sprayAngleDeg).toBe(18.4);
    expect(a.front.circularity).toBe(0.86);
    expect(a).not.toHaveProperty('rear');
  });

  it('FixtureAnalysisRepository throws on unknown fixture', async () => {
    const repo = new FixtureAnalysisRepository();
    await expect(repo.getByFixture('unknown' as never)).rejects.toThrow();
  });
});

describe('Product, recipe, and test session contracts', () => {
  it('lists products and only recipes belonging to the selected product', async () => {
    const repo = new FixtureProductRepository();
    const products = await repo.listProducts();
    const recipes = await repo.listRecipes(products[0].id);
    expect(products.map(product => product.name)).toContain('Fine Mist 100 mL');
    expect(recipes.length).toBeGreaterThan(1);
    expect(recipes.every(recipe => recipe.productId === products[0].id)).toBe(true);
  });

  it('provides one automatic default recipe per fixture product', async () => {
    const repo = new FixtureProductRepository();
    const products = await repo.listProducts();
    for (const product of products) {
      const recipes = await repo.listRecipes(product.id);
      expect(recipes.filter(recipe => recipe.isDefault)).toHaveLength(1);
    }
  });

  it('changing recipe changes the available setpoints', async () => {
    const repo = new FixtureProductRepository();
    const recipes = await repo.listRecipes('prd-fm100');
    expect(recipes[0].pressDurationMs).not.toBe(recipes[1].pressDurationMs);
  });

  it('generates deterministic test and sample identifiers', () => {
    expect(nextTestId()).toBe('TST-260929-0018');
    expect(nextSampleId()).toBe('SMP-260929-0018');
  });

  it('creates an immutable product and recipe snapshot with optional production batch', async () => {
    const repo = new FixtureProductRepository();
    const product = (await repo.getProduct('prd-fm100'))!;
    const recipe = (await repo.listRecipes(product.id))[0];
    const session = createTestSession({ product, recipe, operatorId: 'usr-np', operatorName: 'Nadia Putri', fixture: 'nominal-01' });
    await repo.updateProduct(product.id, { name: 'Renamed Product' });
    await repo.updateRecipe(recipe.id, { forceSetpointN: 99 });
    expect(session.productSnapshot?.productName).toBe('Fine Mist 100 mL');
    expect(session.recipeSnapshot?.forceSetpointN).toBe(34);
    expect(session.productionBatch).toBeUndefined();
    expect(session.operatorName).toBe('Nadia Putri');
    expect(session.source).toBe('fixture');
  });
});

describe('Final Analysis V2 report result contract', () => {
  const makeReport = () => {
    const primary = synchronizedFrames[28];
    const sideCalibration = adjustCalibration(
      createCalibrationSnapshot({ camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 112, y: 296 }, anchorB: { x: 634, y: 296 } }),
      { anchorB: { x: 682, y: 296 } },
      'Nadia Putri',
      '2026-09-29T14:35:00Z',
    );
    const frontCalibration = createCalibrationSnapshot({ camera: 'front', referenceDistanceMm: 500, anchorA: { x: 265, y: 85 }, anchorB: { x: 465, y: 85 } });
    const geometry = getPixelGeometry(primary.frameIndex, tests[0].fixture);
    const sideCorrected = moveSideMeasurementHandle(geometry.side, 'sprayEndpoint', { x: 390, y: 196 }, { width: 720, height: 360 });
    return createFinalAnalysisReport({
      test: tests[0],
      primaryCaptureMoment: primary,
      supportingCaptureMoments: synchronizedFrames.slice(19, 28),
      side: deriveSideMeasurementsFromGeometry(geometry.side, sideCalibration, { geometry: sideCorrected, adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' }),
      front: deriveFrontMeasurementsFromGeometry(geometry.front, frontCalibration),
      sideCalibration,
      frontCalibration,
      sideAutoGeometry: geometry.side,
      sideFinalGeometry: sideCorrected,
      frontAutoGeometry: geometry.front,
      frontFinalGeometry: geometry.front,
      finalizedBy: 'Nadia Putri',
      finalizedAt: '2026-09-29T14:45:00Z',
    });
  };

  it('freezes test, primary capture, support count, frames, calibration, and finalization identity', () => {
    const report = makeReport();
    expect(report.status).toBe('finalized');
    expect(report.analysisSource).toBe('simulation');
    expect(report.test.testId).toBe(tests[0].id);
    expect(report.test.product.productName).toBe('Fine Mist 100 mL');
    expect(report.test.recipe.name).toBe('Standard Spray Test');
    expect(report.test.setpoints.forceSetpointN).toBe(34);
    expect(report.primaryCaptureMomentId).toBe('cap-028');
    expect(report.primaryCapture).toMatchObject({ frameIndex: 28, timestampMs: 1400, phase: 'stable' });
    expect(report.side.frame.timestampMs).toBe(report.front.frame.timestampMs);
    expect(report.side.frame.frameIndex).toBe(report.front.frame.frameIndex);
    expect(report.supportingCaptures).toHaveLength(9);
    expect(report.supportingCaptureMomentIds).toHaveLength(9);
    report.supportingCaptures.forEach(capture => {
      expect(capture.side.frameIndex).toBe(capture.front.frameIndex);
      expect(capture.side.timestampMs).toBe(capture.front.timestampMs);
    });
    expect(report.side.calibration.adjusted).toBe(true);
    expect(report.front.calibration.adjusted).toBe(false);
    expect(report.finalizedBy).toBe('Nadia Putri');
    expect(report.finalizedAt).toBe('2026-09-29T14:45:00Z');
  });

  it('preserves automatic values, final accepted values, and adjustment audit', () => {
    const report = makeReport();
    expect(report.side.sprayLength.adjusted).toBe(true);
    expect(report.side.sprayLength.adjustedBy).toBe('Nadia Putri');
    expect(report.side.sprayLength.auto).not.toBe(report.side.sprayLength.final);
    expect(selectMeasurementValue(report.side.sprayLength)).toBe(report.side.sprayLength.final);
    expect(report.front.circularity.adjusted).toBe(false);
    expect(report.front.circularity.final).toBe(report.front.circularity.auto);
  });

  it('does not mutate finalized report when working analysis state or product/recipe changes later', () => {
    const report = makeReport();
    const frozenScale = report.side.calibration.scaleMmPerPx;
    const frozenProduct = report.test.product.productName;
    const frozenRecipeForce = report.test.recipe.forceSetpointN;
    const frozenFinalLength = report.side.sprayLength.final;

    // Attempt to modify through new analysis operations — report must be unaffected
    adjustCalibration(report.side.calibration, { referenceDistanceMm: 1200 }, 'Other Operator', '2026-09-29T16:00:00Z');
    const editedGeometry = moveSideMeasurementHandle(getPixelGeometry(28, tests[0].fixture).side, 'sprayEndpoint', { x: 720, y: 196 }, { width: 720, height: 360 });
    deriveSideMeasurementsFromGeometry(getPixelGeometry(28, tests[0].fixture).side, report.side.calibration, { geometry: editedGeometry, adjustedBy: 'Other Operator', adjustedAt: '2026-09-29T16:00:00Z' });
    const changedTest = { ...tests[0], productSnapshot: { productCode: 'CHANGED', productName: 'Changed Product' }, recipeSnapshot: { ...tests[0].recipeSnapshot!, forceSetpointN: 99 } };

    expect(report.side.calibration.scaleMmPerPx).toBe(frozenScale);
    expect(report.test.product.productName).toBe(frozenProduct);
    expect(report.test.recipe.forceSetpointN).toBe(frozenRecipeForce);
    expect(report.side.sprayLength.final).toBe(frozenFinalLength);
    expect(changedTest.productSnapshot.productName).toBe('Changed Product');
  });

  it('rejects supporting captures > 9', () => {
    expect(() => {
      const primary = synchronizedFrames[28];
      const geometry = getPixelGeometry(primary.frameIndex, tests[0].fixture);
      const sideCalibration = createCalibrationSnapshot({ camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 112, y: 296 }, anchorB: { x: 634, y: 296 } });
      const frontCalibration = createCalibrationSnapshot({ camera: 'front', referenceDistanceMm: 400, anchorA: { x: 200, y: 180 }, anchorB: { x: 360, y: 180 } });
      createFinalAnalysisReport({
        test: tests[0],
        primaryCaptureMoment: primary,
        supportingCaptureMoments: synchronizedFrames.slice(19, 31),
        side: deriveSideMeasurementsFromGeometry(geometry.side, sideCalibration, {}),
        front: deriveFrontMeasurementsFromGeometry(geometry.front, frontCalibration),
        sideCalibration,
        frontCalibration,
        sideAutoGeometry: geometry.side,
        sideFinalGeometry: geometry.side,
        frontAutoGeometry: geometry.front,
        frontFinalGeometry: geometry.front,
        finalizedBy: 'Nadia Putri',
        finalizedAt: '2026-09-29T14:45:00Z',
      });
    }).toThrow('Maximum 9 supporting captures allowed.');
  });

  it('uses Test Setpoints terminology not actual telemetry', () => {
    const report = makeReport();
    expect(report.test.setpoints).toBeDefined();
    expect(report.test.setpoints.forceSetpointN).toBe(34);
    expect(report.test.setpoints.pressDurationMs).toBe(850);
    expect(report.test.setpoints.strokeMm).toBe(8.5);
    // Report has no actual telemetry property
    expect(report).not.toHaveProperty('actualForceN');
    expect(report).not.toHaveProperty('telemetry');
  });

  it('contains no Rear Camera information', () => {
    const report = makeReport();
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('"rear"');
    expect(report).not.toHaveProperty('rear');
  });

  it('result is read-only: finalized report snapshot is immutable via structuredClone', () => {
    const report = makeReport();
    // Mutate source test fixture
    const originalName = tests[0].productSnapshot!.productName;
    tests[0].productSnapshot!.productName = 'MUTATED';
    expect(report.test.product.productName).toBe(originalName);
    tests[0].productSnapshot!.productName = originalName; // restore
  });

  it('exports final and automatic values without rear camera fields in CSV', () => {
    const csv = createFinalReportCsv(makeReport());
    expect(csv).toContain('side_spray-length_auto');
    expect(csv).toContain('side_spray-length_final');
    expect(csv).toContain('side_spray-length_adjusted');
    expect(csv).toContain('front_spray-area_auto');
    expect(csv).toContain('front_spray-area_final');
    expect(csv.toLowerCase()).not.toContain('rear');
    expect(csv).toContain('primary_timestamp_ms');
  });
});

describe('Task H3 — Measurement Tool Modes for Side Camera', () => {
  const geometry = getPixelGeometry(28, tests[0].fixture);
  const sideBefore = adjustCalibration(createCalibrationSnapshot({ camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 112, y: 296 }, anchorB: { x: 634, y: 296 } }), { anchorB: { x: 682, y: 296 } }, 'Nadia', 'Now');

  it('updates spread position horizontally independently of endpoint', () => {
    const positioned = moveSideMeasurementHandle(geometry.side, 'spreadPosition', { x: 400, y: 0 }, { width: 720, height: 360 });
    expect(positioned.verticalSpreadTopPx.x).toBe(400);
    expect(positioned.verticalSpreadBottomPx.x).toBe(400);
    expect(positioned.sprayEndpointPx.x).toBe(geometry.side.sprayEndpointPx.x);
  });

  it('preserves horizontal position when moving spread top/bottom handles vertically', () => {
    const positioned = moveSideMeasurementHandle(geometry.side, 'spreadPosition', { x: 400, y: 0 }, { width: 720, height: 360 });
    const top = moveSideMeasurementHandle(positioned, 'spreadTop', { x: 999, y: 120 }, { width: 720, height: 360 });
    expect(top.verticalSpreadTopPx.x).toBe(400);
    expect(top.verticalSpreadTopPx.y).toBe(120);
    
    const bottom = moveSideMeasurementHandle(top, 'spreadBottom', { x: 0, y: 300 }, { width: 720, height: 360 });
    expect(bottom.verticalSpreadBottomPx.x).toBe(400);
    expect(bottom.verticalSpreadBottomPx.y).toBe(300);
  });

  it('calculates physical Spread Position and Vertical Spread using calibration', () => {
    const positioned = moveSideMeasurementHandle(geometry.side, 'spreadPosition', { x: 400, y: 0 }, { width: 720, height: 360 });
    const top = moveSideMeasurementHandle(positioned, 'spreadTop', { x: 0, y: 100 }, { width: 720, height: 360 });
    const bottom = moveSideMeasurementHandle(top, 'spreadBottom', { x: 0, y: 200 }, { width: 720, height: 360 });
    
    const values = deriveSideMeasurementsFromGeometry(geometry.side, sideBefore, { geometry: bottom, adjustedBy: 'Nadia', adjustedAt: 'Now' });
    
    const expectedPositionMm = Math.abs(400 - geometry.side.nozzleOriginPx.x) * sideBefore.scaleMmPerPx;
    const expectedSpreadMm = Math.abs(200 - 100) * sideBefore.scaleMmPerPx;
    
    expect(values.spreadPosition?.final).toBeCloseTo(expectedPositionMm);
    expect(values.verticalSpread.final).toBeCloseTo(expectedSpreadMm);
  });

  it('recalculates spread position and spread length when calibration changes', () => {
    const positioned = moveSideMeasurementHandle(geometry.side, 'spreadPosition', { x: 400, y: 0 }, { width: 720, height: 360 });
    const top = moveSideMeasurementHandle(positioned, 'spreadTop', { x: 0, y: 100 }, { width: 720, height: 360 });
    const bottom = moveSideMeasurementHandle(top, 'spreadBottom', { x: 0, y: 200 }, { width: 720, height: 360 });
    
    const valuesBefore = deriveSideMeasurementsFromGeometry(geometry.side, sideBefore, { geometry: bottom, adjustedBy: 'Nadia', adjustedAt: 'Now' });
    
    const sideAfter = adjustCalibration(sideBefore, { referenceDistanceMm: 1200 }, 'Nadia', 'Now');
    const valuesAfter = deriveSideMeasurementsFromGeometry(geometry.side, sideAfter, { geometry: bottom, adjustedBy: 'Nadia', adjustedAt: 'Now' });
    
    expect(valuesAfter.spreadPosition?.final).not.toBeCloseTo(valuesBefore.spreadPosition?.final ?? 0);
    expect(valuesAfter.verticalSpread.final).not.toBeCloseTo(valuesBefore.verticalSpread.final);
  });
});

describe('Task L1 — Final Report Snapshot Integrity', () => {
  const primary = synchronizedFrames[28];
  const sideCalibration = createCalibrationSnapshot({ camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 112, y: 296 }, anchorB: { x: 634, y: 296 } });
  const frontCalibration = createCalibrationSnapshot({ camera: 'front', referenceDistanceMm: 500, anchorA: { x: 265, y: 85 }, anchorB: { x: 465, y: 85 } });
  const initialGeom = getPixelGeometry(28, tests[0].fixture);

  const makeValidReport = (overrides?: Partial<Parameters<typeof createFinalAnalysisReport>[0]>) => {
    return createFinalAnalysisReport({
      test: tests[0],
      primaryCaptureMoment: primary,
      supportingCaptureMoments: [synchronizedFrames[27]],
      side: deriveSideMeasurementsFromGeometry(initialGeom.side, sideCalibration),
      front: deriveFrontMeasurementsFromGeometry(initialGeom.front, frontCalibration),
      sideCalibration,
      frontCalibration,
      sideAutoGeometry: initialGeom.side,
      sideFinalGeometry: initialGeom.side,
      frontAutoGeometry: initialGeom.front,
      frontFinalGeometry: initialGeom.front,
      finalizedBy: 'Nadia Putri',
      finalizedAt: '2026-09-29T14:45:00Z',
      ...overrides,
    });
  };

  it('final report contains frozen Side and Front pixel geometry', () => {
    const report = makeValidReport();
    expect(report.side.autoGeometry).toEqual(initialGeom.side);
    expect(report.side.finalGeometry).toEqual(initialGeom.side);
    expect(report.front.autoGeometry).toEqual(initialGeom.front);
    expect(report.front.finalGeometry).toEqual(initialGeom.front);
  });

  it('fixture mutation after finalization cannot change report snapshot', () => {
    const mutableGeom = { ...initialGeom.side, sprayEndpointPx: { x: 500, y: 200 } };
    const report = makeValidReport({ sideFinalGeometry: mutableGeom });
    // Mutate source geometry object
    mutableGeom.sprayEndpointPx.x = 999;
    expect(report.side.finalGeometry.sprayEndpointPx.x).toBe(500);
  });

  it('calibration mutation after finalization cannot change report snapshot', () => {
    const mutableCal = { ...sideCalibration };
    const report = makeValidReport({ sideCalibration: mutableCal });
    mutableCal.scaleMmPerPx = 99.99;
    expect(report.side.calibration.scaleMmPerPx).toBe(sideCalibration.scaleMmPerPx);
  });

  it('corrected geometry mutation after finalization cannot change report snapshot', () => {
    const correctedGeom = moveSideMeasurementHandle(initialGeom.side, 'sprayEndpoint', { x: 490, y: 200 }, { width: 720, height: 360 });
    const report = makeValidReport({ sideFinalGeometry: correctedGeom });
    correctedGeom.sprayEndpointPx.x = 888;
    expect(report.side.finalGeometry.sprayEndpointPx.x).toBe(490);
  });

  it('>9 Tangkapan Pendukung is rejected rather than truncated', () => {
    expect(() => {
      makeValidReport({
        supportingCaptureMoments: synchronizedFrames.slice(10, 25), // 15 captures
      });
    }).toThrow('Maximum 9 supporting captures allowed.');
  });

  it('unsynced Tangkapan Utama is rejected', () => {
    const unsyncedPrimary = { ...primary, syncStatus: 'invalid' as const };
    expect(() => {
      makeValidReport({ primaryCaptureMoment: unsyncedPrimary });
    }).toThrow('Primary capture must be synchronized.');
  });

  it('Side/Front timestamp mismatch is rejected', () => {
    const mismatchedPrimary = {
      ...primary,
      side: { ...primary.side, timestampMs: 1400 },
      front: { ...primary.front, timestampMs: 1450 },
    };
    expect(() => {
      makeValidReport({ primaryCaptureMoment: mismatchedPrimary });
    }).toThrow('Side and Front frames must share the same timestamp.');
  });

  it('Side/Front frame index mismatch is rejected', () => {
    const mismatchedPrimary = {
      ...primary,
      side: { ...primary.side, frameIndex: 28 },
      front: { ...primary.front, frameIndex: 29 },
    };
    expect(() => {
      makeValidReport({ primaryCaptureMoment: mismatchedPrimary });
    }).toThrow('Side and Front frames must share the same frame index.');
  });

  it('supporting capture pairs remain synchronized', () => {
    const report = makeValidReport({
      supportingCaptureMoments: [synchronizedFrames[25], synchronizedFrames[26]],
    });
    expect(report.supportingCaptures).toHaveLength(2);
    expect(report.supportingCaptures[0].frameIndex).toBe(25);
    expect(report.supportingCaptures[0].side.timestampMs).toBe(report.supportingCaptures[0].front.timestampMs);
    expect(report.supportingCaptures[1].frameIndex).toBe(26);
    expect(report.supportingCaptures[1].side.timestampMs).toBe(report.supportingCaptures[1].front.timestampMs);
  });
});

describe('Task M — Status mapping', () => {
  it('maps test states correctly to user-facing status', () => {
    const draftTest = { ...tests[0], status: 'running' as const };
    const completeTest = { ...tests[0], status: 'complete' as const };
    const failedTest = { ...tests[0], status: 'failed' as const };

    expect(getUserFacingTestStatus(draftTest, null)).toBe('Draft');
    expect(getUserFacingTestStatus(completeTest, null)).toBe('Ready for Review');
    expect(getUserFacingTestStatus(failedTest, null)).toBe('Failed');
  });

  it('reports Final when a matching report is present', () => {
    const completeTest = { ...tests[0], id: 'TST-FINAL', status: 'complete' as const };
    const fakeReport = { testId: 'TST-FINAL' } as unknown as Parameters<typeof getUserFacingTestStatus>[1];
    expect(getUserFacingTestStatus(completeTest, fakeReport)).toBe('Finalized');
  });
});
