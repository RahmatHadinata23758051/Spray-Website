export interface Product {
  id: string;
  productCode: string;
  name: string;
  category: string;
  nominalVolumeMl?: number;
  packaging: {
    material?: string;
    heightMm?: number;
    diameterMm?: number;
  };
  actuator: {
    nozzleType?: string;
    actuatorShape?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestRecipe {
  id: string;
  productId: string;
  name: string;
  description?: string;
  forceSetpointN: number;
  pressDurationMs: number;
  strokeMm: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProductInput = Partial<CreateProductInput>;
export type CreateRecipeInput = Omit<TestRecipe, 'id' | 'productId' | 'createdAt' | 'updatedAt'>;
export type UpdateRecipeInput = Partial<CreateRecipeInput>;

export interface ProductRepository {
  listProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | null>;
  createProduct(input: CreateProductInput): Promise<Product>;
  updateProduct(id: string, input: UpdateProductInput): Promise<Product>;
  listRecipes(productId: string): Promise<TestRecipe[]>;
  createRecipe(productId: string, input: CreateRecipeInput): Promise<TestRecipe>;
  updateRecipe(id: string, input: UpdateRecipeInput): Promise<TestRecipe>;
  setDefaultRecipe(productId: string, recipeId: string): Promise<TestRecipe[]>;
}
