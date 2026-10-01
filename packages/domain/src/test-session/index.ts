import type { CreateTestSessionInput, FirmwareSetpoints, Test } from '../types/index';

const deterministicSessionIndex = 18;
export const nextTestId = () => `TST-260929-${String(deterministicSessionIndex).padStart(4, '0')}`;
export const nextSampleId = () => `SMP-260929-${String(deterministicSessionIndex).padStart(4, '0')}`;
export const deterministicCreatedAt = '2026-09-29T14:05:00Z';

export function recipeToSetpoints(recipe: CreateTestSessionInput['recipe']): FirmwareSetpoints {
  return {
    targetForceN: recipe.forceSetpointN,
    targetDurationMs: recipe.pressDurationMs,
    targetStrokeMm: recipe.strokeMm,
  };
}

export function createTestSession(input: CreateTestSessionInput): Test {
  return {
    id: nextTestId(),
    sampleId: nextSampleId(),
    productId: input.product.id,
    productSnapshot: { productCode: input.product.productCode, productName: input.product.name },
    productName: input.product.name,
    recipeId: input.recipe.id,
    recipeSnapshot: {
      name: input.recipe.name,
      forceSetpointN: input.recipe.forceSetpointN,
      pressDurationMs: input.recipe.pressDurationMs,
      strokeMm: input.recipe.strokeMm,
    },
    productionBatch: input.productionBatch || undefined,
    operatorId: input.operatorId,
    operatorName: input.operatorName,
    createdAt: deterministicCreatedAt,
    source: 'fixture',
    fixture: input.fixture,
    config: {
      forceSetpointN: input.recipe.forceSetpointN,
      pressDurationMs: input.recipe.pressDurationMs,
      strokeMm: input.recipe.strokeMm,
    },
    status: 'running',
  };
}
