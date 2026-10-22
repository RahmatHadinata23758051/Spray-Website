import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product, TestRecipe } from '@spray-paragon/domain';
import { productRepository, kodePengujianRepository } from '../../../application/services';

export function NewKodePengujianPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<TestRecipe[]>([]);

  const [productId, setProductId] = useState('');
  const [recipeId, setRecipeId] = useState('');
  const [productLot, setProductLot] = useState('');
  const [testPeriod, setTestPeriod] = useState('');
  const [storageCondition, setStorageCondition] = useState('');
  const [bottlePosition, setBottlePosition] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    productRepository.listProducts().then((items) => {
      if (!active) return;
      setProducts(items);
      if (items[0]) setProductId(items[0].id);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    productRepository.listRecipes(productId).then((items) => {
      if (!active) return;
      setRecipes(items);
      setRecipeId(
        (items.find((recipe) => recipe.isDefault) ?? items[0])?.id ?? ''
      );
    });
    return () => {
      active = false;
    };
  }, [productId]);

  const product = products.find((item) => item.id === productId);
  const recipe = recipes.find((item) => item.id === recipeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || submitting) return;

    setSubmitting(true);
    try {
      const kp = await kodePengujianRepository.create({
        productId: product.id,
        productSnapshot: {
          productCode: product.productCode,
          productName: product.name,
        },
        productLot: productLot || undefined,
        testPeriod: testPeriod || undefined,
        operatorId: 'usr-np',
        operatorName: 'Nadia Putri',
        storageCondition: storageCondition || undefined,
        bottlePosition: bottlePosition || undefined,
        notes: notes || undefined,
        defaultRecipeId: recipe ? recipe.id : undefined,
        defaultRecipeSnapshot: recipe
          ? {
              name: recipe.name,
              forceSetpointN: recipe.forceSetpointN,
              pressDurationMs: recipe.pressDurationMs,
              strokeMm: recipe.strokeMm,
            }
          : undefined,
      });

      navigate(`/kode-pengujian/${kp.id}`);
    } catch (err) {
      console.error('Gagal membuat kode pengujian', err);
    } finally {
      setSubmitting(false);
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
                  <label className="form-label">Produk <span className="text-semantic-danger">*</span></label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="form-select w-full"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.productCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group space-y-1.5">
                  <label className="form-label">Lot Produk / Referensi Material</label>
                  <input
                    type="text"
                    placeholder="Contoh: LOT-2026-X1"
                    className="form-input w-full"
                    value={productLot}
                    onChange={(e) => setProductLot(e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* Recipe Selection - Optional default only */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-2">Metodologi Default (Opsional)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="form-group space-y-1.5">
                  <label className="form-label">Metodologi Default</label>
                  <p className="text-xs text-text-muted">Dapat diubah per pengujian. Kosongkan jika belum ditentukan.</p>
                  <select
                    value={recipeId}
                    onChange={(e) => setRecipeId(e.target.value)}
                    className="form-select w-full"
                  >
                    <option value="">— Pilih metodologi default (opsional) —</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.forceSetpointN} N, {r.pressDurationMs} ms, {r.strokeMm} mm)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group space-y-1.5">
                  <label className="form-label">Periode Pengujian</label>
                  <input
                    type="text"
                    placeholder="Contoh: Minggu 42 - Stabilitas"
                    className="form-input w-full"
                    value={testPeriod}
                    onChange={(e) => setTestPeriod(e.target.value)}
                  />
                </div>
              </div>

              {recipe && (
                <div className="bg-surface-subtle rounded-input p-4 space-y-2">
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider">Setpoint Metodologi Terpilih</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-text-muted">Gaya Setpoint</div>
                      <div className="font-mono font-semibold text-text-primary">{recipe.forceSetpointN} N</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Durasi Tekan</div>
                      <div className="font-mono font-semibold text-text-primary">{recipe.pressDurationMs} ms</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Jarak Gerak (Stroke)</div>
                      <div className="font-mono font-semibold text-text-primary">{recipe.strokeMm} mm</div>
                    </div>
                  </div>
                  <p className="text-xs text-text-muted">
                    Setpoint ini hanya menjadi default. Setiap pengujian (Test Run) dapat memilih metodologi berbeda.
                  </p>
                </div>
              )}
            </section>

            {/* Shared Context Defaults */}
            <section className="space-y-4">
              <h3 className="text-sm font-bold text-text-primary border-b border-border-subtle pb-2">
                Konteks Default (Berlaku untuk Sampel jika tidak dioverride)
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="form-group space-y-1.5">
                  <label className="form-label">Kondisi Penyimpanan Default</label>
                  <input
                    type="text"
                    placeholder="Contoh: Gudang 25°C"
                    className="form-input w-full"
                    value={storageCondition}
                    onChange={(e) => setStorageCondition(e.target.value)}
                  />
                </div>
                <div className="form-group space-y-1.5">
                  <label className="form-label">Posisi Botol Default</label>
                  <input
                    type="text"
                    placeholder="Contoh: Tegak / Terbalik"
                    className="form-input w-full"
                    value={bottlePosition}
                    onChange={(e) => setBottlePosition(e.target.value)}
                  />
                </div>
                <div className="form-group space-y-1.5">
                  <label className="form-label">Catatan Konteks</label>
                  <textarea
                    rows={2}
                    placeholder="Catatan tambahan..."
                    className="form-input w-full"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle bg-surface p-4 lg:p-6">
            <button
              type="button"
              onClick={() => navigate('/kode-pengujian')}
              className="btn btn-secondary !min-h-[36px] px-4"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!product || submitting}
              className="btn btn-primary !min-h-[36px] px-6"
            >
              {submitting ? 'Membuat...' : 'Buat Kode Pengujian'}
            </button>
          </div>
        </form>
      </div>

      {/* Right Sidebar - Product/Recipe Info */}
      <div className="xl:w-80 xl:shrink-0 space-y-4 hidden xl:block">
        <div className="bg-surface rounded-xl border border-border-default shadow-[0_4px_20px_rgba(16,42,67,0.04)] overflow-hidden">
          <div className="p-4 border-b border-border-subtle bg-surface-subtle">
            <h4 className="text-sm font-bold text-text-primary">Ringkasan Produk</h4>
          </div>
          <div className="p-4 space-y-3">
            {product ? (
              <>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-text-muted">Kode Produk</div>
                  <div className="font-mono text-text-primary">{product.productCode}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-text-muted">Nama Produk</div>
                  <div className="font-semibold text-text-primary">{product.name}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-text-muted">Kategori</div>
                  <div className="text-sm text-text-secondary">{product.category}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-text-muted">Volume Nominal</div>
                  <div className="text-sm text-text-secondary">{product.nominalVolumeMl} mL</div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-text-muted text-sm">Pilih produk untuk melihat detail</div>
            )}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border-default shadow-[0_4px_20px_rgba(16,42,67,0.04)] overflow-hidden">
          <div className="p-4 border-b border-border-subtle bg-surface-subtle">
            <h4 className="text-sm font-bold text-text-primary">Ringkasan Metodologi Default</h4>
          </div>
          <div className="p-4 space-y-3">
            {recipe ? (
              <>
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-text-muted">Nama Metodologi</div>
                  <div className="font-semibold text-text-primary">{recipe.name}</div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 bg-surface-subtle rounded-input">
                    <div className="text-[10px] font-semibold text-text-muted uppercase">Gaya (N)</div>
                    <div className="font-mono text-lg font-bold text-text-primary">{recipe.forceSetpointN}</div>
                  </div>
                  <div className="p-2 bg-surface-subtle rounded-input">
                    <div className="text-[10px] font-semibold text-text-muted uppercase">Durasi (ms)</div>
                    <div className="font-mono text-lg font-bold text-text-primary">{recipe.pressDurationMs}</div>
                  </div>
                  <div className="p-2 bg-surface-subtle rounded-input">
                    <div className="text-[10px] font-semibold text-text-muted uppercase">Stroke (mm)</div>
                    <div className="font-mono text-lg font-bold text-text-primary">{recipe.strokeMm}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-text-muted text-sm">Belum ada metodologi default dipilih</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}