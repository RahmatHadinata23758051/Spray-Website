import type { FinalAnalysisReport } from '@spray-paragon/domain';

function escapeCsv(value: string | number | boolean): string {
  const str = String(value);
  if (/[",\r\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getMeasurementValue(value: { auto: number; final: number; adjusted: boolean } | undefined, field: 'auto' | 'final' | 'adjusted'): string | number | boolean {
  if (!value) return '';
  return value[field];
}

export function createFinalReportCsv(report: FinalAnalysisReport): string {
  const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const sideMetrics: Array<{ label: string; value: { auto: number; final: number; adjusted: boolean } | undefined }> = [
    { label: 'Spray Length', value: report.side?.sprayLength },
    { label: 'Spray Angle', value: report.side?.sprayAngle },
    { label: 'Vertical Spread', value: report.side?.verticalSpread },
    { label: 'Direction Offset', value: report.side?.directionOffset },
  ];
  if (report.side?.spreadPosition) {
    sideMetrics.push({ label: 'Spread Position', value: report.side.spreadPosition });
  }
  const frontMetrics: Array<{ label: string; value: { auto: number; final: number; adjusted: boolean } | undefined }> = [
    { label: 'Spray Area', value: report.front?.sprayArea },
    { label: 'Equivalent Diameter', value: report.front?.equivalentDiameter },
    { label: 'Circularity', value: report.front?.circularity },
    { label: 'Centroid Offset X', value: report.front?.centroidOffsetX },
    { label: 'Centroid Offset Y', value: report.front?.centroidOffsetY },
    { label: 'Horizontal Symmetry', value: report.front?.horizontalSymmetry },
    { label: 'Vertical Symmetry', value: report.front?.verticalSymmetry },
  ];

  const fields: Array<[string, string | number | boolean]> = [
    ['test_id', report.test.testId],
    ['sample_id', report.test.sampleId],
    ['status', report.status],
    ['analysis_source', report.analysisSource],
    ['perspectives', report.perspectives.join(';')],
    ['primary_capture_id', report.primaryCaptureMomentId],
    ['primary_frame_index', report.primaryCapture.frameIndex],
    ['primary_timestamp_ms', report.primaryCapture.timestampMs],
  ];

  for (const metric of sideMetrics) {
    const s = slug(metric.label);
    fields.push([`side_${s}_auto`, getMeasurementValue(metric.value, 'auto')], [`side_${s}_final`, getMeasurementValue(metric.value, 'final')], [`side_${s}_adjusted`, getMeasurementValue(metric.value, 'adjusted')]);
  }
  for (const metric of frontMetrics) {
    const s = slug(metric.label);
    fields.push([`front_${s}_auto`, getMeasurementValue(metric.value, 'auto')], [`front_${s}_final`, getMeasurementValue(metric.value, 'final')], [`front_${s}_adjusted`, getMeasurementValue(metric.value, 'adjusted')]);
  }

  if (report.operationalMetrics) {
    const raw = report.operationalMetrics as {
      measurements?: Record<string, unknown>;
      derived?: {
        dischargedMassG?: number;
        dischargeRateGPerS?: number;
        pressureDropBar?: number;
      };
      dischargedMassG?: number;
      dischargeRateGPerS?: number;
      pressureDropBar?: number;
    };
    const derived = raw.derived ?? (raw.dischargedMassG !== undefined ? raw : undefined);
    const m = raw.measurements ?? {};

    if (m.initialGrossWeightG !== undefined) {
      fields.push(['operational_initial_gross_weight_g', m.initialGrossWeightG as number]);
    }
    if (m.finalGrossWeightG !== undefined) {
      fields.push(['operational_final_gross_weight_g', m.finalGrossWeightG as number]);
    }
    if (m.actualPressDurationS !== undefined) {
      fields.push(['operational_actual_press_duration_s', m.actualPressDurationS as number]);
    }
    if (m.actualStrokeDepth !== undefined) {
      fields.push(['operational_actual_stroke_depth', m.actualStrokeDepth as number]);
    }
    if (m.initialPressureBar !== undefined) {
      fields.push(['operational_initial_pressure_bar', m.initialPressureBar as number]);
    }
    if (m.finalPressureBar !== undefined) {
      fields.push(['operational_final_pressure_bar', m.finalPressureBar as number]);
    }
    if (m.leakage !== undefined) {
      fields.push(['operational_leakage', m.leakage as string]);
    }
    if (m.dryingTimeS !== undefined) {
      fields.push(['operational_drying_time_s', m.dryingTimeS as number]);
    }
    if (derived?.dischargedMassG !== undefined) {
      fields.push(['operational_discharged_mass_g', derived.dischargedMassG]);
    }
    if (derived?.dischargeRateGPerS !== undefined) {
      fields.push(['operational_discharge_rate_gps', derived.dischargeRateGPerS]);
    }
    if (derived?.pressureDropBar !== undefined) {
      fields.push(['operational_pressure_drop_bar', derived.pressureDropBar]);
    }
  }

  const headers = fields.map(([key]) => escapeCsv(key)).join(',');
  const values = fields.map(([, value]) => escapeCsv(value)).join(',');
  
  // UTF-8 BOM + Excel delimiter hint + CRLF headers + CRLF values
  return `\uFEFFsep=,\r\n${headers}\r\n${values}`;
}
