import { pgTable, text, timestamp, uuid, boolean, jsonb, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['operator', 'analyst', 'admin'] }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const kodePengujian = pgTable('kode_pengujian', {
  id: text('id').primaryKey(),
  status: text('status', { enum: ['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'] }).notNull(),
  productId: text('product_id').notNull(),
  productSnapshot: jsonb('product_snapshot').$type<{ productCode: string; productName: string }>().notNull(),
  defaultRecipeId: text('default_recipe_id'),
  defaultRecipeSnapshot: jsonb('default_recipe_snapshot').$type<{ name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number }>(),
  productLot: text('product_lot'),
  testPeriod: text('test_period'),
  operatorId: uuid('operator_id').notNull().references(() => users.id),
  operatorName: text('operator_name').notNull(),
  calculationStandard: text('calculation_standard'),
  storageCondition: text('storage_condition'),
  bottlePosition: text('bottle_position'),
  notes: text('notes'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
}, (table) => ({
  operatorIdx: index('kp_operator_idx').on(table.operatorId),
  statusIdx: index('kp_status_idx').on(table.status),
  updatedAtIdx: index('kp_updated_at_idx').on(table.updatedAt),
}));

export const samples = pgTable('samples', {
  id: text('id').primaryKey(),
  kodePengujianId: text('kode_pengujian_id').notNull().references(() => kodePengujian.id, { onDelete: 'cascade' }),
  sampleCode: text('sample_code'),
  positionInRun: integer('position_in_run').notNull(),
  storageCondition: text('storage_condition'),
  bottlePosition: text('bottle_position'),
  notes: text('notes'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  status: text('status', { enum: ['CREATED', 'TESTED', 'EXCLUDED'] }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
}, (table) => ({
  kpIdx: index('sample_kp_idx').on(table.kodePengujianId),
  positionIdx: index('sample_position_idx').on(table.positionInRun),
  codeIdx: uniqueIndex('sample_kp_code_idx').on(table.kodePengujianId, table.sampleCode),
}));

export const testRuns = pgTable('test_runs', {
  id: text('id').primaryKey(),
  kodePengujianId: text('kode_pengujian_id').notNull().references(() => kodePengujian.id, { onDelete: 'cascade' }),
  sampleId: text('sample_id').notNull().references(() => samples.id, { onDelete: 'restrict' }),
  recipeId: text('recipe_id').notNull(),
  recipeSnapshot: jsonb('recipe_snapshot').$type<{ name: string; forceSetpointN: number; pressDurationMs: number; strokeMm: number }>().notNull(),
  setpoints: jsonb('setpoints').$type<{ forceSetpointN: number; pressDurationMs: number; strokeMm: number }>().notNull(),
  fixture: text('fixture', { enum: ['nominal-01', 'direction-offset-01', 'pattern-asymmetry-01', 'alignment-review-01'] }).notNull(),
  captureSession: jsonb('capture_session'),
  analysisDraft: jsonb('analysis_draft'),
  finalReport: jsonb('final_report'),
  failureReason: text('failure_reason'),
  repetitionIndex: integer('repetition_index'),
  operatorId: uuid('operator_id').notNull().references(() => users.id),
  operatorName: text('operator_name').notNull(),
  status: text('status', { enum: ['PENDING', 'CAPTURING', 'ANALYZING', 'REVIEW_REQUIRED', 'FINALIZED', 'FAILED', 'ABORTED'] }).notNull(),
  notes: text('notes'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
}, (table) => ({
  kpIdx: index('testrun_kp_idx').on(table.kodePengujianId),
  sampleIdx: index('testrun_sample_idx').on(table.sampleId),
  statusIdx: index('testrun_status_idx').on(table.status),
}));

export const finalResults = pgTable('final_results', {
  id: text('id').primaryKey(),
  testRunId: text('test_run_id').notNull().references(() => testRuns.id, { onDelete: 'restrict' }).unique(),
  analysisSource: text('analysis_source', { enum: ['simulation', 'real'] }).notNull(),
  perspectives: jsonb('perspectives').$type<string[]>().notNull(),
  finalizedBy: text('finalized_by').notNull(),
  finalizedAt: timestamp('finalized_at').notNull(),
  sideResult: jsonb('side_result').notNull(),
  frontResult: jsonb('front_result'),
  selectedCaptureReferences: jsonb('selected_capture_references'),
  calibrationSnapshots: jsonb('calibration_snapshots'),
  rawReport: jsonb('raw_report').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  trIdx: uniqueIndex('final_result_tr_idx').on(table.testRunId),
}));

export const mediaReferences = pgTable('media_references', {
  id: text('id').primaryKey(),
  testRunId: text('test_run_id').notNull().references(() => testRuns.id, { onDelete: 'restrict' }),
  assetId: text('asset_id').notNull(),
  kind: text('kind', { enum: ['frame', 'video'] }).notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  capturedAt: timestamp('captured_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  trIdx: index('media_ref_tr_idx').on(table.testRunId),
  assetIdx: uniqueIndex('media_ref_asset_idx').on(table.assetId),
}));

export type KodePengujianRow = typeof kodePengujian.$inferSelect;
export type KodePengujianInsert = typeof kodePengujian.$inferInsert;
export type SampleRow = typeof samples.$inferSelect;
export type SampleInsert = typeof samples.$inferInsert;
export type TestRunRow = typeof testRuns.$inferSelect;
export type TestRunInsert = typeof testRuns.$inferInsert;
export type FinalResultRow = typeof finalResults.$inferSelect;
export type FinalResultInsert = typeof finalResults.$inferInsert;
export type MediaReferenceRow = typeof mediaReferences.$inferSelect;
export type MediaReferenceInsert = typeof mediaReferences.$inferInsert;