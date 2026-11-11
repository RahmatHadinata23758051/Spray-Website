import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product, TestRecipe } from '@spray-paragon/domain';
import { productRepository, kodePengujianRepository } from '../../../application/services';
import {
  FormField,
  Input,
  Select,
  Textarea,
  FormSection,
  ActionBar,
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

  return (
    <div className="max-w-5xl mx-auto w-full space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div>
          <button
            type="button"
            onClick={() => navigate('/kode-pengujian')}
            className="text-xs font-semibold text-text-muted hover:text-text-primary mb-1 flex items-center gap-1 transition-colors"
          >
            <span>&larr;</span> <span>Kembali ke Daftar Kode Pengujian</span>
          </button>
          <h1 className="text-xl font-bold tracking-tight text-text-primary">
            Buat Kode Pengujian Baru
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Daftarkan konteks pengujian batch/formula bersama untuk rangkaian sampel uji.
          </p>
        </div>
      </div>

      {/* Main operational form container */}
      <div className="rounded-md border border-border-default bg-surface shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="divide-y divide-border-subtle">
          {/* Section 1: Identitas Produk */}
          <FormSection
            title="Identitas Produk"
            subtitle="Spesifikasi produk dan lot formula yang akan diuji."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3.5">
              <FormField label="Produk" required>
                <Select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.productCode})
                    </option>
                  ))}
                </Select>
              </FormField>

              <FormField label="Lot Produk / Referensi Material">
                <Input
                  type="text"
                  placeholder="Contoh: LOT-2026-X1"
                  value={productLot}
                  onChange={(e) => setProductLot(e.target.value)}
                />
              </FormField>

              <FormField label="Periode Pengujian">
                <Input
                  type="text"
                  placeholder="Contoh: Minggu 42 - Stabilitas"
                  value={testPeriod}
                  onChange={(e) => setTestPeriod(e.target.value)}
                />
              </FormField>
            </div>

            {/* Compact product spec readout */}
            {product && (
              <div className="mt-3.5 rounded border border-border-subtle bg-surface-subtle/50 px-3 py-2 text-xs flex flex-wrap items-center gap-x-6 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted font-medium">Kode:</span>
                  <span className="font-mono font-semibold text-text-primary">{product.productCode}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted font-medium">Nama:</span>
                  <span className="font-semibold text-text-primary">{product.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted font-medium">Kategori:</span>
                  <span className="text-text-secondary">{product.category}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted font-medium">Volume Nominal:</span>
                  <span className="font-mono text-text-secondary">{product.nominalVolumeMl} mL</span>
                </div>
              </div>
            )}
          </FormSection>

          {/* Section 2: Metodologi Default (Opsional) */}
          <FormSection
            title="Metodologi Default (Opsional)"
            subtitle="Metodologi standar yang otomatis diwariskan ke setiap pengujian sampel."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3.5">
              <FormField
                label="Metodologi Default"
                hint="Dapat diubah per pengujian. Kosongkan jika belum ditentukan."
              >
                <Select
                  value={recipeId}
                  onChange={(e) => setRecipeId(e.target.value)}
                  className="w-full"
                >
                  <option value="">— Pilih metodologi default (opsional) —</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.forceSetpointN} N, {r.pressDurationMs} ms, {r.strokeMm} mm)
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            {recipe && (
              <div className="mt-3.5 rounded border border-border-subtle bg-surface-subtle p-3 space-y-2">
                <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                  Setpoint Metodologi Terpilih
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded border border-border-subtle/80 bg-surface px-3 py-2">
                    <div className="text-[11px] text-text-muted">Gaya Setpoint</div>
                    <div className="font-mono font-bold text-sm text-text-primary mt-0.5">
                      {recipe.forceSetpointN} N
                    </div>
                  </div>
                  <div className="rounded border border-border-subtle/80 bg-surface px-3 py-2">
                    <div className="text-[11px] text-text-muted">Durasi Tekan</div>
                    <div className="font-mono font-bold text-sm text-text-primary mt-0.5">
                      {recipe.pressDurationMs} ms
                    </div>
                  </div>
                  <div className="rounded border border-border-subtle/80 bg-surface px-3 py-2">
                    <div className="text-[11px] text-text-muted">Jarak Gerak (Stroke)</div>
                    <div className="font-mono font-bold text-sm text-text-primary mt-0.5">
                      {recipe.strokeMm} mm
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-text-muted">
                  Setpoint ini hanya menjadi default. Setiap pengujian (Test Run) dapat memilih metodologi berbeda.
                </p>
              </div>
            )}
          </FormSection>

          {/* Section 3: Konteks Default */}
          <FormSection
            title="Konteks Default (Berlaku untuk Sampel jika tidak dioverride)"
            subtitle="Parameter lingkungan penyimpanan dan orientasi botol yang diwariskan ke semua botol sampel."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3.5">
              <FormField label="Kondisi Penyimpanan Default">
                <Input
                  type="text"
                  placeholder="Contoh: Gudang 25°C"
                  value={storageCondition}
                  onChange={(e) => setStorageCondition(e.target.value)}
                />
              </FormField>

              <FormField label="Posisi Botol Default">
                <Input
                  type="text"
                  placeholder="Contoh: Tegak / Terbalik"
                  value={bottlePosition}
                  onChange={(e) => setBottlePosition(e.target.value)}
                />
              </FormField>

              <FormField label="Catatan Konteks">
                <Textarea
                  rows={2}
                  placeholder="Catatan tambahan..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Bottom Action Bar */}
          <ActionBar
            info="Pastikan identitas produk dan lot telah sesuai sebelum membuat kode pengujian."
            actions={
              <>
                <button
                  type="button"
                  onClick={() => navigate('/kode-pengujian')}
                  className="btn btn-secondary !min-h-[34px] px-4 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!product || submitting}
                  className="btn btn-primary !min-h-[34px] px-5 text-xs font-semibold"
                >
                  {submitting ? 'Membuat...' : 'Buat Kode Pengujian'}
                </button>
              </>
            }
          />
        </form>
      </div>
    </div>
  );
}
