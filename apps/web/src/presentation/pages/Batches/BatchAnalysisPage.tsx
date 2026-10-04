import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Batch, Camera as CameraType, CalibrationSnapshot, SelectedCaptureMoment, SideMeasurementCorrection, FrontMeasurementCorrection, SidePixelGeometry, FrontPixelGeometry, SideFinalMeasurements, FrontFinalMeasurements, SynchronizedAnalysisFrame, BatchAnalysisDraft } from '@spray-paragon/domain';
import { createCalibrationSnapshot, getSideDisplayGeometry, getFrontDisplayGeometry, deriveSideMeasurementsFromGeometry, deriveFrontMeasurementsFromGeometry, setPrimaryCapture, addSupportingCapture, removeSupportingCapture, adjustCalibration, moveCalibrationAnchor, cloneSideGeometry, cloneFrontGeometry, moveFrontMeasurementHandle, getPrimary, createBatchFinalAnalysisReport } from '@spray-paragon/domain';
import { batchRepository, simulationService } from '../../../application/services';
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
import { formatStatus } from '../../utils/formatters';

// getPixelGeometry and frames pulled via simulationService port
const frames = simulationService.getFrames();
const getPixelGeometry = simulationService.getPixelGeometry;

const initialCalibration: Record<CameraType, CalibrationSnapshot> = {
  side: createCalibrationSnapshot({ camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 112, y: 296 }, anchorB: { x: 634, y: 296 } }),
  front: createCalibrationSnapshot({ camera: 'front', referenceDistanceMm: 500, anchorA: { x: 265, y: 85 }, anchorB: { x: 465, y: 85 } }),
};

