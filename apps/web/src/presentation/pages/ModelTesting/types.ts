import type { DeviceType } from '@spray-paragon/domain';

export type ModelTestStatus = 'DRAFT' | 'READY_FOR_UPLOAD' | 'PROCESSING' | 'REVIEW' | 'FINALIZED';

export interface ModelTestFrame {
  frameIndex: number;
  timestampMs: number;
  originalImageUrl: string;
  maskImageUrl: string;
  overlayImageUrl: string;
  plumeDetected: boolean;
  confidence: number;
  plumeAreaPx?: number;
}

export interface ModelTestRun {
  id: string;
  title: string;
  productName: string;
  productLot: string;
  formulaNumber: string;
  trialType: string;
  storageCondition: string;
  bottlePosition: string;
  modelVersion: string;
  operatorName: string;
  status: ModelTestStatus;
  
  // Device
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
    pumpSubType: string;
    dipTubeDiameterMm: string;
    initialGrossWeightG: string;
  };

  // Parameters
  observationObjectives: string[];
  notes?: string;

  // Video & Extraction
  videoMetadata?: {
    fileName: string;
    fileSizeBytes: number;
    durationSeconds: number;
    fps: number;
    totalFrames: number;
  };

  frames: ModelTestFrame[];
  selectedPrimaryFrameIndex?: number;
  selectedSupportingFrameIndexes: number[];

  // Evaluation
  evaluationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ModelWizardStep = 1 | 2 | 3 | 4 | 5;
