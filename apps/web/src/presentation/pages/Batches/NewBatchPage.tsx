import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product, TestRecipe } from '@spray-paragon/domain';
import { productRepository, batchRepository } from '../../../application/services';
import type { FixtureScenario } from '@spray-paragon/domain';

export function NewBatchPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<TestRecipe[]>([]);
  
  const [productId, setProductId] = useState('');
  const [recipeId, setRecipeId] = useState('');
  const [productLot, setProductLot] = useState('');
  const [notes, setNotes] = useState('');
  
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
        operatorId: 'usr-np',
        operatorName: 'Nadia Putri',
        fixture,
        notes
      });
      
      navigate(`/batches/${draft.id}`);
    } catch (err) {
      console.error('Failed to create batch draft', err);
    }
  };

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start max-w-[1320px] mx-auto w-full">
      <div className="flex-1 min-w-0 bg-surface rounded-xl border border-border-default shadow-[0_4px_20px_rgba(16,42,67,0.04)] overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 p-6 lg:p-8 space-y-7">
            {/* Product Identity */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-2">Identitas Produk</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="form-group space-y-1.5">
                  <label className="form-label">Produk</label>
                  <select 
                    value={productId} 
                    onChange={e => setProductId(e.target.value)}
                    className="form-select w-full"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.productCode})</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group space-y-1.5">
                  <label className="form-label">Lot Produk / Lot Manufaktur</label>
                  <input 
                    type="text" 
                    value={productLot} 
                    onChange={e => setProductLot(e.target.value)} 
                    placeholder="mis. LOT-24A-09"
                    className="form-input w-full"
                  />
                </div>
              </div>
            </section>

            {/* Test Parameters */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-2">Parameter Pengujian Diminta</h3>
              <div className="form-group space-y-1.5">
                <label className="form-label">Resep Pengujian</label>
                <select 
                  value={recipeId} 
                  onChange={e => setRecipeId(e.target.value)}
                  className="form-select w-full sm:w-1/2"
                >
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>{r.name}{r.isDefault ? ' (Bawaan)' : ''}</option>
                  ))}
                </select>
              </div>
              
              {recipe && (
                <div className="grid grid-cols-3 gap-0 rounded-md overflow-hidden border border-border-default bg-surface w-full sm:w-[80%] max-w-[600px]">
                  <div className="p-3.5 border-r border-border-default">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Target Gaya</div>
                    <div className="mt-1 font-mono text-base font-bold text-text-primary">{recipe.forceSetpointN} N</div>
                  </div>
                  <div className="p-3.5 border-r border-border-default">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Durasi Tekan</div>
                    <div className="mt-1 font-mono text-base font-bold text-text-primary">{recipe.pressDurationMs} ms</div>
                  </div>
                  <div className="p-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Langkah Aktuator</div>
                    <div className="mt-1 font-mono text-base font-bold text-text-primary">{recipe.strokeMm} mm</div>
                  </div>
                </div>
              )}
            </section>

            {/* Additional Info */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-2">Informasi Tambahan</h3>
              <div className="form-group space-y-1.5">
                <label className="form-label">Catatan (Opsional)</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  rows={2}
                  placeholder="Pengamatan atau persyaratan khusus untuk batch ini..."
                  className="form-textarea w-full resize-none"
                />
              </div>
            </section>

            {/* Simulation Settings */}
            <section className="rounded-md border border-border-default overflow-hidden">
              <button 
                type="button" 
                onClick={() => setSimulationOpen(!simulationOpen)}
                className="w-full flex items-center justify-between bg-surface-subtle px-3 py-2.5 text-sm font-bold text-text-primary hover:bg-border-subtle transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-semantic-warning" />
                  <span>Pengaturan Simulasi</span>
                </div>
                <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">{simulationOpen ? 'Sembunyikan' : 'Tampilkan'}</span>
              </button>
              {simulationOpen && (
                <div className="p-4 bg-surface border-t border-border-subtle">
                  <div className="form-group space-y-1.5 sm:w-1/2">
                    <label className="form-label">Skenario</label>
                    <select 
                      value={fixture} 
                      onChange={e => setFixture(e.target.value as FixtureScenario)}
                      className="form-select w-full"
                    >
                      <option value="nominal-01">Nominal (Lulus)</option>
                      <option value="nominal-02">Nominal Varian 2 (Lulus)</option>
                      <option value="direction-offset-01">Direction Offset (Gagal - Sudut)</option>
                      <option value="clogged-nozzle-01">Clogged Nozzle (Gagal - Asimetri)</option>
                      <option value="drip-01">Drip / Leak (Gagal - Kebocoran)</option>
                    </select>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 lg:px-8 py-4 bg-bg-subtle border-t border-border-subtle">
            <button 
              type="button"
              onClick={() => navigate('/batches')}
              className="btn btn-tertiary"
            >
              Batal
            </button>
            <button 
              type="submit" 
              aria-label="Buat Draf Batch"
              disabled={!product || !recipe}
              className="btn btn-primary"
            >
              Buat Draf Batch
            </button>
          </div>
        </form>
      </div>

      <div className="w-full xl:w-[340px] shrink-0">
        <div className="bg-surface rounded-xl border border-border-default shadow-[0_4px_20px_rgba(16,42,67,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle bg-bg-subtle">
            <h3 className="text-sm font-bold text-text-primary">Ringkasan Batch</h3>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">Produk</div>
              <div className="text-sm font-bold text-text-primary">{product ? product.name : '—'}</div>
              {product && <div className="text-xs font-semibold text-text-secondary mt-0.5">{product.productCode}</div>}
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">Lot Produk</div>
              <div className="text-sm font-medium text-text-primary">{productLot || 'Belum diisi'}</div>
            </div>
            <div className="border-t border-border-subtle pt-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">Resep</div>
              <div className="text-sm font-bold text-text-primary">{recipe ? recipe.name : '—'}</div>
            </div>
            {recipe && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">Target Gaya</div>
                  <div className="font-mono text-sm font-medium text-text-primary">{recipe.forceSetpointN} N</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">Langkah</div>
                  <div className="font-mono text-sm font-medium text-text-primary">{recipe.strokeMm} mm</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">Durasi Tekan</div>
                  <div className="font-mono text-sm font-medium text-text-primary">{recipe.pressDurationMs} ms</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
