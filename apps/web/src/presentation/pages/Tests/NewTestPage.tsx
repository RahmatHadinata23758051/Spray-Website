import { useState, useEffect } from 'react';
import type { Page } from '../../navigation';
import type { Test, FixtureScenario } from '@spray-paragon/domain';
import type { Product, TestRecipe } from '@spray-paragon/domain';
import { createTestSession, nextSampleId, nextTestId } from '@spray-paragon/domain';
import { productRepository } from '../../../application/services';
import { Status } from '../../components/ui/Status';

export function NewTestPage({ setPage, setSelected }: { setPage: (p: Page) => void; setSelected?: (t: Test) => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<TestRecipe[]>([]);
  const [productId, setProductId] = useState('');
  const [recipeId, setRecipeId] = useState('');
  const [productionBatch, setProductionBatch] = useState('');
  const [notes, setNotes] = useState('');
  const [fixture, setFixture] = useState<FixtureScenario>('nominal-01');
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

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

  const handleStart = () => {
    if (!product || !recipe) return;
    const session = createTestSession({ product, recipe, productionBatch, operatorId: 'usr-np', operatorName: 'Nadia Putri', fixture, notes });
    setSelected?.(session);
    setPage('Capture');
  };

  return (
    <form className="setup-workspace" onSubmit={event => { event.preventDefault(); handleStart(); }}>
      <div className="setup-intro">
        <div>
          <h2>Create Test</h2>
          <p>Configure a test session from registered product master data and a controlled recipe.</p>
        </div>
        <Status tone="neutral">Recipe-driven setup</Status>
      </div>

      <section className="setup-section" aria-labelledby="test-identity">
        <h3 id="test-identity">Test identity</h3>
        <dl className="identity-grid">
          <div><dt>Test ID</dt><dd className="font-mono">{nextTestId()}</dd></div>
          <div><dt>Sample ID</dt><dd className="font-mono">{nextSampleId()}</dd></div>
          <div><dt>Operator</dt><dd>Nadia Putri</dd></div>
          <div><dt>Created</dt><dd>29 Sep 2026 · 14:05</dd></div>
        </dl>
      </section>

      <section className="setup-section" aria-labelledby="sample-information">
        <h3 id="sample-information">Sample information</h3>
        <div className="form-grid">
          <label>Product
            <select aria-label="Product" value={productId} onChange={event => setProductId(event.target.value)} required>
              <option value="">Select product</option>
              {products.map(item => <option key={item.id} value={item.id}>{item.name} · {item.productCode}</option>)}
            </select>
          </label>
          <label>Production Batch / Lot <span>Optional</span>
            <input aria-label="Production Batch / Lot" value={productionBatch} onChange={event => setProductionBatch(event.target.value)} placeholder="LOT-24-0929-A" />
          </label>
          <label className="form-wide">Notes <span>Optional</span>
            <textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Test preparation or sample condition" />
          </label>
        </div>
      </section>

      <section className="setup-section" aria-labelledby="test-configuration">
        <h3 id="test-configuration">Test configuration</h3>
        <div className="form-grid">
          <label className="form-wide">Test Recipe
            <select aria-label="Test Recipe" value={recipeId} onChange={event => setRecipeId(event.target.value)} required>
              {recipes.map(item => <option key={item.id} value={item.id}>{item.name}{item.isDefault ? ' · Default' : ''}</option>)}
            </select>
          </label>
        </div>
        {recipe ? (
          <div className="setpoint-strip" aria-label="Recipe setpoints">
            <div><span>Target / setpoint</span><strong>{recipe.forceSetpointN} N</strong><small>Force setpoint</small></div>
            <div><span>Target / setpoint</span><strong>{recipe.pressDurationMs} ms</strong><small>Press duration</small></div>
            <div><span>Target / setpoint</span><strong>{recipe.strokeMm} mm</strong><small>Stroke</small></div>
          </div>
        ) : (
          <p className="setup-empty">No recipe is registered for this product.</p>
        )}
        <button type="button" className="text-action" onClick={() => setOverrideOpen(value => !value)} aria-expanded={overrideOpen}>Override parameters</button>
        {overrideOpen && (
          <div className="override-notice">
            <strong>Restricted interaction concept</strong>
            <span>Parameter overrides will require an authorized R&amp;D or Admin role. Recipe values remain active for this MVP.</span>
          </div>
        )}
        <div className="boundary-note">
          <strong>Configuration boundary</strong>
          <span>These values are frontend recipe setpoints intended for a future controller. They are not measured force, duration, stroke, position, machine state, or safety telemetry.</span>
        </div>
      </section>

      <section className="simulation-section">
        <button type="button" className="simulation-disclosure" onClick={() => setSimulationOpen(value => !value)} aria-expanded={simulationOpen}>
          <span>{simulationOpen ? '▾' : '▸'} Simulation settings</span>
          <small>Available only while machine and camera integration are unavailable.</small>
        </button>
        {simulationOpen && (
          <div className="simulation-content">
            <label>Simulation Scenario
              <select aria-label="Simulation Scenario" value={fixture} onChange={event => setFixture(event.target.value as FixtureScenario)}>
                <option value="nominal-01">Nominal spray</option>
                <option value="direction-offset-01">Direction offset</option>
                <option value="pattern-asymmetry-01">Pattern asymmetry</option>
                <option value="alignment-review-01">Alignment review</option>
              </select>
            </label>
          </div>
        )}
      </section>

      <div className="setup-actions">
        {savedMsg && <span role="status">{savedMsg}</span>}
        <button type="button" onClick={() => setSavedMsg('Draft saved locally.')} className="secondary-button">Save Draft</button>
        <button type="submit" disabled={!product || !recipe} className="primary-button">Start Test</button>
      </div>
    </form>
  );
}
