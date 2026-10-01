import React, { useState } from 'react';
import type { Page } from '../../navigation';
import type { Camera as CameraType, Test } from '../../../domain/types';
import type { 
  FinalAnalysisReport, 
  CalibrationSnapshot, 
  SelectedCaptureMoment, 
  SideMeasurementCorrection, 
  FrontMeasurementCorrection, 
  SidePixelGeometry, 
  FrontPixelGeometry, 
  SideFinalMeasurements, 
  FrontFinalMeasurements,
} from '../../../domain/analysis';
import type { SynchronizedAnalysisFrame } from '../../../domain/types';
import {
  createCalibrationSnapshot,
  getSideDisplayGeometry,
  getFrontDisplayGeometry,
  deriveSideMeasurementsFromGeometry,
  deriveFrontMeasurementsFromGeometry,
  setPrimaryCapture,
  addSupportingCapture,
  removeSupportingCapture,
  adjustCalibration,
  moveCalibrationAnchor,
  cloneSideGeometry,
  cloneFrontGeometry,
  moveFrontMeasurementHandle,
  getPrimary,
  createFinalAnalysisReport
} from '../../../domain/analysis';
import { analyses, synchronizedFrames, frames, getPixelGeometry } from '../../../data/mockSpraybotRepository';
import { cameraCopy } from '../../features/analysis/cameraCopy';
import { Status } from '../../components/ui/Status';
import type { ViewMode, ActiveSideTool } from '../../features/analysis/types';
import { AnalysisOverlay } from '../../features/analysis/AnalysisOverlay';
import { Timeline } from '../../features/analysis/Timeline';
import { CalibrationReferenceOverlay } from '../../features/analysis/CalibrationReferenceOverlay';
import { MeasurementCorrectionOverlay } from '../../features/analysis/MeasurementCorrectionOverlay';
import { CaptureSelection } from '../../features/analysis/CaptureSelection';
import { Inspector } from '../../features/analysis/Inspector';
import { FinalAnalysisConfirmation } from '../../features/analysis/FinalAnalysisConfirmation';
import { phaseLabel } from '../../features/analysis/utils';

const initialCalibration: Record<CameraType, CalibrationSnapshot> = {
  side: createCalibrationSnapshot({ camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 112, y: 296 }, anchorB: { x: 634, y: 296 } }),
  front: createCalibrationSnapshot({ camera: 'front', referenceDistanceMm: 500, anchorA: { x: 265, y: 85 }, anchorB: { x: 465, y: 85 } }),
};

