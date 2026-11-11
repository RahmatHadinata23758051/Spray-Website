import type {
  KodePengujian,
  Sample,
  TestRun,
  DeviceType,
  UsagePattern,
  TrialType,
  LeakageStatus,
  ObservationObjective,
  ExecutionMeasurements,
  OperationalDerivedMetrics,
  TestRunSetpoints,
} from '@spray-paragon/domain';
import {
  calculateDischargedMass,
  calculateDischargeRate,
  calculatePressureDrop,
  pressDurationMsToSeconds,
  secondsToPressDurationMs,
} from '@spray-paragon/domain';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface WizardFormData {
  // Step 01: Identification
  productName: string;
  formulaNumber: string;
  lotNumber: string;
  kuf: string;
  acquisitionDate: string;
  trialObjective: string;
  storagePosition: string;
  storageCondition: string;
  benchmark: string;
  trialType: TrialType;
  sampleCode: string;
  usagePattern: UsagePattern;

  // Step 02: Device Configuration
  deviceType: DeviceType;
  aerosolSpec: {
    actuatorCode: string;
    canBottleCode: string;
    valveCode: string;
    gasRatio: string;
    gasType: string;
    initialPressureBar: string;
    initialGrossWeightG: string;
  };
  nonAerosolSpec: {
    bottleCode: string;
    pumpCode: string;
    initialGrossWeightG: string;
  };

  // Step 03: Test Parameters & Observation Objectives
  observationObjectives: ObservationObjective[];
  forceMode: 'Normal' | 'Tidak Normal';
  normalForcePresetN: number;
  customForceN: string;
  holdingTimeS: string;
  bottleHeightMm: string;
  actuatorAreaMm2: string;
  strokeMm: string;

  // Step 04: Execution & Field Measurements
  initialPressureBar: string;
  finalPressureBar: string;
  initialGrossWeightG: string;
  finalGrossWeightG: string;
  actualPressDurationS: string;
  actualStrokeDepthMm: string;
  leakage: LeakageStatus | '';
  dryingTimeS: string;
  observationNotes: string;
}

export function initWizardFormData(
  kp: KodePengujian,
  sample: Sample,
  testRun: TestRun
): WizardFormData {
  const devConf = sample.deviceConfiguration;
  const isAerosol = devConf?.deviceType === 'Aerosol';
  const aerosol = isAerosol ? devConf.aerosol : undefined;
  const nonAerosol = !isAerosol && devConf?.deviceType === 'Non-Aerosol' ? devConf.nonAerosol : undefined;

  const setpoints = testRun.setpoints;
  const exec = testRun.executionMeasurements;

  // Holding time in seconds (converted from pressDurationMs)
  const initialHoldingTimeS = pressDurationMsToSeconds(setpoints.pressDurationMs).toString();

  // Determine initial initialGrossWeight & initialPressure
  const initGrossWeight = exec?.initialGrossWeightG !== undefined ? exec.initialGrossWeightG.toString() : '';
  const initPressure = exec?.initialPressureBar !== undefined ? exec.initialPressureBar.toString() : '';

  return {
    // 01 Identification
    productName: kp.productSnapshot?.productName || '',
    formulaNumber: (kp.metadata?.formulaNumber as string) || kp.productSnapshot?.productCode || '',
    lotNumber: kp.productLot || '',
    kuf: kp.kuf || '',
    acquisitionDate: testRun.acquisitionDate || new Date().toISOString().slice(0, 10),
    trialObjective: kp.trialObjective || '',
    storagePosition: sample.bottlePosition || kp.bottlePosition || 'Tegak',
    storageCondition: sample.storageCondition || kp.storageCondition || 'Suhu Ruang',
    benchmark: kp.benchmark || '',
    trialType: kp.trialType || 'Lab',
    sampleCode: sample.sampleCode || sample.id,
    usagePattern: sample.usagePattern || 'Sekali Pakai',

    // 02 Device Config
    deviceType: devConf?.deviceType || 'Non-Aerosol',
    aerosolSpec: {
      actuatorCode: aerosol?.actuatorCode || '',
      canBottleCode: aerosol?.canOrBottleCode || '',
      valveCode: aerosol?.valveCode || '',
      gasRatio: aerosol?.gasRatio || '',
      gasType: aerosol?.gasType || '',
      initialPressureBar: initPressure,
      initialGrossWeightG: initGrossWeight,
    },
    nonAerosolSpec: {
      bottleCode: nonAerosol?.bottleCode || '',
      pumpCode: nonAerosol?.pumpCode || '',
      initialGrossWeightG: initGrossWeight,
    },

    // 03 Parameters
    observationObjectives:
      (testRun.observationObjectives as ObservationObjective[]) ||
      (kp.observationObjectives as ObservationObjective[]) ||
      ['Panjang lintasan', 'Sebaran'],
    forceMode: setpoints.forceMode || 'Normal',
    normalForcePresetN: setpoints.normalForcePresetN || (setpoints.forceMode === 'Normal' ? setpoints.forceSetpointN : 30),
    customForceN: setpoints.forceMode === 'Tidak Normal' ? setpoints.forceSetpointN.toString() : '30',
    holdingTimeS: initialHoldingTimeS,
    bottleHeightMm: setpoints.bottleHeightMm !== undefined ? setpoints.bottleHeightMm.toString() : '120',
    actuatorAreaMm2: setpoints.actuatorAreaMm2 !== undefined ? setpoints.actuatorAreaMm2.toString() : '150',
    strokeMm: setpoints.strokeMm.toString(),

    // 04 Execution Measurements
    initialPressureBar: initPressure,
    finalPressureBar: exec?.finalPressureBar !== undefined ? exec.finalPressureBar.toString() : '',
    initialGrossWeightG: initGrossWeight,
    finalGrossWeightG: exec?.finalGrossWeightG !== undefined ? exec.finalGrossWeightG.toString() : '',
    actualPressDurationS: exec?.actualPressDurationS !== undefined ? exec.actualPressDurationS.toString() : '',
    actualStrokeDepthMm: exec?.actualStrokeDepth !== undefined ? exec.actualStrokeDepth.toString() : '',
    leakage: exec?.leakage || '',
    dryingTimeS: exec?.dryingTimeS !== undefined ? exec.dryingTimeS.toString() : '',
    observationNotes: testRun.notes || '',
  };
}

