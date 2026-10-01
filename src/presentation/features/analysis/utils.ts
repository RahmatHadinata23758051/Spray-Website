import type { Point, SideFinalMeasurements, FrontFinalMeasurements } from '../../../domain/analysis';
import type { CapturePhaseV2 } from '../../../domain/types';

export function phaseLabel(phase: CapturePhaseV2): string {
  return phase === 'pre_spray' ? 'Pre-spray' : phase === 'build_up' ? 'Build-up' : phase[0].toUpperCase() + phase.slice(1);
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
