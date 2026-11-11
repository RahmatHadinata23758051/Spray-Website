import { describe, it, expect } from 'vitest';
import {
  CreateKodePengujianRequestSchema,
  UpdateKodePengujianRequestSchema,
  CreateSampleRequestSchema,
  UpdateSampleRequestSchema,
  CreateTestRunRequestSchema,
  UpdateTestRunRequestSchema,
  KodePengujianResponseSchema,
} from '../kodePengujian';

describe('@spray-paragon/contracts: kodePengujian strict writes & legacy read compatibility', () => {
  const dummyProduct = { productCode: 'PRD-01', productName: 'Hair Spray' };
  const dummyRecipe = { name: 'R1', forceSetpointN: 20, pressDurationMs: 1500, strokeMm: 10 };

  it('accepts valid client enums on CreateKodePengujianRequestSchema', () => {
    const valid = CreateKodePengujianRequestSchema.safeParse({
      productId: 'p-1',
      productSnapshot: dummyProduct,
      operatorName: 'Operator 1',
      storageCondition: 'Oven 45',
      bottlePosition: 'Tidur',
      observationObjectives: ['Panjang lintasan', 'Distribusi droplet'],
    });
    expect(valid.success).toBe(true);
  });

  it('rejects invalid storageCondition on CreateKodePengujianRequestSchema', () => {
    const invalid = CreateKodePengujianRequestSchema.safeParse({
      productId: 'p-1',
      productSnapshot: dummyProduct,
      operatorName: 'Operator 1',
      storageCondition: 'Suhu Ruang', // Legacy, forbidden on new write
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects invalid bottlePosition on CreateKodePengujianRequestSchema', () => {
    const invalid = CreateKodePengujianRequestSchema.safeParse({
      productId: 'p-1',
      productSnapshot: dummyProduct,
      operatorName: 'Operator 1',
      bottlePosition: 'Terbalik', // Forbidden on new write
    });
    expect(invalid.success).toBe(false);
  });

  it('rejects invalid observationObjectives on CreateKodePengujianRequestSchema', () => {
    const invalid = CreateKodePengujianRequestSchema.safeParse({
      productId: 'p-1',
      productSnapshot: dummyProduct,
      operatorName: 'Operator 1',
      observationObjectives: ['Spray Angle Custom'],
    });
    expect(invalid.success).toBe(false);
  });

  it('accepts valid client enums on CreateSampleRequestSchema and rejects invalid', () => {
    const valid = CreateSampleRequestSchema.safeParse({
      sampleCode: 'SMP-01',
      storageCondition: 'Freezer',
      bottlePosition: 'Tegak',
    });
    expect(valid.success).toBe(true);

    const invalid = CreateSampleRequestSchema.safeParse({
      storageCondition: 'Oven 40°C',
    });
    expect(invalid.success).toBe(false);

    const validUpdate = UpdateSampleRequestSchema.safeParse({
      version: 1,
      storageCondition: 'Jemur',
      bottlePosition: 'Tidur',
    });
    expect(validUpdate.success).toBe(true);

    const invalidUpdateKp = UpdateKodePengujianRequestSchema.safeParse({
      version: 1,
      storageCondition: 'Cycling',
    });
    expect(invalidUpdateKp.success).toBe(false);
  });

  it('rejects invalid observationObjectives on CreateTestRunRequestSchema and UpdateTestRunRequestSchema', () => {
    const invalidCreate = CreateTestRunRequestSchema.safeParse({
      sampleId: 's-1',
      recipeId: 'r-1',
      recipeSnapshot: dummyRecipe,
      setpoints: { forceSetpointN: 20, pressDurationMs: 1500, strokeMm: 10 },
      fixture: 'nominal-01',
      operatorId: '550e8400-e29b-41d4-a716-446655440000',
      operatorName: 'Op 1',
      observationObjectives: ['Not an objective'],
    });
    expect(invalidCreate.success).toBe(false);

    const invalidUpdate = UpdateTestRunRequestSchema.safeParse({
      version: 1,
      observationObjectives: ['Not an objective'],
    });
    expect(invalidUpdate.success).toBe(false);
  });

  it('KodePengujianResponseSchema allows legacy strings for backward-compatibility', () => {
    const legacyResponse = KodePengujianResponseSchema.safeParse({
      id: 'KP-261111-0001',
      status: 'DRAFT',
      productId: 'p-1',
      productSnapshot: dummyProduct,
      operatorId: '550e8400-e29b-41d4-a716-446655440000',
      operatorName: 'Operator 1',
      storageCondition: 'Suhu Ruang', // Legacy string tolerated on read
      bottlePosition: 'Terbalik', // Legacy string tolerated on read
      samples: [],
      testRuns: [],
      createdAt: '2026-11-11T20:00:00.000Z',
      updatedAt: '2026-11-11T20:00:00.000Z',
      version: 1,
    });
    expect(legacyResponse.success).toBe(true);
  });
});

