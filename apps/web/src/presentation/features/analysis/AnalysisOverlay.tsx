import type { Camera as CameraType, Frame } from '@spray-paragon/domain';
import type { CalibrationSnapshot, SidePixelGeometry, FrontPixelGeometry, SideFinalMeasurements, FrontFinalMeasurements } from '@spray-paragon/domain';
import { calibratedGridSpacingPx, selectMeasurementValue } from '@spray-paragon/domain';
import { fmt } from '../../utils/formatters';
import type { ViewMode } from './types';

const frontMistPoints: readonly [number, number, number, number][] = [
  [300,115,14,.34],[340,103,10,.46],[380,108,17,.31],[416,127,11,.42],[270,148,16,.32],[321,146,9,.52],[365,142,20,.26],[409,155,14,.38],[452,171,9,.48],[249,190,12,.4],[292,185,19,.29],[342,183,10,.55],[390,190,17,.31],[435,205,13,.38],[266,231,14,.34],[315,221,11,.47],[360,229,20,.25],[404,238,9,.51],[443,249,14,.33],[303,272,11,.4],[351,278,15,.31],[393,269,9,.46]
];
const frontMaskVoids: readonly [number, number, number, number][] = [
  [297,138,9,.75],[371,119,6,.8],[430,162,11,.7],[276,204,7,.78],[348,190,10,.68],[417,230,8,.75],[330,267,11,.7],[388,279,6,.8]
];

