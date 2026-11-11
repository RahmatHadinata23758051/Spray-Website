import { z } from 'zod';

export const KodePengujianStatusSchema = z.enum(['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED']);
export type KodePengujianStatus = z.infer<typeof KodePengujianStatusSchema>;

export const SampleStatusSchema = z.enum(['CREATED', 'TESTED', 'EXCLUDED']);
export type SampleStatus = z.infer<typeof SampleStatusSchema>;

export const TestRunStatusSchema = z.enum(['PENDING', 'CAPTURING', 'ANALYZING', 'REVIEW_REQUIRED', 'FINALIZED', 'FAILED', 'ABORTED']);
export type TestRunStatus = z.infer<typeof TestRunStatusSchema>;

export const FixtureScenarioSchema = z.enum(['nominal-01', 'direction-offset-01', 'pattern-asymmetry-01', 'alignment-review-01']);
export type FixtureScenario = z.infer<typeof FixtureScenarioSchema>;

export const ProductSnapshotSchema = z.object({
  productCode: z.string(),
  productName: z.string(),
});

export const RecipeSnapshotSchema = z.object({
  name: z.string(),
  forceSetpointN: z.number(),
  pressDurationMs: z.number(),
  strokeMm: z.number(),
});

export const DeviceTypeSchema = z.enum(['Aerosol', 'Non-Aerosol']);
export type DeviceType = z.infer<typeof DeviceTypeSchema>;

export const UsagePatternSchema = z.enum(['Sekali Pakai', 'Berulang']);
export type UsagePattern = z.infer<typeof UsagePatternSchema>;

export const TrialTypeSchema = z.enum(['Lab', 'PS', 'MP']);
export type TrialType = z.infer<typeof TrialTypeSchema>;

export const StoragePositionSchema = z.enum(['Tegak', 'Tidur']);
export type StoragePosition = z.infer<typeof StoragePositionSchema>;

export const StorageConditionSchema = z.enum([
  'Ruang',
  'Jemur',
  'Display',
  'Oven 40',
  'Oven 45',
  'Oven 50',
  'Oven 60',
  'Freezer',
  'Siklus',
]);
export type StorageCondition = z.infer<typeof StorageConditionSchema>;

export const LeakageStatusSchema = z.enum(['Ya', 'Tidak']);
export type LeakageStatus = z.infer<typeof LeakageStatusSchema>;

export const ObservationObjectiveSchema = z.enum([
  'Panjang lintasan',
  'Sebaran',
  'Sudut kontak',
  'Kecepatan pengeringan',
  'Distribusi droplet',
]);
export type ObservationObjective = z.infer<typeof ObservationObjectiveSchema>;

export const WizardProgressSchema = z.object({
  step1Completed: z.boolean().optional(),
  step2Completed: z.boolean().optional(),
  step3Completed: z.boolean().optional(),
  step4Completed: z.boolean().optional(),
});
export type WizardProgress = z.infer<typeof WizardProgressSchema>;

export const AerosolPackagingSpecSchema = z.object({
  actuatorCode: z.string().optional(),
  canOrBottleCode: z.string().optional(),
  valveCode: z.string().optional(),
  gasRatio: z.string().optional(),
  gasType: z.string().optional(),
});
export type AerosolPackagingSpec = z.infer<typeof AerosolPackagingSpecSchema>;

export const NonAerosolPackagingSpecSchema = z.object({
  bottleCode: z.string().optional(),
  pumpCode: z.string().optional(),
});
export type NonAerosolPackagingSpec = z.infer<typeof NonAerosolPackagingSpecSchema>;

export const DeviceConfigurationSchema = z.object({
  deviceType: DeviceTypeSchema,
  aerosol: AerosolPackagingSpecSchema.optional(),
  nonAerosol: NonAerosolPackagingSpecSchema.optional(),
});
export type DeviceConfiguration = z.infer<typeof DeviceConfigurationSchema>;

export const SetpointsSchema = z.object({
  forceSetpointN: z.number(),
  pressDurationMs: z.number(),
  strokeMm: z.number(),
  bottleHeightMm: z.number().optional(),
  actuatorAreaMm2: z.number().optional(),
  forceMode: z.enum(['Normal', 'Tidak Normal']).optional(),
  normalForcePresetN: z.number().optional(),
});
export type Setpoints = z.infer<typeof SetpointsSchema>;

export const ExecutionMeasurementsSchema = z.object({
  initialGrossWeightG: z.number().optional(),
  initialPressureBar: z.number().optional(),
  finalGrossWeightG: z.number().optional(),
  finalPressureBar: z.number().optional(),
  actualPressDurationS: z.number().optional(),
  actualStrokeDepth: z.number().optional(),
  leakage: LeakageStatusSchema.optional(),
  dryingTimeS: z.number().optional(),
  observationNotes: z.string().optional(),
});
export type ExecutionMeasurements = z.infer<typeof ExecutionMeasurementsSchema>;

export const OperationalDerivedMetricsSchema = z.object({
  dischargedMassG: z.number().optional(),
  dischargeRateGPerS: z.number().optional(),
  pressureDropBar: z.number().optional(),
});
export type OperationalDerivedMetrics = z.infer<typeof OperationalDerivedMetricsSchema>;

export const CreateKodePengujianRequestSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  productSnapshot: ProductSnapshotSchema,
  defaultRecipeId: z.string().optional(),
  defaultRecipeSnapshot: RecipeSnapshotSchema.optional(),
  productLot: z.string().optional(),
  formulaNumber: z.string().optional(),
  testPeriod: z.string().optional(),
  operatorId: z.string().uuid().optional(),
  operatorName: z.string().optional(),
  calculationStandard: z.string().optional(),
  storageCondition: z.string().optional(),
  bottlePosition: z.string().optional(),
  kuf: z.string().optional(),
  trialObjective: z.string().optional(),
  benchmark: z.string().optional(),
  trialType: TrialTypeSchema.optional(),
  observationObjectives: z.array(z.union([ObservationObjectiveSchema, z.string()])).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateKodePengujianRequest = z.infer<typeof CreateKodePengujianRequestSchema>;

