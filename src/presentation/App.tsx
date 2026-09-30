import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Box,
  Camera,
  ChevronRight,
  ClipboardPlus,
  FileBarChart,
  Gauge,
  History as HistoryIcon,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  SlidersHorizontal,
  Users as UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import { tests, analyses, frames, synchronizedFrames, fmt, getPixelGeometry } from '../data/mockSpraybotRepository';
import { productRepository } from '../data/productRepository';
import type { Product, TestRecipe } from '../domain/product';
import { createTestSession, nextSampleId, nextTestId } from '../domain/testSession';
import type { Analysis as AnalysisData, Camera as CameraType, Test, FixtureScenario, SynchronizedAnalysisFrame, CapturePhaseV2 } from '../domain/types';
import { addSupportingCapture, adjustCalibration, calibratedGridSpacingPx, cloneFrontGeometry, cloneSideGeometry, createCalibrationSnapshot, createFinalAnalysisReport, createFrontMeasurements, createSideMeasurements, deriveFrontMeasurementsFromGeometry, deriveSideMeasurementsFromGeometry, getFrontDisplayGeometry, getPrimary, getSideDisplayGeometry, moveCalibrationAnchor, moveFrontMeasurementHandle, moveSideMeasurementHandle, removeSupportingCapture, selectMeasurementValue, setPrimaryCapture, translateCalibrationWithinBounds, type CalibrationSnapshot, type FinalAnalysisReport, type FrontFinalMeasurements, type FrontMeasurementCorrection, type FrontPixelGeometry, type MeasurementValue, type Point, type SelectedCaptureMoment, type SideFinalMeasurements, type SideMeasurementCorrection, type SidePixelGeometry } from '../domain/analysis';

type NavPage = 'Dashboard' | 'New Test' | 'Capture' | 'Analysis' | 'Result' | 'History' | 'Reports' | 'Products' | 'Calibration' | 'Users';
type Page = NavPage | 'Settings' | 'Login';

const navigation: { label: string; items: { page: NavPage; icon: LucideIcon }[] }[] = [
  { label: 'Main navigation', items: [{ page: 'Dashboard', icon: LayoutDashboard }, { page: 'New Test', icon: ClipboardPlus }] },
  { label: 'Workflow', items: [{ page: 'Capture', icon: Camera }, { page: 'Analysis', icon: BarChart3 }, { page: 'Result', icon: Gauge }] },
  { label: 'Data', items: [{ page: 'History', icon: HistoryIcon }, { page: 'Reports', icon: FileBarChart }, { page: 'Products', icon: Box }] },
  { label: 'System', items: [{ page: 'Calibration', icon: SlidersHorizontal }, { page: 'Users', icon: UsersIcon }] },
];

const pageDescriptions: Record<Exclude<Page, 'Login'>, string> = {
  Dashboard: 'Current workstation activity and recent fixture tests',
  'New Test': 'Configure a deterministic simulated spray test',
  Capture: 'Synchronized Side and Front fixture acquisition',
  Analysis: 'Inspect camera-specific measurements and frame data',
  Result: 'Canonical output for the selected fixture test',
  History: 'Search and inspect previous simulated tests',
  Reports: 'Review and export fixture-backed results',
  Products: 'Product presets and test defaults',
  Calibration: 'Fixture calibration references',
  Users: 'Local workstation access',
  Settings: 'Local application preferences',
};

const cameraCopy: Record<CameraType, { title: string; purpose: string; accent: string }> = {
  side: { title: 'Side camera', purpose: 'Spray geometry profile', accent: '#1D8FFF' },
  front: { title: 'Front camera', purpose: 'Pattern shape and centroid', accent: '#14A3A8' },
};

type ViewMode = 'Original' | 'Mask' | 'Overlay';

function Status({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }) {
  const c = {
    info: 'border-primary/20 bg-primary-soft text-primary-hover',
    success: 'border-semantic-success/25 bg-semantic-success-soft text-semantic-success',
    warning: 'border-semantic-warning/25 bg-semantic-warning-soft text-semantic-warning',
    danger: 'border-semantic-danger/25 bg-semantic-danger-soft text-semantic-danger',
    neutral: 'border-border-default bg-subtle text-text-secondary',
  }[tone];
  return <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-semibold leading-none ${c}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{children}</span>;
}

function Panel(p: { title?: string; children: React.ReactNode; className?: string }) {
  return <section className={`surface-panel ${p.className ?? ''}`}>{p.title && <h2 className="surface-panel-title">{p.title}</h2>}<div className="p-4">{p.children}</div></section>;
}

function Table({ children }: { children: React.ReactNode }) {
  return <div className="table-shell"><table className="min-w-full divide-y divide-border-subtle text-sm">{children}</table></div>;
}

export function App() {
  const [page, setPage] = useState<Page>('Login');
  const [selected, setSelected] = useState<Test>(tests[0]);
  const [finalReport, setFinalReport] = useState<FinalAnalysisReport | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  if (page === 'Login') return <Login setPage={setPage} />;

  return <div className={`app-shell ${collapsed ? 'app-shell-collapsed' : ''}`}>
    <aside className="app-sidebar">
      <div className="product-header">
        <div className="product-mark" aria-hidden="true"><span /><span /><span /></div>
        {!collapsed && <div className="min-w-0"><div className="truncate text-[15px] font-semibold tracking-[-0.01em] text-nav-text">Spraybot</div><div className="truncate text-[11px] text-nav-muted">R&amp;D Spray Analysis</div></div>}
        <button className="sidebar-toggle" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button>
      </div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {navigation.map(group => <div className="nav-group" key={group.label}>
          {!collapsed && <div className="nav-group-label">{group.label}</div>}
          {group.items.map(({ page: item, icon: Icon }) => <button key={item} title={collapsed ? item : undefined} aria-label={collapsed ? item : undefined} aria-current={page === item ? 'page' : undefined} onClick={() => setPage(item)} className={`nav-item ${page === item ? 'nav-item-selected' : ''}`}><Icon size={17} strokeWidth={1.75} /><span>{item}</span></button>)}
        </div>)}
      </nav>
      <div className="session-area">
        {!collapsed && <div className="session-identity"><div className="session-avatar" aria-hidden="true">NP</div><div className="min-w-0"><div className="truncate text-xs font-medium text-nav-text">Nadia Putri</div><div className="text-[11px] text-nav-muted">Operator</div></div></div>}
        <button className="nav-item" title={collapsed ? 'Settings' : undefined} aria-label={collapsed ? 'Settings' : undefined} onClick={() => setPage('Settings')}><Settings size={17} strokeWidth={1.75} /><span>Settings</span></button>
        <button className="nav-item" title={collapsed ? 'Logout' : undefined} aria-label={collapsed ? 'Logout' : undefined} onClick={() => setPage('Login')}><LogOut size={17} strokeWidth={1.75} /><span>Logout</span></button>
      </div>
    </aside>
    <main className={`app-main ${page === 'Analysis' ? 'analysis-page' : ''}`}>
      <header className={`context-header ${page === 'Analysis' ? 'analysis-context-header' : ''}`}>
        <div className="min-w-0">
          <div className="breadcrumb"><span>Spraybot</span><ChevronRight size={12} /><span>{page}</span>{['Capture', 'Analysis', 'Result'].includes(page) && <><ChevronRight size={12} /><span className="font-mono">{selected.id}</span></>}</div>
          <div className="mt-1 flex min-w-0 items-baseline gap-3"><h1>{page}</h1><p className="hidden truncate text-sm text-text-muted xl:block">{pageDescriptions[page]}</p></div>
          {['Capture', 'Analysis', 'Result'].includes(page) && <div className="context-record"><span className="font-medium text-text-primary">{selected.productName}</span><span>{selected.sampleId}</span></div>}
        </div>
        <div className="flex shrink-0 items-center gap-3"><div className="simulation-state" role="status"><span aria-hidden="true" />Simulation Mode</div></div>
      </header>
      <div className="workspace">{page === 'Dashboard' ? <Dashboard setPage={setPage} setSelected={setSelected} /> : page === 'New Test' ? <NewTest setPage={setPage} setSelected={setSelected} /> : page === 'Capture' ? <Capture setPage={setPage} /> : page === 'Analysis' ? <Analysis test={selected} setPage={setPage} finalReport={finalReport} setFinalReport={setFinalReport} /> : page === 'Result' ? <Result test={selected} finalReport={finalReport} setPage={setPage} /> : page === 'History' ? <History setSelected={setSelected} setPage={setPage} /> : page === 'Reports' ? <Reports finalReport={finalReport} /> : page === 'Products' ? <Products /> : page === 'Calibration' ? <Calibration /> : page === 'Settings' ? <SettingsPage /> : <Users />}</div>
    </main>
  </div>;
}

function Login({ setPage }: { setPage: (p: Page) => void }) {
  const [email, setEmail] = useState('operator@local.test');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const valid = email.includes('@') && password.length >= 6;
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) { setError('Enter valid email and password (6+ chars)'); return; }
    setLoading(true);
    setError('');
    setTimeout(() => { setLoading(false); setPage('Dashboard'); }, 400);
  };
  return <main className="grid min-h-screen place-items-center bg-canvas px-5 py-10"><section className="w-full max-w-[460px] rounded-xl border border-border-default bg-surface p-8 shadow-[0_18px_55px_rgba(28,66,98,0.09)] md:p-10"><div className="mb-8 flex items-center gap-3"><div className="product-mark" aria-hidden="true"><span /><span /><span /></div><div><div className="text-base font-bold text-text-primary">Spraybot</div><div className="text-xs font-semibold text-text-muted">R&amp;D Spray Analysis</div></div></div><form onSubmit={handleSubmit} className="space-y-5"><div><Status tone="neutral">Local workstation · Simulation Mode</Status><h1 className="mt-5 text-[30px] font-bold leading-[38px] tracking-[-0.03em]">Sign in to Spraybot</h1><p className="mt-2 text-sm leading-[22px] text-text-secondary">Access the local spray analysis workstation. No machine hardware is connected. Camera functions remain simulated.</p></div><label className="block text-sm font-semibold">Email<input value={email} onChange={e => { setEmail(e.target.value); setError(''); }} className="mt-2 w-full rounded-sm border border-border-default bg-subtle px-3.5 py-3 outline-none focus:border-primary focus:bg-white" type="email" required /></label><label className="block text-sm font-semibold">Password<div className="relative"><input value={password} onChange={e => { setPassword(e.target.value); setError(''); }} type={showPassword ? 'text' : 'password'} className="mt-2 w-full rounded-sm border border-border-default bg-subtle px-3.5 py-3 pr-14 outline-none focus:border-primary focus:bg-white" required minLength={6} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[22px] text-xs font-semibold text-text-muted hover:text-primary" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div></label>{error && <p className="text-sm font-semibold text-semantic-danger">{error}</p>}<button type="submit" disabled={!valid || loading} className="w-full rounded-sm bg-primary px-4 py-3 font-bold text-white shadow-[0_7px_18px_rgba(29,143,255,0.2)] hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Signing in...' : 'Sign in'}</button><p className="text-center text-xs font-semibold text-text-muted">Authorized local users only</p></form></section></main>;
}

function Dashboard({ setPage, setSelected }: { setPage: (p: Page) => void; setSelected: (t: Test) => void }) {
  return <div className="space-y-5"><div className="flex items-center justify-between rounded-md border border-border-default bg-primary-soft p-3"><span className="text-sm">Simulation mode - mock analysis complete for latest test.</span><button onClick={() => setPage('New Test')} className="rounded-sm bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover">New Test</button></div><div className="grid items-start gap-5 xl:grid-cols-[1.1fr_.9fr]"><Panel title="Latest test"><Summary test={tests[0]} /></Panel><Panel title="Temporal stability"><div className="grid grid-cols-2 gap-4">{[['Length mean', fmt.cm(analyses['nominal-01'].temporal.sprayLengthMeanMm)], ['Length std dev', fmt.mm(analyses['nominal-01'].temporal.sprayLengthStdDevMm)], ['Angle mean', fmt.deg(analyses['nominal-01'].temporal.sprayAngleMeanDeg)], ['Angle std dev', fmt.deg(analyses['nominal-01'].temporal.sprayAngleStdDevDeg)]].map(x => <Metric key={x[0]} label={x[0]} value={x[1]} />)}</div></Panel></div><Recent setSelected={setSelected} setPage={setPage} /></div>;
}

function Summary({ test }: { test: Test }) {
  return <div className="grid gap-x-6 gap-y-4 md:grid-cols-2"><Metric label="Product" value={test.productName} /><Metric label="Sample" value={test.sampleId} /><Metric label="Force" value={`${test.config.forceSetpointN} N`} /><Metric label="Duration" value={`${test.config.pressDurationMs} ms`} /></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  const machineLike = /\b(id|timestamp|frame|coordinate|center|scale|offset|roi)\b/i.test(label);
  return <div className="min-w-0"><div className="text-xs font-semibold leading-[18px] text-text-muted">{label}</div><div className={`${machineLike ? 'font-mono' : 'font-sans'} truncate text-[22px] font-bold leading-[32px] tracking-[-0.025em] tabular-nums`} title={value}>{value}</div></div>;
}

