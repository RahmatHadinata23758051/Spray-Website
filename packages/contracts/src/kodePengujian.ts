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

export const SetpointsSchema = z.object({
  forceSetpointN: z.number(),
  pressDurationMs: z.number(),
  strokeMm: z.number(),
});

export const CreateKodePengujianRequestSchema = z.object({
  id: z.string().optional(),
  productId: z.string(),
  productSnapshot: ProductSnapshotSchema,
  defaultRecipeId: z.string().optional(),
  defaultRecipeSnapshot: RecipeSnapshotSchema.optional(),
  productLot: z.string().optional(),
  testPeriod: z.string().optional(),
  operatorId: z.string().uuid().optional(),
  operatorName: z.string().optional(),
  calculationStandard: z.string().optional(),
  storageCondition: z.string().optional(),
  bottlePosition: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateKodePengujianRequest = z.infer<typeof CreateKodePengujianRequestSchema>;

export const UpdateKodePengujianRequestSchema = z.object({
  productLot: z.string().optional(),
  testPeriod: z.string().optional(),
  calculationStandard: z.string().optional(),
  storageCondition: z.string().optional(),
  bottlePosition: z.string().optional(),
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
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateSampleRequest = z.infer<typeof CreateSampleRequestSchema>;

export const UpdateSampleRequestSchema = z.object({
  sampleCode: z.string().optional(),
  storageCondition: z.string().optional(),
  bottlePosition: z.string().optional(),
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
  notes: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateTestRunRequest = z.infer<typeof CreateTestRunRequestSchema>;

export const UpdateTestRunRequestSchema = z.object({
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