export function computeLiveOperationalMetrics(formData: WizardFormData): OperationalDerivedMetrics | undefined {
  const initWeight = parseFloat(formData.initialGrossWeightG);
  const finalWeight = parseFloat(formData.finalGrossWeightG);
  const actualDuration = parseFloat(formData.actualPressDurationS);
  const initPressure = parseFloat(formData.initialPressureBar);
  const finalPressure = parseFloat(formData.finalPressureBar);

  const dischargedMassG =
    !isNaN(initWeight) && !isNaN(finalWeight)
      ? calculateDischargedMass(initWeight, finalWeight)
      : undefined;

  const dischargeRateGPerS =
    dischargedMassG !== undefined && !isNaN(actualDuration) && actualDuration > 0
      ? calculateDischargeRate(dischargedMassG, actualDuration)
      : undefined;

  const pressureDropBar =
    formData.deviceType === 'Aerosol' && !isNaN(initPressure) && !isNaN(finalPressure)
      ? calculatePressureDrop(initPressure, finalPressure)
      : undefined;

  if (dischargedMassG === undefined && dischargeRateGPerS === undefined && pressureDropBar === undefined) {
    return undefined;
  }

  return {
    dischargedMassG,
    dischargeRateGPerS,
    pressureDropBar,
  };
}

export function parseSetpointsFromForm(formData: WizardFormData): TestRunSetpoints {
  const forceSetpointN =
    formData.forceMode === 'Normal'
      ? formData.normalForcePresetN
      : parseFloat(formData.customForceN) || 30;

  const holdingTimeS = parseFloat(formData.holdingTimeS);
  const pressDurationMs = !isNaN(holdingTimeS)
    ? secondsToPressDurationMs(holdingTimeS)
    : 1000;

  const strokeMm = parseFloat(formData.strokeMm) || 10;
  const bottleHeightMm = formData.bottleHeightMm ? parseFloat(formData.bottleHeightMm) : undefined;
  const actuatorAreaMm2 = formData.actuatorAreaMm2 ? parseFloat(formData.actuatorAreaMm2) : undefined;

  return {
    forceSetpointN,
    pressDurationMs,
    strokeMm,
    bottleHeightMm: isNaN(bottleHeightMm as number) ? undefined : bottleHeightMm,
    actuatorAreaMm2: isNaN(actuatorAreaMm2 as number) ? undefined : actuatorAreaMm2,
    forceMode: formData.forceMode,
    normalForcePresetN: formData.normalForcePresetN,
  };
}

export function parseExecutionMeasurementsFromForm(formData: WizardFormData): ExecutionMeasurements {
  const initialPressureBar = formData.initialPressureBar ? parseFloat(formData.initialPressureBar) : undefined;
  const finalPressureBar = formData.finalPressureBar ? parseFloat(formData.finalPressureBar) : undefined;
  const initialGrossWeightG = formData.initialGrossWeightG ? parseFloat(formData.initialGrossWeightG) : undefined;
  const finalGrossWeightG = formData.finalGrossWeightG ? parseFloat(formData.finalGrossWeightG) : undefined;
  const actualPressDurationS = formData.actualPressDurationS ? parseFloat(formData.actualPressDurationS) : undefined;
  const actualStrokeDepth = formData.actualStrokeDepthMm ? parseFloat(formData.actualStrokeDepthMm) : undefined;
  const dryingTimeS = formData.dryingTimeS ? parseFloat(formData.dryingTimeS) : undefined;

  return {
    initialPressureBar: isNaN(initialPressureBar as number) ? undefined : initialPressureBar,
    finalPressureBar: isNaN(finalPressureBar as number) ? undefined : finalPressureBar,
    initialGrossWeightG: isNaN(initialGrossWeightG as number) ? undefined : initialGrossWeightG,
    finalGrossWeightG: isNaN(finalGrossWeightG as number) ? undefined : finalGrossWeightG,
    actualPressDurationS: isNaN(actualPressDurationS as number) ? undefined : actualPressDurationS,
    actualStrokeDepth: isNaN(actualStrokeDepth as number) ? undefined : actualStrokeDepth,
    leakage: formData.leakage ? (formData.leakage as LeakageStatus) : undefined,
    dryingTimeS: isNaN(dryingTimeS as number) ? undefined : dryingTimeS,
  };
}