function Recent({ setSelected, setPage, items = tests, target = 'Analysis' }: { setSelected: (t: Test) => void; setPage: (p: Page) => void; items?: Test[]; target?: Page }) {
  return <Panel title="Recent tests"><Table><thead className="bg-subtle"><tr>{['Test ID', 'Date', 'Product', 'Operator', 'Status', 'Action'].map(h => <th className="px-3 py-2 text-left font-semibold" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-border-default bg-surface">{items.map(t => <tr key={t.id}><td className="px-3 py-2 font-mono">{t.id}</td><td className="px-3 py-2">{fmt.date(t.createdAt)}</td><td className="px-3 py-2">{t.productName}</td><td className="px-3 py-2">{t.operatorName}</td><td className="px-3 py-2"><Status tone={t.status === 'complete' ? 'success' : t.status === 'failed' ? 'danger' : 'warning'}>{t.status}</Status></td><td className="px-3 py-2"><button onClick={() => { setSelected(t); setPage(target); }} className="text-primary underline">Open</button></td></tr>)}</tbody></Table></Panel>;
}

function NewTest({ setPage, setSelected }: { setPage: (p: Page) => void; setSelected?: (t: Test) => void }) {
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

  return <form className="setup-workspace" onSubmit={event => { event.preventDefault(); handleStart(); }}>
    <div className="setup-intro"><div><h2>Create Test</h2><p>Configure a test session from registered product master data and a controlled recipe.</p></div><Status tone="neutral">Recipe-driven setup</Status></div>

    <section className="setup-section" aria-labelledby="test-identity"><h3 id="test-identity">Test identity</h3><dl className="identity-grid">
      <div><dt>Test ID</dt><dd className="font-mono">{nextTestId()}</dd></div><div><dt>Sample ID</dt><dd className="font-mono">{nextSampleId()}</dd></div><div><dt>Operator</dt><dd>Nadia Putri</dd></div><div><dt>Created</dt><dd>29 Sep 2026 · 14:05</dd></div>
    </dl></section>

    <section className="setup-section" aria-labelledby="sample-information"><h3 id="sample-information">Sample information</h3><div className="form-grid">
      <label>Product<select aria-label="Product" value={productId} onChange={event => setProductId(event.target.value)} required><option value="">Select product</option>{products.map(item => <option key={item.id} value={item.id}>{item.name} · {item.productCode}</option>)}</select></label>
      <label>Production Batch / Lot <span>Optional</span><input aria-label="Production Batch / Lot" value={productionBatch} onChange={event => setProductionBatch(event.target.value)} placeholder="LOT-24-0929-A" /></label>
      <label className="form-wide">Notes <span>Optional</span><textarea value={notes} onChange={event => setNotes(event.target.value)} placeholder="Test preparation or sample condition" /></label>
    </div></section>

    <section className="setup-section" aria-labelledby="test-configuration"><h3 id="test-configuration">Test configuration</h3><div className="form-grid">
      <label className="form-wide">Test Recipe<select aria-label="Test Recipe" value={recipeId} onChange={event => setRecipeId(event.target.value)} required>{recipes.map(item => <option key={item.id} value={item.id}>{item.name}{item.isDefault ? ' · Default' : ''}</option>)}</select></label>
    </div>
    {recipe ? <div className="setpoint-strip" aria-label="Recipe setpoints"><div><span>Target / setpoint</span><strong>{recipe.forceSetpointN} N</strong><small>Force setpoint</small></div><div><span>Target / setpoint</span><strong>{recipe.pressDurationMs} ms</strong><small>Press duration</small></div><div><span>Target / setpoint</span><strong>{recipe.strokeMm} mm</strong><small>Stroke</small></div></div> : <p className="setup-empty">No recipe is registered for this product.</p>}
    <button type="button" className="text-action" onClick={() => setOverrideOpen(value => !value)} aria-expanded={overrideOpen}>Override parameters</button>
    {overrideOpen && <div className="override-notice"><strong>Restricted interaction concept</strong><span>Parameter overrides will require an authorized R&amp;D or Admin role. Recipe values remain active for this MVP.</span></div>}
    <div className="boundary-note"><strong>Configuration boundary</strong><span>These values are frontend recipe setpoints intended for a future controller. They are not measured force, duration, stroke, position, machine state, or safety telemetry.</span></div>
    </section>

    <section className="simulation-section"><button type="button" className="simulation-disclosure" onClick={() => setSimulationOpen(value => !value)} aria-expanded={simulationOpen}><span>{simulationOpen ? '▾' : '▸'} Simulation settings</span><small>Available only while machine and camera integration are unavailable.</small></button>
      {simulationOpen && <div className="simulation-content"><label>Simulation Scenario<select aria-label="Simulation Scenario" value={fixture} onChange={event => setFixture(event.target.value as FixtureScenario)}><option value="nominal-01">Nominal spray</option><option value="direction-offset-01">Direction offset</option><option value="pattern-asymmetry-01">Pattern asymmetry</option><option value="alignment-review-01">Alignment review</option></select></label></div>}
    </section>

    <div className="setup-actions">{savedMsg && <span role="status">{savedMsg}</span>}<button type="button" onClick={() => setSavedMsg('Draft saved locally.')} className="secondary-button">Save Draft</button><button type="submit" disabled={!product || !recipe} className="primary-button">Start Test</button></div>
  </form>;
}

function Capture({ setPage }: { setPage: (p: Page) => void }) {
  return <div className="space-y-5"><Status>Simulation mode — fixture capture</Status><div className="grid gap-4 lg:grid-cols-2">{(['side', 'front'] as CameraType[]).map(c => <CameraBox key={c} camera={c} />)}</div><Panel title="Capture timeline"><div className="flex gap-1">{frames.map(f => <div key={f.frameIndex} title={`${f.frameIndex} ${f.phase}`} className={`h-8 flex-1 rounded-xs ${f.phase === 'stable' ? 'bg-primary' : 'bg-border-default'}`} />)}</div><div className="mt-4 flex justify-end"><button onClick={() => setPage('Analysis')} className="rounded-sm bg-primary px-4 py-2 text-white">Open analysis</button></div></Panel></div>;
}

function CameraBox({ camera }: { camera: CameraType }) {
  return <Panel title={`${camera[0].toUpperCase() + camera.slice(1)} Camera`}><div className="relative aspect-video overflow-hidden rounded-sm border border-border-strong bg-subtle"><Overlay camera={camera} /></div><p className="mt-2 text-xs text-text-muted">Mock capture loaded · fixture frame set</p></Panel>;
}

function Overlay({ camera }: { camera: CameraType }) {
  const color = camera === 'side' ? '#075AA8' : '#0D747A';
  return <svg viewBox="0 0 600 340" className="h-full w-full"><rect width="600" height="340" fill="#EDF3F9" /><g stroke="#D5DEE8">{Array.from({ length: 10 }, (_, i) => <line key={i} x1={i * 60} y1="0" x2={i * 60} y2="340" />)}{Array.from({ length: 6 }, (_, i) => <line key={i} y1={i * 60} x1="0" y2={i * 60} x2="600" />)}</g>{camera === 'side' ? <g stroke={color} strokeWidth="4" fill="none"><circle cx="90" cy="170" r="5" fill={color} /><path d="M90 170 C230 92 420 92 540 128" /><path d="M90 170 C260 248 430 236 545 208" /><line x1="90" y1="170" x2="540" y2="168" /><line x1="405" y1="100" x2="405" y2="232" /></g> : <g stroke={color} strokeWidth="4" fill="none"><ellipse cx="306" cy="170" rx="112" ry="82" /><circle cx="306" cy="170" r="76" /><line x1="306" y1="65" x2="306" y2="275" /><line x1="175" y1="170" x2="435" y2="170" /><circle cx="318" cy="162" r="7" fill={color} /></g>}</svg>;
}

const initialCalibration: Record<CameraType, CalibrationSnapshot> = {
  side: createCalibrationSnapshot({ camera: 'side', referenceDistanceMm: 1000, anchorA: { x: 112, y: 296 }, anchorB: { x: 634, y: 296 } }),
  front: createCalibrationSnapshot({ camera: 'front', referenceDistanceMm: 500, anchorA: { x: 265, y: 85 }, anchorB: { x: 465, y: 85 } }),
};

function Analysis({ test, setPage, finalReport, setFinalReport }: { test: Test; setPage: (p: Page) => void; finalReport: FinalAnalysisReport | null; setFinalReport: (r: FinalAnalysisReport | null) => void }) {
  const [camera, setCamera] = useState<CameraType>('side');
  const [mode, setMode] = useState<ViewMode>('Overlay');
  const [captureIndex, setCaptureIndex] = useState(28);
  const [selectedCaptures, setSelectedCaptures] = useState<SelectedCaptureMoment[]>([]);
  const [selectionError, setSelectionError] = useState<string | undefined>();
  const [calibrations, setCalibrations] = useState<Record<CameraType, CalibrationSnapshot>>(initialCalibration);
  const [workingCalibrations, setWorkingCalibrations] = useState<Record<CameraType, CalibrationSnapshot>>(initialCalibration);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [isEditingMeasurement, setIsEditingMeasurement] = useState(false);
  const [sideCorrectionsByMoment, setSideCorrectionsByMoment] = useState<Record<string, SideMeasurementCorrection>>({});
  const [frontCorrectionsByMoment, setFrontCorrectionsByMoment] = useState<Record<string, FrontMeasurementCorrection>>({});
  const [workingSideGeometry, setWorkingSideGeometry] = useState<SidePixelGeometry | null>(null);
  const [workingFrontGeometry, setWorkingFrontGeometry] = useState<FrontPixelGeometry | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'captured' | 'review_required' | 'finalized'>(finalReport ? 'finalized' : 'captured');
  const a = analyses[test.fixture];
  const currentMoment = synchronizedFrames[captureIndex] || synchronizedFrames[0];
  const currentFrame = currentMoment[camera];
  const isStable = currentMoment.phase === 'stable';
  const currentGeometry = getPixelGeometry(currentMoment.frameIndex, test.fixture);
  const activeCalibrations = isCalibrating ? workingCalibrations : calibrations;
  const savedSideGeometry = getSideDisplayGeometry(currentGeometry.side, sideCorrectionsByMoment[currentMoment.id]);
  const savedFrontGeometry = getFrontDisplayGeometry(currentGeometry.front, frontCorrectionsByMoment[currentMoment.id]);
  const displaySideGeometry = isEditingMeasurement && camera === 'side' && workingSideGeometry ? workingSideGeometry : savedSideGeometry;
  const displayFrontGeometry = isEditingMeasurement && camera === 'front' && workingFrontGeometry ? workingFrontGeometry : savedFrontGeometry;
  const sideAudit = sideCorrectionsByMoment[currentMoment.id];
  const frontAudit = frontCorrectionsByMoment[currentMoment.id];
  const sideMeasurements = deriveSideMeasurementsFromGeometry(currentGeometry.side, activeCalibrations.side, displaySideGeometry === currentGeometry.side ? undefined : { geometry: displaySideGeometry, adjustedBy: sideAudit?.adjustedBy ?? (isEditingMeasurement ? 'Working edit' : undefined), adjustedAt: sideAudit?.adjustedAt });
  const frontMeasurements = deriveFrontMeasurementsFromGeometry(currentGeometry.front, activeCalibrations.front, displayFrontGeometry === currentGeometry.front ? undefined : { geometry: displayFrontGeometry, adjustedBy: frontAudit?.adjustedBy ?? (isEditingMeasurement ? 'Working edit' : undefined), adjustedAt: frontAudit?.adjustedAt });

  const handleSetPrimary = () => {
    const res = setPrimaryCapture(selectedCaptures, currentMoment, 'Nadia Putri', '2026-09-29T14:30:00Z');
    setSelectedCaptures(res.selected);
    setSelectionError(res.error);
  };

  const handleAddSupporting = () => {
    const res = addSupportingCapture(selectedCaptures, currentMoment, 'Nadia Putri', '2026-09-29T14:30:00Z');
    setSelectedCaptures(res.selected);
    setSelectionError(res.error);
  };

  const handleRemoveSupporting = (id: string) => {
    const res = removeSupportingCapture(selectedCaptures, id);
    setSelectedCaptures(res.selected);
    setSelectionError(res.error);
  };

  const handleStartCalibration = () => {
    setWorkingCalibrations({
      side: createCalibrationSnapshot(calibrations.side),
      front: createCalibrationSnapshot(calibrations.front),
    });
    setIsCalibrating(true);
    setIsEditingMeasurement(false);
    setMode('Overlay');
  };

  const handleCancelCalibration = () => {
    setWorkingCalibrations({
      side: createCalibrationSnapshot(calibrations.side),
      front: createCalibrationSnapshot(calibrations.front),
    });
    setIsCalibrating(false);
    setMode('Overlay');
  };

  const handleApplyCalibration = () => {
    const applied = adjustCalibration(workingCalibrations[camera], {}, 'Nadia Putri', '2026-09-29T14:35:00Z');
    setCalibrations(previous => ({ ...previous, [camera]: applied }));
    setWorkingCalibrations(previous => ({ ...previous, [camera]: applied }));
    setIsCalibrating(false);
    setMode('Overlay');
  };

  const handleWorkingCalibrationChange = (next: CalibrationSnapshot) => {
    setWorkingCalibrations(previous => ({ ...previous, [camera]: next }));
  };

  const handleAdjustCalibration = (deltaPx: number) => {
    const current = workingCalibrations[camera];
    handleWorkingCalibrationChange(moveCalibrationAnchor(
      current,
      'anchorB',
      { x: current.anchorB.x + deltaPx, y: current.anchorB.y },
      { width: 720, height: 360 },
    ));
  };

  const handleStartMeasurementEdit = () => {
    setWorkingSideGeometry(cloneSideGeometry(savedSideGeometry));
    setWorkingFrontGeometry(cloneFrontGeometry(savedFrontGeometry));
    setIsEditingMeasurement(true);
    setIsCalibrating(false);
    setMode('Overlay');
  };

  const handleCancelMeasurementEdit = () => {
    setWorkingSideGeometry(null);
    setWorkingFrontGeometry(null);
    setIsEditingMeasurement(false);
    setMode('Overlay');
  };

  const handleApplyMeasurementEdit = () => {
    if (camera === 'side' && workingSideGeometry) {
      setSideCorrectionsByMoment(previous => ({
        ...previous,
        [currentMoment.id]: { geometry: cloneSideGeometry(workingSideGeometry), adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' },
      }));
    }
    if (camera === 'front' && workingFrontGeometry) {
      setFrontCorrectionsByMoment(previous => ({
        ...previous,
        [currentMoment.id]: { geometry: cloneFrontGeometry(workingFrontGeometry), adjustedBy: 'Nadia Putri', adjustedAt: '2026-09-29T14:40:00Z' },
      }));
    }
    setIsEditingMeasurement(false);
    setMode('Overlay');
  };

  const handleWorkingSideGeometryChange = (next: SidePixelGeometry) => {
    setWorkingSideGeometry(cloneSideGeometry(next));
  };

  const handleWorkingFrontGeometryChange = (next: FrontPixelGeometry) => {
    setWorkingFrontGeometry(cloneFrontGeometry(next));
  };

  const handleNudgeSide = (field: 'sprayLength' | 'sprayAngle' | 'verticalSpread', delta: number) => {
    const current = workingSideGeometry ?? cloneSideGeometry(savedSideGeometry);
    if (field === 'sprayLength') {
      const deltaPx = delta / activeCalibrations.side.scaleMmPerPx;
      setWorkingSideGeometry(moveSideMeasurementHandle(current, 'sprayEndpoint', { x: current.sprayEndpointPx.x + deltaPx, y: current.sprayEndpointPx.y }, { width: 720, height: 360 }));
    } else if (field === 'verticalSpread') {
      const deltaPx = delta / activeCalibrations.side.scaleMmPerPx;
      setWorkingSideGeometry(moveSideMeasurementHandle(current, 'spreadBottom', { x: current.verticalSpreadBottomPx.x, y: current.verticalSpreadBottomPx.y + deltaPx }, { width: 720, height: 360 }));
    } else if (field === 'sprayAngle') {
      setWorkingSideGeometry(moveSideMeasurementHandle(current, 'upperAngle', { x: current.upperBoundaryPx.x, y: current.upperBoundaryPx.y - delta * 2 }, { width: 720, height: 360 }));
    }
  };

  const handleNudgeFront = (field: 'sprayArea' | 'centroidOffsetX' | 'centroidOffsetY', delta: number) => {
    const current = workingFrontGeometry ?? cloneFrontGeometry(savedFrontGeometry);
    const scale = activeCalibrations.front.scaleMmPerPx;
    if (field === 'centroidOffsetX') {
      const deltaPx = delta / scale;
      setWorkingFrontGeometry(moveFrontMeasurementHandle(current, 'centroid', { x: current.centroidPx.x + deltaPx, y: current.centroidPx.y }, { width: 720, height: 360 }));
    } else if (field === 'centroidOffsetY') {
      const deltaPx = delta / scale;
      setWorkingFrontGeometry(moveFrontMeasurementHandle(current, 'centroid', { x: current.centroidPx.x, y: current.centroidPx.y + deltaPx }, { width: 720, height: 360 }));
    } else if (field === 'sprayArea') {
      const currentRadius = current.equivalentDiameterPx / 2;
      const targetRadius = Math.max(10, currentRadius + delta / (scale * 20));
      setWorkingFrontGeometry(moveFrontMeasurementHandle(current, 'diameterRight', { x: current.referenceCenterPx.x + targetRadius, y: current.referenceCenterPx.y }, { width: 720, height: 360 }));
    }
  };

  const primarySelection = getPrimary(selectedCaptures);
  const primaryMoment = primarySelection ? synchronizedFrames.find(moment => moment.id === primarySelection.captureFrameId) : undefined;
  const getSideMeasurementsForMoment = (moment: SynchronizedAnalysisFrame): SideFinalMeasurements => {
    const geom = getPixelGeometry(moment.frameIndex, test.fixture).side;
    return deriveSideMeasurementsFromGeometry(geom, calibrations.side, sideCorrectionsByMoment[moment.id]);
  };
  const getFrontMeasurementsForMoment = (moment: SynchronizedAnalysisFrame): FrontFinalMeasurements => {
    const geom = getPixelGeometry(moment.frameIndex, test.fixture).front;
    return deriveFrontMeasurementsFromGeometry(geom, calibrations.front, frontCorrectionsByMoment[moment.id]);
  };
  const primarySideMeasurements = primaryMoment ? getSideMeasurementsForMoment(primaryMoment) : undefined;
  const primaryFrontMeasurements = primaryMoment ? getFrontMeasurementsForMoment(primaryMoment) : undefined;
  const handleConfirmFinalAnalysis = () => {
    if (!primaryMoment) {
      setAnalysisStatus('review_required');
      return;
    }
    const supportingCaptureMoments = selectedCaptures
      .filter(selection => selection.role === 'supporting')
      .map(selection => synchronizedFrames.find(moment => moment.id === selection.captureFrameId))
      .filter((moment): moment is SynchronizedAnalysisFrame => Boolean(moment));
    setFinalReport(createFinalAnalysisReport({
      test,
      primaryCaptureMoment: primaryMoment,
      supportingCaptureMoments,
      side: getSideMeasurementsForMoment(primaryMoment),
      front: getFrontMeasurementsForMoment(primaryMoment),
      sideCalibration: calibrations.side,
      frontCalibration: calibrations.front,
      finalizedBy: 'Nadia Putri',
      finalizedAt: '2026-09-29T14:45:00Z',
    }));
    setAnalysisStatus('finalized');
  };

  return <div className="analysis-workspace">
    <div className="analysis-status-row">
      <Status tone={isStable ? 'success' : 'neutral'}>{isStable ? 'Stable phase' : phaseLabel(currentMoment.phase)}</Status>
      {currentMoment.recommended && <Status tone="warning">Recommended capture</Status>}
      <span>Fixture: <strong className="font-mono">{test.fixture}</strong></span>
      <span>Capture: <strong className="font-mono">{currentMoment.frameIndex + 1} of {synchronizedFrames.length}</strong></span>
      <span>Time: <strong className="font-mono">{currentMoment.timestampMs} ms</strong></span>
      <span>Sync: <strong className="font-mono">{currentMoment.syncStatus} · Δ {currentMoment.timestampDeltaMs} ms</strong></span>
    </div>

    <div className="analysis-shell">
      <div className="surface-panel analysis-panel">
        <div className="analysis-toolbar">
          {(['side', 'front'] as CameraType[]).map(c => {
            const active = camera === c;
            return <button key={c} onClick={() => setCamera(c)} className={`analysis-tab ${active ? 'analysis-tab-active' : ''}`}>
              <span className="analysis-tab-dot" style={{ background: cameraCopy[c].accent }} />
              <span>{cameraCopy[c].title}</span>
            </button>;
          })}
          <div className="mode-switch">
            {(['Original', 'Mask', 'Overlay'] as ViewMode[]).map(m => <button key={m} onClick={() => setMode(m)} className={mode === m ? 'mode-active' : ''}>{m}</button>)}
          </div>
        </div>

        <div className="analysis-viewport">
          <div className="analysis-frame">
            <div className="analysis-frame-label">
              <span>CAM {camera.toUpperCase()}</span>
              <span>FRAME #{String(currentFrame.frameIndex).padStart(3, '0')}</span>
              <span>{currentFrame.timestampMs} ms</span>
              <span>{mode.toUpperCase()}</span>
            </div>
            <AnalysisOverlay
              camera={camera}
              mode={mode}
              frame={frames[currentMoment.frameIndex] || frames[0]}
              calibration={activeCalibrations[camera]}
              sideGeometry={displaySideGeometry}
              frontGeometry={displayFrontGeometry}
              sideMeasurements={sideMeasurements}
              frontMeasurements={frontMeasurements}
            />
            {isCalibrating && <CalibrationReferenceOverlay calibration={workingCalibrations[camera]} onChange={handleWorkingCalibrationChange} />}
            {isEditingMeasurement && <MeasurementCorrectionOverlay
              camera={camera}
              autoSideGeometry={currentGeometry.side}
              workingSideGeometry={workingSideGeometry ?? savedSideGeometry}
              autoFrontGeometry={currentGeometry.front}
              workingFrontGeometry={workingFrontGeometry ?? savedFrontGeometry}
              onSideChange={handleWorkingSideGeometryChange}
              onFrontChange={handleWorkingFrontGeometryChange}
            />}
          </div>
          <Timeline moments={synchronizedFrames} analysis={a} selectedIndex={captureIndex} onSelect={setCaptureIndex} />
        </div>
      </div>

      <div className="inspector-panel surface-panel">
        <div className="surface-panel-title flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: cameraCopy[camera].accent }} />
          <span>{cameraCopy[camera].title}</span>
        </div>
        <div className="p-4">
          <p className="mb-3 text-xs font-semibold text-text-secondary">{cameraCopy[camera].purpose}</p>
          <CaptureSelection
            currentMoment={currentMoment}
            selectedCaptures={selectedCaptures}
            selectionError={selectionError}
            onSetPrimary={handleSetPrimary}
            onAddSupporting={handleAddSupporting}
            onRemoveSupporting={handleRemoveSupporting}
          />
          <Inspector
            camera={camera}
            a={a}
            moment={currentMoment}
            calibration={activeCalibrations[camera]}
            isCalibrating={isCalibrating}
            onStartCalibration={handleStartCalibration}
            onCancelCalibration={handleCancelCalibration}
            onApplyCalibration={handleApplyCalibration}
            onAdjustCalibration={handleAdjustCalibration}
            isEditingMeasurement={isEditingMeasurement}
            onStartMeasurementEdit={handleStartMeasurementEdit}
            onCancelMeasurementEdit={handleCancelMeasurementEdit}
            onApplyMeasurementEdit={handleApplyMeasurementEdit}
            sideMeasurements={sideMeasurements}
            frontMeasurements={frontMeasurements}
            onCorrectSide={handleNudgeSide}
            onCorrectFront={handleNudgeFront}
          />
          <FinalAnalysisConfirmation
            status={analysisStatus}
            selectedCount={selectedCaptures.length}
            primaryMoment={primaryMoment}
            sideMeasurements={primarySideMeasurements}
            frontMeasurements={primaryFrontMeasurements}
            calibrations={calibrations}
            finalReport={finalReport}
            onConfirm={handleConfirmFinalAnalysis}
            onViewResult={() => setPage('Result')}
          />
          <div className="mt-3 border-t border-border-subtle pt-3 text-xs leading-[18px] text-text-muted">
            Fixture data only. No machine or camera hardware is connected.
          </div>
        </div>
      </div>
    </div>
  </div>;
}

function phaseLabel(phase: CapturePhaseV2): string {
  return phase === 'pre_spray' ? 'Pre-spray' : phase === 'build_up' ? 'Build-up' : phase[0].toUpperCase() + phase.slice(1);
}

function Timeline({ moments, analysis, selectedIndex, onSelect }: { moments: SynchronizedAnalysisFrame[]; analysis: AnalysisData; selectedIndex: number; onSelect: (index: number) => void }) {
  const phases: CapturePhaseV2[] = ['pre_spray', 'build_up', 'stable', 'decay'];
  const current = moments[selectedIndex];
  return <div className="analysis-timeline">
    <div className="timeline-header">
      <span>Capture timeline</span>
      <span><strong className="font-mono">Capture #{String(current.frameIndex).padStart(3, '0')}</strong> · <strong className="font-mono">{selectedIndex + 1} of {moments.length}</strong> · <strong className="font-mono">{current.timestampMs} ms</strong></span>
    </div>
    <div className="timeline-phases" aria-hidden="true">
      {phases.map(phase => {
        const count = moments.filter(moment => moment.phase === phase).length;
        return <span key={phase} style={{ flex: count }}>{phaseLabel(phase)}</span>;
      })}
    </div>
    <div className="timeline-bars">
      {moments.map((moment, index) => {
        const inWindow = moment.timestampMs >= analysis.analysisWindow.startMs && moment.timestampMs <= analysis.analysisWindow.endMs;
        const isCurrent = index === selectedIndex;
        return <button
          key={moment.id}
          onClick={() => onSelect(index)}
          className={`timeline-frame phase-${moment.phase.replace('_', '')} ${inWindow ? 'timeline-stable' : ''} ${moment.recommended ? 'timeline-recommended' : ''} ${isCurrent ? 'timeline-current' : ''}`}
          title={`Capture #${moment.frameIndex} · ${moment.timestampMs} ms · ${phaseLabel(moment.phase)}${moment.recommended ? ' · Recommended' : ''}`}
          aria-label={`Capture ${moment.frameIndex} ${moment.timestampMs} ms ${phaseLabel(moment.phase)}${moment.recommended ? ' recommended' : ''}`}
          aria-pressed={isCurrent}
        />;
      })}
    </div>
    <div className="timeline-footer">
      <span>Pre-spray</span><span>Build-up</span><span>Stable phase {analysis.analysisWindow.startMs}–{analysis.analysisWindow.endMs} ms</span><span>Decay</span>
    </div>
  </div>;
}

function AnalysisOverlay({
  camera,
  mode,
  frame,
  calibration,
  sideGeometry,
  frontGeometry,
  sideMeasurements,
  frontMeasurements,
}: {
  camera: CameraType;
  mode: ViewMode;
  frame: typeof frames[0];
  calibration: CalibrationSnapshot;
  sideGeometry: SidePixelGeometry;
  frontGeometry: FrontPixelGeometry;
  sideMeasurements: SideFinalMeasurements;
  frontMeasurements: FrontFinalMeasurements;
}) {
  const seedShift = (frame.frameIndex % 7) - 3;
  const density = frame.phase === 'pre-spray' ? 0.12 : frame.phase === 'build-up' ? 0.55 : frame.phase === 'decay' ? 0.4 : 0.9;
  const mist = frontMistPoints;
  const sidePath = `M112 204 C158 ${190 - seedShift}, 198 154, 252 147 C314 120, 371 136, 421 122 C487 112, 536 137, 594 151 C622 158, 642 175, 653 194 C632 213, 605 223, 574 226 C518 244, 473 235, 419 246 C350 259, 300 235, 245 237 C188 229, 146 218, 112 204 Z`;
  const frontPath = `M357 78 C401 72, 435 95, 460 122 C493 133, 503 168, 492 198 C513 231, 482 262, 451 276 C428 310, 383 315, 350 299 C312 316, 272 296, 253 267 C214 253, 205 215, 223 185 C207 148, 233 116, 269 106 C291 78, 326 70, 357 78 Z`;

  const spacingMm = camera === 'side' ? 100 : 50;
  const gridSpacingPx = calibratedGridSpacingPx(spacingMm, calibration);
  const numVertical = Math.min(24, Math.floor(720 / gridSpacingPx));
  const numHorizontal = Math.min(16, Math.floor(360 / gridSpacingPx));
  const physicalGrid = mode !== 'Mask' && <g className="calibrated-grid" opacity="0.5" data-grid-spacing-px={gridSpacingPx.toFixed(3)} aria-label={`Physical grid ${spacingMm} millimeter spacing`} role="group">
    {Array.from({ length: numVertical + 1 }, (_, i) => {
      const x = i * gridSpacingPx;
      return <g key={`v${i}`}>
        <line x1={x} y1="0" x2={x} y2="360" stroke="#6d8295" strokeWidth="0.8" />
        <text x={x + 3} y="11" fill="#a9bbca" fontSize="8" fontFamily="IBM Plex Mono">{(i * (spacingMm / 10)).toFixed(0)}cm</text>
      </g>;
    })}
    {Array.from({ length: numHorizontal + 1 }, (_, i) => {
      const y = i * gridSpacingPx;
      return <line key={`h${i}`} y1={y} x1="0" y2={y} x2="720" stroke="#6d8295" strokeWidth="0.8" />;
    })}
  </g>;

  return <svg viewBox="0 0 720 360" className="h-full w-full" role="img" aria-label={`${camera} camera ${mode.toLowerCase()} fixture frame`}>
    <defs>
      <filter id="mist-blur"><feGaussianBlur stdDeviation="5" /></filter>
      <filter id="fine-blur"><feGaussianBlur stdDeviation="1.7" /></filter>
      <linearGradient id="camera-falloff" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#111b25"/><stop offset="0.55" stopColor="#0c151f"/><stop offset="1" stopColor="#060c12"/></linearGradient>
      <clipPath id="side-clip"><path d={sidePath}/></clipPath>
      <clipPath id="front-clip"><path d={frontPath}/></clipPath>
    </defs>
    <rect width="720" height="360" fill={mode === 'Mask' ? '#060a0e' : 'url(#camera-falloff)'} />

    {camera === 'side' && <>
      <image href={mode === 'Mask' ? '/fixtures/side-mask.png' : '/fixtures/side-original.png'} x="0" y="0" width="720" height="360" preserveAspectRatio="xMidYMid slice" opacity={mode === 'Mask' ? 1 : density} />
      {mode !== 'Mask' && <g>
        <path d="M38 178 h68 l18 18 v18 l-18 18 H38z" fill="#27323c" stroke="#5e6d79" />
        <rect x="94" y="191" width="27" height="26" rx="2" fill="#87939d" />
        <circle cx="113" cy="204" r="4" fill="#c5d0d8" />
      </g>}
      {physicalGrid}
      {mode === 'Overlay' && <g>
        <path d={sidePath} fill="#1d8fff" fillOpacity="0.07" stroke="#1d8fff" strokeWidth="2" />
        <circle cx={sideGeometry.nozzleOriginPx.x} cy={sideGeometry.nozzleOriginPx.y} r="5" fill="#1d8fff" stroke="#dce8f1" strokeWidth="2" />
        <line x1={sideGeometry.nozzleOriginPx.x} y1={sideGeometry.nozzleOriginPx.y} x2="650" y2="198" stroke="#8fa3b8" strokeWidth="1.5" strokeDasharray="6 5" />
        <line x1={sideGeometry.nozzleOriginPx.x} y1={sideGeometry.nozzleOriginPx.y} x2={sideGeometry.upperBoundaryPx.x} y2={sideGeometry.upperBoundaryPx.y} stroke="#1d8fff" strokeWidth="1.4" />
        <line x1={sideGeometry.nozzleOriginPx.x} y1={sideGeometry.nozzleOriginPx.y} x2={sideGeometry.lowerBoundaryPx.x} y2={sideGeometry.lowerBoundaryPx.y} stroke="#1d8fff" strokeWidth="1.4" />
        <path d="M202 193 A90 90 0 0 1 201 216" fill="none" stroke="#ffb020" strokeWidth="2" />
        <text x="212" y="211" fill="#ffb020" fontSize="12" fontFamily="IBM Plex Mono">{fmt.deg(selectMeasurementValue(sideMeasurements.sprayAngle))}</text>
        <line data-testid="side-display-length-line" x1={sideGeometry.nozzleOriginPx.x} y1="312" x2={sideGeometry.sprayEndpointPx.x} y2="312" stroke="#ffb020" strokeWidth="2" /><line x1={sideGeometry.nozzleOriginPx.x} y1="304" x2={sideGeometry.nozzleOriginPx.x} y2="320" stroke="#ffb020" strokeWidth="2" /><line x1={sideGeometry.sprayEndpointPx.x} y1="304" x2={sideGeometry.sprayEndpointPx.x} y2="320" stroke="#ffb020" strokeWidth="2" />
        <text data-testid="side-overlay-spray-length" x="330" y="304" fill="#ffb020" fontSize="12" fontFamily="IBM Plex Mono">{fmt.cm(selectMeasurementValue(sideMeasurements.sprayLength))}</text>
        <line x1={sideGeometry.verticalSpreadTopPx.x} y1={sideGeometry.verticalSpreadTopPx.y} x2={sideGeometry.verticalSpreadBottomPx.x} y2={sideGeometry.verticalSpreadBottomPx.y} stroke="#ffb020" strokeWidth="2" />
        <text x="601" y="192" fill="#ffb020" fontSize="11" fontFamily="IBM Plex Mono">{fmt.mm(selectMeasurementValue(sideMeasurements.verticalSpread))}</text>
      </g>}
    </>}

    {camera === 'front' && <>
      {mode !== 'Mask' && <g><circle cx="360" cy="180" r="152" fill="#8fa3b8" opacity={0.07 + density * 0.07} filter="url(#mist-blur)"/><g clipPath="url(#front-clip)" opacity={density}>{mist.map((p, i) => <circle key={i} cx={p[0] + seedShift * (i % 2)} cy={p[1] - seedShift * (i % 3) * 0.4} r={p[2] * 1.15} fill="#c1cbd4" opacity={p[3]} filter={p[2] > 7 ? 'url(#mist-blur)' : 'url(#fine-blur)'} />)}</g></g>}
      {mode === 'Mask' && <g><path d={frontPath} fill="#e7edf2"/><g clipPath="url(#front-clip)">{frontMaskVoids.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={p[2]} fill="#060a0e" opacity={p[3]} />)}</g></g>}
      {physicalGrid}
      {mode === 'Overlay' && <g>
        <path d={frontPath} fill="#1d8fff" fillOpacity="0.08" stroke="#1d8fff" strokeWidth="2" />
        <circle cx={frontGeometry.referenceCenterPx.x} cy={frontGeometry.referenceCenterPx.y} r="112" fill="none" stroke="#ffb020" strokeWidth="1.8" strokeDasharray="7 5" />
        <line x1="190" y1="190" x2="530" y2="190" stroke="#8fa3b8" strokeWidth="1.4" strokeDasharray="5 5" /><line x1="360" y1="42" x2="360" y2="330" stroke="#8fa3b8" strokeWidth="1.4" strokeDasharray="5 5" />
        <circle cx={frontGeometry.referenceCenterPx.x} cy={frontGeometry.referenceCenterPx.y} r="5" fill="none" stroke="#8fa3b8" strokeWidth="2" />
        <circle cx={frontGeometry.centroidPx.x} cy={frontGeometry.centroidPx.y} r="5" fill="#ffb020" />
        <line x1={frontGeometry.referenceCenterPx.x} y1={frontGeometry.referenceCenterPx.y} x2={frontGeometry.centroidPx.x} y2={frontGeometry.centroidPx.y} stroke="#ffb020" strokeWidth="2" />
        <text x="379" y="179" fill="#ffb020" fontSize="11" fontFamily="IBM Plex Mono">Δ {fmt.mm(selectMeasurementValue(frontMeasurements.centroidOffsetX))}, {fmt.mm(selectMeasurementValue(frontMeasurements.centroidOffsetY))}</text>
        <line data-testid="front-display-diameter-line" x1={frontGeometry.referenceCenterPx.x - frontGeometry.equivalentDiameterPx / 2} y1="318" x2={frontGeometry.referenceCenterPx.x + frontGeometry.equivalentDiameterPx / 2} y2="318" stroke="#ffb020" strokeWidth="2"/><line x1={frontGeometry.referenceCenterPx.x - frontGeometry.equivalentDiameterPx / 2} y1="310" x2={frontGeometry.referenceCenterPx.x - frontGeometry.equivalentDiameterPx / 2} y2="326" stroke="#ffb020" strokeWidth="2"/><line x1={frontGeometry.referenceCenterPx.x + frontGeometry.equivalentDiameterPx / 2} y1="310" x2={frontGeometry.referenceCenterPx.x + frontGeometry.equivalentDiameterPx / 2} y2="326" stroke="#ffb020" strokeWidth="2"/>
        <text x="319" y="309" fill="#ffb020" fontSize="11" fontFamily="IBM Plex Mono">Ø {fmt.mm(selectMeasurementValue(frontMeasurements.equivalentDiameter))}</text>
      </g>}
    </>}

  </svg>;
}

const frontMistPoints: readonly [number, number, number, number][] = [
  [300,115,14,.34],[340,103,10,.46],[380,108,17,.31],[416,127,11,.42],[270,148,16,.32],[321,146,9,.52],[365,142,20,.26],[409,155,14,.38],[452,171,9,.48],[249,190,12,.4],[292,185,19,.29],[342,183,10,.55],[390,190,17,.31],[435,205,13,.38],[266,231,14,.34],[315,221,11,.47],[360,229,20,.25],[404,238,9,.51],[443,249,14,.33],[303,272,11,.4],[351,278,15,.31],[393,269,9,.46]
];
const frontMaskVoids: readonly [number, number, number, number][] = [[297,138,9,.75],[371,119,6,.8],[430,162,11,.7],[276,204,7,.78],[348,190,10,.68],[417,230,8,.75],[330,267,11,.7],[388,279,6,.8]];

type CalibrationDragTarget = 'anchorA' | 'anchorB' | 'body';

type CalibrationDrag = {
  target: CalibrationDragTarget;
  pointerId: number;
  startPoint: Point;
  startCalibration: CalibrationSnapshot;
};

function CalibrationReferenceOverlay({ calibration, onChange }: { calibration: CalibrationSnapshot; onChange: (next: CalibrationSnapshot) => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<CalibrationDrag | null>(null);
  const [activeTarget, setActiveTarget] = useState<CalibrationDragTarget | null>(null);
  const { anchorA, anchorB, referenceDistanceMm, scaleMmPerPx } = calibration;
  const midX = (anchorA.x + anchorB.x) / 2;
  const midY = (anchorA.y + anchorB.y) / 2;
  const angleDeg = Math.atan2(anchorB.y - anchorA.y, anchorB.x - anchorA.x) * 180 / Math.PI;
  const referenceLengthPx = Math.hypot(anchorB.x - anchorA.x, anchorB.y - anchorA.y);
  const intervalCount = Math.max(1, Math.round(referenceDistanceMm / 100));

  const toSvgPoint = (clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * 720 / rect.width,
      y: (clientY - rect.top) * 360 / rect.height,
    };
  };

  const startDrag = (event: React.PointerEvent<SVGElement>, target: CalibrationDragTarget) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      target,
      pointerId: event.pointerId,
      startPoint: toSvgPoint(event.clientX, event.clientY),
      startCalibration: calibration,
    };
    setActiveTarget(target);
  };

  const moveDrag = (event: React.PointerEvent<SVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const point = toSvgPoint(event.clientX, event.clientY);
    const delta = { x: point.x - drag.startPoint.x, y: point.y - drag.startPoint.y };
    if (drag.target === 'body') {
      onChange(translateCalibrationWithinBounds(drag.startCalibration, delta, { width: 720, height: 360 }));
      return;
    }
    const startAnchor = drag.startCalibration[drag.target];
    onChange(moveCalibrationAnchor(drag.startCalibration, drag.target, {
      x: startAnchor.x + delta.x,
      y: startAnchor.y + delta.y,
    }, { width: 720, height: 360 }));
  };

  const endDrag = (event: React.PointerEvent<SVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setActiveTarget(null);
  };

  const nudgeAnchor = (event: React.KeyboardEvent<SVGCircleElement>, anchor: 'anchorA' | 'anchorB') => {
    const step = event.shiftKey ? 10 : 1;
    const delta = event.key === 'ArrowLeft' ? { x: -step, y: 0 }
      : event.key === 'ArrowRight' ? { x: step, y: 0 }
        : event.key === 'ArrowUp' ? { x: 0, y: -step }
          : event.key === 'ArrowDown' ? { x: 0, y: step }
            : null;
    if (!delta) return;
    event.preventDefault();
    const current = calibration[anchor];
    onChange(moveCalibrationAnchor(calibration, anchor, { x: current.x + delta.x, y: current.y + delta.y }, { width: 720, height: 360 }));
  };

  return <svg ref={svgRef} className={`calibration-overlay ${activeTarget ? 'is-dragging' : ''}`} viewBox="0 0 720 360" role="group" aria-label={`Calibration reference ${referenceDistanceMm} millimeters`}>
    <g className="calibration-ruler" transform={`translate(${anchorA.x} ${anchorA.y}) rotate(${angleDeg})`}>
      <line x1="0" y1="0" x2={referenceLengthPx} y2="0" className="calibration-line" />
      {Array.from({ length: intervalCount + 1 }, (_, i) => {
        const x = referenceLengthPx * i / intervalCount;
        return <g key={i} className="calibration-tick">
          <line x1={x} y1="-10" x2={x} y2="10" />
          <text x={x} y="-16" textAnchor="middle" transform={`rotate(${-angleDeg} ${x} -16)`}>{i * 10} cm</text>
        </g>;
      })}
      <line
        x1="16"
        y1="0"
        x2={Math.max(16, referenceLengthPx - 16)}
        y2="0"
        className={`calibration-body-hit ${activeTarget === 'body' ? 'is-active' : ''}`}
        role="slider"
        aria-label="Calibration grid reference body"
        tabIndex={0}
        onPointerDown={event => startDrag(event, 'body')}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
    </g>
    <circle
      cx={anchorA.x}
      cy={anchorA.y}
      r="9"
      className={`calibration-anchor ${activeTarget === 'anchorA' ? 'is-active' : ''}`}
      role="slider"
      aria-label="Calibration anchor A"
      aria-valuetext={`${anchorA.x.toFixed(0)}, ${anchorA.y.toFixed(0)} pixels`}
      tabIndex={0}
      onKeyDown={event => nudgeAnchor(event, 'anchorA')}
      onPointerDown={event => startDrag(event, 'anchorA')}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    />
    <circle
      cx={anchorB.x}
      cy={anchorB.y}
      r="9"
      className={`calibration-anchor ${activeTarget === 'anchorB' ? 'is-active' : ''}`}
      role="slider"
      aria-label="Calibration anchor B"
      aria-valuetext={`${anchorB.x.toFixed(0)}, ${anchorB.y.toFixed(0)} pixels`}
      tabIndex={0}
      onKeyDown={event => nudgeAnchor(event, 'anchorB')}
      onPointerDown={event => startDrag(event, 'anchorB')}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    />
    <text x={anchorA.x} y={anchorA.y + 28} textAnchor="middle">A</text>
    <text x={anchorB.x} y={anchorB.y + 28} textAnchor="middle">B</text>
    <g className="calibration-live-readout" transform={`translate(${Math.min(620, Math.max(100, midX))}, ${Math.max(42, midY - 38)})`}>
      <rect x="-96" y="-26" width="192" height="44" rx="5" />
      <text x="-84" y="-8">Reference</text><text x="84" y="-8" textAnchor="end">{referenceDistanceMm} mm</text>
      <text x="-84" y="10">Scale</text><text x="84" y="10" textAnchor="end">{scaleMmPerPx.toFixed(3)} mm/px</text>
    </g>
  </svg>;
}

