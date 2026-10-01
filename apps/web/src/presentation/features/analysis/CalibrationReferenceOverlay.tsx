import React, { useRef, useState } from 'react';
import type { CalibrationSnapshot, Point } from '@spray-paragon/domain';
import { translateCalibrationWithinBounds, moveCalibrationAnchor } from '@spray-paragon/domain';

type CalibrationDragTarget = 'anchorA' | 'anchorB' | 'body';

type CalibrationDrag = {
  target: CalibrationDragTarget;
  pointerId: number;
  startPoint: Point;
  startCalibration: CalibrationSnapshot;
};

export function CalibrationReferenceOverlay({ calibration, onChange }: { calibration: CalibrationSnapshot; onChange: (next: CalibrationSnapshot) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<CalibrationDrag | null>(null);
  const [activeTarget, setActiveTarget] = useState<CalibrationDragTarget | null>(null);
  const { anchorA, anchorB, referenceDistanceMm, scaleMmPerPx } = calibration;
  const midX = (anchorA.x + anchorB.x) / 2;
  const midY = (anchorA.y + anchorB.y) / 2;
  const angleDeg = Math.atan2(anchorB.y - anchorA.y, anchorB.x - anchorA.x) * 180 / Math.PI;
  const referenceLengthPx = Math.hypot(anchorB.x - anchorA.x, anchorB.y - anchorA.y);
  const intervalCount = Math.max(1, Math.round(referenceDistanceMm / 100));

  const toSvgPoint = (clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * 720 / rect.width,
      y: (clientY - rect.top) * 360 / rect.height,
    };
  };

  const startDrag = (event: React.PointerEvent<SVGElement>, target: CalibrationDragTarget) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      target,
      pointerId: event.pointerId,
      startPoint: toSvgPoint(event.clientX, event.clientY),
      startCalibration: calibration,
    };
    setActiveTarget(target);
  };

  const moveDrag = (event: React.PointerEvent<SVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = toSvgPoint(event.clientX, event.clientY);
    const delta = { x: point.x - drag.startPoint.x, y: point.y - drag.startPoint.y };
    if (drag.target === 'body') {
      onChange(translateCalibrationWithinBounds(drag.startCalibration, delta, { width: 720, height: 360 }));
      return;
    }
    const startAnchor = drag.startCalibration[drag.target];
    onChange(moveCalibrationAnchor(drag.startCalibration, drag.target, {
      x: startAnchor.x + delta.x,
      y: startAnchor.y + delta.y,
    }, { width: 720, height: 360 }));
  };

  const endDrag = (event: React.PointerEvent<SVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setActiveTarget(null);
  };

  const nudgeAnchor = (event: React.KeyboardEvent<SVGCircleElement>, anchor: 'anchorA' | 'anchorB') => {
    const step = event.shiftKey ? 10 : 1;
    const delta = event.key === 'ArrowLeft' ? { x: -step, y: 0 }
      : event.key === 'ArrowRight' ? { x: step, y: 0 }
        : event.key === 'ArrowUp' ? { x: 0, y: -step }
          : event.key === 'ArrowDown' ? { x: 0, y: step }
            : null;
    if (!delta) return;
    event.preventDefault();
    const current = calibration[anchor];
    onChange(moveCalibrationAnchor(calibration, anchor, { x: current.x + delta.x, y: current.y + delta.y }, { width: 720, height: 360 }));
  };

  return (
    <svg ref={svgRef} className={`calibration-overlay ${activeTarget ? 'is-dragging' : ''}`} viewBox="0 0 720 360" role="group" aria-label={`Calibration reference ${referenceDistanceMm} millimeters`}>
      <g className="calibration-ruler" transform={`translate(${anchorA.x} ${anchorA.y}) rotate(${angleDeg})`}>
        <line x1="0" y1="0" x2={referenceLengthPx} y2="0" className="calibration-line" />
        {Array.from({ length: intervalCount + 1 }, (_, i) => {
          const x = referenceLengthPx * i / intervalCount;
          return (
            <g key={i} className="calibration-tick">
              <line x1={x} y1="-10" x2={x} y2="10" />
              <text x={x} y="-16" textAnchor="middle" transform={`rotate(${-angleDeg} ${x} -16)`}>{i * 10} cm</text>
            </g>
          );
        })}
        <line
          x1="16"
          y1="0"
          x2={Math.max(16, referenceLengthPx - 16)}
          y2="0"
          className={`calibration-body-hit ${activeTarget === 'body' ? 'is-active' : ''}`}
          role="slider"
          aria-label="Calibration grid reference body"
          tabIndex={0}
          onPointerDown={event => startDrag(event, 'body')}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      </g>
      <circle
        cx={anchorA.x}
        cy={anchorA.y}
        r="9"
        className={`calibration-anchor ${activeTarget === 'anchorA' ? 'is-active' : ''}`}
        role="slider"
        aria-label="Calibration anchor A"
        aria-valuetext={`${anchorA.x.toFixed(0)}, ${anchorA.y.toFixed(0)} pixels`}
        tabIndex={0}
        onKeyDown={event => nudgeAnchor(event, 'anchorA')}
        onPointerDown={event => startDrag(event, 'anchorA')}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <circle
        cx={anchorB.x}
        cy={anchorB.y}
        r="9"
        className={`calibration-anchor ${activeTarget === 'anchorB' ? 'is-active' : ''}`}
        role="slider"
        aria-label="Calibration anchor B"
        aria-valuetext={`${anchorB.x.toFixed(0)}, ${anchorB.y.toFixed(0)} pixels`}
        tabIndex={0}
        onKeyDown={event => nudgeAnchor(event, 'anchorB')}
        onPointerDown={event => startDrag(event, 'anchorB')}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
      <text x={anchorA.x} y={anchorA.y + 28} textAnchor="middle">A</text>
      <text x={anchorB.x} y={anchorB.y + 28} textAnchor="middle">B</text>
      <g className="calibration-live-readout" transform={`translate(${Math.min(620, Math.max(100, midX))}, ${Math.max(42, midY - 38)})`}>
        <rect x="-96" y="-26" width="192" height="44" rx="5" />
        <text x="-84" y="-8">Reference</text><text x="84" y="-8" textAnchor="end">{referenceDistanceMm} mm</text>
        <text x="-84" y="10">Scale</text><text x="84" y="10" textAnchor="end">{scaleMmPerPx.toFixed(3)} mm/px</text>
      </g>
    </svg>
  );
}
