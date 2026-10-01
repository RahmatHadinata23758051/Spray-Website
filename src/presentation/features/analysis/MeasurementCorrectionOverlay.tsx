import React, { useRef, useState } from 'react';
import type { Camera as CameraType } from '../../../domain/types';
import type { SidePixelGeometry, FrontPixelGeometry, Point } from '../../../domain/analysis';
import { moveSideMeasurementHandle, moveFrontMeasurementHandle } from '../../../domain/analysis';
import type { ActiveSideTool } from './types';

type MeasurementHandle = 'sprayEndpoint' | 'spreadTop' | 'spreadBottom' | 'spreadPosition' | 'upperAngle' | 'lowerAngle' | 'centroid' | 'diameterLeft' | 'diameterRight';

export function MeasurementCorrectionOverlay({ 
  camera, 
  activeSideTool, 
  autoSideGeometry, 
  workingSideGeometry, 
  autoFrontGeometry, 
  workingFrontGeometry, 
  onSideChange, 
  onFrontChange 
}: {
  camera: CameraType;
  activeSideTool: ActiveSideTool;
  autoSideGeometry: SidePixelGeometry;
  workingSideGeometry: SidePixelGeometry;
  autoFrontGeometry: FrontPixelGeometry;
  workingFrontGeometry: FrontPixelGeometry;
  onSideChange: (geometry: SidePixelGeometry) => void;
  onFrontChange: (geometry: FrontPixelGeometry) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointerRef = useRef<{ pointerId: number; handle: MeasurementHandle } | null>(null);
  const [activeHandle, setActiveHandle] = useState<MeasurementHandle | null>(null);

  const toViewBoxPoint = (clientX: number, clientY: number): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) / rect.width * 720, y: (clientY - rect.top) / rect.height * 360 };
  };

  const updateHandle = (handle: MeasurementHandle, point: Point) => {
    if (camera === 'side') {
      onSideChange(moveSideMeasurementHandle(workingSideGeometry, handle as 'sprayEndpoint' | 'spreadTop' | 'spreadBottom' | 'spreadPosition' | 'upperAngle' | 'lowerAngle', point, { width: 720, height: 360 }));
    } else {
      onFrontChange(moveFrontMeasurementHandle(workingFrontGeometry, handle as 'centroid' | 'diameterLeft' | 'diameterRight', point, { width: 720, height: 360 }));
    }
  };

  const pointerDown = (event: React.PointerEvent<SVGCircleElement>, handle: MeasurementHandle) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = { pointerId: event.pointerId, handle };
    setActiveHandle(handle);
  };

  const pointerMove = (event: React.PointerEvent<SVGCircleElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    updateHandle(pointer.handle, toViewBoxPoint(event.clientX, event.clientY));
  };

  const pointerEnd = (event: React.PointerEvent<SVGCircleElement>) => {
    if (pointerRef.current?.pointerId !== event.pointerId) return;
    pointerRef.current = null;
    setActiveHandle(null);
  };

  const keyDown = (event: React.KeyboardEvent<SVGCircleElement>, handle: MeasurementHandle, point: Point) => {
    const amount = event.shiftKey ? 10 : 1;
    const delta = event.key === 'ArrowLeft' ? { x: -amount, y: 0 } : event.key === 'ArrowRight' ? { x: amount, y: 0 } : event.key === 'ArrowUp' ? { x: 0, y: -amount } : event.key === 'ArrowDown' ? { x: 0, y: amount } : null;
    if (!delta) return;
    event.preventDefault();
    updateHandle(handle, { x: point.x + delta.x, y: point.y + delta.y });
  };

  const handle = (name: MeasurementHandle, label: string, point: Point) => (
    <circle
      cx={point.x} 
      cy={point.y} 
      r="8" 
      className={`measurement-handle ${activeHandle === name ? 'is-active' : ''}`}
      role="slider" 
      aria-label={label} 
      aria-valuetext={`${point.x.toFixed(0)}, ${point.y.toFixed(0)} pixels`} 
      tabIndex={0}
      onPointerDown={event => pointerDown(event, name)} 
      onPointerMove={pointerMove} 
      onPointerUp={pointerEnd} 
      onPointerCancel={pointerEnd}
      onKeyDown={event => keyDown(event, name, point)}
    />
  );

  const diameterRadius = workingFrontGeometry.equivalentDiameterPx / 2;

  return (
    <svg ref={svgRef} className={`measurement-edit-overlay ${activeHandle ? 'is-dragging' : ''}`} viewBox="0 0 720 360" role="group" aria-label={`${camera} measurement correction handles`}>
      {camera === 'side' ? (
        <>
          <circle cx={workingSideGeometry.nozzleOriginPx.x} cy={workingSideGeometry.nozzleOriginPx.y} r="5" fill="#1d8fff" stroke="#dce8f1" strokeWidth="2" />
          {activeSideTool === 'Length' && (
            <>
              <g className="measurement-auto-geometry" aria-label="System automatic length geometry">
                <line x1={autoSideGeometry.nozzleOriginPx.x} y1={autoSideGeometry.nozzleOriginPx.y} x2={autoSideGeometry.sprayEndpointPx.x} y2={autoSideGeometry.sprayEndpointPx.y} stroke="#1d8fff" strokeDasharray="5 4" strokeWidth="1.5" />
                <circle cx={autoSideGeometry.sprayEndpointPx.x} cy={autoSideGeometry.sprayEndpointPx.y} r="6" fill="none" stroke="#1d8fff" strokeWidth="2" strokeDasharray="3 2" />
              </g>
              <g className="measurement-final-geometry" aria-label="Operator final length geometry">
                <line x1={workingSideGeometry.nozzleOriginPx.x} y1={workingSideGeometry.nozzleOriginPx.y} x2={workingSideGeometry.sprayEndpointPx.x} y2={workingSideGeometry.sprayEndpointPx.y} stroke="#ff8c00" strokeWidth="2" />
              </g>
              {handle('sprayEndpoint', 'Spray endpoint', workingSideGeometry.sprayEndpointPx)}
            </>
          )}
          {activeSideTool === 'Spread' && (() => {
            const midY = (workingSideGeometry.verticalSpreadTopPx.y + workingSideGeometry.verticalSpreadBottomPx.y) / 2;
            return (
              <>
                <g className="measurement-auto-geometry" aria-label="System automatic spread geometry">
                  <line x1={autoSideGeometry.verticalSpreadTopPx.x} y1={autoSideGeometry.verticalSpreadTopPx.y} x2={autoSideGeometry.verticalSpreadBottomPx.y} y2={autoSideGeometry.verticalSpreadBottomPx.y} stroke="#1d8fff" strokeDasharray="5 4" strokeWidth="1.5" />
                </g>
                <g className="measurement-final-geometry" aria-label="Operator final spread geometry">
                  <line x1={workingSideGeometry.verticalSpreadTopPx.x} y1={workingSideGeometry.verticalSpreadTopPx.y} x2={workingSideGeometry.verticalSpreadBottomPx.y} y2={workingSideGeometry.verticalSpreadBottomPx.y} stroke="#ff8c00" strokeWidth="2.5" />
                </g>
                {handle('spreadPosition', 'Spread measurement position', { x: workingSideGeometry.verticalSpreadTopPx.x, y: midY })}
                {handle('spreadTop', 'Upper spread boundary', workingSideGeometry.verticalSpreadTopPx)}
                {handle('spreadBottom', 'Lower spread boundary', workingSideGeometry.verticalSpreadBottomPx)}
              </>
            );
          })()}
          {activeSideTool === 'Angle' && (
            <>
              <g className="measurement-auto-geometry" aria-label="System automatic angle geometry">
                <line x1={autoSideGeometry.nozzleOriginPx.x} y1={autoSideGeometry.nozzleOriginPx.y} x2={autoSideGeometry.upperBoundaryPx.x} y2={autoSideGeometry.upperBoundaryPx.y} stroke="#1d8fff" strokeDasharray="5 4" strokeWidth="1.5" />
                <line x1={autoSideGeometry.nozzleOriginPx.x} y1={autoSideGeometry.nozzleOriginPx.y} x2={autoSideGeometry.lowerBoundaryPx.x} y2={autoSideGeometry.lowerBoundaryPx.y} stroke="#1d8fff" strokeDasharray="5 4" strokeWidth="1.5" />
              </g>
              <g className="measurement-final-geometry" aria-label="Operator final angle geometry">
                <line x1={workingSideGeometry.nozzleOriginPx.x} y1={workingSideGeometry.nozzleOriginPx.y} x2={workingSideGeometry.upperBoundaryPx.x} y2={workingSideGeometry.upperBoundaryPx.y} stroke="#ff8c00" strokeWidth="2" />
                <line x1={workingSideGeometry.nozzleOriginPx.x} y1={workingSideGeometry.nozzleOriginPx.y} x2={workingSideGeometry.lowerBoundaryPx.x} y2={workingSideGeometry.lowerBoundaryPx.y} stroke="#ff8c00" strokeWidth="2" />
              </g>
              {handle('upperAngle', 'Upper angle boundary', workingSideGeometry.upperBoundaryPx)}
              {handle('lowerAngle', 'Lower angle boundary', workingSideGeometry.lowerBoundaryPx)}
            </>
          )}
          <text x="132" y="188">BLUE AUTO · ORANGE WORKING FINAL</text>
        </>
      ) : (
        <>
          <g className="measurement-auto-geometry" aria-label="System automatic geometry">
            <circle cx={autoFrontGeometry.referenceCenterPx.x} cy={autoFrontGeometry.referenceCenterPx.y} r={autoFrontGeometry.equivalentDiameterPx / 2} />
            <line x1={autoFrontGeometry.referenceCenterPx.x} y1={autoFrontGeometry.referenceCenterPx.y} x2={autoFrontGeometry.centroidPx.x} y2={autoFrontGeometry.centroidPx.y} />
          </g>
          <g className="measurement-final-geometry" aria-label="Operator final geometry">
            <circle cx={workingFrontGeometry.referenceCenterPx.x} cy={workingFrontGeometry.referenceCenterPx.y} r={diameterRadius} />
            <line x1={workingFrontGeometry.referenceCenterPx.x} y1={workingFrontGeometry.referenceCenterPx.y} x2={workingFrontGeometry.centroidPx.x} y2={workingFrontGeometry.centroidPx.y} />
            <line x1={workingFrontGeometry.referenceCenterPx.x - diameterRadius} y1={workingFrontGeometry.referenceCenterPx.y} x2={workingFrontGeometry.referenceCenterPx.x + diameterRadius} y2={workingFrontGeometry.referenceCenterPx.y} />
          </g>
          {handle('centroid', 'Spray centroid handle', workingFrontGeometry.centroidPx)}
          {handle('diameterLeft', 'Equivalent diameter handle left', { x: workingFrontGeometry.referenceCenterPx.x - diameterRadius, y: workingFrontGeometry.referenceCenterPx.y })}
          {handle('diameterRight', 'Equivalent diameter handle right', { x: workingFrontGeometry.referenceCenterPx.x + diameterRadius, y: workingFrontGeometry.referenceCenterPx.y })}
          <text x="360" y="48" textAnchor="middle">BLUE AUTO · ORANGE WORKING FINAL</text>
        </>
      )}
    </svg>
  );
}