type MeasurementHandle = 'sprayEndpoint' | 'spreadTop' | 'spreadBottom' | 'upperAngle' | 'lowerAngle' | 'centroid' | 'diameterLeft' | 'diameterRight';

function MeasurementCorrectionOverlay({ camera, autoSideGeometry, workingSideGeometry, autoFrontGeometry, workingFrontGeometry, onSideChange, onFrontChange }: {
  camera: CameraType;
  autoSideGeometry: SidePixelGeometry;
  workingSideGeometry: SidePixelGeometry;
  autoFrontGeometry: FrontPixelGeometry;
  workingFrontGeometry: FrontPixelGeometry;
  onSideChange: (geometry: SidePixelGeometry) => void;
  onFrontChange: (geometry: FrontPixelGeometry) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const pointerRef = useRef<{ pointerId: number; handle: MeasurementHandle } | null>(null);
  const [activeHandle, setActiveHandle] = useState<MeasurementHandle | null>(null);
  const toViewBoxPoint = (clientX: number, clientY: number): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) / rect.width * 720, y: (clientY - rect.top) / rect.height * 360 };
  };
  const updateHandle = (handle: MeasurementHandle, point: Point) => {
    if (camera === 'side') onSideChange(moveSideMeasurementHandle(workingSideGeometry, handle as 'sprayEndpoint' | 'spreadTop' | 'spreadBottom' | 'upperAngle' | 'lowerAngle', point, { width: 720, height: 360 }));
    else onFrontChange(moveFrontMeasurementHandle(workingFrontGeometry, handle as 'centroid' | 'diameterLeft' | 'diameterRight', point, { width: 720, height: 360 }));
  };
  const pointerDown = (event: React.PointerEvent<SVGCircleElement>, handle: MeasurementHandle) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = { pointerId: event.pointerId, handle };
    setActiveHandle(handle);
  };
  const pointerMove = (event: React.PointerEvent<SVGCircleElement>) => {
    const pointer = pointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    updateHandle(pointer.handle, toViewBoxPoint(event.clientX, event.clientY));
  };
  const pointerEnd = (event: React.PointerEvent<SVGCircleElement>) => {
    if (pointerRef.current?.pointerId !== event.pointerId) return;
    pointerRef.current = null;
    setActiveHandle(null);
  };
  const keyDown = (event: React.KeyboardEvent<SVGCircleElement>, handle: MeasurementHandle, point: Point) => {
    const amount = event.shiftKey ? 10 : 1;
    const delta = event.key === 'ArrowLeft' ? { x: -amount, y: 0 } : event.key === 'ArrowRight' ? { x: amount, y: 0 } : event.key === 'ArrowUp' ? { x: 0, y: -amount } : event.key === 'ArrowDown' ? { x: 0, y: amount } : null;
    if (!delta) return;
    event.preventDefault();
    updateHandle(handle, { x: point.x + delta.x, y: point.y + delta.y });
  };
  const handle = (name: MeasurementHandle, label: string, point: Point) => <circle
    cx={point.x} cy={point.y} r="8" className={`measurement-handle ${activeHandle === name ? 'is-active' : ''}`}
    role="slider" aria-label={label} aria-valuetext={`${point.x.toFixed(0)}, ${point.y.toFixed(0)} pixels`} tabIndex={0}
    onPointerDown={event => pointerDown(event, name)} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}
    onKeyDown={event => keyDown(event, name, point)}
  />;
  const diameterRadius = workingFrontGeometry.equivalentDiameterPx / 2;
  return <svg ref={svgRef} className={`measurement-edit-overlay ${activeHandle ? 'is-dragging' : ''}`} viewBox="0 0 720 360" role="group" aria-label={`${camera} measurement correction handles`}>
    {camera === 'side' ? <>
      <g className="measurement-auto-geometry" aria-label="System automatic geometry">
        <line x1={autoSideGeometry.nozzleOriginPx.x} y1={autoSideGeometry.nozzleOriginPx.y} x2={autoSideGeometry.sprayEndpointPx.x} y2={autoSideGeometry.sprayEndpointPx.y} />
        <line x1={autoSideGeometry.nozzleOriginPx.x} y1={autoSideGeometry.nozzleOriginPx.y} x2={autoSideGeometry.upperBoundaryPx.x} y2={autoSideGeometry.upperBoundaryPx.y} />
        <line x1={autoSideGeometry.nozzleOriginPx.x} y1={autoSideGeometry.nozzleOriginPx.y} x2={autoSideGeometry.lowerBoundaryPx.x} y2={autoSideGeometry.lowerBoundaryPx.y} />
        <line x1={autoSideGeometry.verticalSpreadTopPx.x} y1={autoSideGeometry.verticalSpreadTopPx.y} x2={autoSideGeometry.verticalSpreadBottomPx.x} y2={autoSideGeometry.verticalSpreadBottomPx.y} />
      </g>
      <g className="measurement-final-geometry" aria-label="Operator final geometry">
        <line x1={workingSideGeometry.nozzleOriginPx.x} y1={workingSideGeometry.nozzleOriginPx.y} x2={workingSideGeometry.sprayEndpointPx.x} y2={workingSideGeometry.sprayEndpointPx.y} />
        <line x1={workingSideGeometry.nozzleOriginPx.x} y1={workingSideGeometry.nozzleOriginPx.y} x2={workingSideGeometry.upperBoundaryPx.x} y2={workingSideGeometry.upperBoundaryPx.y} />
        <line x1={workingSideGeometry.nozzleOriginPx.x} y1={workingSideGeometry.nozzleOriginPx.y} x2={workingSideGeometry.lowerBoundaryPx.x} y2={workingSideGeometry.lowerBoundaryPx.y} />
        <line x1={workingSideGeometry.verticalSpreadTopPx.x} y1={workingSideGeometry.verticalSpreadTopPx.y} x2={workingSideGeometry.verticalSpreadBottomPx.x} y2={workingSideGeometry.verticalSpreadBottomPx.y} />
      </g>
      {handle('sprayEndpoint', 'Spray endpoint handle', workingSideGeometry.sprayEndpointPx)}
      {handle('spreadTop', 'Upper spread handle', workingSideGeometry.verticalSpreadTopPx)}
      {handle('spreadBottom', 'Lower spread handle', workingSideGeometry.verticalSpreadBottomPx)}
      {handle('upperAngle', 'Upper angle handle', workingSideGeometry.upperBoundaryPx)}
      {handle('lowerAngle', 'Lower angle handle', workingSideGeometry.lowerBoundaryPx)}
      <text x="132" y="188">BLUE AUTO · ORANGE WORKING FINAL</text>
    </> : <>
      <g className="measurement-auto-geometry" aria-label="System automatic geometry">
        <circle cx={autoFrontGeometry.referenceCenterPx.x} cy={autoFrontGeometry.referenceCenterPx.y} r={autoFrontGeometry.equivalentDiameterPx / 2} />
        <line x1={autoFrontGeometry.referenceCenterPx.x} y1={autoFrontGeometry.referenceCenterPx.y} x2={autoFrontGeometry.centroidPx.x} y2={autoFrontGeometry.centroidPx.y} />
      </g>
      <g className="measurement-final-geometry" aria-label="Operator final geometry">
        <circle cx={workingFrontGeometry.referenceCenterPx.x} cy={workingFrontGeometry.referenceCenterPx.y} r={diameterRadius} />
        <line x1={workingFrontGeometry.referenceCenterPx.x} y1={workingFrontGeometry.referenceCenterPx.y} x2={workingFrontGeometry.centroidPx.x} y2={workingFrontGeometry.centroidPx.y} />
        <line x1={workingFrontGeometry.referenceCenterPx.x - diameterRadius} y1={workingFrontGeometry.referenceCenterPx.y} x2={workingFrontGeometry.referenceCenterPx.x + diameterRadius} y2={workingFrontGeometry.referenceCenterPx.y} />
      </g>
      {handle('centroid', 'Spray centroid handle', workingFrontGeometry.centroidPx)}
      {handle('diameterLeft', 'Equivalent diameter handle left', { x: workingFrontGeometry.referenceCenterPx.x - diameterRadius, y: workingFrontGeometry.referenceCenterPx.y })}
      {handle('diameterRight', 'Equivalent diameter handle right', { x: workingFrontGeometry.referenceCenterPx.x + diameterRadius, y: workingFrontGeometry.referenceCenterPx.y })}
      <text x="360" y="48" textAnchor="middle">BLUE AUTO · ORANGE WORKING FINAL</text>
    </>}
  </svg>;
}

