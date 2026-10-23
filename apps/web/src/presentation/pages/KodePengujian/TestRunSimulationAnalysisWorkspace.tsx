import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  KodePengujian,
  TestRun,
  Sample,
  SelectedCaptureMoment,
  Camera,
  SynchronizedAnalysisFrame,
  SidePixelGeometry,
  FrontPixelGeometry,
  CalibrationSnapshot,
  SideMeasurementCorrection,
  FrontMeasurementCorrection,
  SideFinalMeasurements,
  FrontFinalMeasurements,
  BatchAnalysisDraft,
} from '@spray-paragon/domain';
import {
  addSupportingAnalysisCapture,
  removeSupportingCapture,
  setPrimaryAnalysisCapture,
  createCalibrationSnapshot,
  getSideDisplayGeometry,
  getFrontDisplayGeometry,
  deriveSideMeasurementsFromGeometry,
  deriveFrontMeasurementsFromGeometry,
  resolveSideOrientation,
  DEFAULT_SIDE_ORIENTATION,
  cloneSideGeometry,
  cloneFrontGeometry,
  moveFrontMeasurementHandle,
  createFinalAnalysisReport,
  adjustCalibration,
  moveCalibrationAnchor,
} from '@spray-paragon/domain';
import { simulationService } from '../../../application/services';
import { kodePengujianRepository, syncService } from '../../../application/services';
import { Status } from '../../components/ui/Status';
import type { ViewMode, ActiveSideTool } from '../../features/analysis/types';
import { AnalysisOverlay } from '../../features/analysis/AnalysisOverlay';
import { Timeline } from '../../features/analysis/Timeline';
import { CalibrationReferenceOverlay } from '../../features/analysis/CalibrationReferenceOverlay';
import { MeasurementCorrectionOverlay } from '../../features/analysis/MeasurementCorrectionOverlay';
import { CaptureSelection } from '../../features/analysis/CaptureSelection';
import { Inspector } from '../../features/analysis/Inspector';
import { FinalAnalysisConfirmation } from '../../features/analysis/FinalAnalysisConfirmation';
import { cameraCopy } from '../../features/analysis/cameraCopy';

export interface TestRunSimulationAnalysisWorkspaceProps {
  kp: KodePengujian;
  sample: Sample;
  testRun: TestRun;
  onBack: () => void;
  onTestRunUpdated?: (updated: TestRun) => void;
}