export const UpdateKodePengujianRequestSchema = z.object({
  productLot: z.string().optional(),
  formulaNumber: z.string().optional(),
  testPeriod: z.string().optional(),
  calculationStandard: z.string().optional(),
  storageCondition: z.string().optional(),
  bottlePosition: z.string().optional(),
  kuf: z.string().optional(),
  trialObjective: z.string().optional(),
  benchmark: z.string().optional(),
  trialType: TrialTypeSchema.optional(),
  observationObjectives: z.array(z.union([ObservationObjectiveSchema, z.string()])).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  defaultRecipeId: z.string().optional(),
  defaultRecipeSnapshot: RecipeSnapshotSchema.optional(),
  version: z.number().int().positive(),
});

export type UpdateKodePengujianRequest = z.infer<typeof UpdateKodePengujianRequestSchema>;

export const CreateSampleRequestSchema = z.object({
  id: z.string().optional(),
  sampleCode: z.string().optional(),
  positionInRun: z.number().int().positive().optional(),
  storageCondition: z.string().optional(),
  bottlePosition: z.string().optional(),
  deviceConfiguration: DeviceConfigurationSchema.optional(),
  usagePattern: UsagePatternSchema.optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateSampleRequest = z.infer<typeof CreateSampleRequestSchema>;

export const UpdateSampleRequestSchema = z.object({
  sampleCode: z.string().optional(),
  storageCondition: z.string().optional(),
  bottlePosition: z.string().optional(),
  deviceConfiguration: DeviceConfigurationSchema.optional(),
  usagePattern: UsagePatternSchema.optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  status: SampleStatusSchema.optional(),
  version: z.number().int().positive(),
});

export type UpdateSampleRequest = z.infer<typeof UpdateSampleRequestSchema>;

export const CreateTestRunRequestSchema = z.object({
  id: z.string().optional(),
  sampleId: z.string(),
  recipeId: z.string(),
  recipeSnapshot: RecipeSnapshotSchema,
  setpoints: SetpointsSchema,
  fixture: FixtureScenarioSchema,
  operatorId: z.string().uuid(),
  operatorName: z.string(),
  repetitionIndex: z.number().int().nonnegative().optional(),
  executionMeasurements: ExecutionMeasurementsSchema.optional(),
  operationalDerivedMetrics: OperationalDerivedMetricsSchema.optional(),
  observationObjectives: z.array(z.union([ObservationObjectiveSchema, z.string()])).optional(),
  wizardProgress: WizardProgressSchema.optional(),
  acquisitionDate: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateTestRunRequest = z.infer<typeof CreateTestRunRequestSchema>;

export const UpdateTestRunRequestSchema = z.object({
  setpoints: SetpointsSchema.optional(),
  executionMeasurements: ExecutionMeasurementsSchema.optional(),
  operationalDerivedMetrics: OperationalDerivedMetricsSchema.optional(),
  observationObjectives: z.array(z.union([ObservationObjectiveSchema, z.string()])).optional(),
  wizardProgress: WizardProgressSchema.optional(),
  acquisitionDate: z.string().optional(),
  captureSession: z.unknown().optional(),
  analysisDraft: z.unknown().optional(),
  finalReport: z.unknown().optional(),
  failureReason: z.string().optional(),
  status: TestRunStatusSchema.optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  version: z.number().int().positive(),
});

export type UpdateTestRunRequest = z.infer<typeof UpdateTestRunRequestSchema>;

export const KodePengujianResponseSchema = z.object({
  id: z.string(),
  status: KodePengujianStatusSchema,
  productId: z.string(),
  productSnapshot: ProductSnapshotSchema,
  defaultRecipeId: z.string().optional(),
  defaultRecipeSnapshot: RecipeSnapshotSchema.optional(),
  productLot: z.string().optional(),
  formulaNumber: z.string().optional(),
  testPeriod: z.string().optional(),
  operatorId: z.string().uuid(),
  operatorName: z.string(),
  calculationStandard: z.string().optional(),
  storageCondition: z.string().optional(),
  bottlePosition: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  samples: z.array(z.unknown()),
  testRuns: z.array(z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
  sync: z.object({
    status: z.enum(['local', 'pending', 'synced', 'failed']),
    localUpdatedAt: z.string().datetime(),
    serverUpdatedAt: z.string().datetime().optional(),
    lastSyncError: z.string().optional(),
    retryCount: z.number().int().nonnegative().optional(),
  }).optional(),
});

export type KodePengujianResponse = z.infer<typeof KodePengujianResponseSchema>;

export const KodePengujianListItemSchema = z.object({
  id: z.string(),
  status: KodePengujianStatusSchema,
  productId: z.string(),
  productSnapshot: ProductSnapshotSchema,
  productLot: z.string().optional(),
  testPeriod: z.string().optional(),
  operatorName: z.string(),
  sampleCount: z.number().int().nonnegative(),
  testRunCount: z.number().int().nonnegative(),
  finalizedRunCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
  sync: z.object({
    status: z.enum(['local', 'pending', 'synced', 'failed']),
    localUpdatedAt: z.string().datetime(),
    serverUpdatedAt: z.string().datetime().optional(),
    lastSyncError: z.string().optional(),
    retryCount: z.number().int().nonnegative().optional(),
  }).optional(),
});

export type KodePengujianListItem = z.infer<typeof KodePengujianListItemSchema>;

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;