import React, { useState, useEffect } from 'react';
import type { Product, TestRecipe } from '@spray-paragon/domain';
import { productRepository } from '../../../application/services';
import { fmt } from '../../utils/formatters';
import { Status } from '../../components/ui/Status';

export function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<TestRecipe[]>([]);
  const [allRecipes, setAllRecipes] = useState<TestRecipe[]>([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'list' | 'detail' | 'product-form' | 'recipe-form'>('list');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<TestRecipe | null>(null);

  const [prodCode, setProdCode] = useState('');
  const [prodName, setProdName] = useState('');
  const [prodCat, setProdCat] = useState('Fine mist');
  const [prodVol, setProdVol] = useState('100');
  const [pkgMat, setPkgMat] = useState('PETG');
  const [pkgH, setPkgH] = useState('162');
  const [pkgD, setPkgD] = useState('42');
  const [actNozzle, setActNozzle] = useState('Fine Mist Pump');
  const [actShape, setActShape] = useState('Flat actuator');
  const [prodNotes, setProdNotes] = useState('');

  const [rcpName, setRcpName] = useState('');
  const [rcpDesc, setRcpDesc] = useState('');
  const [rcpForce, setRcpForce] = useState('34');
  const [rcpDur, setRcpDur] = useState('850');
  const [rcpStroke, setRcpStroke] = useState('8.5');
  const [rcpDef, setRcpDef] = useState(false);

  useEffect(() => {
    let active = true;
    productRepository.listProducts().then(list => {
      if (!active) return;
      setItems(list);
      Promise.all(list.map(product => productRepository.listRecipes(product.id))).then(groups => { if (active) setAllRecipes(groups.flat()); });
      if (selectedId) productRepository.listRecipes(selectedId).then(list => { if (active) setRecipes(list); });
    });
    return () => { active = false; };
  }, [selectedId]);

  const loadData = () => {
    productRepository.listProducts().then(list => {
      setItems(list);
      Promise.all(list.map(product => productRepository.listRecipes(product.id))).then(groups => setAllRecipes(groups.flat()));
      if (selectedId) productRepository.listRecipes(selectedId).then(setRecipes);
    });
  };

  const selectedProduct = items.find(item => item.id === selectedId) || null;

  const openAddProduct = () => {
    setEditingProduct(null);
    setProdCode(`PRD-${String(items.length + 1).padStart(3, '0')}`);
    setProdName('');
    setProdCat('Fine mist');
    setProdVol('100');
    setPkgMat('PETG'); setPkgH('160'); setPkgD('40');
    setActNozzle('Fine Mist Pump'); setActShape('Flat actuator');
    setProdNotes('');
    setMode('product-form');
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProdCode(product.productCode);
    setProdName(product.name);
    setProdCat(product.category);
    setProdVol(product.nominalVolumeMl ? String(product.nominalVolumeMl) : '');
    setPkgMat(product.packaging.material || '');
    setPkgH(product.packaging.heightMm ? String(product.packaging.heightMm) : '');
    setPkgD(product.packaging.diameterMm ? String(product.packaging.diameterMm) : '');
    setActNozzle(product.actuator.nozzleType || '');
    setActShape(product.actuator.actuatorShape || '');
    setProdNotes(product.notes || '');
    setMode('product-form');
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      productCode: prodCode, name: prodName, category: prodCat, nominalVolumeMl: prodVol ? Number(prodVol) : undefined,
      packaging: { material: pkgMat || undefined, heightMm: pkgH ? Number(pkgH) : undefined, diameterMm: pkgD ? Number(pkgD) : undefined },
      actuator: { nozzleType: actNozzle || undefined, actuatorShape: actShape || undefined },
      notes: prodNotes || undefined,
    };
    if (editingProduct) {
      await productRepository.updateProduct(editingProduct.id, payload);
    } else {
      const created = await productRepository.createProduct(payload);
      await productRepository.createRecipe(created.id, { name: 'Standard Spray Test', forceSetpointN: 34, pressDurationMs: 850, strokeMm: 8.5, isDefault: true });
    }
    loadData();
    setMode(selectedId ? 'detail' : 'list');
  };

  const openAddRecipe = () => {
    setEditingRecipe(null);
    setRcpName(''); setRcpDesc(''); setRcpForce('34'); setRcpDur('850'); setRcpStroke('8.5'); setRcpDef(recipes.length === 0);
    setMode('recipe-form');
  };

  const openEditRecipe = (recipe: TestRecipe) => {
    setEditingRecipe(recipe);
    setRcpName(recipe.name); setRcpDesc(recipe.description || ''); setRcpForce(String(recipe.forceSetpointN)); setRcpDur(String(recipe.pressDurationMs)); setRcpStroke(String(recipe.strokeMm)); setRcpDef(recipe.isDefault);
    setMode('recipe-form');
  };

  const saveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    const payload = { name: rcpName, description: rcpDesc || undefined, forceSetpointN: Number(rcpForce) || 34, pressDurationMs: Number(rcpDur) || 850, strokeMm: Number(rcpStroke) || 8.5, isDefault: rcpDef };
    if (editingRecipe) {
      await productRepository.updateRecipe(editingRecipe.id, payload);
    } else {
      await productRepository.createRecipe(selectedId, payload);
    }
    loadData();
    setMode('detail');
  };

  const handleSetDefaultRecipe = async (recipeId: string) => {
    if (!selectedId) return;
    await productRepository.setDefaultRecipe(selectedId, recipeId);
    loadData();
  };

  const filtered = items.filter(item => `${item.productCode} ${item.name} ${item.category}`.toLowerCase().includes(query.toLowerCase()));

  if (mode === 'product-form') {
    return (
      <div className="surface-panel !rounded-panel max-w-2xl p-6">
        <h2 className="text-base font-bold text-text-primary mb-4 pb-2 border-b border-border-subtle">
          {editingProduct ? 'Edit Data Master Produk' : 'Tambah Data Master Produk'}
        </h2>
        <form onSubmit={saveProduct} className="space-y-5">
          <fieldset className="rounded-lg border border-border-subtle p-4 space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">Informasi Produk</legend>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1 font-semibold text-text-secondary">
                Nama Produk
                <input value={prodName} onChange={e => setProdName(e.target.value)} required placeholder="misal: Fine Mist 100 mL" className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-medium text-text-primary outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1 font-semibold text-text-secondary">
                Kode Produk
                <input value={prodCode} onChange={e => setProdCode(e.target.value)} required placeholder="PRD-FM100" className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-mono text-text-primary outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1 font-semibold text-text-secondary">
                Kategori
                <select value={prodCat} onChange={e => setProdCat(e.target.value)} className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-medium text-text-primary outline-none focus:border-primary">
                  <option value="Fine mist">Fine mist</option>
                  <option value="Trigger spray">Trigger spray</option>
                  <option value="Continuous spray">Continuous spray</option>
                  <option value="Cosmetic atomizer">Cosmetic atomizer</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 font-semibold text-text-secondary">
                Volume Nominal (mL)
                <input type="number" value={prodVol} onChange={e => setProdVol(e.target.value)} placeholder="100" className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-medium text-text-primary outline-none focus:border-primary" />
              </label>
            </div>
          </fieldset>
          <fieldset className="rounded-lg border border-border-subtle p-4 space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">Spesifikasi Kemasan</legend>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <label className="flex flex-col gap-1 font-semibold text-text-secondary">
                Bahan
                <input value={pkgMat} onChange={e => setPkgMat(e.target.value)} placeholder="PETG / HDPE" className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-medium text-text-primary outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1 font-semibold text-text-secondary">
                Tinggi (mm)
                <input type="number" value={pkgH} onChange={e => setPkgH(e.target.value)} placeholder="162" className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-medium text-text-primary outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1 font-semibold text-text-secondary">
                Diameter (mm)
                <input type="number" value={pkgD} onChange={e => setPkgD(e.target.value)} placeholder="42" className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-medium text-text-primary outline-none focus:border-primary" />
              </label>
            </div>
          </fieldset>
          <fieldset className="rounded-lg border border-border-subtle p-4 space-y-3">
            <legend className="text-xs font-bold uppercase tracking-wider text-text-muted px-1">Aktuator / Nosel</legend>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1 font-semibold text-text-secondary">
                Tipe Nosel
                <input value={actNozzle} onChange={e => setActNozzle(e.target.value)} placeholder="Fine Mist Pump" className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-medium text-text-primary outline-none focus:border-primary" />
              </label>
              <label className="flex flex-col gap-1 font-semibold text-text-secondary">
                Bentuk Aktuator
                <input value={actShape} onChange={e => setActShape(e.target.value)} placeholder="Flat actuator" className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-medium text-text-primary outline-none focus:border-primary" />
              </label>
            </div>
          </fieldset>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => setMode(selectedId ? 'detail' : 'list')} className="btn btn-secondary">Batal</button>
            <button type="submit" className="btn btn-primary shadow-sm">Simpan Produk</button>
          </div>
        </form>
      </div>
    );
  }

  if (mode === 'recipe-form') {
    return (
      <div className="surface-panel !rounded-panel max-w-xl p-6">
        <h2 className="text-base font-bold text-text-primary mb-4 pb-2 border-b border-border-subtle">
          {editingRecipe ? 'Edit Resep Pengujian' : 'Tambah Resep Pengujian'}
        </h2>
        <form onSubmit={saveRecipe} className="space-y-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-text-secondary">
            Nama Resep
            <input value={rcpName} onChange={e => setRcpName(e.target.value)} required placeholder="misal: Standard Spray Test" className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-medium text-text-primary outline-none focus:border-primary" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-text-secondary">
            Deskripsi
            <input value={rcpDesc} onChange={e => setRcpDesc(e.target.value)} placeholder="Tujuan rutinitas evaluasi" className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-medium text-text-primary outline-none focus:border-primary" />
          </label>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <label className="flex flex-col gap-1 font-semibold text-text-secondary">
              Gaya (N)
              <input type="number" value={rcpForce} onChange={e => setRcpForce(e.target.value)} required min="1" max="500" className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-mono text-text-primary outline-none focus:border-primary" />
            </label>
            <label className="flex flex-col gap-1 font-semibold text-text-secondary">
              Dur. Tekan (ms)
              <input type="number" value={rcpDur} onChange={e => setRcpDur(e.target.value)} required min="100" max="5000" className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-mono text-text-primary outline-none focus:border-primary" />
            </label>
            <label className="flex flex-col gap-1 font-semibold text-text-secondary">
              Langkah (mm)
              <input type="number" step="0.1" value={rcpStroke} onChange={e => setRcpStroke(e.target.value)} required min="1" max="50" className="rounded-input border border-border-default bg-surface px-3 py-1.5 text-sm font-mono text-text-primary outline-none focus:border-primary" />
            </label>
          </div>
          <label className="flex items-center gap-2 pt-2 text-xs font-semibold text-text-secondary">
            <input type="checkbox" checked={rcpDef} onChange={e => setRcpDef(e.target.checked)} className="rounded" />
            <span>Jadikan resep bawaan untuk {selectedProduct?.name}</span>
          </label>
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
            <button type="button" onClick={() => setMode('detail')} className="btn btn-secondary">Batal</button>
            <button type="submit" className="btn btn-primary shadow-sm">Simpan Resep</button>
          </div>
        </form>
      </div>
    );
  }

  if (mode === 'detail' && selectedProduct) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border-default bg-surface px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setMode('list')} className="btn btn-secondary text-xs">← Produk</button>
            <div>
              <div className="text-lg font-bold text-text-primary">{selectedProduct.name}</div>
              <div className="text-xs font-mono text-text-muted mt-0.5">{selectedProduct.productCode} · {selectedProduct.category}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => openEditProduct(selectedProduct)} className="btn btn-secondary">Edit Produk</button>
            <button onClick={openAddRecipe} className="btn btn-primary shadow-sm">+ Tambah Resep</button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <section className="surface-panel !rounded-panel overflow-hidden">
              <div className="border-b border-border-subtle bg-surface-subtle px-4 py-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Spesifikasi Produk</h3>
              </div>
              <dl className="p-4 space-y-2 text-xs">
                <div className="flex justify-between"><dt className="text-text-muted font-medium">Kode</dt><dd className="font-mono font-bold text-text-primary">{selectedProduct.productCode}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted font-medium">Kategori</dt><dd className="font-semibold text-text-primary">{selectedProduct.category}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted font-medium">Volume Nominal</dt><dd className="font-mono font-bold text-text-primary">{selectedProduct.nominalVolumeMl ? `${selectedProduct.nominalVolumeMl} mL` : 'Tidak ditentukan'}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted font-medium">Bahan Kemasan</dt><dd className="text-text-primary">{selectedProduct.packaging.material || 'Tidak ditentukan'}</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted font-medium">Dimensi</dt><dd className="font-mono text-text-primary">{selectedProduct.packaging.heightMm || '—'} T × {selectedProduct.packaging.diameterMm || '—'} Ø mm</dd></div>
                <div className="flex justify-between"><dt className="text-text-muted font-medium">Profil Nosel</dt><dd className="text-text-primary">{selectedProduct.actuator.nozzleType || 'Standar'}</dd></div>
              </dl>
            </section>
          </div>

          <div className="lg:col-span-2">
            <section className="table-shell">
              <div className="border-b border-border-default bg-surface px-4 py-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">Resep Pengujian</h3>
                <span className="text-xs font-semibold text-text-muted">{recipes.length} dikonfigurasi</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-surface-subtle border-b border-border-subtle text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Resep</th>
                    <th className="px-4 py-2.5 text-left">Setpoin (N / ms / mm)</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-surface text-xs">
                  {recipes.map(r => (
                    <tr key={r.id} className="hover:bg-surface-subtle">
                      <td className="px-4 py-3">
                        <div className="font-bold text-text-primary">{r.name}</div>
                        {r.description && <div className="text-[11px] text-text-muted mt-0.5">{r.description}</div>}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-text-secondary">{r.forceSetpointN} N · {r.pressDurationMs} ms · {r.strokeMm} mm</td>
                      <td className="px-4 py-3">
                        {r.isDefault ? (
                          <Status tone="success">Bawaan</Status>
                        ) : (
                          <button onClick={() => handleSetDefaultRecipe(r.id)} className="text-xs font-semibold text-primary hover:underline">Jadikan bawaan</button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEditRecipe(r)} className="text-xs font-semibold text-primary hover:underline">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-border-default bg-surface px-4 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="text-sm font-bold text-text-primary tracking-tight">Katalog Produk</div>
          <span className="text-xs font-semibold text-text-muted">Product Master Data</span>
        </div>
        <div className="flex items-center gap-3">
          <input 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            placeholder="Filter produk berdasarkan kode, nama, kategori..." 
            className="w-72 rounded-input border border-border-default bg-surface-subtle px-3 py-1.5 text-sm font-medium text-text-primary outline-none focus:border-primary focus:bg-surface" 
          />
          <button onClick={openAddProduct} className="btn btn-primary shadow-sm">+ Tambah Produk</button>
        </div>
      </div>

      <div className="flex-1 table-shell min-h-0">
        <table className="w-full text-sm">
          <thead className="bg-surface sticky top-0 z-10 shadow-[0_1px_0_var(--border-default)] text-[11px] font-bold uppercase tracking-wider text-text-muted">
            <tr>
              <th className="px-4 py-3 text-left">Kode</th>
              <th className="px-4 py-3 text-left">Nama Produk</th>
              <th className="px-4 py-3 text-left">Kategori</th>
              <th className="px-4 py-3 text-left">Volume</th>
              <th className="px-4 py-3 text-left">Resep Bawaan</th>
              <th className="px-4 py-3 text-left">Diperbarui</th>
              <th className="px-4 py-3 text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle bg-surface">
            {filtered.map(p => {
              const defaultRecipe = allRecipes.find(r => r.productId === p.id && r.isDefault);
              return (
                <tr key={p.id} className="hover:bg-surface-subtle transition-colors">
                  <td className="px-4 py-2.5 font-mono font-bold text-primary">{p.productCode}</td>
                  <td className="px-4 py-2.5 font-bold text-text-primary">{p.name}</td>
                  <td className="px-4 py-2.5 font-semibold text-text-secondary">{p.category}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{p.nominalVolumeMl ? `${p.nominalVolumeMl} mL` : '—'}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-text-secondary">{defaultRecipe?.name || 'Standard Spray Test'}</td>
                  <td className="px-4 py-2.5 text-xs text-text-muted">{fmt.date(p.updatedAt)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => { setSelectedId(p.id); setMode('detail'); }} className="text-xs font-semibold text-primary hover:underline">
                      View Detail
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm font-medium text-text-muted">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