export function TestRunSimulationAnalysisWorkspace({
  kp,
  sample,
  testRun,
  onBack,
  onTestRunUpdated,
}: TestRunSimulationAnalysisWorkspaceProps) {
  const navigate = useNavigate();

  const [camera, setCamera] = useState<Camera>('side');
  const [mode, setMode] = useState<ViewMode>('Overlay');
  const [captureIndex, setCaptureIndex] = useState(0);

  const [selectedCaptures, setSelectedCaptures] = useState<SelectedCaptureMoment[]>([]);
  const [selectionError, setSelectionError] = useState<string | undefined>();
  const [calibrations, setCalibrations] = useState<Record<Camera, CalibrationSnapshot>>({
    side: createCalibrationSnapshot({ camera: 'side', sideOrientation: DEFAULT_SIDE_ORIENTATION, referenceDistanceMm: 1000, anchorA: { x: 112, y: 296 }, anchorB: { x: 634, y: 296 } }),
    front: createCalibrationSnapshot({ camera: 'front', referenceDistanceMm: 500, anchorA: { x: 265, y: 85 }, anchorB: { x: 465, y: 85 } }),
  });
  const [workingCalibrations, setWorkingCalibrations] = useState<Record<Camera, CalibrationSnapshot>>(calibrations);

  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isEditingMeasurement, setIsEditingMeasurement] = useState(false);
  const [activeSideTool, setActiveSideTool] = useState<ActiveSideTool>('Length');

  const [sideCorrectionsByMoment, setSideCorrectionsByMoment] = useState<Record<string, SideMeasurementCorrection>>({});
  const [frontCorrectionsByMoment, setFrontCorrectionsByMoment] = useState<Record<string, FrontMeasurementCorrection>>({});

  const [workingSideGeometry, setWorkingSideGeometry] = useState<SidePixelGeometry | null>(null);
  const [workingFrontGeometry, setWorkingFrontGeometry] = useState<FrontPixelGeometry | null>(null);

  const frames = simulationService.getFrames();
  const getPixelGeometryFn = simulationService.getPixelGeometry;

  const fixture = testRun.fixture;
  const isReadOnly = testRun.status === 'FINALIZED';
  const moments = useMemo(() => testRun.captureSession?.synchronizedMoments || [], [testRun.captureSession]);

  // Initialize from analysisDraft if present
  useEffect(() => {
    const draft = testRun.analysisDraft;
    if (!draft) return;

    const sessionMoments = testRun.captureSession?.synchronizedMoments || [];
    const recommendedIdx = sessionMoments.findIndex(m => m.recommended);

    if (draft.primaryCaptureMomentId) {
      const primaryIdx = sessionMoments.findIndex(m => m.id === draft.primaryCaptureMomentId);
      if (primaryIdx >= 0) setCaptureIndex(primaryIdx);
      else if (recommendedIdx >= 0) setCaptureIndex(recommendedIdx);
    } else if (recommendedIdx >= 0) {
      setCaptureIndex(recommendedIdx);
    } else if (sessionMoments.length > 28) {
      setCaptureIndex(28);
    }

    setCalibrations({
      side: draft.calibration.side,
      front: draft.calibration.front,
    });
    setWorkingCalibrations({
      side: draft.calibration.side,
      front: draft.calibration.front,
    });

    const newSelectedCaptures: SelectedCaptureMoment[] = [];
    if (draft.primaryCaptureMomentId) {
      newSelectedCaptures.push({
        captureFrameId: draft.primaryCaptureMomentId,
        role: 'primary',
        selectedBy: 'Operator',
        selectedAt: draft.updatedAt,
      });
    }
    for (const suppId of draft.supportingCaptureMomentIds) {
      newSelectedCaptures.push({
        captureFrameId: suppId,
        role: 'supporting',
        selectedBy: 'Operator',
        selectedAt: draft.updatedAt,
      });
    }
    setSelectedCaptures(newSelectedCaptures);

    const newSideCorrections: Record<string, SideMeasurementCorrection> = {};
    for (const [id, geom] of Object.entries(draft.sideCorrections)) {
      newSideCorrections[id] = { geometry: geom, adjustedBy: 'Operator', adjustedAt: draft.updatedAt };
    }
    const newFrontCorrections: Record<string, FrontMeasurementCorrection> = {};
    for (const [id, geom] of Object.entries(draft.frontCorrections)) {
      newFrontCorrections[id] = { geometry: geom, adjustedBy: 'Operator', adjustedAt: draft.updatedAt };
    }
    setSideCorrectionsByMoment(newSideCorrections);
    setFrontCorrectionsByMoment(newFrontCorrections);
  }, [testRun.analysisDraft, testRun.captureSession]);

  const currentMoment = moments[captureIndex] || moments[0];
  const isStable = currentMoment?.phase === 'stable';

  const activeCalibrations = isCalibrating ? workingCalibrations : calibrations;
  const currentGeometry = currentMoment
    ? getPixelGeometryFn(currentMoment.frameIndex, fixture, resolveSideOrientation(activeCalibrations.side))
    : { side: {} as SidePixelGeometry, front: {} as FrontPixelGeometry };

  const savedSideGeometry = currentMoment
    ? getSideDisplayGeometry(currentGeometry.side, sideCorrectionsByMoment[currentMoment.id])
    : currentGeometry.side;
  const savedFrontGeometry = currentMoment
    ? getFrontDisplayGeometry(currentGeometry.front, frontCorrectionsByMoment[currentMoment.id])
    : currentGeometry.front;

  const displaySideGeometry = isEditingMeasurement && camera === 'side' && workingSideGeometry ? workingSideGeometry : savedSideGeometry;
  const displayFrontGeometry = isEditingMeasurement && camera === 'front' && workingFrontGeometry ? workingFrontGeometry : savedFrontGeometry;

  const sideAudit = currentMoment ? sideCorrectionsByMoment[currentMoment.id] : undefined;
  const frontAudit = currentMoment ? frontCorrectionsByMoment[currentMoment.id] : undefined;

  const sideMeasurements = currentMoment
    ? deriveSideMeasurementsFromGeometry(
        currentGeometry.side,
        activeCalibrations.side,
        displaySideGeometry === currentGeometry.side ? undefined : {
          geometry: displaySideGeometry,
          adjustedBy: sideAudit?.adjustedBy ?? (isEditingMeasurement ? 'Working edit' : undefined),
          adjustedAt: sideAudit?.adjustedAt,
        }
      )
    : undefined;

  const frontMeasurements = currentMoment
    ? deriveFrontMeasurementsFromGeometry(
        currentGeometry.front,
        activeCalibrations.front,
        displayFrontGeometry === currentGeometry.front ? undefined : {
          geometry: displayFrontGeometry,
          adjustedBy: frontAudit?.adjustedBy ?? (isEditingMeasurement ? 'Working edit' : undefined),
          adjustedAt: frontAudit?.adjustedAt,
        }
      )
    : undefined;

  // Persistence helper
  const persistDraft = useCallback(async (patch: Partial<BatchAnalysisDraft>) => {
    if (isReadOnly) return;
    try {
      const currentDraft: BatchAnalysisDraft = testRun.analysisDraft || {
        calibration: { ...calibrations },
        primaryCaptureMomentId: selectedCaptures.find(s => s.role === 'primary')?.captureFrameId || null,
        supportingCaptureMomentIds: selectedCaptures.filter(s => s.role === 'supporting').map(s => s.captureFrameId),
        sideCorrections: Object.fromEntries(Object.entries(sideCorrectionsByMoment).map(([k, v]) => [k, v.geometry])),
        frontCorrections: Object.fromEntries(Object.entries(frontCorrectionsByMoment).map(([k, v]) => [k, v.geometry])),
        updatedAt: new Date().toISOString(),
      };
      const updatedDraft = { ...currentDraft, ...patch, updatedAt: new Date().toISOString() };
      const updatedTr = await kodePengujianRepository.updateTestRun(kp.id, testRun.id, {
        analysisDraft: updatedDraft,
        status: 'ANALYZING',
      });
      if (updatedTr && onTestRunUpdated) {
        onTestRunUpdated(updatedTr);
      }
      await syncService.queueSync(kp.id);
    } catch (e) {
      console.error('Failed to save analysis draft', e);
      setSelectionError(e instanceof Error ? e.message : String(e));
    }
  }, [kp.id, testRun.id, testRun.analysisDraft, calibrations, selectedCaptures, sideCorrectionsByMoment, frontCorrectionsByMoment, onTestRunUpdated, isReadOnly]);

  const handleSetPrimary = useCallback(() => {
    if (isReadOnly || !currentMoment) return;
    const res = setPrimaryAnalysisCapture(selectedCaptures, currentMoment.id, 'Operator', new Date().toISOString());
    setSelectedCaptures(res.selected);
    setSelectionError(res.error);
    if (!res.error) {
      const primaryId = currentMoment.id;
      const autoGeometry = getPixelGeometryFn(currentMoment.frameIndex, fixture, resolveSideOrientation(calibrations.side));
      const sideDisplayGeom = getSideDisplayGeometry(autoGeometry.side, sideCorrectionsByMoment[primaryId]);
      const frontDisplayGeom = getFrontDisplayGeometry(autoGeometry.front, frontCorrectionsByMoment[primaryId]);

      const sidePatch = { ...sideCorrectionsByMoment };
      const frontPatch = { ...frontCorrectionsByMoment };
      if (!sidePatch[primaryId] || !sidePatch[primaryId].geometry) {
        sidePatch[primaryId] = { geometry: sideDisplayGeom, adjustedBy: 'Operator', adjustedAt: new Date().toISOString() };
      }
      if (!frontPatch[primaryId] || !frontPatch[primaryId].geometry) {
        frontPatch[primaryId] = { geometry: frontDisplayGeom, adjustedBy: 'Operator', adjustedAt: new Date().toISOString() };
      }

      persistDraft({
        primaryCaptureMomentId: currentMoment.id,
        supportingCaptureMomentIds: res.selected.filter(s => s.role === 'supporting').map(s => s.captureFrameId),
        sideCorrections: Object.fromEntries(Object.entries(sidePatch).map(([k, v]) => [k, v.geometry])),
        frontCorrections: Object.fromEntries(Object.entries(frontPatch).map(([k, v]) => [k, v.geometry])),
      });
    }
  }, [currentMoment, selectedCaptures, isReadOnly, persistDraft, fixture, calibrations.side, sideCorrectionsByMoment, frontCorrectionsByMoment, getPixelGeometryFn]);

  const handleAddSupporting = useCallback(() => {
    if (isReadOnly || !currentMoment) return;
    const res = addSupportingAnalysisCapture(selectedCaptures, currentMoment.id, 'Operator', new Date().toISOString());
    setSelectedCaptures(res.selected);
    setSelectionError(res.error);
    if (!res.error) {
      persistDraft({ supportingCaptureMomentIds: res.selected.filter(s => s.role === 'supporting').map(s => s.captureFrameId) });
    }
  }, [currentMoment, selectedCaptures, isReadOnly, persistDraft]);

  const handleRemoveSupporting = useCallback((id: string) => {
    if (isReadOnly) return;
    const res = removeSupportingCapture(selectedCaptures, id);
    setSelectedCaptures(res.selected);
    setSelectionError(res.error);
    if (!res.error) {
      persistDraft({ supportingCaptureMomentIds: res.selected.filter(s => s.role === 'supporting').map(s => s.captureFrameId) });
    }
  }, [selectedCaptures, isReadOnly, persistDraft]);

  const handleStartCalibration = useCallback(() => {
    if (isReadOnly) return;
    setWorkingCalibrations({
      side: createCalibrationSnapshot(calibrations.side),
      front: createCalibrationSnapshot(calibrations.front),
    });
    setIsCalibrating(true);
    setIsEditingMeasurement(false);
    setMode('Overlay');
  }, [isReadOnly, calibrations]);

  const handleCancelCalibration = useCallback(() => {
    setWorkingCalibrations({
      side: createCalibrationSnapshot(calibrations.side),
      front: createCalibrationSnapshot(calibrations.front),
    });
    setIsCalibrating(false);
    setMode('Overlay');
  }, [calibrations]);

  const handleApplyCalibration = useCallback(() => {
    if (isReadOnly) return;
    const applied = adjustCalibration(workingCalibrations[camera], {}, 'Operator', new Date().toISOString());
    const newCals = { ...calibrations, [camera]: applied };
    const orientationFlipped = camera === 'side' && resolveSideOrientation(calibrations.side) !== resolveSideOrientation(applied);
    setCalibrations(newCals);
    setWorkingCalibrations(newCals);
    if (orientationFlipped) {
      setSideCorrectionsByMoment({});
      persistDraft({ calibration: newCals, sideCorrections: {} });
    } else {
      persistDraft({ calibration: newCals });
    }
    setIsCalibrating(false);
    setMode('Overlay');
  }, [isReadOnly, camera, calibrations, workingCalibrations, persistDraft]);

  const handleWorkingCalibrationChange = useCallback((next: CalibrationSnapshot) => {
    setWorkingCalibrations(previous => ({ ...previous, [camera]: next }));
  }, [camera]);

  const handleSideOrientationChange = useCallback((sideOrientation: 'nozzleLeft' | 'nozzleRight') => {
    if (isReadOnly || camera !== 'side') return;
    const nextSideCalibration = createCalibrationSnapshot({ ...workingCalibrations.side, sideOrientation });
    setWorkingCalibrations(previous => ({ ...previous, side: nextSideCalibration }));
  }, [camera, isReadOnly, workingCalibrations.side]);

  const handleAdjustCalibration = useCallback((deltaPx: number) => {
    const current = workingCalibrations[camera];
    handleWorkingCalibrationChange(moveCalibrationAnchor(
      current,
      'anchorB',
      { x: current.anchorB.x + deltaPx, y: current.anchorB.y },
      { width: 720, height: 360 },
    ));
  }, [camera, workingCalibrations, handleWorkingCalibrationChange]);

  const handleStartMeasurementEdit = useCallback(() => {
    if (isReadOnly) return;
    setWorkingSideGeometry(cloneSideGeometry(savedSideGeometry));
    setWorkingFrontGeometry(cloneFrontGeometry(savedFrontGeometry));
    setIsEditingMeasurement(true);
    setActiveSideTool('Length');
    setIsCalibrating(false);
    setMode('Overlay');
  }, [isReadOnly, savedSideGeometry, savedFrontGeometry]);

  const handleCancelMeasurementEdit = useCallback(() => {
    setWorkingSideGeometry(null);
    setWorkingFrontGeometry(null);
    setIsEditingMeasurement(false);
    setMode('Overlay');
  }, []);

  const handleApplyMeasurementEdit = useCallback(() => {
    if (!currentMoment) return;
    const sidePatch = Object.fromEntries(Object.entries(sideCorrectionsByMoment).map(([k, v]) => [k, v.geometry]));
    const frontPatch = Object.fromEntries(Object.entries(frontCorrectionsByMoment).map(([k, v]) => [k, v.geometry]));

    if (camera === 'side' && workingSideGeometry) {
      const cloned = cloneSideGeometry(workingSideGeometry);
      setSideCorrectionsByMoment(prev => ({ ...prev, [currentMoment.id]: { geometry: cloned, adjustedBy: 'Operator', adjustedAt: new Date().toISOString() } }));
      sidePatch[currentMoment.id] = cloned;
    }
    if (camera === 'front' && workingFrontGeometry) {
      const cloned = cloneFrontGeometry(workingFrontGeometry);
      setFrontCorrectionsByMoment(prev => ({ ...prev, [currentMoment.id]: { geometry: cloned, adjustedBy: 'Operator', adjustedAt: new Date().toISOString() } }));
      frontPatch[currentMoment.id] = cloned;
    }
    setIsEditingMeasurement(false);
    setMode('Overlay');
    persistDraft({ sideCorrections: sidePatch, frontCorrections: frontPatch });
  }, [camera, workingSideGeometry, workingFrontGeometry, sideCorrectionsByMoment, frontCorrectionsByMoment, currentMoment, persistDraft]);

  const handleWorkingSideGeometryChange = useCallback((next: SidePixelGeometry) => {
    setWorkingSideGeometry(cloneSideGeometry(next));
  }, []);

  const handleWorkingFrontGeometryChange = useCallback((next: FrontPixelGeometry) => {
    setWorkingFrontGeometry(cloneFrontGeometry(next));
  }, []);

  const handleNudgeFront = useCallback((field: 'sprayArea' | 'centroidOffsetX' | 'centroidOffsetY', delta: number) => {
    const current = workingFrontGeometry ?? cloneFrontGeometry(savedFrontGeometry);
    const scale = activeCalibrations.front.scaleMmPerPx;
    if (field === 'centroidOffsetX') {
      const deltaPx = delta / scale;
      setWorkingFrontGeometry(moveFrontMeasurementHandle(current, 'centroid', { x: current.centroidPx.x + deltaPx, y: current.centroidPx.y }, { width: 720, height: 360 }));
    } else if (field === 'centroidOffsetY') {
      const deltaPx = delta / scale;
      setWorkingFrontGeometry(moveFrontMeasurementHandle(current, 'centroid', { x: current.centroidPx.x, y: current.centroidPx.y + deltaPx }, { width: 720, height: 360 }));
    } else if (field === 'sprayArea') {
      const currentRadius = current.equivalentDiameterPx / 2;
      const targetRadius = Math.max(10, currentRadius + delta / (scale * 20));
      setWorkingFrontGeometry(moveFrontMeasurementHandle(current, 'diameterRight', { x: current.referenceCenterPx.x + targetRadius, y: current.referenceCenterPx.y }, { width: 720, height: 360 }));
    }
  }, [workingFrontGeometry, savedFrontGeometry, activeCalibrations.front]);

  const primarySelection = selectedCaptures.find(s => s.role === 'primary');
  const primaryMoment = primarySelection ? moments.find(moment => moment.id === primarySelection.captureFrameId) : undefined;

  const getSideMeasurementsForMoment = useCallback((moment: SynchronizedAnalysisFrame): SideFinalMeasurements => {
    const geom = getPixelGeometryFn(moment.frameIndex, fixture, resolveSideOrientation(calibrations.side)).side;
    return deriveSideMeasurementsFromGeometry(geom, calibrations.side, sideCorrectionsByMoment[moment.id]);
  }, [fixture, calibrations.side, sideCorrectionsByMoment, getPixelGeometryFn]);

  const getFrontMeasurementsForMoment = useCallback((moment: SynchronizedAnalysisFrame): FrontFinalMeasurements => {
    const geom = getPixelGeometryFn(moment.frameIndex, fixture).front;
    return deriveFrontMeasurementsFromGeometry(geom, calibrations.front, frontCorrectionsByMoment[moment.id]);
  }, [fixture, calibrations.front, frontCorrectionsByMoment, getPixelGeometryFn]);

  const primarySideMeasurements = primaryMoment ? getSideMeasurementsForMoment(primaryMoment) : undefined;
  const primaryFrontMeasurements = primaryMoment ? getFrontMeasurementsForMoment(primaryMoment) : undefined;

  const handleConfirmFinalAnalysis = useCallback(async () => {
    if (!primaryMoment) {
      setSelectionError('Primary capture must be selected.');
      return;
    }
    const supportingCaptureMoments = selectedCaptures
      .filter(selection => selection.role === 'supporting')
      .map(selection => moments.find(moment => moment.id === selection.captureFrameId))
      .filter((moment): moment is SynchronizedAnalysisFrame => Boolean(moment));

    const primaryGeometry = getPixelGeometryFn(primaryMoment.frameIndex, fixture, resolveSideOrientation(calibrations.side));
    const primarySideFinalGeometry = getSideDisplayGeometry(primaryGeometry.side, sideCorrectionsByMoment[primaryMoment.id]);
    const primaryFrontFinalGeometry = getFrontDisplayGeometry(primaryGeometry.front, frontCorrectionsByMoment[primaryMoment.id]);

    try {
      const report = createFinalAnalysisReport({
        test: {
          id: testRun.id,
          sampleId: sample.id,
          productId: kp.productId,
          productName: kp.productSnapshot.productName,
          productSnapshot: kp.productSnapshot,
          recipeSnapshot: testRun.recipeSnapshot,
          config: testRun.setpoints,
          operatorName: testRun.operatorName,
          createdAt: testRun.startedAt || testRun.createdAt,
          productionBatch: kp.productLot,
          fixture: testRun.fixture,
          status: 'complete' as const,
        },
        primaryCaptureMoment: primaryMoment,
        supportingCaptureMoments,
        side: primarySideMeasurements!,
        front: primaryFrontMeasurements!,
        sideCalibration: calibrations.side,
        frontCalibration: calibrations.front,
        sideAutoGeometry: primaryGeometry.side,
        sideFinalGeometry: primarySideFinalGeometry,
        frontAutoGeometry: primaryGeometry.front,
        frontFinalGeometry: primaryFrontFinalGeometry,
        finalizedBy: testRun.operatorName,
        finalizedAt: new Date().toISOString(),
      });

      await kodePengujianRepository.updateTestRun(kp.id, testRun.id, {
        finalReport: report,
        status: 'FINALIZED',
        completedAt: new Date().toISOString(),
      });
      await syncService.queueSync(kp.id);
      navigate(`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/result`);
    } catch (e) {
      console.error(e);
      setSelectionError(e instanceof Error ? e.message : String(e));
    }
  }, [
    kp,
    sample,
    testRun,
    primaryMoment,
    selectedCaptures,
    moments,
    fixture,
    calibrations,
    sideCorrectionsByMoment,
    frontCorrectionsByMoment,
    primarySideMeasurements,
    primaryFrontMeasurements,
    getPixelGeometryFn,
    navigate,
  ]);

  if (moments.length === 0) {
    return (
      <div className="space-y-4 p-8">
        <h1 className="text-xl font-bold text-text-primary">Analisis Simulasi Tidak Tersedia</h1>
        <p className="text-sm text-text-secondary">Tidak ada momen sinkron yang ditemukan dalam sesi capture ini.</p>
        <button onClick={onBack} className="text-sm font-medium text-primary hover:underline">
          &larr; Kembali ke Detail Pengujian
        </button>
      </div>
    );
  }

  const selectedCount = selectedCaptures.length;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Context Bar */}
      <div className="flex items-center justify-between rounded-panel border border-border-default bg-surface px-4 py-3 shadow-sm text-sm">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 font-mono font-bold text-text-primary">
            <span>{kp.id}</span>
            <span className="text-text-muted">/</span>
            <span>{sample.sampleCode || sample.id}</span>
            <span className="text-text-muted">/</span>
            <span className="text-primary">{testRun.id}</span>
          </div>
          <div className="h-4 w-px bg-border-strong hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-mono font-bold text-[11px] uppercase tracking-wider">Metodologi</span>
            <span className="font-semibold text-text-primary text-xs">{testRun.recipeSnapshot.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-mono font-bold text-[11px] uppercase tracking-wider">Mode</span>
            <span className="font-mono font-bold text-text-primary">SIMULASI (Samping & Depan)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-mono font-bold text-[11px] uppercase tracking-wider">Frame</span>
            <span className="font-mono font-bold text-text-primary">{currentMoment.frameIndex + 1} / {moments.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-mono font-bold text-[11px] uppercase tracking-wider">Waktu</span>
            <span className="font-mono font-bold text-text-primary">{currentMoment.timestampMs} ms</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-mono font-bold text-[11px] uppercase tracking-wider">Sinkron</span>
            <span className="font-mono font-bold text-text-primary">SINKRONISASI · Δ {currentMoment.timestampDeltaMs} ms</span>
          </div>
          <Status tone={isStable ? 'success' : 'neutral'}>{isStable ? 'Fase Stabil' : currentMoment.phase}</Status>
          {currentMoment.recommended && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-semantic-warning">
              <span className="h-2 w-2 rounded-full bg-semantic-warning" /> Direkomendasikan
            </div>
          )}
          {isReadOnly && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" /> Hanya Baca
            </div>
          )}
          {/* Simulation notice */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-soft px-2 py-0.5 rounded">
            <span className="h-2 w-2 rounded-full bg-primary" /> Mode Simulasi — Data Fixture
          </div>
        </div>
        <button onClick={onBack} className="text-xs font-semibold hover:text-primary transition-colors text-text-secondary flex items-center gap-1 shrink-0">
          <span>&larr;</span> Kembali ke Kode Pengujian
        </button>
      </div>

      <div className="flex-1 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] items-start">
        {/* Technical Workbench */}
        <div className="flex flex-col bg-workbench rounded-panel overflow-hidden border border-workbench-border shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-workbench-raised px-4 py-2.5 border-b border-workbench-border">
            <div className="flex gap-2">
              {(['side', 'front'] as Camera[]).map(c => {
                const active = camera === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCamera(c)}
                    aria-label={`kamera ${c === 'side' ? 'samping' : 'depan'}`}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                      active ? 'bg-workbench border border-workbench-border text-white shadow-sm' : 'text-workbench-muted hover:text-white hover:bg-workbench'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${c === 'side' ? 'bg-camera-side' : 'bg-camera-front'}`} />
                    {cameraCopy[c].title}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4">
              {(isEditingMeasurement || isCalibrating) && (
                <div className="hidden xl:flex items-center gap-3 text-[10px] font-mono text-workbench-muted">
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#1d8fff]" /> Biru · Otomatis</span>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#ff8c00]" /> Oranye · Koreksi aktif</span>
                  <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-semantic-warning" /> Kuning · Hasil diterapkan</span>
                </div>
              )}
              <div className="flex items-center p-0.5 rounded-lg bg-[#080f18] border border-workbench-border">
                {(['Original', 'Mask', 'Overlay'] as ViewMode[]).map(m => {
                  const labelMap: Record<ViewMode, string> = {
                    Original: 'Citra Asli',
                    Mask: 'Mask',
                    Overlay: 'Overlay',
                  };
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all ${
                        mode === m ? 'bg-workbench-raised text-white shadow-sm border border-workbench-border' : 'text-workbench-muted hover:text-white'
                      }`}
                    >
                      {labelMap[m]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="analysis-viewport bg-[#080f18] relative aspect-[2/1] w-full flex items-center justify-center border-b border-workbench-border">
            <div className="absolute top-3 left-3 z-10 text-[11px] font-mono font-bold text-workbench-text tracking-wide bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded border border-workbench-border/60 flex items-center gap-2 shadow-sm">
              <span className="text-white uppercase">{camera === 'side' ? 'SAMPING' : 'DEPAN'}</span>
              <span className="text-workbench-muted">•</span>
              <span>#{String(currentMoment.frameIndex + 1).padStart(3, '0')}</span>
              <span className="text-workbench-muted">•</span>
              <span>{currentMoment.timestampMs} ms</span>
              <span className="text-workbench-muted">•</span>
              <span className="text-primary">{mode === 'Original' ? 'Citra Asli' : mode}</span>
            </div>
            {sideMeasurements && frontMeasurements && (
              <AnalysisOverlay
                camera={camera}
                mode={mode}
                frame={frames[currentMoment.frameIndex] || frames[0]}
                calibration={activeCalibrations[camera]}
                sideGeometry={displaySideGeometry}
                frontGeometry={displayFrontGeometry}
                sideMeasurements={sideMeasurements}
                frontMeasurements={frontMeasurements}
              />
            )}
            {isCalibrating && <CalibrationReferenceOverlay calibration={workingCalibrations[camera]} onChange={handleWorkingCalibrationChange} />}
            {isEditingMeasurement && (
              <MeasurementCorrectionOverlay
                camera={camera}
                activeSideTool={activeSideTool}
                autoSideGeometry={currentGeometry.side}
                workingSideGeometry={workingSideGeometry ?? savedSideGeometry}
                autoFrontGeometry={currentGeometry.front}
                workingFrontGeometry={workingFrontGeometry ?? savedFrontGeometry}
                sideOrientation={activeCalibrations.side.sideOrientation}
                sideCalibration={activeCalibrations.side}
                onSideChange={handleWorkingSideGeometryChange}
                onFrontChange={handleWorkingFrontGeometryChange}
              />
            )}
          </div>

          <div className="px-4 py-3 bg-workbench-raised">
            <Timeline
              moments={moments}
              selectedIndex={captureIndex}
              onSelect={idx => {
                if (isCalibrating) handleCancelCalibration();
                if (isEditingMeasurement) handleCancelMeasurementEdit();
                setCaptureIndex(idx);
              }}
            />
          </div>
        </div>

        <aside className="inspector-panel">
          {sideMeasurements && frontMeasurements && (
            <Inspector
              camera={camera}
              sideMeasurements={sideMeasurements}
              frontMeasurements={frontMeasurements}
              calibration={activeCalibrations[camera]}
              moment={currentMoment}
              isCalibrating={isCalibrating}
              isEditingMeasurement={isEditingMeasurement}
              activeSideTool={activeSideTool}
              onStartCalibration={handleStartCalibration}
              onCancelCalibration={handleCancelCalibration}
              onApplyCalibration={handleApplyCalibration}
              onAdjustCalibration={handleAdjustCalibration}
              onSideOrientationChange={handleSideOrientationChange}
              onStartMeasurementEdit={handleStartMeasurementEdit}
              onCancelMeasurementEdit={handleCancelMeasurementEdit}
              onApplyMeasurementEdit={handleApplyMeasurementEdit}
              onSetActiveSideTool={setActiveSideTool}
              onCorrectFront={handleNudgeFront}
              totalMomentsCount={moments.length}
              readOnly={isReadOnly}
            />
          )}
          <CaptureSelection
            currentMoment={currentMoment}
            selectedCaptures={selectedCaptures}
            selectionError={selectionError}
            onSetPrimary={handleSetPrimary}
            onAddSupporting={handleAddSupporting}
            onRemoveSupporting={handleRemoveSupporting}
            moments={moments}
            readOnly={isReadOnly}
          />
          <FinalAnalysisConfirmation
            status={testRun.status === 'FINALIZED' ? 'finalized' : 'review_required'}
            selectedCount={selectedCount}
            primaryMoment={primaryMoment}
            sideMeasurements={primarySideMeasurements}
            frontMeasurements={primaryFrontMeasurements}
            calibrations={calibrations}
            finalReport={testRun.finalReport || null}
            onConfirm={handleConfirmFinalAnalysis}
            onViewResult={() => navigate(`/kode-pengujian/${kp.id}/samples/${sample.id}/runs/${testRun.id}/result`)}
          />
        </aside>
      </div>
    </div>
  );
}
