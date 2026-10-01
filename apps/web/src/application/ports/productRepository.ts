import type {
  Product,
  TestRecipe,
  CreateProductInput,
  UpdateProductInput,
  CreateRecipeInput,
  UpdateRecipeInput,
} from '@spray-paragon/domain';

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
