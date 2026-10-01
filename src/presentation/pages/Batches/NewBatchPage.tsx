import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product, TestRecipe } from '../../../domain/product';
import { productRepository } from '../../../data/productRepository';
import { batchRepository } from '../../../data/batchRepositoryInstance';
import type { FixtureScenario } from '../../../domain/types';

export function NewBatchPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<TestRecipe[]>([]);
  
  const [productId, setProductId] = useState('');
  const [recipeId, setRecipeId] = useState('');
  const [productLot, setProductLot] = useState('');
  const [notes, setNotes] = useState('');
  
  // Simulation settings (not mixed with core identity)
  const [fixture, setFixture] = useState<FixtureScenario>('nominal-01');
  const [simulationOpen, setSimulationOpen] = useState(false);

  useEffect(() => {
    let active = true;
    productRepository.listProducts().then(items => {
      if (!active) return;
      setProducts(items);
      if (items[0]) setProductId(items[0].id);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    productRepository.listRecipes(productId).then(items => {
      if (!active) return;
      setRecipes(items);
      setRecipeId((items.find(recipe => recipe.isDefault) ?? items[0])?.id ?? '');
    });
    return () => { active = false; };
  }, [productId]);

  const product = products.find(item => item.id === productId);
  const recipe = recipes.find(item => item.id === recipeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !recipe) return;

    try {
      const draft = await batchRepository.createBatchDraft({
        productId: product.id,
        productSnapshot: { productCode: product.productCode, productName: product.name },
        recipeId: recipe.id,
        recipeSnapshot: { name: recipe.name, forceSetpointN: recipe.forceSetpointN, pressDurationMs: recipe.pressDurationMs, strokeMm: recipe.strokeMm },
        productLot,
        operatorId: 'usr-np', // Authenticated user context stub
        operatorName: 'Nadia Putri',
        fixture,
        notes
      });
      
      // Navigate to detail page for the new batch draft
      navigate(`/batches/${draft.id}`);
    } catch (err) {
      console.error('Failed to create batch draft', err);
      // Fallback UI or toast could be added here
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-border-subtle pb-3">
        <h1 className="text-xl font-bold tracking-tight text-text-primary">New Batch</h1>
        <p className="mt-1 text-sm text-text-secondary">Configure product, recipe, and lot to begin a new spray test batch.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Product Identity */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-subtle pb-2">Product Identity</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">Product</label>
              <select 
                value={productId} 
                onChange={e => setProductId(e.target.value)}
                className="w-full rounded-sm border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.productCode})</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-primary">Product Lot / Manufacturing Lot</label>
              <input 
                type="text" 
                value={productLot} 
                onChange={e => setProductLot(e.target.value)} 
                placeholder="e.g. LOT-24A-09"
                className="w-full rounded-sm border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-text-muted"
              />
            </div>
          </div>
        </div>

        {/* Test Parameters */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-text-primary border-b border-border-subtle pb-2">Requested Test Parameters</h2>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary">Test Recipe</label>
            <select 
              value={recipeId} 
              onChange={e => setRecipeId(e.target.value)}
              className="w-full sm:w-1/2 rounded-sm border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              {recipes.map(r => (
                <option key={r.id} value={r.id}>{r.name}{r.isDefault ? ' (Default)' : ''}</option>
              ))}
            </select>
          </div>
          
          {recipe && (
            <div className="grid grid-cols-3 gap-4 rounded-sm border border-border-subtle bg-bg-subtle p-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Force Setpoint</div>
                <div className="mt-0.5 text-sm font-medium text-text-primary">{recipe.forceSetpointN} N</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Press Duration</div>
                <div className="mt-0.5 text-sm font-medium text-text-primary">{recipe.pressDurationMs} ms</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">Stroke</div>
                <div className="mt-0.5 text-sm font-medium text-text-primary">{recipe.strokeMm} mm</div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary">Notes (Optional)</label>
          <textarea 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            rows={2}
            className="w-full rounded-sm border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="border border-border-subtle rounded-sm overflow-hidden">
          <button 
            type="button" 
            onClick={() => setSimulationOpen(!simulationOpen)}
            className="w-full flex items-center justify-between bg-bg-subtle px-3 py-2 text-xs font-semibold text-text-primary hover:bg-border-subtle/30"
          >
            <span>Simulation Settings</span>
            <span className="text-text-muted">{simulationOpen ? 'Hide' : 'Show'}</span>
          </button>
          {simulationOpen && (
            <div className="p-3 bg-bg-surface border-t border-border-subtle space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-primary">Scenario</label>
                <select 
                  value={fixture} 
                  onChange={e => setFixture(e.target.value as FixtureScenario)}
                  className="w-full sm:w-1/2 rounded-sm border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="nominal-01">Nominal (Pass)</option>
                  <option value="nominal-02">Nominal Variant 2 (Pass)</option>
                  <option value="direction-offset-01">Direction Offset (Fail - Plume Angle)</option>
                  <option value="clogged-nozzle-01">Clogged Nozzle (Fail - Asymmetry)</option>
                  <option value="drip-01">Drip / Leak (Fail - Liquid presence)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit" 
            disabled={!product || !recipe}
            className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover shadow-[0_1px_2px_rgba(0,0,0,0.05)] disabled:opacity-50"
          >
            Create Batch Draft
          </button>
        </div>
      </form>
    </div>
  );
}
