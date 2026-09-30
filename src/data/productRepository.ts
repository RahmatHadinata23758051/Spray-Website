import type {
  CreateProductInput,
  CreateRecipeInput,
  Product,
  ProductRepository,
  TestRecipe,
  UpdateProductInput,
  UpdateRecipeInput,
} from '../domain/product';

export const productFixtures: Product[] = [
  {
    id: 'prd-fm100', productCode: 'PRD-FM100', name: 'Fine Mist 100 mL', category: 'Fine mist', nominalVolumeMl: 100,
    packaging: { material: 'PETG', heightMm: 162, diameterMm: 42 },
    actuator: { nozzleType: 'Fine Mist Pump', actuatorShape: 'Flat actuator' },
    notes: 'Primary fine-mist reference package for routine spray evaluation.', createdAt: '2026-08-12T08:00:00Z', updatedAt: '2026-09-24T09:40:00Z',
  },
  {
    id: 'prd-ts250', productCode: 'PRD-TS250', name: 'Trigger Spray 250 mL', category: 'Trigger spray', nominalVolumeMl: 250,
    packaging: { material: 'HDPE', heightMm: 198, diameterMm: 58 },
    actuator: { nozzleType: 'Trigger Sprayer', actuatorShape: 'Curved trigger' },
    notes: 'Trigger package used for direction-offset fixture evaluation.', createdAt: '2026-08-18T08:00:00Z', updatedAt: '2026-09-22T13:15:00Z',
  },
  {
    id: 'prd-cs150', productCode: 'PRD-CS150', name: 'Continuous Spray 150 mL', category: 'Continuous spray', nominalVolumeMl: 150,
    packaging: { material: 'Aluminium', heightMm: 184, diameterMm: 50 },
    actuator: { nozzleType: 'Bag-on-valve actuator', actuatorShape: 'Concave actuator' },
    createdAt: '2026-08-21T08:00:00Z', updatedAt: '2026-09-20T11:05:00Z',
  },
];

export const recipeFixtures: TestRecipe[] = [
  { id: 'rcp-fm-standard', productId: 'prd-fm100', name: 'Standard Spray Test', description: 'Routine geometry and pattern measurement.', forceSetpointN: 34, pressDurationMs: 850, strokeMm: 8.5, isDefault: true, createdAt: '2026-08-12T08:00:00Z', updatedAt: '2026-09-24T09:40:00Z' },
  { id: 'rcp-fm-stability', productId: 'prd-fm100', name: 'Stability Spray Test', description: 'Extended press for temporal stability review.', forceSetpointN: 34, pressDurationMs: 1000, strokeMm: 8.5, isDefault: false, createdAt: '2026-08-12T08:10:00Z', updatedAt: '2026-09-18T10:25:00Z' },
  { id: 'rcp-fm-extended', productId: 'prd-fm100', name: 'Extended Spray Test', description: 'Long-duration development sequence.', forceSetpointN: 36, pressDurationMs: 1250, strokeMm: 9, isDefault: false, createdAt: '2026-08-12T08:20:00Z', updatedAt: '2026-09-16T14:30:00Z' },
  { id: 'rcp-ts-standard', productId: 'prd-ts250', name: 'Standard Trigger Test', forceSetpointN: 42, pressDurationMs: 920, strokeMm: 11, isDefault: true, createdAt: '2026-08-18T08:00:00Z', updatedAt: '2026-09-22T13:15:00Z' },
  { id: 'rcp-ts-extended', productId: 'prd-ts250', name: 'Extended Trigger Test', forceSetpointN: 44, pressDurationMs: 1100, strokeMm: 11.5, isDefault: false, createdAt: '2026-08-18T08:10:00Z', updatedAt: '2026-09-12T08:30:00Z' },
  { id: 'rcp-cs-standard', productId: 'prd-cs150', name: 'Continuous Spray Test', forceSetpointN: 38, pressDurationMs: 780, strokeMm: 9.2, isDefault: true, createdAt: '2026-08-21T08:00:00Z', updatedAt: '2026-09-20T11:05:00Z' },
];

export class FixtureProductRepository implements ProductRepository {
  private products = productFixtures.map(product => structuredClone(product));
  private recipes = recipeFixtures.map(recipe => structuredClone(recipe));
  private productSequence = this.products.length + 1;
  private recipeSequence = this.recipes.length + 1;

  async listProducts() { return this.products.map(product => structuredClone(product)); }
  async getProduct(id: string) { return structuredClone(this.products.find(product => product.id === id) ?? null); }

  async createProduct(input: CreateProductInput) {
    const now = '2026-09-29T14:05:00Z';
    const product: Product = { ...structuredClone(input), id: `prd-local-${String(this.productSequence++).padStart(3, '0')}`, createdAt: now, updatedAt: now };
    this.products.push(product);
    return structuredClone(product);
  }

  async updateProduct(id: string, input: UpdateProductInput) {
    const index = this.products.findIndex(product => product.id === id);
    if (index < 0) throw new Error(`Unknown product ${id}`);
    this.products[index] = { ...this.products[index], ...structuredClone(input), packaging: { ...this.products[index].packaging, ...input.packaging }, actuator: { ...this.products[index].actuator, ...input.actuator }, updatedAt: '2026-09-29T14:05:00Z' };
    return structuredClone(this.products[index]);
  }

  async listRecipes(productId: string) { return this.recipes.filter(recipe => recipe.productId === productId).map(recipe => structuredClone(recipe)); }

  async createRecipe(productId: string, input: CreateRecipeInput) {
    if (!this.products.some(product => product.id === productId)) throw new Error(`Unknown product ${productId}`);
    if (input.isDefault) this.recipes = this.recipes.map(recipe => recipe.productId === productId ? { ...recipe, isDefault: false } : recipe);
    const now = '2026-09-29T14:05:00Z';
    const recipe: TestRecipe = { ...structuredClone(input), id: `rcp-local-${String(this.recipeSequence++).padStart(3, '0')}`, productId, createdAt: now, updatedAt: now };
    this.recipes.push(recipe);
    return structuredClone(recipe);
  }

  async updateRecipe(id: string, input: UpdateRecipeInput) {
    const index = this.recipes.findIndex(recipe => recipe.id === id);
    if (index < 0) throw new Error(`Unknown recipe ${id}`);
    const productId = this.recipes[index].productId;
    if (input.isDefault) this.recipes = this.recipes.map(recipe => recipe.productId === productId ? { ...recipe, isDefault: false } : recipe);
    this.recipes[index] = { ...this.recipes[index], ...structuredClone(input), updatedAt: '2026-09-29T14:05:00Z' };
    return structuredClone(this.recipes[index]);
  }

  async setDefaultRecipe(productId: string, recipeId: string) {
    if (!this.recipes.some(recipe => recipe.id === recipeId && recipe.productId === productId)) throw new Error('Recipe does not belong to product');
    this.recipes = this.recipes.map(recipe => recipe.productId === productId ? { ...recipe, isDefault: recipe.id === recipeId } : recipe);
    return this.listRecipes(productId);
  }
}

export const productRepository = new FixtureProductRepository();
