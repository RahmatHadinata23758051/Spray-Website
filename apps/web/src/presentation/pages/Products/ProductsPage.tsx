import React, { useState, useEffect } from 'react';
import type { Product, TestRecipe } from '@spray-paragon/domain';
import { productRepository } from '../../../data';
import { fmt } from '../../../data';
import { Panel } from '../../components/ui/Panel';
import { Table } from '../../components/ui/Table';
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
      <Panel title={editingProduct ? 'Edit product master data' : 'Add product master data'}>
        <form onSubmit={saveProduct} className="master-form-grid">
          <fieldset><legend>PRODUCT INFORMATION</legend><div className="form-grid">
            <label>Product name<input value={prodName} onChange={e => setProdName(e.target.value)} required placeholder="e.g. Fine Mist 100 mL" /></label>
            <label>Product code<input value={prodCode} onChange={e => setProdCode(e.target.value)} required placeholder="PRD-FM100" /></label>
            <label>Category<select value={prodCat} onChange={e => setProdCat(e.target.value)}><option value="Fine mist">Fine mist</option><option value="Trigger spray">Trigger spray</option><option value="Continuous spray">Continuous spray</option><option value="Cosmetic atomizer">Cosmetic atomizer</option></select></label>
            <label>Nominal volume (mL)<input type="number" value={prodVol} onChange={e => setProdVol(e.target.value)} placeholder="100" /></label>
          </div></fieldset>
          <fieldset><legend>PACKAGING</legend><div className="form-grid">
            <label>Material<input value={pkgMat} onChange={e => setPkgMat(e.target.value)} placeholder="PETG / HDPE / Glass" /></label>
            <label>Height (mm)<input type="number" value={pkgH} onChange={e => setPkgH(e.target.value)} placeholder="162" /></label>
            <label>Diameter (mm)<input type="number" value={pkgD} onChange={e => setPkgD(e.target.value)} placeholder="42" /></label>
          </div></fieldset>
          <fieldset><legend>ACTUATOR / NOZZLE</legend><div className="form-grid">
            <label>Nozzle type<input value={actNozzle} onChange={e => setActNozzle(e.target.value)} placeholder="Fine Mist Pump" /></label>
            <label>Actuator shape<input value={actShape} onChange={e => setActShape(e.target.value)} placeholder="Flat actuator" /></label>
          </div></fieldset>
          <fieldset><legend>NOTES</legend><label className="form-wide"><textarea value={prodNotes} onChange={e => setProdNotes(e.target.value)} placeholder="Standard package notes..." /></label></fieldset>
          <div className="setup-actions"><button type="button" onClick={() => setMode(selectedId ? 'detail' : 'list')} className="secondary-button">Cancel</button><button type="submit" className="primary-button">Save Product</button></div>
        </form>
      </Panel>
    );
  }

  if (mode === 'recipe-form') {
    return (
      <Panel title={editingRecipe ? 'Edit Test Recipe' : 'Add Test Recipe'}>
        <form onSubmit={saveRecipe} className="master-form-grid">
          <fieldset><legend>RECIPE DETAILS</legend><div className="form-grid">
            <label className="form-wide">Recipe name<input value={rcpName} onChange={e => setRcpName(e.target.value)} required placeholder="e.g. Standard Spray Test" /></label>
            <label className="form-wide">Description<input value={rcpDesc} onChange={e => setRcpDesc(e.target.value)} placeholder="Evaluation routine purpose" /></label>
            <label>Force setpoint (N)<input type="number" value={rcpForce} onChange={e => setRcpForce(e.target.value)} required min="1" max="500" /></label>
            <label>Press duration (ms)<input type="number" value={rcpDur} onChange={e => setRcpDur(e.target.value)} required min="100" max="5000" /></label>
            <label>Stroke (mm)<input type="number" step="0.1" value={rcpStroke} onChange={e => setRcpStroke(e.target.value)} required min="1" max="50" /></label>
            <label className="form-checkbox-label"><input type="checkbox" checked={rcpDef} onChange={e => setRcpDef(e.target.checked)} /><span>Set as default recipe for {selectedProduct?.name}</span></label>
          </div></fieldset>
          <div className="setup-actions"><button type="button" onClick={() => setMode('detail')} className="secondary-button">Cancel</button><button type="submit" className="primary-button">Save Recipe</button></div>
        </form>
      </Panel>
    );
  }

  if (mode === 'detail' && selectedProduct) {
    return (
      <div className="product-workspace space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default bg-surface p-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setMode('list')} className="secondary-button">← Back to Products</button>
            <div><div className="text-lg font-bold text-text-primary">{selectedProduct.name}</div><div className="text-xs font-mono text-text-muted">{selectedProduct.productCode} · {selectedProduct.category}</div></div>
          </div>
          <div className="flex items-center gap-2"><button onClick={() => openEditProduct(selectedProduct)} className="secondary-button">Edit Product</button><button onClick={openAddRecipe} className="primary-button">+ Add Recipe</button></div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <Panel title="Product Information"><dl className="inspector-data"><div><dt>Code</dt><dd className="font-mono">{selectedProduct.productCode}</dd></div><div><dt>Category</dt><dd>{selectedProduct.category}</dd></div><div><dt>Volume</dt><dd>{selectedProduct.nominalVolumeMl ? `${selectedProduct.nominalVolumeMl} mL` : 'Unspecified'}</dd></div></dl></Panel>
            <Panel title="Packaging"><dl className="inspector-data"><div><dt>Material</dt><dd>{selectedProduct.packaging.material || 'Unspecified'}</dd></div><div><dt>Height</dt><dd>{selectedProduct.packaging.heightMm ? `${selectedProduct.packaging.heightMm} mm` : 'Unspecified'}</dd></div><div><dt>Diameter</dt><dd>{selectedProduct.packaging.diameterMm ? `${selectedProduct.packaging.diameterMm} mm` : 'Unspecified'}</dd></div></dl></Panel>
            <Panel title="Actuator / Nozzle"><dl className="inspector-data"><div><dt>Nozzle type</dt><dd>{selectedProduct.actuator.nozzleType || 'Unspecified'}</dd></div><div><dt>Actuator shape</dt><dd>{selectedProduct.actuator.actuatorShape || 'Unspecified'}</dd></div></dl></Panel>
            {selectedProduct.notes && <Panel title="Notes"><p className="text-xs leading-relaxed text-text-secondary">{selectedProduct.notes}</p></Panel>}
          </div>
          <div className="lg:col-span-2">
            <Panel title="Test Recipes">
              <Table>
                <thead className="bg-subtle"><tr>{['Recipe Name', 'Setpoints (N / ms / mm)', 'Default', 'Action'].map(h => <th className="px-3 py-2 text-left" key={h}>{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border-default">
                  {recipes.map(r => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 font-medium">{r.name}{r.description && <div className="text-xs font-normal text-text-muted">{r.description}</div>}</td>
                      <td className="px-3 py-2 font-mono text-xs">{r.forceSetpointN} N · {r.pressDurationMs} ms · {r.strokeMm} mm</td>
                      <td className="px-3 py-2">{r.isDefault ? <Status tone="success">Default</Status> : <button onClick={() => handleSetDefaultRecipe(r.id)} className="text-xs text-primary underline">Set default</button>}</td>
                      <td className="px-3 py-2"><button onClick={() => openEditRecipe(r)} className="text-xs text-primary underline">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter products by code, name, category..." className="w-full max-w-sm rounded-md border border-border-default bg-surface px-3 py-2 text-sm outline-none focus:border-primary" />
        <button onClick={openAddProduct} className="primary-button">+ Add Product</button>
      </div>
      <Panel title="Product Master Data">
        <Table>
          <thead className="bg-subtle"><tr>{['Product Code', 'Product Name', 'Category', 'Volume', 'Default Recipe', 'Updated', 'Action'].map(h => <th className="px-3 py-2 text-left" key={h}>{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border-default">
            {filtered.map(p => {
              return (
                <tr key={p.id}>
                  <td className="px-3 py-2 font-mono">{p.productCode}</td>
                  <td className="px-3 py-2 font-semibold">{p.name}</td>
                  <td className="px-3 py-2">{p.category}</td>
                  <td className="px-3 py-2">{p.nominalVolumeMl ? `${p.nominalVolumeMl} mL` : '-'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{allRecipes.find(r => r.productId === p.id && r.isDefault)?.name || 'Standard Spray Test'}</td>
                  <td className="px-3 py-2 text-xs text-text-muted">{fmt.date(p.updatedAt)}</td>
                  <td className="px-3 py-2"><button onClick={() => { setSelectedId(p.id); setMode('detail'); }} className="text-primary underline font-medium">View Detail</button></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