function CaptureSelection({ currentMoment, selectedCaptures, selectionError, onSetPrimary, onAddSupporting, onRemoveSupporting }: {
  currentMoment: SynchronizedAnalysisFrame;
  selectedCaptures: SelectedCaptureMoment[];
  selectionError?: string;
  onSetPrimary: () => void;
  onAddSupporting: () => void;
  onRemoveSupporting: (id: string) => void;
}) {
  const currentSelection = selectedCaptures.find(item => item.captureFrameId === currentMoment.id);
  const selectedDetails = selectedCaptures.map(selection => ({
    selection,
    moment: synchronizedFrames.find(moment => moment.id === selection.captureFrameId),
  })).filter(item => item.moment !== undefined);

  return <section className="capture-selection" aria-labelledby="capture-selection-title">
    <div className="capture-selection-heading">
      <h3 id="capture-selection-title">Report captures</h3>
      <strong>Selected Captures {selectedCaptures.length} / 10</strong>
    </div>
    <p className="capture-selection-help">Choose one shared Side + Front moment as Primary. Add up to nine Supporting moments.</p>
    <div className="capture-selection-actions">
      <button className="primary-button" type="button" onClick={onSetPrimary} disabled={currentSelection?.role === 'primary'}>
        {currentSelection?.role === 'primary' ? 'Primary capture' : 'Set as Primary'}
      </button>
      <button className="secondary-button" type="button" onClick={onAddSupporting} disabled={Boolean(currentSelection) || selectedCaptures.length >= 10}>
        {currentSelection?.role === 'supporting' ? 'Supporting capture' : 'Add Supporting'}
      </button>
    </div>
    {selectionError && <p className="capture-selection-error" role="alert">{selectionError}</p>}
    {selectedDetails.length === 0 ? <p className="capture-selection-empty">No report captures selected. Finalization requires one Primary.</p> : <ul className="capture-selection-list">
      {selectedDetails.map(({ selection, moment }) => moment && <li key={selection.captureFrameId} className={selection.role === 'primary' ? 'capture-selection-primary' : ''}>
        <div className="capture-selection-jump">
          <span>{selection.role === 'primary' ? '★ Primary' : 'Supporting'}</span>
          <strong className="font-mono">Capture #{String(moment.frameIndex).padStart(3, '0')} · {moment.timestampMs} ms</strong>
        </div>
        {selection.role === 'supporting' && <button type="button" className="capture-selection-remove" onClick={() => onRemoveSupporting(selection.captureFrameId)} aria-label={`Remove Supporting Capture ${moment.frameIndex}`}>Remove</button>}
      </li>)}
    </ul>}
  </section>;
}

function metricSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function formatPointPx(point: Point): string {
  return `${point.x.toFixed(0)}, ${point.y.toFixed(0)} px`;
}

function hasAdjustedMeasurement(measurements: SideFinalMeasurements | FrontFinalMeasurements): boolean {
  return Object.values(measurements).some(value => value.adjusted);
}

function FinalAnalysisConfirmation({ status, selectedCount, primaryMoment, sideMeasurements, frontMeasurements, calibrations, finalReport, onConfirm, onViewResult }: {
  status: 'captured' | 'review_required' | 'finalized';
  selectedCount: number;
  primaryMoment?: SynchronizedAnalysisFrame;
  sideMeasurements?: SideFinalMeasurements;
  frontMeasurements?: FrontFinalMeasurements;
  calibrations: Record<CameraType, CalibrationSnapshot>;
  finalReport: FinalAnalysisReport | null;
  onConfirm: () => void;
  onViewResult: () => void;
}) {
  const canConfirm = Boolean(primaryMoment && sideMeasurements && frontMeasurements);
  return <section className="final-confirmation">
    <div className="final-confirmation-heading">
      <h3>Final analysis confirmation</h3>
      <span className={`final-status final-status-${status}`}>{status.replace('_', ' ')}</span>
    </div>
    <p className="final-confirmation-copy">Operator confirmation is required before this simulated analysis becomes final.</p>
    {!primaryMoment && <p className="final-confirmation-warning">Select exactly one Primary Capture Moment before confirmation.</p>}
    {primaryMoment && sideMeasurements && frontMeasurements && <dl className="final-confirmation-summary">
      <div><dt>Primary Capture</dt><dd className="font-mono">#{String(primaryMoment.frameIndex).padStart(3, '0')} · {primaryMoment.timestampMs} ms</dd></div>
      <div><dt>Selected Captures</dt><dd>{selectedCount} / 10</dd></div>
      <div><dt>Side Camera final</dt><dd className="font-mono">{fmt.cm(selectMeasurementValue(sideMeasurements.sprayLength))} · {fmt.deg(selectMeasurementValue(sideMeasurements.sprayAngle))} · {fmt.mm(selectMeasurementValue(sideMeasurements.verticalSpread))}</dd></div>
      <div><dt>Front Camera final</dt><dd className="font-mono">{fmt.area(selectMeasurementValue(frontMeasurements.sprayArea))} · Ø {fmt.mm(selectMeasurementValue(frontMeasurements.equivalentDiameter))} · {selectMeasurementValue(frontMeasurements.circularity).toFixed(2)}</dd></div>
      <div><dt>Side calibration</dt><dd>{calibrations.side.adjusted ? `Adjusted by ${calibrations.side.adjustedBy}` : 'Default fixture calibration'}</dd></div>
      <div><dt>Front calibration</dt><dd>{calibrations.front.adjusted ? `Adjusted by ${calibrations.front.adjustedBy}` : 'Default fixture calibration'}</dd></div>
      <div><dt>Side measurement</dt><dd>{hasAdjustedMeasurement(sideMeasurements) ? 'Operator adjusted final values' : 'Automatic accepted'}</dd></div>
      <div><dt>Front measurement</dt><dd>{hasAdjustedMeasurement(frontMeasurements) ? 'Operator adjusted final values' : 'Automatic accepted'}</dd></div>
    </dl>}
    <button type="button" className="primary-button final-confirm-button" onClick={onConfirm} disabled={!canConfirm || status === 'finalized'}>Confirm Final Analysis</button>
    {finalReport && <div className="mt-2 space-y-2">
      <p className="final-report-id">Final report saved in memory: <strong className="font-mono">{finalReport.primaryCaptureMomentId}</strong></p>
      <button type="button" className="secondary-button w-full" onClick={onViewResult}>View Result →</button>
    </div>}
  </section>;
}

