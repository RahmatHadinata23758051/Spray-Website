import { z } from 'zod';

export const ApiErrorCodeSchema = z.enum([
  'BATCH_NOT_FOUND',
  'INVALID_BATCH_TRANSITION',
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INTERNAL_ERROR',
]);

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});

export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export function createSuccessEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    ok: z.literal(true),
    data: dataSchema,
    requestId: z.string(),
    meta: z.record(z.unknown()).optional(),
  });
}

export const ApiErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: ApiErrorDetailSchema,
  requestId: z.string(),
});

export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;

export interface ApiSuccessEnvelope<T> {
  ok: true;
  data: T;
  requestId: string;
  meta?: Record<string, unknown>;
}

export type ApiResponse<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
