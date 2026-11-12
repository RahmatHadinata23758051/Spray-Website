import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product, TestRecipe } from '@spray-paragon/domain';
import { productRepository, kodePengujianRepository } from '../../../application/services';
import {
  FormField,
  Input,
  Select,
  Textarea,
} from '../../components/ui';

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

  const handleCreateAndStart = async () => {
    if (!product || submitting) return;

    setSubmitting(true);
    try {
      const defaultRecipe = recipe || recipes[0] || {
        id: 'rcp-default',
        name: 'Standard Spray Test',
        forceSetpointN: 35.0,
        pressDurationMs: 1500,
        strokeMm: 8.5,
      };

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

      // Auto-create Sample 01
      const sampleRes = await kodePengujianRepository.addSample(kp.id, {
        sampleCode: 'SMP-01',
        positionInRun: 1,
        storageCondition: storageCondition || undefined,
        bottlePosition: bottlePosition || undefined,
      });

      // Auto-create TestRun 01
      const runRes = await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: sampleRes.sample.id,
        recipeId: defaultRecipe.id,
        recipeSnapshot: {
          name: defaultRecipe.name,
          forceSetpointN: defaultRecipe.forceSetpointN,
          pressDurationMs: defaultRecipe.pressDurationMs,
          strokeMm: defaultRecipe.strokeMm,
        },
        setpoints: {
          forceSetpointN: defaultRecipe.forceSetpointN,
          pressDurationMs: defaultRecipe.pressDurationMs,
          strokeMm: defaultRecipe.strokeMm,
        },
        fixture: 'nominal-01',
        operatorId: 'usr-np',
        operatorName: 'Nadia Putri',
        repetitionIndex: 1,
      });

      navigate(`/kode-pengujian/${kp.id}/samples/${sampleRes.sample.id}/runs/${runRes.testRun.id}/execute?step=1`);
    } catch (err) {
      console.error('Gagal membuat dan memulai pengujian', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-3 pb-8">
      {/* Back button navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/kode-pengujian')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
        >
          <span>&larr;</span> <span>Kembali ke Daftar Kode Pengujian</span>
        </button>
      </div>

      {/* Primary single white structured form surface */}
      <div className="rounded-[10px] border border-border-default bg-surface shadow-xs overflow-hidden">
        <form onSubmit={handleSubmit} className="divide-y divide-border-subtle">
          {/* Section 1: Identitas Produk */}
          <div className="p-5 md:p-6 space-y-4">
            <div className="border-b border-border-subtle pb-2.5">
              <h2 className="text-xs font-semibold text-text-primary">
                Identitas Produk
              </h2>
              <p className="text-[11px] text-text-muted mt-0.5">
                Spesifikasi produk dan lot formula yang akan diuji.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(260px,2fr)_minmax(180px,1fr)_minmax(180px,1fr)] gap-4 items-start">
              <FormField label="Produk" required className="whitespace-nowrap">
                <Select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full text-xs"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.productCode})
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Lot Produk / Referensi Material" className="whitespace-nowrap">
                <Input
                  type="text"
                  placeholder="Contoh: LOT-2026-X1"
                  value={productLot}
                  onChange={(e) => setProductLot(e.target.value)}
                  className="w-full text-xs"
                />
              </FormField>

              <FormField label="Periode Pengujian" className="whitespace-nowrap">
                <Input
                  type="text"
                  placeholder="Contoh: Minggu 42 - Stabilitas"
                  value={testPeriod}
                  onChange={(e) => setTestPeriod(e.target.value)}
                  className="w-full text-xs"
                />
              </FormField>
            </div>

            {/* Compact inline product spec pill aligned under the product selector */}
            {product && (
              <div className="mt-2 inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded border border-border-subtle bg-surface-subtle px-3 py-1.5 text-xs text-text-secondary font-mono">
                <span className="font-bold text-text-primary">{product.productCode}</span>
                <span className="text-border-strong font-normal">·</span>
                <span className="text-text-primary font-medium font-sans">{product.name}</span>
                <span className="text-border-strong font-normal">·</span>
                <span>{product.nominalVolumeMl} mL</span>
                <span className="text-border-strong font-normal">·</span>
                <span className="font-sans text-[11px] text-text-muted">{product.category}</span>
              </div>
            )}
          </div>

          {/* Section 2: Metodologi Default (Opsional) */}
          <div className="p-5 md:p-6 space-y-4">
            <div className="border-b border-border-subtle pb-2.5">
              <h2 className="text-xs font-semibold text-text-primary">
                Metodologi Default (Opsional)
              </h2>
              <p className="text-[11px] text-text-muted mt-0.5">
                Metodologi standar yang diwariskan ke sampel uji.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[minmax(320px,1.5fr)_minmax(280px,1fr)] gap-4 items-start">
              <FormField
                label="Metodologi Default"
                hint="Dapat diubah per pengujian."
                className="whitespace-nowrap"
              >
                <Select
                  value={recipeId}
                  onChange={(e) => setRecipeId(e.target.value)}
                  className="w-full text-xs"
                >
                  <option value="">— Pilih metodologi default (opsional) —</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.forceSetpointN} N, {r.pressDurationMs} ms, {r.strokeMm} mm)
                    </option>
                  ))}
                </Select>
              </FormField>

              {recipe && (
                <div className="md:pt-5">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded border border-border-subtle bg-surface-subtle text-xs font-mono text-text-secondary">
                    <span className="text-text-muted font-sans font-medium text-[11px]">
                      Setpoint:
                    </span>
                    <span className="font-medium text-text-primary">{recipe.forceSetpointN} N</span>
                    <span className="text-border-strong font-normal">·</span>
                    <span className="font-medium text-text-primary">{recipe.pressDurationMs} ms</span>
                    <span className="text-border-strong font-normal">·</span>
                    <span className="font-medium text-text-primary">{recipe.strokeMm} mm stroke</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Konteks Default */}
          <div className="p-5 md:p-6 space-y-4">
            <div className="border-b border-border-subtle pb-2.5">
              <h2 className="text-xs font-semibold text-text-primary">
                Konteks Default
              </h2>
              <p className="text-[11px] text-text-muted mt-0.5">
                Parameter penyimpanan dan orientasi botol default.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Kondisi Penyimpanan Default" className="whitespace-nowrap">
                <Input
                  type="text"
                  placeholder="Contoh: Gudang 25°C"
                  value={storageCondition}
                  onChange={(e) => setStorageCondition(e.target.value)}
                  className="w-full text-xs"
                />
              </FormField>

              <FormField label="Posisi Botol Default" className="whitespace-nowrap">
                <Input
                  type="text"
                  placeholder="Contoh: Tegak / Terbalik"
                  value={bottlePosition}
                  onChange={(e) => setBottlePosition(e.target.value)}
                  className="w-full text-xs"
                />
              </FormField>
            </div>

            <FormField label="Catatan Konteks">
              <Textarea
                rows={3}
                placeholder="Catatan tambahan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs"
              />
            </FormField>
          </div>

          {/* Section 4: Action Footer inside the primary form surface */}
          <div className="border-t border-border-default bg-surface-subtle/50 px-5 md:px-6 py-3.5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => navigate('/kode-pengujian')}
              className="btn btn-secondary !min-h-[34px] px-4 text-xs font-medium"
            >
              Batalkan
            </button>
            <div className="flex items-center gap-2.5">
              <button
                type="submit"
                disabled={!product || submitting}
                className="btn btn-secondary !min-h-[34px] px-4 text-xs font-medium"
              >
                {submitting ? 'Membuat...' : 'Buat Kode Pengujian'}
              </button>
              <button
                type="button"
                onClick={handleCreateAndStart}
                disabled={!product || submitting}
                className="btn btn-primary !min-h-[34px] px-4 text-xs font-medium flex items-center gap-1.5 shadow-sm"
                id="btn-buat-dan-mulai"
              >
                <span>{submitting ? 'Memproses...' : 'Buat & Mulai Pengujian'}</span>
                <span>&rarr;</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