export function AnalysisOverlay({
  camera,
  mode,
  frame,
  calibration,
  sideGeometry,
  frontGeometry,
  sideMeasurements,
  frontMeasurements,
}: {
  camera: CameraType;
  mode: ViewMode;
  frame: Frame;
  calibration: CalibrationSnapshot;
  sideGeometry: SidePixelGeometry;
  frontGeometry: FrontPixelGeometry;
  sideMeasurements: SideFinalMeasurements;
  frontMeasurements: FrontFinalMeasurements;
}) {
  const seedShift = (frame.frameIndex % 7) - 3;
  const density = frame.phase === 'pre-spray' ? 0.12 : frame.phase === 'build-up' ? 0.55 : frame.phase === 'decay' ? 0.4 : 0.9;
  const mist = frontMistPoints;
  const sidePath = `M112 204 C158 ${190 - seedShift}, 198 154, 252 147 C314 120, 371 136, 421 122 C487 112, 536 137, 594 151 C622 158, 642 175, 653 194 C632 213, 605 223, 574 226 C518 244, 473 235, 419 246 C350 259, 300 235, 245 237 C188 229, 146 218, 112 204 Z`;
  const frontPath = `M357 78 C401 72, 435 95, 460 122 C493 133, 503 168, 492 198 C513 231, 482 262, 451 276 C428 310, 383 315, 350 299 C312 316, 272 296, 253 267 C214 253, 205 215, 223 185 C207 148, 233 116, 269 106 C291 78, 326 70, 357 78 Z`;

  const spacingMm = camera === 'side' ? 100 : 50;
  const gridSpacingPx = calibratedGridSpacingPx(spacingMm, calibration);
  const numVertical = Math.min(24, Math.floor(720 / gridSpacingPx));
  const numHorizontal = Math.min(16, Math.floor(360 / gridSpacingPx));
  const physicalGrid = mode !== 'Mask' && <g className="calibrated-grid" opacity="0.5" data-grid-spacing-px={gridSpacingPx.toFixed(3)} aria-label={`Grid fisik jarak ${spacingMm} milimeter`} role="group">
    {Array.from({ length: numVertical + 1 }, (_, i) => {
      const x = i * gridSpacingPx;
      return <g key={`v${i}`}>
        <line x1={x} y1="0" x2={x} y2="360" stroke="#6d8295" strokeWidth="0.8" />
        <text x={x + 3} y="11" fill="#a9bbca" fontSize="8" fontFamily="IBM Plex Mono">{(i * (spacingMm / 10)).toFixed(0)}cm</text>
      </g>;
    })}
    {Array.from({ length: numHorizontal + 1 }, (_, i) => {
      const y = i * gridSpacingPx;
      return <line key={`h${i}`} y1={y} x1="0" y2={y} x2="720" stroke="#6d8295" strokeWidth="0.8" />;
    })}
  </g>;

  return <svg viewBox="0 0 720 360" className="h-full w-full" role="img" aria-label={`Frame tangkapan ${mode.toLowerCase()} kamera ${camera === 'side' ? 'samping' : 'depan'}`}>
    <defs>
      <filter id="mist-blur"><feGaussianBlur stdDeviation="5" /></filter>
      <filter id="fine-blur"><feGaussianBlur stdDeviation="1.7" /></filter>
      <linearGradient id="camera-falloff" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#111b25"/><stop offset="0.55" stopColor="#0c151f"/><stop offset="1" stopColor="#060c12"/></linearGradient>
      <clipPath id="side-clip"><path d={sidePath}/></clipPath>
      <clipPath id="front-clip"><path d={frontPath}/></clipPath>
    </defs>
    <rect width="720" height="360" fill={mode === 'Mask' ? '#060a0e' : 'url(#camera-falloff)'} />

    {camera === 'side' && <>
      <image href={mode === 'Mask' ? '/fixtures/side-mask.png' : '/fixtures/side-original.png'} x="0" y="0" width="720" height="360" preserveAspectRatio="xMidYMid slice" opacity={mode === 'Mask' ? 1 : density} />
      {mode !== 'Mask' && <g>
        <path d="M38 178 h68 l18 18 v18 l-18 18 H38z" fill="#27323c" stroke="#5e6d79" />
        <rect x="94" y="191" width="27" height="26" rx="2" fill="#87939d" />
        <circle cx="113" cy="204" r="4" fill="#c5d0d8" />
      </g>}
      {physicalGrid}
      {mode === 'Overlay' && <g>
        <path d={sidePath} fill="#1d8fff" fillOpacity="0.07" stroke="#1d8fff" strokeWidth="2" />
        <circle cx={sideGeometry.nozzleOriginPx.x} cy={sideGeometry.nozzleOriginPx.y} r="5" fill="#1d8fff" stroke="#dce8f1" strokeWidth="2" />
        <line x1={sideGeometry.nozzleOriginPx.x} y1={sideGeometry.nozzleOriginPx.y} x2="650" y2="198" stroke="#8fa3b8" strokeWidth="1.5" strokeDasharray="6 5" />
        <line x1={sideGeometry.nozzleOriginPx.x} y1={sideGeometry.nozzleOriginPx.y} x2={sideGeometry.upperBoundaryPx.x} y2={sideGeometry.upperBoundaryPx.y} stroke="#1d8fff" strokeWidth="1.4" />
        <line x1={sideGeometry.nozzleOriginPx.x} y1={sideGeometry.nozzleOriginPx.y} x2={sideGeometry.lowerBoundaryPx.x} y2={sideGeometry.lowerBoundaryPx.y} stroke="#1d8fff" strokeWidth="1.4" />
        <path d="M202 193 A90 90 0 0 1 201 216" fill="none" stroke="#ffb020" strokeWidth="2" />
        <text x="212" y="211" fill="#ffb020" fontSize="12" fontFamily="IBM Plex Mono">{fmt.deg(selectMeasurementValue(sideMeasurements.sprayAngle))}</text>
        <line data-testid="side-display-length-line" x1={sideGeometry.nozzleOriginPx.x} y1="312" x2={sideGeometry.sprayEndpointPx.x} y2="312" stroke="#ffb020" strokeWidth="2" /><line x1={sideGeometry.nozzleOriginPx.x} y1="304" x2={sideGeometry.nozzleOriginPx.x} y2="320" stroke="#ffb020" strokeWidth="2" /><line x1={sideGeometry.sprayEndpointPx.x} y1="304" x2={sideGeometry.sprayEndpointPx.x} y2="320" stroke="#ffb020" strokeWidth="2" />
        <text data-testid="side-overlay-spray-length" x="330" y="304" fill="#ffb020" fontSize="12" fontFamily="IBM Plex Mono">{fmt.cm(selectMeasurementValue(sideMeasurements.sprayLength))}</text>
        <line x1={sideGeometry.verticalSpreadTopPx.x} y1={sideGeometry.verticalSpreadTopPx.y} x2={sideGeometry.verticalSpreadBottomPx.x} y2={sideGeometry.verticalSpreadBottomPx.y} stroke="#ffb020" strokeWidth="2" />
        <text x={Math.min(680, sideGeometry.verticalSpreadTopPx.x + 8)} y={(sideGeometry.verticalSpreadTopPx.y + sideGeometry.verticalSpreadBottomPx.y) / 2} fill="#ffb020" fontSize="11" fontFamily="IBM Plex Mono">{fmt.mm(selectMeasurementValue(sideMeasurements.verticalSpread))}</text>
      </g>}
    </>}

    {camera === 'front' && <>
      {mode !== 'Mask' && <g><circle cx="360" cy="180" r="152" fill="#8fa3b8" opacity={0.07 + density * 0.07} filter="url(#mist-blur)"/><g clipPath="url(#front-clip)" opacity={density}>{mist.map((p, i) => <circle key={i} cx={p[0] + seedShift * (i % 2)} cy={p[1] - seedShift * (i % 3) * 0.4} r={p[2] * 1.15} fill="#c1cbd4" opacity={p[3]} filter={p[2] > 7 ? 'url(#mist-blur)' : 'url(#fine-blur)'} />)}</g></g>}
      {mode === 'Mask' && <g><path d={frontPath} fill="#e7edf2"/><g clipPath="url(#front-clip)">{frontMaskVoids.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={p[2]} fill="#060a0e" opacity={p[3]} />)}</g></g>}
      {physicalGrid}
      {mode === 'Overlay' && <g>
        <path d={frontPath} fill="#1d8fff" fillOpacity="0.08" stroke="#1d8fff" strokeWidth="2" />
        <circle cx={frontGeometry.referenceCenterPx.x} cy={frontGeometry.referenceCenterPx.y} r="112" fill="none" stroke="#ffb020" strokeWidth="1.8" strokeDasharray="7 5" />
        <line x1="190" y1="190" x2="530" y2="190" stroke="#8fa3b8" strokeWidth="1.4" strokeDasharray="5 5" /><line x1="360" y1="42" x2="360" y2="330" stroke="#8fa3b8" strokeWidth="1.4" strokeDasharray="5 5" />
        <circle cx={frontGeometry.referenceCenterPx.x} cy={frontGeometry.referenceCenterPx.y} r="5" fill="none" stroke="#8fa3b8" strokeWidth="2" />
        <circle cx={frontGeometry.centroidPx.x} cy={frontGeometry.centroidPx.y} r="5" fill="#ffb020" />
        <line x1={frontGeometry.referenceCenterPx.x} y1={frontGeometry.referenceCenterPx.y} x2={frontGeometry.centroidPx.x} y2={frontGeometry.centroidPx.y} stroke="#ffb020" strokeWidth="2" />
        <text x="379" y="179" fill="#ffb020" fontSize="11" fontFamily="IBM Plex Mono">Δ {fmt.mm(selectMeasurementValue(frontMeasurements.centroidOffsetX))}, {fmt.mm(selectMeasurementValue(frontMeasurements.centroidOffsetY))}</text>
        <line data-testid="front-display-diameter-line" x1={frontGeometry.referenceCenterPx.x - frontGeometry.equivalentDiameterPx / 2} y1="318" x2={frontGeometry.referenceCenterPx.x + frontGeometry.equivalentDiameterPx / 2} y2="318" stroke="#ffb020" strokeWidth="2"/><line x1={frontGeometry.referenceCenterPx.x - frontGeometry.equivalentDiameterPx / 2} y1="310" x2={frontGeometry.referenceCenterPx.x - frontGeometry.equivalentDiameterPx / 2} y2="326" stroke="#ffb020" strokeWidth="2"/><line x1={frontGeometry.referenceCenterPx.x + frontGeometry.equivalentDiameterPx / 2} y1="310" x2={frontGeometry.referenceCenterPx.x + frontGeometry.equivalentDiameterPx / 2} y2="326" stroke="#ffb020" strokeWidth="2"/>
        <text x="319" y="309" fill="#ffb020" fontSize="11" fontFamily="IBM Plex Mono">Ø {fmt.mm(selectMeasurementValue(frontMeasurements.equivalentDiameter))}</text>
      </g>}
    </>}

  </svg>;
}