export function AnalysisPage({ test, setPage, finalReport, setFinalReport }: { test: Test; setPage: (p: Page) => void; finalReport: FinalAnalysisReport | null; setFinalReport: (r: FinalAnalysisReport | null) => void }) {
  const [camera, setCamera] = useState<CameraType>('side');
  const [mode, setMode] = useState<ViewMode>('Overlay');
  const [captureIndex, setCaptureIndex] = useState(28);
  const [selectedCaptures, setSelectedCaptures] = useState<SelectedCaptureMoment[]>([]);
  const [selectionError, setSelectionError] = useState<string | undefined>();
  const [calibrations, setCalibrations] = useState<Record<CameraType, CalibrationSnapshot>>(initialCalibration);
  const [workingCalibrations, setWorkingCalibrations] = useState<Record<CameraType, CalibrationSnapshot>>(initialCalibration);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isEditingMeasurement, setIsEditingMeasurement] = useState(false);
  const [activeSideTool, setActiveSideTool] = useState<ActiveSideTool>('Length');
  const [sideCorrectionsByMoment, setSideCorrectionsByMoment] = useState<Record<string, SideMeasurementCorrection>>({});
  const [frontCorrectionsByMoment, setFrontCorrectionsByMoment] = useState<Record<string, FrontMeasurementCorrection>>({});
  const [workingSideGeometry, setWorkingSideGeometry] = useState<SidePixelGeometry | null>(null);
  const [workingFrontGeometry, setWorkingFrontGeometry] = useState<FrontPixelGeometry | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'captured' | 'review_required' | 'finalized'>(finalReport ? 'finalized' : 'captured');

  const a = analyses[test.fixture];
  const currentMoment = synchronizedFrames[captureIndex] || synchronizedFrames[0];
  const currentFrame = currentMoment[camera];
  const isStable = currentMoment.phase === 'stable';
  const currentGeometry = getPixelGeometry(currentMoment.frameIndex, test.fixture);
  const activeCalibrations = isCalibrating ? workingCalibrations : calibrations;
  const savedSideGeometry = getSideDisplayGeometry(currentGeometry.side, sideCorrectionsByMoment[currentMoment.id]);
  const savedFrontGeometry = getFrontDisplayGeometry(currentGeometry.front, frontCorrectionsByMoment[currentMoment.id]);
  const displaySideGeometry = isEditingMeasurement && camera === 'side' && workingSideGeometry ? workingSideGeometry : savedSideGeometry;
  const displayFrontGeometry = isEditingMeasurement && camera === 'front' && workingFrontGeometry ? workingFrontGeometry : savedFrontGeometry;
  
  const sideAudit = sideCorrectionsByMoment[currentMoment.id];
  const frontAudit = frontCorrectionsByMoment[currentMoment.id];
  
  const sideMeasurements = deriveSideMeasurementsFromGeometry(currentGeometry.side, activeCalibrations.side, displaySideGeometry === currentGeometry.side ? undefined : { geometry: displaySideGeometry, adjustedBy: sideAudit?.adjustedBy ?? (isEditingMeasurement ? 'Working edit' : undefined), adjustedAt: sideAudit?.adjustedAt });
  const frontMeasurements = deriveFrontMeasurementsFromGeometry(currentGeometry.front, activeCalibrations.front, displayFrontGeometry === currentGeometry.front ? undefined : { geometry: displayFrontGeometry, adjustedBy: frontAudit?.adjustedBy ?? (isEditingMeasurement ? 'Working edit' : undefined), adjustedAt: frontAudit?.adjustedAt });

  const handleSetPrimary = () => {
    const res = setPrimaryCapture(selectedCaptures, currentMoment, 'Nadia Putri', '2026-09-29T14:30:00Z');
    setSelectedCaptures(res.selected);
    setSelectionError(res.error);
  };

  const handleAddSupporting = () => {
    const res = addSupportingCapture(selectedCaptures, currentMoment, 'Nadia Putri', '2026-09-29T14:30:00Z');
    setSelectedCaptures(res.selected);
    setSelectionError(res.error);
  };

  const handleRemoveSupporting = (id: string) => {
    const res = removeSupportingCapture(selectedCaptures, id);
    setSelectedCaptures(res.selected);
    setSelectionError(res.error);
  };

  const handleStartCalibration = () => {
    setWorkingCalibrations({
      side: createCalibrationSnapshot(calibrations.side),
      front: createCalibrationSnapshot(calibrations.front),
    });
    setIsCalibrating(true);
    setIsEditingMeasurement(false);
    setMode('Overlay');
  };

  const handleCancelCalibration = () => {
    setWorkingCalibrations({
      side: createCalibrationSnapshot(calibrations.side),
      front: createCalibrationSnapshot(calibrations.front),
    });
    setIsCalibrating(false);
    setMode('Overlay');
  };

  const handleApplyCalibration = () => {
    const applied = adjustCalibration(workingCalibrations[camera], {}, 'Nadia Putri', '2026-09-29T14:35:00Z');
    setCalibrations(previous => ({ ...previous, [camera]: applied }));
    setWorkingCalibrations(previous => ({ ...previous, [camera]: applied }));
    setIsCalibrating(false);
    setMode('Overlay');
  };

  const handleWorkingCalibrationChange = (next: CalibrationSnapshot) => {
    setWorkingCalibrations(previous => ({ ...previous, [camera]: next }));
  };

  const handleAdjustCalibration = (deltaPx: number) => {
    const current = workingCalibrations[camera];
    handleWorkingCalibrationChange(moveCalibrationAnchor(
      current,
      'anchorB',
      { x: current.anchorB.x + deltaPx, y: current.anchorB.y },
      { width: 720, height: 360 },
    ));
  };

  const handleStartMeasurementEdit = () => {
    setWorkingSideGeometry(cloneSideGeometry(savedSideGeometry));
    setWorkingFrontGeometry(cloneFrontGeometry(savedFrontGeometry));
    setIsEditingMeasurement(true);
    setActiveSideTool('Length');
    setIsCalibrating(false);
    setMode('Overlay');
  };

  const handleCancelMeasurementEdit = () => {
    setWorkingSideGeometry(null);
    setWorkingFrontGeometry(null);
    setIsEditingMeasurement(false);
    setMode('Overlay');
  };

  const handleApplyMeasurementEdit = () => {
    if (camera === 'side' && workingSideGeometry) {
      setSideCorrectionsByMoment(previous => ({
        ...previous,
        [currentMoment.id]: { geometry: cloneSideGeometry(workingSideGeometry), adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' },
      }));
    }
    if (camera === 'front' && workingFrontGeometry) {
      setFrontCorrectionsByMoment(previous => ({
        ...previous,
        [currentMoment.id]: { geometry: cloneFrontGeometry(workingFrontGeometry), adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' },
      }));
    }
    setIsEditingMeasurement(false);
    setMode('Overlay');
  };

  const handleWorkingSideGeometryChange = (next: SidePixelGeometry) => {
    setWorkingSideGeometry(cloneSideGeometry(next));
  };

  const handleWorkingFrontGeometryChange = (next: FrontPixelGeometry) => {
    setWorkingFrontGeometry(cloneFrontGeometry(next));
  };

  const handleNudgeFront = (field: 'sprayArea' | 'centroidOffsetX' | 'centroidOffsetY', delta: number) => {
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
  };

  const primarySelection = getPrimary(selectedCaptures);
  const primaryMoment = primarySelection ? synchronizedFrames.find(moment => moment.id === primarySelection.captureFrameId) : undefined;
  
  const getSideMeasurementsForMoment = (moment: SynchronizedAnalysisFrame): SideFinalMeasurements => {
    const geom = getPixelGeometry(moment.frameIndex, test.fixture).side;
    return deriveSideMeasurementsFromGeometry(geom, calibrations.side, sideCorrectionsByMoment[moment.id]);
  };
  const getFrontMeasurementsForMoment = (moment: SynchronizedAnalysisFrame): FrontFinalMeasurements => {
    const geom = getPixelGeometry(moment.frameIndex, test.fixture).front;
    return deriveFrontMeasurementsFromGeometry(geom, calibrations.front, frontCorrectionsByMoment[moment.id]);
  };
  
  const primarySideMeasurements = primaryMoment ? getSideMeasurementsForMoment(primaryMoment) : undefined;
  const primaryFrontMeasurements = primaryMoment ? getFrontMeasurementsForMoment(primaryMoment) : undefined;

  const handleConfirmFinalAnalysis = () => {
    if (!primaryMoment) {
      setAnalysisStatus('review_required');
      return;
    }
    const supportingCaptureMoments = selectedCaptures
      .filter(selection => selection.role === 'supporting')
      .map(selection => synchronizedFrames.find(moment => moment.id === selection.captureFrameId))
      .filter((moment): moment is SynchronizedAnalysisFrame => Boolean(moment));
    const primaryGeometry = getPixelGeometry(primaryMoment.frameIndex, test.fixture);
    const primarySideFinalGeometry = getSideDisplayGeometry(primaryGeometry.side, sideCorrectionsByMoment[primaryMoment.id]);
    const primaryFrontFinalGeometry = getFrontDisplayGeometry(primaryGeometry.front, frontCorrectionsByMoment[primaryMoment.id]);
    setFinalReport(createFinalAnalysisReport({
      test,
      primaryCaptureMoment: primaryMoment,
      supportingCaptureMoments,
      side: getSideMeasurementsForMoment(primaryMoment),
      front: getFrontMeasurementsForMoment(primaryMoment),
      sideCalibration: calibrations.side,
      frontCalibration: calibrations.front,
      sideAutoGeometry: primaryGeometry.side,
      sideFinalGeometry: primarySideFinalGeometry,
      frontAutoGeometry: primaryGeometry.front,
      frontFinalGeometry: primaryFrontFinalGeometry,
      finalizedBy: 'Nadia Putri',
      finalizedAt: '2026-09-29T14:45:00Z',
    }));
    setAnalysisStatus('finalized');
  };

  return (
    <div className="analysis-workspace">
      <div className="analysis-status-row">
        <Status tone={isStable ? 'success' : 'neutral'}>{isStable ? 'Stable phase' : phaseLabel(currentMoment.phase)}</Status>
        {currentMoment.recommended && <Status tone="warning">Recommended capture</Status>}
        <span>Fixture: <strong className="font-mono">{test.fixture}</strong></span>
        <span>Capture: <strong className="font-mono">{currentMoment.frameIndex + 1} of {synchronizedFrames.length}</strong></span>
        <span>Time: <strong className="font-mono">{currentMoment.timestampMs} ms</strong></span>
        <span>Sync: <strong className="font-mono">{currentMoment.syncStatus} · Δ {currentMoment.timestampDeltaMs} ms</strong></span>
      </div>

      <div className="analysis-shell">
        <div className="surface-panel analysis-panel">
          <div className="analysis-toolbar">
            {(['side', 'front'] as CameraType[]).map(c => {
              const active = camera === c;
              return (
                <button key={c} onClick={() => setCamera(c)} aria-label={`${c} camera`} className={`analysis-tab ${active ? 'analysis-tab-active' : ''}`}>
                  <span className="analysis-tab-dot" style={{ background: cameraCopy[c].accent }} />
                  <span>{cameraCopy[c].title}</span>
                </button>
              );
            })}
            <div className="mode-switch">
              {(['Original', 'Mask', 'Overlay'] as ViewMode[]).map(m => (
                <button key={m} onClick={() => setMode(m)} className={mode === m ? 'mode-active' : ''}>{m}</button>
              ))}
            </div>
          </div>

          <div className="analysis-viewport">
            <div className="analysis-frame">
              <div className="analysis-frame-label">
                <span>CAM {camera.toUpperCase()}</span>
                <span>FRAME #{String(currentFrame.frameIndex).padStart(3, '0')}</span>
                <span>{currentFrame.timestampMs} ms</span>
                <span>{mode.toUpperCase()}</span>
              </div>
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
              {isCalibrating && <CalibrationReferenceOverlay calibration={workingCalibrations[camera]} onChange={handleWorkingCalibrationChange} />}
              {isEditingMeasurement && (
                <MeasurementCorrectionOverlay
                  camera={camera}
                  activeSideTool={activeSideTool}
                  autoSideGeometry={currentGeometry.side}
                  workingSideGeometry={workingSideGeometry ?? savedSideGeometry}
                  autoFrontGeometry={currentGeometry.front}
                  workingFrontGeometry={workingFrontGeometry ?? savedFrontGeometry}
                  onSideChange={handleWorkingSideGeometryChange}
                  onFrontChange={handleWorkingFrontGeometryChange}
                />
              )}
            </div>
            <Timeline moments={synchronizedFrames} analysis={a} selectedIndex={captureIndex} onSelect={setCaptureIndex} />
          </div>
        </div>

        <div className="inspector-panel surface-panel">
          <div className="surface-panel-title flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: cameraCopy[camera].accent }} />
            <span>{cameraCopy[camera].title}</span>
          </div>
          <div className="p-4">
            <p className="mb-3 text-xs font-semibold text-text-secondary">{cameraCopy[camera].purpose}</p>
            <CaptureSelection
              currentMoment={currentMoment}
              selectedCaptures={selectedCaptures}
              selectionError={selectionError}
              onSetPrimary={handleSetPrimary}
              onAddSupporting={handleAddSupporting}
              onRemoveSupporting={handleRemoveSupporting}
            />
            <Inspector
              camera={camera}
              a={a}
              moment={currentMoment}
              calibration={activeCalibrations[camera]}
              isCalibrating={isCalibrating}
              onStartCalibration={handleStartCalibration}
              onCancelCalibration={handleCancelCalibration}
              onApplyCalibration={handleApplyCalibration}
              onAdjustCalibration={handleAdjustCalibration}
              isEditingMeasurement={isEditingMeasurement}
              activeSideTool={activeSideTool}
              onSetActiveSideTool={setActiveSideTool}
              onStartMeasurementEdit={handleStartMeasurementEdit}
              onCancelMeasurementEdit={handleCancelMeasurementEdit}
              onApplyMeasurementEdit={handleApplyMeasurementEdit}
              sideMeasurements={sideMeasurements}
              frontMeasurements={frontMeasurements}
              onCorrectFront={handleNudgeFront}
            />
            <FinalAnalysisConfirmation
              status={analysisStatus}
              selectedCount={selectedCaptures.length}
              primaryMoment={primaryMoment}
              sideMeasurements={primarySideMeasurements}
              frontMeasurements={primaryFrontMeasurements}
              calibrations={calibrations}
              finalReport={finalReport}
              onConfirm={handleConfirmFinalAnalysis}
              onViewResult={() => setPage('Result')}
            />
            <div className="mt-3 border-t border-border-subtle pt-3 text-xs leading-[18px] text-text-muted">
              Fixture data only. No machine or camera hardware is connected.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
