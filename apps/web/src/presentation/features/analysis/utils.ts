import type { Point, SideFinalMeasurements, FrontFinalMeasurements } from '@spray-paragon/domain';
import type { CapturePhaseV2 } from '@spray-paragon/domain';

export function phaseLabel(phase: CapturePhaseV2): string {
  if (phase === 'pre_spray') return 'Pra-spray';
  if (phase === 'build_up') return 'Pembentukan';
  if (phase === 'stable') return 'Fase Stabil';
  if (phase === 'decay') return 'Peluruhan';
  return phase;
}

export function metricSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function formatPointPx(point: Point): string {
  return `${point.x.toFixed(0)}, ${point.y.toFixed(0)} px`;
}

export function hasAdjustedMeasurement(measurements: SideFinalMeasurements | FrontFinalMeasurements): boolean {
  return Object.values(measurements).some(value => value.adjusted);
}
