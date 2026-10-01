import { describe, it, expect } from 'vitest';
import { ApiErrorCodeSchema, createSuccessEnvelopeSchema, ApiErrorEnvelopeSchema } from '../envelope';
import { LoginRequestSchema } from '../auth';
import { CreateBatchDraftRequestDTO } from '../batch';
import { z } from 'zod';

describe('@spray-paragon/contracts: Validation', () => {
  it('validates success envelope', () => {
    const stringSchema = z.string();
    const successSchema = createSuccessEnvelopeSchema(stringSchema);
    
    const result = successSchema.safeParse({
      ok: true,
      data: 'hello',
      requestId: 'req-123',
    });
    
    expect(result.success).toBe(true);
  });

  it('validates error envelope with standard error codes', () => {
    const result = ApiErrorEnvelopeSchema.safeParse({
      ok: false,
      error: {
        code: 'BATCH_NOT_FOUND',
        message: 'The batch was not found',
      },
      requestId: 'req-123',
    });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(ApiErrorCodeSchema.safeParse(result.data.error.code).success).toBe(true);
    }
  });

  it('rejects invalid login request', () => {
    const result = LoginRequestSchema.safeParse({ username: '', password: '' });
    expect(result.success).toBe(false);
  });

  it('validates batch draft creation', () => {
    const result = CreateBatchDraftRequestDTO.safeParse({
      productId: 'p-1',
      productSnapshot: { productCode: 'PC1', productName: 'Prod 1' },
      recipeId: 'r-1',
      recipeSnapshot: { name: 'R1', forceSetpointN: 10, pressDurationMs: 100, strokeMm: 5 },
      operatorId: 'o-1',
      operatorName: 'Op 1',
      fixture: 'nominal-01'
    });
    
    expect(result.success).toBe(true);
  });
});