function Inspector({ camera, a, moment, calibration, isCalibrating, onStartCalibration, onCancelCalibration, onApplyCalibration, onAdjustCalibration, isEditingMeasurement, onStartMeasurementEdit, onCancelMeasurementEdit, onApplyMeasurementEdit, sideMeasurements, frontMeasurements, onCorrectSide, onCorrectFront }: {
  camera: CameraType;
  a: AnalysisData;
  moment?: SynchronizedAnalysisFrame;
  calibration?: CalibrationSnapshot;
  isCalibrating?: boolean;
  onStartCalibration?: () => void;
  onCancelCalibration?: () => void;
  onApplyCalibration?: () => void;
  onAdjustCalibration?: (deltaPx: number) => void;
  isEditingMeasurement?: boolean;
  onStartMeasurementEdit?: () => void;
  onCancelMeasurementEdit?: () => void;
  onApplyMeasurementEdit?: () => void;
  sideMeasurements?: SideFinalMeasurements;
  frontMeasurements?: FrontFinalMeasurements;
  onCorrectSide?: (field: 'sprayLength' | 'sprayAngle' | 'verticalSpread', delta: number) => void;
  onCorrectFront?: (field: 'sprayArea' | 'centroidOffsetX' | 'centroidOffsetY', delta: number) => void;
}) {
  const measurementRows: { label: string; value: MeasurementValue; format: (value: number) => string }[] = camera === 'side'
    ? [
      ['Spray length', sideMeasurements?.sprayLength ?? { auto: a.side.sprayLengthMm, final: a.side.sprayLengthMm, adjusted: false }, fmt.cm],
      ['Spray angle', sideMeasurements?.sprayAngle ?? { auto: a.side.sprayAngleDeg, final: a.side.sprayAngleDeg, adjusted: false }, fmt.deg],
      ['Vertical spread', sideMeasurements?.verticalSpread ?? { auto: a.side.maxVerticalSpreadMm, final: a.side.maxVerticalSpreadMm, adjusted: false }, fmt.mm],
      ['Direction offset', sideMeasurements?.directionOffset ?? { auto: a.side.directionOffsetDeg, final: a.side.directionOffsetDeg, adjusted: false }, fmt.deg],
    ].map(([label, value, format]) => ({ label: label as string, value: value as MeasurementValue, format: format as (value: number) => string }))
    : [
      ['Spray area', frontMeasurements?.sprayArea ?? { auto: a.front.sprayAreaMm2, final: a.front.sprayAreaMm2, adjusted: false }, fmt.area],
      ['Equivalent diameter', frontMeasurements?.equivalentDiameter ?? { auto: a.front.equivalentDiameterMm, final: a.front.equivalentDiameterMm, adjusted: false }, fmt.mm],
      ['Circularity', frontMeasurements?.circularity ?? { auto: a.front.circularity, final: a.front.circularity, adjusted: false }, (value: number) => value.toFixed(2)],
      ['Centroid X', frontMeasurements?.centroidOffsetX ?? { auto: a.front.centroidOffsetXmm, final: a.front.centroidOffsetXmm, adjusted: false }, fmt.mm],
      ['Centroid Y', frontMeasurements?.centroidOffsetY ?? { auto: a.front.centroidOffsetYmm, final: a.front.centroidOffsetYmm, adjusted: false }, fmt.mm],
      ['Horizontal symmetry', frontMeasurements?.horizontalSymmetry ?? { auto: a.front.horizontalSymmetry, final: a.front.horizontalSymmetry, adjusted: false }, fmt.pct],
      ['Vertical symmetry', frontMeasurements?.verticalSymmetry ?? { auto: a.front.verticalSymmetry, final: a.front.verticalSymmetry, adjusted: false }, fmt.pct],
    ].map(([label, value, format]) => ({ label: label as string, value: value as MeasurementValue, format: format as (value: number) => string }));

  return <div className="inspector-sections">
    {calibration && <section className="calibration-summary-strip" aria-label={`${camera} calibration summary`}>
      <span><strong>Scale</strong> <span data-testid="inspector-scale" className="font-mono">{calibration.scaleMmPerPx.toFixed(3)} mm / px</span></span>
      <span><strong>Anchor B</strong> <span className="font-mono">{formatPointPx(calibration.anchorB)}</span></span>
    </section>}
    <section>
      <h3>Measurements</h3>
      <div className="metric-list">{measurementRows.map(row => <div className={`metric-row ${row.value.adjusted ? 'metric-row-adjusted' : ''}`} key={row.label}><span>{row.label}</span><strong data-testid={`inspector-${camera}-${metricSlug(row.label)}`} className="font-mono">{row.value.adjusted ? `Auto ${row.format(row.value.auto)} / Final ${row.format(selectMeasurementValue(row.value))}` : row.format(selectMeasurementValue(row.value))}</strong></div>)}</div>
      {(onStartMeasurementEdit || onCancelMeasurementEdit || onApplyMeasurementEdit) && <div className="measurement-actions">
        {!isEditingMeasurement && onStartMeasurementEdit && <button type="button" className="secondary-button" onClick={onStartMeasurementEdit}>Edit Measurement</button>}
        {isEditingMeasurement && <>
          <div className="measurement-action-row">
            {onCancelMeasurementEdit && <button type="button" className="secondary-button" onClick={onCancelMeasurementEdit}>Cancel</button>}
            {onApplyMeasurementEdit && <button type="button" className="primary-button" onClick={onApplyMeasurementEdit}>Apply Measurement</button>}
          </div>
          <p className="measurement-hint">Blue is automatic detection. Drag orange handles to define the accepted final geometry. Arrow = 1 px; Shift + Arrow = 10 px.</p>
          {camera === 'side' && onCorrectSide && <details className="measurement-fallback"><summary>Keyboard fallback controls</summary><div className="measurement-nudge">
            <button type="button" onClick={() => onCorrectSide('sprayLength', 5)}>Length +5 mm</button>
            <button type="button" onClick={() => onCorrectSide('sprayAngle', 0.2)}>Angle +0.2°</button>
            <button type="button" onClick={() => onCorrectSide('verticalSpread', 2)}>Spread +2 mm</button>
          </div></details>}
          {camera === 'front' && onCorrectFront && <details className="measurement-fallback"><summary>Keyboard fallback controls</summary><div className="measurement-nudge">
            <button type="button" onClick={() => onCorrectFront('sprayArea', 120)}>Area +120 mm²</button>
            <button type="button" onClick={() => onCorrectFront('centroidOffsetX', 0.5)}>Centroid X +0.5</button>
            <button type="button" onClick={() => onCorrectFront('centroidOffsetY', 0.5)}>Centroid Y +0.5</button>
          </div></details>}
        </>}
      </div>}
    </section>
    {moment && <section><h3>Capture moment</h3><dl className="inspector-data"><div><dt>Capture</dt><dd className="font-mono">#{String(moment.frameIndex).padStart(3, '0')} · {moment.frameIndex + 1} of {synchronizedFrames.length}</dd></div><div><dt>Timestamp</dt><dd className="font-mono">{moment.timestampMs} ms</dd></div><div><dt>Phase</dt><dd>{phaseLabel(moment.phase)}</dd></div><div><dt>Sync status</dt><dd className="font-mono">{moment.syncStatus} · Δ {moment.timestampDeltaMs} ms</dd></div><div><dt>Recommendation</dt><dd>{moment.recommended ? 'Recommended capture' : 'Not recommended'}</dd></div></dl></section>}
    <section>
      <h3>Calibration</h3>
      {calibration ? <dl className="inspector-data">
        <div><dt>Reference</dt><dd className="font-mono">{calibration.referenceDistanceMm} mm</dd></div>
        <div><dt>Anchor A</dt><dd className="font-mono">{formatPointPx(calibration.anchorA)}</dd></div>
        <div><dt>Anchor B</dt><dd className="font-mono">{formatPointPx(calibration.anchorB)}</dd></div>
        <div><dt>Scale</dt><dd className="font-mono">{calibration.scaleMmPerPx.toFixed(3)} mm / px</dd></div>
        <div><dt>Status</dt><dd className={calibration.adjusted ? 'text-semantic-warning' : 'text-semantic-success'}>{calibration.adjusted ? `Adjusted by ${calibration.adjustedBy}` : 'Fixture calibrated'}</dd></div>
      </dl> : <dl className="inspector-data"><div><dt>Scale status</dt><dd className="text-semantic-success">Fixture calibrated</dd></div><div><dt>Coordinate mode</dt><dd>Physical mm</dd></div></dl>}
      {(onStartCalibration || onApplyCalibration || onCancelCalibration) && <div className="calibration-actions">
        {!isCalibrating && onStartCalibration && <button type="button" className="secondary-button" onClick={onStartCalibration}>Adjust Calibration</button>}
        {isCalibrating && <>
          <div className="calibration-action-row">
            {onCancelCalibration && <button type="button" className="secondary-button" onClick={onCancelCalibration}>Cancel</button>}
            {onApplyCalibration && <button type="button" className="primary-button" onClick={onApplyCalibration}>Apply Calibration</button>}
          </div>
          <p className="calibration-hint">Drag Anchor A, Anchor B, or the ruler body. Keyboard fallback: Arrow = 1 px, Shift + Arrow = 10 px.</p>
          {onAdjustCalibration && <div className="calibration-nudge" aria-label="Keyboard fallback calibration controls">
            <button type="button" onClick={() => onAdjustCalibration(-12)} aria-label="Move anchor B left 12 px">B ← 12 px</button>
            <button type="button" onClick={() => onAdjustCalibration(12)} aria-label="Move anchor B right 12 px">B → 12 px</button>
          </div>}
        </>}
      </div>}
    </section>
  </div>;
}

function Result({ test, finalReport, setPage }: { test: Test; finalReport: FinalAnalysisReport | null; setPage: (p: Page) => void }) {
  if (!finalReport || finalReport.testId !== test.id) {
    return <div className="result-empty surface-panel">
      <h2>Final analysis required</h2>
      <p>This test does not yet have a finalized Analysis V2 report. Return to Analysis, select one Primary Capture Moment, then confirm final analysis.</p>
      <button type="button" className="primary-button" onClick={() => setPage('Analysis')}>Return to Analysis</button>
    </div>;
  }

  return <FinalizedResult report={finalReport} onViewReport={() => setPage('Reports')} />;
}

function FinalizedResult({ report, onViewReport }: { report: FinalAnalysisReport; onViewReport: () => void }) {
  const primaryFrame = { frameIndex: report.primaryCapture.frameIndex, timestampMs: report.primaryCapture.timestampMs, phase: report.primaryCapture.phase === 'pre_spray' ? 'pre-spray' as const : report.primaryCapture.phase === 'build_up' ? 'build-up' as const : report.primaryCapture.phase === 'decay' ? 'decay' as const : 'stable' as const };
  return <article className="result-v2">
    <section className="result-hero surface-panel">
      <div>
        <Status tone="success">Finalized</Status>
        <h2 className="font-mono">{report.test.testId}</h2>
        <p>{report.test.product.productName}</p>
      </div>
      <dl className="result-identity-grid">
        <div><dt>Sample</dt><dd className="font-mono">{report.test.sampleId}</dd></div>
        <div><dt>Recipe</dt><dd>{report.test.recipe.name}</dd></div>
        <div><dt>Operator</dt><dd>{report.test.operator}</dd></div>
        <div><dt>Primary Capture</dt><dd className="font-mono">#{String(report.primaryCapture.frameIndex).padStart(3, '0')} · {report.primaryCapture.timestampMs} ms</dd></div>
      </dl>
      <button type="button" className="secondary-button" onClick={onViewReport}>View Report</button>
    </section>

    <section className="result-primary surface-panel">
      <div className="result-section-heading"><div><span>Primary Capture</span><h3>Capture #{String(report.primaryCapture.frameIndex).padStart(3, '0')}</h3></div><p className="font-mono">{report.primaryCapture.timestampMs} ms · {phaseLabel(report.primaryCapture.phase)}</p></div>
      <div className="result-camera-grid">
        <ResultCameraFrame title="Side Camera Overlay" camera="side" frame={primaryFrame} measurements={report.side} calibration={report.side.calibration} />
        <ResultCameraFrame title="Front Camera Overlay" camera="front" frame={primaryFrame} measurements={report.front} calibration={report.front.calibration} />
      </div>
    </section>

    <div className="result-two-column">
      <ResultMeasurementPanel camera="side" report={report} />
      <ResultMeasurementPanel camera="front" report={report} />
    </div>

    <section className="result-two-column">
      <CalibrationSummary camera="Side" calibration={report.side.calibration} />
      <CalibrationSummary camera="Front" calibration={report.front.calibration} />
    </section>

    <AnalysisAudit report={report} />
    <SupportingCaptures report={report} />
  </article>;
}

type ResultMetric = { label: string; value: MeasurementValue; format: (value: number) => string; editable: boolean };

function resultMetrics(camera: CameraType, report: FinalAnalysisReport): ResultMetric[] {
  if (camera === 'side') return [
    { label: 'Spray Length', value: report.side.sprayLength, format: fmt.cm, editable: true },
    { label: 'Spray Angle', value: report.side.sprayAngle, format: fmt.deg, editable: true },
    { label: 'Vertical Spread', value: report.side.verticalSpread, format: fmt.mm, editable: true },
    { label: 'Direction Offset', value: report.side.directionOffset, format: fmt.deg, editable: true },
  ];
  return [
    { label: 'Spray Area', value: report.front.sprayArea, format: fmt.area, editable: true },
    { label: 'Equivalent Diameter', value: report.front.equivalentDiameter, format: fmt.mm, editable: true },
    { label: 'Circularity', value: report.front.circularity, format: value => value.toFixed(2), editable: false },
    { label: 'Centroid Offset X', value: report.front.centroidOffsetX, format: fmt.mm, editable: true },
    { label: 'Centroid Offset Y', value: report.front.centroidOffsetY, format: fmt.mm, editable: true },
    { label: 'Horizontal Symmetry', value: report.front.horizontalSymmetry, format: fmt.pct, editable: false },
    { label: 'Vertical Symmetry', value: report.front.verticalSymmetry, format: fmt.pct, editable: false },
  ];
}

function ResultCameraFrame({ title, camera, frame, measurements, calibration }: { title: string; camera: CameraType; frame: typeof frames[number]; measurements: SideFinalMeasurements | FrontFinalMeasurements; calibration: CalibrationSnapshot }) {
  const geometry = getPixelGeometry(frame.frameIndex, 'nominal-01');
  return <figure className="result-camera-frame">
    <div className="result-frame-meta"><strong>{title}</strong><span className="font-mono">#{String(frame.frameIndex).padStart(3, '0')} · {frame.timestampMs} ms</span></div>
    <div className="result-frame-image"><AnalysisOverlay camera={camera} mode="Overlay" frame={frame} calibration={calibration} sideGeometry={geometry.side} frontGeometry={geometry.front} sideMeasurements={camera === 'side' ? measurements as SideFinalMeasurements : createSideMeasurements({ sprayLengthMm: 0, sprayAngleDeg: 0, maxVerticalSpreadMm: 0, directionOffsetDeg: 0 })} frontMeasurements={camera === 'front' ? measurements as FrontFinalMeasurements : createFrontMeasurements({ sprayAreaMm2: 0, equivalentDiameterMm: 0, circularity: 0, centroidOffsetXmm: 0, centroidOffsetYmm: 0, horizontalSymmetry: 0, verticalSymmetry: 0 })} /></div>
    <figcaption>Frozen synchronized capture · Analysis source: Simulation</figcaption>
  </figure>;
}

function ResultMeasurementPanel({ camera, report }: { camera: CameraType; report: FinalAnalysisReport }) {
  return <section className="result-measurements surface-panel">
    <div className="result-section-heading"><div><span>{camera === 'side' ? 'Profile geometry' : 'Pattern geometry'}</span><h3>{camera === 'side' ? 'Side Camera Result' : 'Front Camera Result'}</h3></div></div>
    <div className="result-metric-list">{resultMetrics(camera, report).map(metric => <div className="result-metric" key={metric.label}>
      <div><span>{metric.label}</span>{metric.value.adjusted ? <small>Adjusted by {metric.value.adjustedBy}</small> : <small>{metric.editable ? 'Automatic accepted' : 'Automatic measurement'}</small>}</div>
      {metric.value.adjusted ? <div className="result-value-comparison"><span>Automatic <del>{metric.format(metric.value.auto)}</del></span><strong>Final {metric.format(metric.value.final)}</strong></div> : <strong>{metric.format(metric.value.final)}</strong>}
    </div>)}</div>
  </section>;
}

function CalibrationSummary({ camera, calibration }: { camera: 'Side' | 'Front'; calibration: CalibrationSnapshot }) {
  return <section className="calibration-result surface-panel"><span>{camera} calibration</span><strong>{calibration.referenceDistanceMm} mm reference</strong><span className="font-mono">{calibration.scaleMmPerPx.toFixed(3)} mm/px</span><small>{calibration.adjusted ? `Operator adjusted by ${calibration.adjustedBy}` : 'Default calibration'}</small></section>;
}

function AnalysisAudit({ report }: { report: FinalAnalysisReport }) {
  const sideAdjusted = hasAdjustedMeasurement(report.side);
  const frontAdjusted = hasAdjustedMeasurement(report.front);
  return <section className="result-audit surface-panel"><div className="result-section-heading"><div><span>Traceability</span><h3>Analysis Audit</h3></div></div><dl>
    <div><dt>Analysis finalized</dt><dd>{new Date(report.finalizedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
    <div><dt>Finalized by</dt><dd>{report.finalizedBy}</dd></div>
    <div><dt>Side measurement</dt><dd>{sideAdjusted ? 'Operator adjusted' : 'Automatic accepted'}</dd></div>
    <div><dt>Side calibration</dt><dd>{report.side.calibration.adjusted ? 'Operator adjusted' : 'Default'}</dd></div>
    <div><dt>Front measurement</dt><dd>{frontAdjusted ? 'Operator adjusted' : 'Automatic accepted'}</dd></div>
    <div><dt>Front calibration</dt><dd>{report.front.calibration.adjusted ? 'Operator adjusted' : 'Default'}</dd></div>
  </dl></section>;
}

function SupportingCaptures({ report }: { report: FinalAnalysisReport }) {
  if (report.supportingCaptures.length === 0) return <p className="supporting-empty">No supporting captures were selected.</p>;
  return <section className="supporting-section surface-panel"><div className="result-section-heading"><div><span>Evidence</span><h3>Supporting Captures</h3></div><p>{report.supportingCaptures.length} of 9</p></div><div className="supporting-list">{report.supportingCaptures.map(capture => <article key={capture.captureMomentId}>
    <header><strong className="font-mono">#{String(capture.frameIndex).padStart(3, '0')} · {capture.timestampMs} ms</strong><span>{phaseLabel(capture.phase)}</span></header>
    <div><div><Overlay camera="side" /><span>Side · {capture.side.frameId}</span></div><div><Overlay camera="front" /><span>Front · {capture.front.frameId}</span></div></div>
  </article>)}</div></section>;
}

export function createFinalReportCsv(report: FinalAnalysisReport): string {
  const fields: Array<[string, string | number | boolean]> = [
    ['test_id', report.test.testId], ['sample_id', report.test.sampleId], ['status', report.status], ['analysis_source', 'Simulation'],
    ['primary_capture_id', report.primaryCaptureMomentId], ['primary_frame_index', report.primaryCapture.frameIndex], ['primary_timestamp_ms', report.primaryCapture.timestampMs],
  ];
  for (const metric of resultMetrics('side', report)) fields.push([`side_${metricSlug(metric.label)}_auto`, metric.value.auto], [`side_${metricSlug(metric.label)}_final`, metric.value.final], [`side_${metricSlug(metric.label)}_adjusted`, metric.value.adjusted]);
  for (const metric of resultMetrics('front', report)) fields.push([`front_${metricSlug(metric.label)}_auto`, metric.value.auto], [`front_${metricSlug(metric.label)}_final`, metric.value.final], [`front_${metricSlug(metric.label)}_adjusted`, metric.value.adjusted]);
  return `${fields.map(([key]) => key).join(',')}\n${fields.map(([, value]) => String(value)).join(',')}`;
}

function History({ setSelected, setPage }: { setSelected: (t: Test) => void; setPage: (p: Page) => void }) {
  const [q, setQ] = useState('');
  const [product, setProduct] = useState('All');
  const [operator, setOperator] = useState('All');
  const [state, setState] = useState('All');
  const filtered = tests.filter(t => {
    const haystack = `${t.id} ${t.productName} ${t.sampleId} ${t.operatorName}`.toLowerCase();
    return haystack.includes(q.toLowerCase()) && (product === 'All' || t.productName === product) && (operator === 'All' || t.operatorName === operator) && (state === 'All' || t.status === state);
  });
  return <div className="space-y-4">
    <div className="grid gap-3 md:grid-cols-4">
      <label className="block text-sm font-medium">Search <input value={q} onChange={e => setQ(e.target.value)} className="mt-1 w-full rounded-sm border border-border-default px-3 py-2" placeholder="Test ID, product, operator..." /></label>
      <label className="block text-sm font-medium">Product <select value={product} onChange={e => setProduct(e.target.value)} className="mt-1 w-full rounded-sm border border-border-default px-3 py-2"><option>All</option>{Array.from(new Set(tests.map(t => t.productName))).map(n => <option key={n}>{n}</option>)}</select></label>
      <label className="block text-sm font-medium">Operator <select value={operator} onChange={e => setOperator(e.target.value)} className="mt-1 w-full rounded-sm border border-border-default px-3 py-2"><option>All</option>{Array.from(new Set(tests.map(t => t.operatorName))).map(n => <option key={n}>{n}</option>)}</select></label>
      <label className="block text-sm font-medium">State <select value={state} onChange={e => setState(e.target.value)} className="mt-1 w-full rounded-sm border border-border-default px-3 py-2"><option>All</option><option>complete</option><option>failed</option><option>running</option></select></label>
    </div>
    {filtered.length === 0 ? <div className="rounded-md border border-border-default bg-subtle p-8 text-center"><p className="text-sm text-text-secondary">No tests match the current filters.</p></div> : <Recent setSelected={setSelected} setPage={setPage} items={filtered} target="Result" />}
  </div>;
}

function Reports({ finalReport }: { finalReport: FinalAnalysisReport | null }) {
  const [exporting, setExporting] = useState(false);
  const handleExport = () => {
    setExporting(true);
    const csv = finalReport ? createFinalReportCsv(finalReport) : [
      'Test ID,Date,Product,Sample,Operator,Status,Spray Angle,Spray Area',
      ...tests.map(t => { const a = analyses[t.fixture]; return [t.id, fmt.date(t.createdAt), t.productName, t.sampleId, t.operatorName, t.status, fmt.deg(a.side.sprayAngleDeg), fmt.area(a.front.sprayAreaMm2)].join(','); }),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spraybot-report-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 800);
  };

  if (!finalReport) return <Panel title="Reports"><div className="p-4"><p className="text-sm text-text-secondary">No finalized analysis report is available. Finalize an Analysis V2 session to produce a report.</p><button onClick={handleExport} disabled={exporting} className="mt-3 rounded-sm border border-border-default px-4 py-2 text-sm hover:bg-subtle disabled:opacity-50">{exporting ? 'Exporting...' : 'Export Legacy CSV'}</button></div></Panel>;

  return <article className="report-v2">
    <div className="report-header surface-panel">
      <div><div className="report-mark"><Status tone="success">Finalized</Status><span className="report-disclosure">Analysis source: Simulation</span></div><h2>Technical Test Report</h2><p className="font-mono">{finalReport.test.testId}</p></div>
      <button onClick={handleExport} disabled={exporting} className="secondary-button">{exporting ? 'Exporting CSV...' : 'Export CSV'}</button>
    </div>

    <section className="report-section surface-panel"><div className="result-section-heading"><div><span>Identification</span><h3>Test Information</h3></div></div><dl>
      <div><dt>Test ID</dt><dd className="font-mono">{finalReport.test.testId}</dd></div>
      <div><dt>Sample ID</dt><dd className="font-mono">{finalReport.test.sampleId}</dd></div>
      <div><dt>Product</dt><dd>{finalReport.test.product.productName}</dd></div>
      <div><dt>Product Code</dt><dd className="font-mono">{finalReport.test.product.productCode}</dd></div>
      <div><dt>Recipe</dt><dd>{finalReport.test.recipe.name}</dd></div>
      {finalReport.test.productionBatch && <div><dt>Production Batch</dt><dd className="font-mono">{finalReport.test.productionBatch}</dd></div>}
      <div><dt>Operator</dt><dd>{finalReport.test.operator}</dd></div>
      <div><dt>Test Timestamp</dt><dd>{new Date(finalReport.test.testTimestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
      <div><dt>Report Status</dt><dd><Status tone="success">{finalReport.status}</Status></dd></div>
    </dl></section>

    <section className="report-section surface-panel"><div className="result-section-heading"><div><span>Configuration</span><h3>Test Setpoints</h3></div></div><dl>
      <div><dt>Force setpoint</dt><dd>{finalReport.test.setpoints.forceSetpointN} N</dd></div>
      <div><dt>Press duration</dt><dd>{finalReport.test.setpoints.pressDurationMs} ms</dd></div>
      <div><dt>Stroke</dt><dd>{finalReport.test.setpoints.strokeMm} mm</dd></div>
    </dl></section>

    <section className="report-section surface-panel"><div className="result-section-heading"><div><span>Selected capture moment</span><h3>Primary Capture</h3></div></div><dl>
      <div><dt>Capture</dt><dd className="font-mono">#{String(finalReport.primaryCapture.frameIndex).padStart(3, '0')}</dd></div>
      <div><dt>Timestamp</dt><dd className="font-mono">{finalReport.primaryCapture.timestampMs} ms</dd></div>
      <div><dt>Phase</dt><dd>{phaseLabel(finalReport.primaryCapture.phase)}</dd></div>
      <div><dt>Side Frame</dt><dd className="font-mono">{finalReport.side.frameId}</dd></div>
      <div><dt>Front Frame</dt><dd className="font-mono">{finalReport.front.frameId}</dd></div>
    </dl></section>

    <ResultMeasurementPanel camera="side" report={finalReport} />
    <ResultMeasurementPanel camera="front" report={finalReport} />

    <section className="result-two-column">
      <CalibrationSummary camera="Side" calibration={finalReport.side.calibration} />
      <CalibrationSummary camera="Front" calibration={finalReport.front.calibration} />
    </section>

    <AnalysisAudit report={finalReport} />
    <SupportingCaptures report={finalReport} />

    <section className="report-section surface-panel"><div className="result-section-heading"><div><span>Record</span><h3>Finalization</h3></div></div><dl>
      <div><dt>Finalized by</dt><dd>{finalReport.finalizedBy}</dd></div>
      <div><dt>Finalized at</dt><dd>{new Date(finalReport.finalizedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</dd></div>
      <div><dt>Analysis source</dt><dd>Simulation</dd></div>
    </dl></section>
  </article>;
}

function Products() {
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
    return <Panel title={editingProduct ? 'Edit product master data' : 'Add product master data'}>
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
    </Panel>;
  }

  if (mode === 'recipe-form') {
    return <Panel title={editingRecipe ? 'Edit Test Recipe' : 'Add Test Recipe'}>
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
    </Panel>;
  }

  if (mode === 'detail' && selectedProduct) {
    return <div className="product-workspace space-y-4">
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
        <div className="lg:col-span-2"><Panel title="Test Recipes"><Table><thead className="bg-subtle"><tr>{['Recipe Name', 'Setpoints (N / ms / mm)', 'Default', 'Action'].map(h => <th className="px-3 py-2 text-left" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-border-default">{recipes.map(r => <tr key={r.id}><td className="px-3 py-2 font-medium">{r.name}{r.description && <div className="text-xs font-normal text-text-muted">{r.description}</div>}</td><td className="px-3 py-2 font-mono text-xs">{r.forceSetpointN} N · {r.pressDurationMs} ms · {r.strokeMm} mm</td><td className="px-3 py-2">{r.isDefault ? <Status tone="success">Default</Status> : <button onClick={() => handleSetDefaultRecipe(r.id)} className="text-xs text-primary underline">Set default</button>}</td><td className="px-3 py-2"><button onClick={() => openEditRecipe(r)} className="text-xs text-primary underline">Edit</button></td></tr>)}</tbody></Table></Panel></div>
      </div>
    </div>;
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter products by code, name, category..." className="w-full max-w-sm rounded-md border border-border-default bg-surface px-3 py-2 text-sm outline-none focus:border-primary" />
      <button onClick={openAddProduct} className="primary-button">+ Add Product</button>
    </div>
    <Panel title="Product Master Data">
      <Table>
        <thead className="bg-subtle"><tr>{['Product Code', 'Product Name', 'Category', 'Volume', 'Default Recipe', 'Updated', 'Action'].map(h => <th className="px-3 py-2 text-left" key={h}>{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-border-default">{filtered.map(p => {
          return <tr key={p.id}><td className="px-3 py-2 font-mono">{p.productCode}</td><td className="px-3 py-2 font-semibold">{p.name}</td><td className="px-3 py-2">{p.category}</td><td className="px-3 py-2">{p.nominalVolumeMl ? `${p.nominalVolumeMl} mL` : '-'}</td><td className="px-3 py-2 font-mono text-xs">{allRecipes.find(r => r.productId === p.id && r.isDefault)?.name || 'Standard Spray Test'}</td><td className="px-3 py-2 text-xs text-text-muted">{fmt.date(p.updatedAt)}</td><td className="px-3 py-2"><button onClick={() => { setSelectedId(p.id); setMode('detail'); }} className="text-primary underline font-medium">View Detail</button></td></tr>;
        })}</tbody>
      </Table>
    </Panel>
  </div>;
}

function Calibration() {
  return <Panel title="Mock calibration"><Status tone="warning">Mock calibration</Status><div className="mt-4 grid gap-4 md:grid-cols-2"><Metric label="Side camera scale" value="0.42 mm / px" /><Metric label="Front reference center" value="300, 170 px" /><Metric label="ROI preview" value="Fixture ROI only" /></div></Panel>;
}

function SettingsPage() {
  return <Panel title="Settings"><div className="space-y-4 max-w-xl"><div><div className="text-sm font-semibold">Local Workstation Environment</div><p className="text-xs text-text-secondary">System configuration for Spraybot analysis station.</p></div><div className="grid gap-3 rounded-md border border-border-default bg-subtle p-4 text-xs"><div className="flex justify-between"><span className="text-text-muted">Node Environment</span><span className="font-mono font-medium">development</span></div><div className="flex justify-between"><span className="text-text-muted">Analysis Backend</span><span className="font-mono font-medium">Fixture Mock Engine</span></div><div className="flex justify-between"><span className="text-text-muted">Authentication Mode</span><span className="font-mono font-medium">Local PostgreSQL Session</span></div></div></div></Panel>;
}

function Users() {
  return <Panel title="Users"><Table><thead className="bg-subtle"><tr>{['Name', 'Email', 'Role', 'Status'].map(h => <th className="px-3 py-2 text-left" key={h}>{h}</th>)}</tr></thead><tbody><tr><td className="px-3 py-2">Nadia Putri</td><td>operator@local.test</td><td>Operator</td><td><Status tone="success">Enabled</Status></td></tr><tr><td className="px-3 py-2">R&D Analyst</td><td>analyst@local.test</td><td>Analyst</td><td><Status tone="success">Enabled</Status></td></tr></tbody></Table></Panel>;
}



