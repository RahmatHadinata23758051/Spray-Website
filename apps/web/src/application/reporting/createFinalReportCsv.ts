import type { FinalAnalysisReport } from '@spray-paragon/domain';

export function createFinalReportCsv(report: FinalAnalysisReport): string {
  const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const sideMetrics = [
    { label: 'Spray Length', value: report.side.sprayLength },
    { label: 'Spray Angle', value: report.side.sprayAngle },
    { label: 'Vertical Spread', value: report.side.verticalSpread },
    { label: 'Direction Offset', value: report.side.directionOffset },
  ];
  const frontMetrics = [
    { label: 'Spray Area', value: report.front.sprayArea },
    { label: 'Equivalent Diameter', value: report.front.equivalentDiameter },
    { label: 'Circularity', value: report.front.circularity },
    { label: 'Centroid Offset X', value: report.front.centroidOffsetX },
    { label: 'Centroid Offset Y', value: report.front.centroidOffsetY },
    { label: 'Horizontal Symmetry', value: report.front.horizontalSymmetry },
    { label: 'Vertical Symmetry', value: report.front.verticalSymmetry },
  ];

  const fields: Array<[string, string | number | boolean]> = [
    ['test_id', report.test.testId],
    ['sample_id', report.test.sampleId],
    ['status', report.status],
    ['analysis_source', report.analysisSource],
    ['primary_capture_id', report.primaryCaptureMomentId],
    ['primary_frame_index', report.primaryCapture.frameIndex],
    ['primary_timestamp_ms', report.primaryCapture.timestampMs],
  ];

  for (const metric of sideMetrics) {
    const s = slug(metric.label);
    fields.push([`side_${s}_auto`, metric.value.auto], [`side_${s}_final`, metric.value.final], [`side_${s}_adjusted`, metric.value.adjusted]);
  }
  for (const metric of frontMetrics) {
    const s = slug(metric.label);
    fields.push([`front_${s}_auto`, metric.value.auto], [`front_${s}_final`, metric.value.final], [`front_${s}_adjusted`, metric.value.adjusted]);
  }

  const headers = fields.map(([key]) => key).join(',');
  const values = fields.map(([, value]) => String(value)).join(',');
  return `${headers}\n${values}`;
}