export function BatchAnalysisPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);

  const [camera, setCamera] = useState<CameraType>('side');
  const [mode, setMode] = useState<ViewMode>('Overlay');
  const [captureIndex, setCaptureIndex] = useState(0);
  
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

  const loadBatch = useCallback(async () => {
    if (!batchId) return;
    try {
      const b = await batchRepository.getBatch(batchId);
      if (!b) {
        setBatch(null);
        setLoading(false);
        return;
      }
      setBatch(b);

      let draft = b.analysisDraft;
      if (b.status === 'FINALIZED' && b.finalReport) {
        // Construct a synthetic draft from finalReport for display
        draft = {
          calibration: {
            side: b.finalReport.side.calibration,
            front: b.finalReport.front.calibration,
          },
          primaryCaptureMomentId: b.finalReport.primaryCaptureMomentId,
          supportingCaptureMomentIds: b.finalReport.supportingCaptureMomentIds,
          sideCorrections: {},
          frontCorrections: {},
          updatedAt: b.finalReport.finalizedAt,
        };
        // Side/Front geometries are saved directly, but we'll map them back below.
      }

      const moments = b.captureSession?.synchronizedMoments || [];
      const recommendedIdx = moments.findIndex(m => m.recommended);
      if (draft?.primaryCaptureMomentId) {
        const primaryIdx = moments.findIndex(m => m.id === draft.primaryCaptureMomentId);
        if (primaryIdx >= 0) setCaptureIndex(primaryIdx);
        else if (recommendedIdx >= 0) setCaptureIndex(recommendedIdx);
      } else if (recommendedIdx >= 0) {
        setCaptureIndex(recommendedIdx);
      } else if (moments.length > 28) {
        setCaptureIndex(28);
      }

      if (draft) {
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

        if (b.status === 'FINALIZED' && b.finalReport) {
          newSideCorrections[b.finalReport.primaryCaptureMomentId] = { geometry: b.finalReport.side.finalGeometry, adjustedBy: 'Operator', adjustedAt: b.finalReport.finalizedAt };
          newFrontCorrections[b.finalReport.primaryCaptureMomentId] = { geometry: b.finalReport.front.finalGeometry, adjustedBy: 'Operator', adjustedAt: b.finalReport.finalizedAt };
        }

        setSideCorrectionsByMoment(newSideCorrections);
        setFrontCorrectionsByMoment(newFrontCorrections);
      }
    } catch (e) {
      console.error(e);
      setBatch(null);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    let active = true;
    if (active) loadBatch();
    return () => { active = false; };
  }, [loadBatch]);

  if (loading) {
    return <div className="p-4 text-sm text-text-secondary">Memuat analisis...</div>;
  }

  if (!batch) {
    return (
      <div className="space-y-4 p-8">
        <h1 className="text-xl font-bold text-text-primary">Batch Tidak Ditemukan</h1>
        <button onClick={() => navigate('/batches')} className="text-sm font-medium text-primary hover:underline">
          &larr; Kembali ke Daftar Batch
        </button>
      </div>
    );
  }

  if (batch.status !== 'REVIEW_REQUIRED' && batch.status !== 'FINALIZED') {
    return (
      <div className="space-y-4 p-8">
        <h1 className="text-xl font-bold text-text-primary">Analisis Tidak Tersedia</h1>
        <p className="text-sm text-text-secondary">
          Analisis dinonaktifkan untuk batch dalam status siklus <strong>{formatStatus(batch.status)}</strong>. 
          Analisis yang dapat diedit hanya diizinkan saat statusnya adalah {formatStatus('REVIEW_REQUIRED')}.
        </p>
        <button onClick={() => navigate(`/batches/${batch.id}`)} className="text-sm font-medium text-primary hover:underline">
          &larr; Kembali ke Detail Batch
        </button>
      </div>
    );
  }

  const isReadOnly = batch.status === 'FINALIZED';
  const moments = batch.captureSession?.synchronizedMoments || [];
  
  if (moments.length === 0) {
    return <div className="p-4">Tidak ada momen sinkron yang ditemukan dalam batch ini.</div>;
  }

  const currentMoment = moments[captureIndex] || moments[0];
  const currentFrame = currentMoment[camera];
  const isStable = currentMoment.phase === 'stable';
  
  const currentGeometry = getPixelGeometry(currentMoment.frameIndex, batch.setupSnapshot?.fixture || 'nominal-01');
  const activeCalibrations = isCalibrating ? workingCalibrations : calibrations;
  
  const savedSideGeometry = getSideDisplayGeometry(currentGeometry.side, sideCorrectionsByMoment[currentMoment.id]);
  const savedFrontGeometry = getFrontDisplayGeometry(currentGeometry.front, frontCorrectionsByMoment[currentMoment.id]);
  
  const displaySideGeometry = isEditingMeasurement && camera === 'side' && workingSideGeometry ? workingSideGeometry : savedSideGeometry;
  const displayFrontGeometry = isEditingMeasurement && camera === 'front' && workingFrontGeometry ? workingFrontGeometry : savedFrontGeometry;
  
  const sideAudit = sideCorrectionsByMoment[currentMoment.id];
  const frontAudit = frontCorrectionsByMoment[currentMoment.id];
  
  const sideMeasurements = deriveSideMeasurementsFromGeometry(currentGeometry.side, activeCalibrations.side, displaySideGeometry === currentGeometry.side ? undefined : { geometry: displaySideGeometry, adjustedBy: sideAudit?.adjustedBy ?? (isEditingMeasurement ? 'Working edit' : undefined), adjustedAt: sideAudit?.adjustedAt });
  const frontMeasurements = deriveFrontMeasurementsFromGeometry(currentGeometry.front, activeCalibrations.front, displayFrontGeometry === currentGeometry.front ? undefined : { geometry: displayFrontGeometry, adjustedBy: frontAudit?.adjustedBy ?? (isEditingMeasurement ? 'Working edit' : undefined), adjustedAt: frontAudit?.adjustedAt });

  // -------------------------------------------------------------------------------------
  // Persistence Helpers
  // -------------------------------------------------------------------------------------
  const persistDraft = async (patch: Partial<BatchAnalysisDraft>) => {
    if (isReadOnly) return;
    try {
      const currentDraft: BatchAnalysisDraft = batch.analysisDraft || {
        calibration: { ...calibrations },
        primaryCaptureMomentId: getPrimary(selectedCaptures)?.captureFrameId || null,
        supportingCaptureMomentIds: selectedCaptures.filter(s => s.role === 'supporting').map(s => s.captureFrameId),
        sideCorrections: Object.fromEntries(Object.entries(sideCorrectionsByMoment).map(([k, v]) => [k, v.geometry])),
        frontCorrections: Object.fromEntries(Object.entries(frontCorrectionsByMoment).map(([k, v]) => [k, v.geometry])),
        updatedAt: new Date().toISOString()
      };
      const updatedDraft = { ...currentDraft, ...patch, updatedAt: new Date().toISOString() };
      const updatedBatch = await batchRepository.updateAnalysisDraft(batch.id, updatedDraft);
      setBatch(updatedBatch);
    } catch (e) {
      console.error('Failed to save analysis draft', e);
      setSelectionError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSetPrimary = () => {
    if (isReadOnly) return;
    const res = setPrimaryCapture(selectedCaptures, currentMoment, 'Operator', new Date().toISOString());
    setSelectedCaptures(res.selected);
    setSelectionError(res.error);
    if (!res.error) persistDraft({ primaryCaptureMomentId: currentMoment.id, supportingCaptureMomentIds: res.selected.filter(s => s.role === 'supporting').map(s => s.captureFrameId) });
  };

  const handleAddSupporting = () => {
    if (isReadOnly) return;
    const res = addSupportingCapture(selectedCaptures, currentMoment, 'Operator', new Date().toISOString());
    setSelectedCaptures(res.selected);
    setSelectionError(res.error);
    if (!res.error) persistDraft({ supportingCaptureMomentIds: res.selected.filter(s => s.role === 'supporting').map(s => s.captureFrameId) });
  };

  const handleRemoveSupporting = (id: string) => {
    if (isReadOnly) return;
    const res = removeSupportingCapture(selectedCaptures, id);
    setSelectedCaptures(res.selected);
    setSelectionError(res.error);
    if (!res.error) persistDraft({ supportingCaptureMomentIds: res.selected.filter(s => s.role === 'supporting').map(s => s.captureFrameId) });
  };

  const handleStartCalibration = () => {
    if (isReadOnly) return;
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
    const applied = adjustCalibration(workingCalibrations[camera], {}, 'Operator', new Date().toISOString());
    const newCals = { ...calibrations, [camera]: applied };
    setCalibrations(newCals);
    setWorkingCalibrations(newCals);
    setIsCalibrating(false);
    setMode('Overlay');
    persistDraft({ calibration: newCals });
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
    if (isReadOnly) return;
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
    let sidePatch = Object.fromEntries(Object.entries(sideCorrectionsByMoment).map(([k, v]) => [k, v.geometry]));
    let frontPatch = Object.fromEntries(Object.entries(frontCorrectionsByMoment).map(([k, v]) => [k, v.geometry]));

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
  const primaryMoment = primarySelection ? moments.find(moment => moment.id === primarySelection.captureFrameId) : undefined;
  
  const getSideMeasurementsForMoment = (moment: SynchronizedAnalysisFrame): SideFinalMeasurements => {
    const geom = getPixelGeometry(moment.frameIndex, batch.setupSnapshot?.fixture || 'nominal-01').side;
    return deriveSideMeasurementsFromGeometry(geom, calibrations.side, sideCorrectionsByMoment[moment.id]);
  };
  const getFrontMeasurementsForMoment = (moment: SynchronizedAnalysisFrame): FrontFinalMeasurements => {
    const geom = getPixelGeometry(moment.frameIndex, batch.setupSnapshot?.fixture || 'nominal-01').front;
    return deriveFrontMeasurementsFromGeometry(geom, calibrations.front, frontCorrectionsByMoment[moment.id]);
  };
  
  const primarySideMeasurements = primaryMoment ? getSideMeasurementsForMoment(primaryMoment) : undefined;
  const primaryFrontMeasurements = primaryMoment ? getFrontMeasurementsForMoment(primaryMoment) : undefined;

  const handleConfirmFinalAnalysis = async () => {
    if (!primaryMoment) {
      setSelectionError('Primary capture must be selected.');
      return;
    }
    const supportingCaptureMoments = selectedCaptures
      .filter(selection => selection.role === 'supporting')
      .map(selection => moments.find(moment => moment.id === selection.captureFrameId))
      .filter((moment): moment is SynchronizedAnalysisFrame => Boolean(moment));
      
    const primaryGeometry = getPixelGeometry(primaryMoment.frameIndex, batch.setupSnapshot?.fixture || 'nominal-01');
    const primarySideFinalGeometry = getSideDisplayGeometry(primaryGeometry.side, sideCorrectionsByMoment[primaryMoment.id]);
    const primaryFrontFinalGeometry = getFrontDisplayGeometry(primaryGeometry.front, frontCorrectionsByMoment[primaryMoment.id]);
    
    try {
      const report = createBatchFinalAnalysisReport({
        batch,
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
        finalizedBy: 'Operator',
        finalizedAt: new Date().toISOString(),
      });
      await batchRepository.finalizeBatch(batch.id, report);
      navigate(`/batches/${batch.id}`);
    } catch (e) {
      console.error(e);
      setSelectionError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Context Bar */}
      <div className="flex items-center justify-between rounded-panel border border-border-default bg-surface px-4 py-3 shadow-sm text-sm">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2 font-mono font-bold text-text-primary">
            Batch: {batch.id}
          </div>
          <div className="h-4 w-px bg-border-strong hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-mono font-bold text-[11px] uppercase tracking-wider">Tangkapan</span>
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
          <div className="flex items-center gap-2">
            <Status tone={isStable ? 'success' : 'neutral'}>{isStable ? 'Fase Stabil' : phaseLabel(currentMoment.phase)}</Status>
          </div>
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
        </div>
        <button onClick={() => navigate(`/batches/${batch.id}`)} className="text-xs font-semibold hover:text-primary transition-colors text-text-secondary flex items-center gap-1 shrink-0">
          <span>&larr;</span> Kembali ke Detail
        </button>
      </div>

      <div className="flex-1 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px] items-start">
        {/* Technical Workbench */}
        <div className="flex flex-col bg-workbench rounded-panel overflow-hidden border border-workbench-border shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-workbench-raised px-4 py-2.5 border-b border-workbench-border">
            <div className="flex gap-2">
              {(['side', 'front'] as CameraType[]).map(c => {
                const active = camera === c;
                return (
                  <button 
                    key={c} 
                    onClick={() => setCamera(c)} 
                    aria-label={`kamera ${c === 'side' ? 'samping' : 'depan'}`} 
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${active ? 'bg-workbench border border-workbench-border text-white shadow-sm' : 'text-workbench-muted hover:text-white hover:bg-workbench'}`}
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
                      className={`rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all ${mode === m ? 'bg-workbench-raised text-white shadow-sm border border-workbench-border' : 'text-workbench-muted hover:text-white'}`}
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
              <span>#{String(currentFrame.frameIndex + 1).padStart(3, '0')}</span>
              <span className="text-workbench-muted">•</span>
              <span>{currentFrame.timestampMs} ms</span>
              <span className="text-workbench-muted">•</span>
              <span className="text-primary">{mode === 'Original' ? 'Citra Asli' : mode}</span>
            </div>
            <AnalysisOverlay
              camera={camera}
              mode={mode}
              frame={frames[currentMoment.frameIndex] || frames[0]} // Using legacy global 'frames' mapped by index
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
            onStartMeasurementEdit={handleStartMeasurementEdit}
            onCancelMeasurementEdit={handleCancelMeasurementEdit}
            onApplyMeasurementEdit={handleApplyMeasurementEdit}
            onSetActiveSideTool={setActiveSideTool}
            onCorrectFront={handleNudgeFront}
            totalMomentsCount={moments.length}
            readOnly={isReadOnly}
          />
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
            status={batch.status === 'FINALIZED' ? 'finalized' : 'review_required'}
            selectedCount={selectedCaptures.length}
            primaryMoment={primaryMoment}
            sideMeasurements={primarySideMeasurements}
            frontMeasurements={primaryFrontMeasurements}
            calibrations={calibrations}
            finalReport={batch.finalReport || null}
            onConfirm={handleConfirmFinalAnalysis}
            onViewResult={() => navigate(`/batches/${batch.id}`)}
          />
        </aside>
      </div>
    </div>
  );
}