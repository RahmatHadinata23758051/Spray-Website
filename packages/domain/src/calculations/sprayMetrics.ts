/**
 * Pure domain calculation utilities for spray device metrics.
 * Implements deterministic formulas from Paragon R&D specification.
 */

/**
 * Calculates Discharged Mass (Massa Semprot) in grams:
 * Δm = initialGrossWeight - finalGrossWeight
 *
 * Preconditions:
 * - Both weights must be non-negative.
 * - If finalGrossWeight > initialGrossWeight, returns negative mass (tare drift or operator anomaly).
 *
 * Formatted to 3 decimal places.
 */
export function calculateDischargedMass(
  initialGrossWeightG?: number | null,
  finalGrossWeightG?: number | null
): number | undefined {
  if (
    initialGrossWeightG === undefined ||
    initialGrossWeightG === null ||
    finalGrossWeightG === undefined ||
    finalGrossWeightG === null ||
    Number.isNaN(initialGrossWeightG) ||
    Number.isNaN(finalGrossWeightG)
  ) {
    return undefined;
  }
  const mass = initialGrossWeightG - finalGrossWeightG;
  return Math.round(mass * 1000) / 1000;
}

/**
 * Calculates Discharge Rate (Laju Keluaran) in grams per second:
 * Rate = Discharged Mass / Actual Press Duration (s)
 *
 * Preconditions:
 * - actualDurationS must be greater than zero to avoid division by zero.
 * - Discharged mass should be non-negative.
 *
 * Formatted to 3 decimal places.
 */
export function calculateDischargeRate(
  dischargedMassG?: number | null,
  actualDurationS?: number | null
): number | undefined {
  if (
    dischargedMassG === undefined ||
    dischargedMassG === null ||
    actualDurationS === undefined ||
    actualDurationS === null ||
    Number.isNaN(dischargedMassG) ||
    Number.isNaN(actualDurationS) ||
    actualDurationS <= 0
  ) {
    return undefined;
  }
  const rate = dischargedMassG / actualDurationS;
  return Math.round(rate * 1000) / 1000;
}

/**
 * Calculates Pressure Drop (Penurunan Tekanan) in bar:
 * ΔP = initialPressure - finalPressure
 *
 * Preconditions:
 * - Applicable only for Aerosol devices.
 * - Non-Aerosol devices return undefined.
 *
 * Formatted to 2 decimal places.
 */
export function calculatePressureDrop(
  initialPressureBar?: number | null,
  finalPressureBar?: number | null,
  isAerosol = true
): number | undefined {
  if (!isAerosol) {
    return undefined;
  }
  if (
    initialPressureBar === undefined ||
    initialPressureBar === null ||
    finalPressureBar === undefined ||
    finalPressureBar === null ||
    Number.isNaN(initialPressureBar) ||
    Number.isNaN(finalPressureBar)
  ) {
    return undefined;
  }
  const drop = initialPressureBar - finalPressureBar;
  return Math.round(drop * 100) / 100;
}

/**
 * Converts internal milliseconds to client-facing seconds.
 * e.g., 2000 ms -> 2.0 s
 */
export function pressDurationMsToSeconds(ms: number): number {
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.round((ms / 1000) * 100) / 100;
}

/**
 * Converts client-facing seconds to internal canonical milliseconds.
 * e.g., 2.0 s -> 2000 ms
 */
export function secondsToPressDurationMs(seconds: number): number {
  if (Number.isNaN(seconds) || seconds < 0) return 0;
  return Math.round(seconds * 1000);
}

