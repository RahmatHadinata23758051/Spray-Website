import { z } from 'zod';

export const BatchStatusDTO = z.enum([
  'DRAFT',
  'READY',
  'CAPTURING',
  'PROCESSING',
  'REVIEW_REQUIRED',
  'FINALIZED',
  'FAILED',
  'ABORTED',
]);

export const CreateBatchDraftRequestDTO = z.object({
  id: z.string().optional(),
  productId: z.string(),
  productSnapshot: z.object({
    productCode: z.string(),
    productName: z.string(),
  }),
  recipeId: z.string(),
  recipeSnapshot: z.object({
    name: z.string(),
    forceSetpointN: z.number(),
    pressDurationMs: z.number(),
    strokeMm: z.number(),
  }),
  setpoints: z
    .object({
      forceSetpointN: z.number(),
      pressDurationMs: z.number(),
      strokeMm: z.number(),
    })
    .optional(),
  productLot: z.string().optional(),
  operatorId: z.string(),
  operatorName: z.string(),
  fixture: z.enum([
    'nominal-01',
    'direction-offset-01',
    'pattern-asymmetry-01',
    'alignment-review-01',
  ]),
  notes: z.string().optional(),
});

export type CreateBatchDraftRequestDTO = z.infer<typeof CreateBatchDraftRequestDTO>;

export const BatchResponseDTO = z.object({
  id: z.string(),
  status: BatchStatusDTO,
  createdAt: z.string(),
  updatedAt: z.string(),
  productLot: z.string().optional(),
  operatorName: z.string().optional(),
});

export type BatchResponseDTO = z.infer<typeof BatchResponseDTO>;
