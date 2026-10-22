import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  kodePengujianRepository,
  productRepository,
  syncService,
} from '../../../application/services';
import type {
  KodePengujian,
  TestRecipe,
  FixtureScenario,
} from '@spray-paragon/domain';
import { getEffectiveSampleContext } from '@spray-paragon/domain';
import { Status } from '../../components/ui/Status';
import { Table } from '../../components/ui/Table';
import { fmt } from '../../utils/formatters';

const kpStatusLabels: Record<string, string> = {
  DRAFT: 'Draf',
  ACTIVE: 'Aktif',
  CLOSED: 'Selesai',
  ARCHIVED: 'Diarsipkan',
};

const sampleStatusLabels: Record<string, string> = {
  CREATED: 'Dibuat',
  TESTED: 'Sudah Diuji',
  EXCLUDED: 'Dikecualikan',
};

const testRunStatusLabels: Record<string, string> = {
  PENDING: 'Menunggu',
  CAPTURING: 'Pengambilan Data',
  ANALYZING: 'Analisis',
  REVIEW_REQUIRED: 'Perlu Ditinjau',
  FINALIZED: 'Final',
  FAILED: 'Gagal',
  ABORTED: 'Dibatalkan',
};

const syncStatusLabels: Record<string, string> = {
  local: 'Lokal',
  pending: 'Menunggu Sinkronisasi',
  synced: 'Tersinkron',
  failed: 'Gagal Sinkronisasi',
};

function getSyncStatusTone(status: string): 'neutral' | 'info' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'synced':
      return 'success';
    case 'pending':
      return 'warning';
    case 'failed':
      return 'danger';
    case 'local':
    default:
      return 'neutral';
  }
}

function getTestRunStatusTone(
  status: string
): 'neutral' | 'info' | 'warning' | 'success' | 'danger' {
  switch (status) {
    case 'PENDING':
      return 'neutral';
    case 'CAPTURING':
    case 'ANALYZING':
      return 'info';
    case 'REVIEW_REQUIRED':
      return 'warning';
    case 'FINALIZED':
      return 'success';
    case 'FAILED':
    case 'ABORTED':
      return 'danger';
    default:
      return 'info';
  }
}

export function KodePengujianDetailPage() {
  const { kpId } = useParams();
  const navigate = useNavigate();
  const [kp, setKp] = useState<KodePengujian | null>(null);
  const [loading, setLoading] = useState(true);

  // Active selected sample for viewing test runs
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);

  // Available recipes for this product
  const [recipes, setRecipes] = useState<TestRecipe[]>([]);

  // Modal / form states
  const [showAddSampleModal, setShowAddSampleModal] = useState(false);
  const [newSampleCode, setNewSampleCode] = useState('');
  const [newSampleStorageOverride, setNewSampleStorageOverride] = useState('');
  const [newSamplePositionOverride, setNewSamplePositionOverride] = useState('');
  const [newSampleNotes, setNewSampleNotes] = useState('');
  const [addingSample, setAddingSample] = useState(false);

  // Add TestRun modal states
  const [showAddTestRunModal, setShowAddTestRunModal] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [testRunRepetition, setTestRunRepetition] = useState('');
  const [testRunNotes, setTestRunNotes] = useState('');
  const [addingTestRun, setAddingTestRun] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleManualSync = async () => {
    if (!kp) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await syncService.syncKodePengujian(kp.id);
      if (!result.success) {
        setSyncFeedback(result.error || 'Gagal sinkronisasi ke server');
      } else {
        setSyncFeedback('Sinkronisasi berhasil');
      }
      const refreshed = await kodePengujianRepository.get(kp.id);
      if (refreshed) setKp(refreshed);
    } catch (e) {
      setSyncFeedback((e as Error).message);
    } finally {
      setIsSyncing(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!kpId) return;
    try {
      const data = await kodePengujianRepository.get(kpId);
      setKp(data);
      if (data) {
        // Load product recipes
        const recs = await productRepository.listRecipes(data.productId);
        setRecipes(recs);
        if (recs.length > 0 && !selectedRecipeId) {
          const def = recs.find((r) => r.id === data.defaultRecipeId) || recs[0];
          setSelectedRecipeId(def.id);
        }
        // Auto-select first sample if none selected
        if (!selectedSampleId && data.samples.length > 0) {
          setSelectedSampleId(data.samples[0].id);
        }
      }
    } catch (e) {
      console.error(e);
      setKp(null);
    } finally {
      setLoading(false);
    }
  }, [kpId, selectedSampleId, selectedRecipeId]);

  useEffect(() => {
    let active = true;
    if (active) loadData();
    return () => {
      active = false;
    };
  }, [loadData]);

  const handleAddSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kp || addingSample) return;
    setAddingSample(true);
    try {
      const result = await kodePengujianRepository.addSample(kp.id, {
        sampleCode: newSampleCode.trim() || undefined,
        positionInRun: kp.samples.length + 1,
        storageCondition: newSampleStorageOverride.trim() || undefined,
        bottlePosition: newSamplePositionOverride.trim() || undefined,
        notes: newSampleNotes.trim() || undefined,
      });
      setShowAddSampleModal(false);
      setNewSampleCode('');
      setNewSampleStorageOverride('');
      setNewSamplePositionOverride('');
      setNewSampleNotes('');
      // Select the newly added sample
      setSelectedSampleId(result.sample.id);
      await loadData();
    } catch (err) {
      console.error('Gagal menambahkan sampel:', err);
    } finally {
      setAddingSample(false);
    }
  };

  const handleAddTestRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kp || !selectedSampleId || addingTestRun) return;
    const recipe = recipes.find((r) => r.id === selectedRecipeId);
    if (!recipe) return;

    setAddingTestRun(true);
    try {
      await kodePengujianRepository.addTestRun(kp.id, {
        sampleId: selectedSampleId,
        recipeId: recipe.id,
        recipeSnapshot: {
          name: recipe.name,
          forceSetpointN: recipe.forceSetpointN,
          pressDurationMs: recipe.pressDurationMs,
          strokeMm: recipe.strokeMm,
        },
        setpoints: {
          forceSetpointN: recipe.forceSetpointN,
          pressDurationMs: recipe.pressDurationMs,
          strokeMm: recipe.strokeMm,
        },
        fixture: 'nominal-01' as FixtureScenario,
        operatorId: 'usr-np',
        operatorName: 'Nadia Putri',
        repetitionIndex: testRunRepetition.trim()
          ? Number(testRunRepetition)
          : undefined,
        notes: testRunNotes.trim() || undefined,
      });

      setShowAddTestRunModal(false);
      setTestRunRepetition('');
      setTestRunNotes('');
      await loadData();
    } catch (err) {
      console.error('Gagal menambahkan pengujian:', err);
    } finally {
      setAddingTestRun(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-text-secondary">
        Memuat kode pengujian {kpId}...
      </div>
    );
  }

  if (!kp) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-text-primary">
          Kode Pengujian Tidak Ditemukan
        </h1>
        <p className="text-sm text-text-secondary">
          Kode Pengujian {kpId} tidak ditemukan atau belum dibuat.
        </p>
        <button
          onClick={() => navigate('/kode-pengujian')}
          className="text-sm font-medium text-primary hover:underline"
        >
          &larr; Kembali ke Kode Pengujian
        </button>
      </div>
    );
  }

  const selectedSample = kp.samples.find((s) => s.id === selectedSampleId) || null;
  const sampleTestRuns = kp.testRuns.filter((t) => t.sampleId === selectedSampleId);
  const activeRecipe = recipes.find((r) => r.id === selectedRecipeId) || null;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Title */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div>
          <button
            onClick={() => navigate('/kode-pengujian')}
            className="text-xs font-semibold text-text-muted hover:text-text-primary mb-1.5 flex items-center gap-1 transition-colors"
          >
            <span>&larr;</span> <span>Kembali ke Daftar Kode Pengujian</span>
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary font-mono">
              {kp.id}
            </h1>
            <Status tone={kp.status === 'CLOSED' ? 'success' : kp.status === 'ACTIVE' ? 'warning' : 'neutral'}>
              {kpStatusLabels[kp.status] || kp.status}
            </Status>
            {kp.sync && (
              <>
                <Status tone={getSyncStatusTone(kp.sync.status)}>
                  {syncStatusLabels[kp.sync.status] || kp.sync.status}
                </Status>
                {kp.sync.status !== 'synced' && (
                  <button
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="btn btn-secondary text-xs"
                    type="button"
                  >
                    {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}
                  </button>
                )}
                {syncFeedback && (
                  <span className="text-xs text-text-muted font-mono ml-2">
                    {syncFeedback}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Header Context Panel */}
      <div className="surface-panel p-5 bg-surface rounded-xl border border-border-default space-y-4">
        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">
          Konteks Pengujian Bersama
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
          <div>
            <div className="text-xs text-text-muted">Produk / Formula</div>
            <div className="font-semibold text-text-primary">
              {kp.productSnapshot?.productName || '—'}
            </div>
            <div className="font-mono text-xs text-text-secondary">
              {kp.productSnapshot?.productCode || '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Lot / Referensi Material</div>
            <div className="font-mono font-semibold text-text-primary">
              {kp.productLot || '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Periode Uji</div>
            <div className="font-medium text-text-primary">
              {kp.testPeriod || '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Kondisi Simpan (Default)</div>
            <div className="font-medium text-text-primary">
              {kp.storageCondition || '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Posisi Botol (Default)</div>
            <div className="font-medium text-text-primary">
              {kp.bottlePosition || '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted">Metodologi Default</div>
            <div className="font-medium text-text-primary">
              {kp.defaultRecipeSnapshot?.name || '—'}
            </div>
          </div>
        </div>

        {kp.notes && (
          <div className="pt-2 border-t border-border-subtle text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">Catatan:</span> {kp.notes}
          </div>
        )}
      </div>

      {/* Main Hierarchy: Samples Table & Selected Sample Test Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Samples List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="surface-panel surface-panel-large overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary">
                  Sampel Pengujian
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-surface-subtle text-xs font-semibold text-text-secondary">
                  {kp.samples.length}
                </span>
              </div>
              <button
                onClick={() => setShowAddSampleModal(true)}
                className="btn btn-primary !min-h-[32px] px-3 text-xs"
                id="btn-tambah-sampel"
              >
                + Tambah Sampel
              </button>
            </div>

            <Table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>ID / Kode Sampel</th>
                  <th>Kondisi Simpan</th>
                  <th>Posisi Botol</th>
                  <th>Pengujian</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="bg-surface">
                {kp.samples.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-text-muted text-xs">
                      Belum ada sampel. Klik "+ Tambah Sampel" untuk menambahkan botol sampel.
                    </td>
                  </tr>
                ) : (
                  kp.samples.map((sample) => {
                    const effective = getEffectiveSampleContext(sample, kp);
                    const isSelected = sample.id === selectedSampleId;
                    const runCount = kp.testRuns.filter((t) => t.sampleId === sample.id).length;
                    const isTested = kp.testRuns.some((t) => t.sampleId === sample.id && t.status === 'FINALIZED');
                    const displayStatus = sample.status === 'EXCLUDED' ? 'EXCLUDED' : isTested ? 'TESTED' : 'CREATED';

                    return (
                      <tr
                        key={sample.id}
                        onClick={() => setSelectedSampleId(sample.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary-soft/40 border-l-4 border-primary font-medium'
                            : 'hover:bg-surface-subtle'
                        }`}
                      >
                        <td className="font-mono text-xs text-text-muted">
                          #{sample.positionInRun}
                        </td>
                        <td>
                          <div className="font-semibold text-text-primary text-xs">
                            {sample.sampleCode || sample.id}
                          </div>
                          {sample.sampleCode && (
                            <div className="font-mono text-[10px] text-text-muted">
                              {sample.id}
                            </div>
                          )}
                        </td>
                        <td className="text-xs">
                          {effective.storageCondition || '—'}
                          {sample.storageCondition && (
                            <span className="ml-1 text-[10px] text-primary font-semibold">
                              (override)
                            </span>
                          )}
                        </td>
                        <td className="text-xs">
                          {effective.bottlePosition || '—'}
                          {sample.bottlePosition && (
                            <span className="ml-1 text-[10px] text-primary font-semibold">
                              (override)
                            </span>
                          )}
                        </td>
                        <td className="text-xs font-semibold">
                          {runCount} Pengujian
                        </td>
                        <td>
                          <Status
                            tone={
                              displayStatus === 'TESTED'
                                ? 'success'
                                : displayStatus === 'EXCLUDED'
                                ? 'danger'
                                : 'neutral'
                            }
                          >
                            {sampleStatusLabels[displayStatus] || displayStatus}
                          </Status>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </div>

        {/* Right Column: Selected Sample Test Runs */}
        <div className="lg:col-span-5 space-y-4">
          <div className="surface-panel surface-panel-large overflow-hidden">
            <div className="p-4 border-b border-border-subtle bg-surface flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  {selectedSample
                    ? `Pengujian untuk Sampel #${selectedSample.positionInRun} (${
                        selectedSample.sampleCode || selectedSample.id
                      })`
                    : 'Detail Pengujian Sampel'}
                </h3>
                <p className="text-xs text-text-muted">
                  {sampleTestRuns.length} pengujian tercatat untuk sampel ini
                </p>
              </div>
              {selectedSample && (
                <button
                  onClick={() => setShowAddTestRunModal(true)}
                  className="btn btn-primary !min-h-[32px] px-3 text-xs"
                  id="btn-tambah-pengujian"
                >
                  + Tambah Pengujian
                </button>
              )}
            </div>

            {!selectedSample ? (
              <div className="p-8 text-center text-text-muted text-xs">
                Pilih salah satu sampel di sebelah kiri untuk melihat daftar pengujian.
              </div>
            ) : sampleTestRuns.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-xs space-y-3">
                <p>Belum ada eksekusi pengujian untuk sampel ini.</p>
                <button
                  onClick={() => setShowAddTestRunModal(true)}
                  className="btn btn-secondary !min-h-[32px] px-4 text-xs"
                >
                  + Tambah Pengujian Sekarang
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {sampleTestRuns.map((tr) => (
                  <div key={tr.id} className="p-4 space-y-2 hover:bg-surface-subtle transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-bold text-xs text-primary">
                        {tr.id}
                        {tr.repetitionIndex !== undefined && (
                          <span className="ml-1 text-[11px] text-text-secondary font-normal">
                            (Repetisi #{tr.repetitionIndex})
                          </span>
                        )}
                      </div>
                      <Status tone={getTestRunStatusTone(tr.status)}>
                        {testRunStatusLabels[tr.status] || tr.status}
                      </Status>
                    </div>

                    <div className="text-xs">
                      <div className="font-semibold text-text-primary">
                        {tr.recipeSnapshot.name}
                      </div>
                      <div className="text-text-muted flex items-center gap-3 mt-1 font-mono text-[11px]">
                        <span>{tr.setpoints.forceSetpointN} N</span>
                        <span>•</span>
                        <span>{tr.setpoints.pressDurationMs} ms</span>
                        <span>•</span>
                        <span>{tr.setpoints.strokeMm} mm</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-border-subtle/50">
                      <span>Operator: {tr.operatorName}</span>
                      <div className="flex items-center gap-2">
                        {tr.status === 'PENDING' && (
                          <button
                            onClick={() =>
                              navigate(
                                `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/capture`
                              )
                            }
                            className="btn btn-primary !min-h-[28px] !py-1 px-3 text-xs"
                            id={`btn-mulai-pengujian-${tr.id}`}
                          >
                            Mulai Pengujian
                          </button>
                        )}
                        {tr.status === 'CAPTURING' && (
                          <button
                            onClick={() =>
                              navigate(
                                `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/capture`
                              )
                            }
                            className="btn btn-secondary !min-h-[28px] !py-1 px-3 text-xs"
                            id={`btn-lanjut-pengujian-${tr.id}`}
                          >
                            Buka Pengambilan
                          </button>
                        )}
                        {tr.status === 'ANALYZING' && (
                          <button
                            onClick={() =>
                              navigate(
                                `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/analysis`
                              )
                            }
                            className="btn btn-primary !min-h-[28px] !py-1 px-3 text-xs"
                            id={`btn-buka-analisis-${tr.id}`}
                          >
                            Buka Analisis
                          </button>
                        )}
                        {tr.status === 'REVIEW_REQUIRED' && (
                          <button
                            onClick={() =>
                              navigate(
                                `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/analysis`
                              )
                            }
                            className="btn btn-primary !min-h-[28px] !py-1 px-3 text-xs"
                            id={`btn-tinjau-analisis-${tr.id}`}
                          >
                            Tinjau Analisis
                          </button>
                        )}
                        {tr.status === 'FINALIZED' && (
                          <button
                            onClick={() =>
                              navigate(
                                `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/result`
                              )
                            }
                            className="btn btn-secondary !min-h-[28px] !py-1 px-3 text-xs"
                            id={`btn-buka-hasil-${tr.id}`}
                          >
                            Buka Hasil
                          </button>
                        )}
                        <span>{fmt.date(tr.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Tambah Sampel */}
      {showAddSampleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-xl border border-border-default shadow-xl max-w-md w-full overflow-hidden">
            <form onSubmit={handleAddSample}>
              <div className="p-4 border-b border-border-subtle bg-surface-subtle flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary">Tambah Botol Sampel</h3>
                <button
                  type="button"
                  onClick={() => setShowAddSampleModal(false)}
                  className="text-text-muted hover:text-text-primary text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4 text-sm">
                <div className="form-group space-y-1">
                  <label className="form-label text-xs">Kode / Label Sampel (Opsional)</label>
                  <input
                    type="text"
                    placeholder={`Contoh: SMP-${String(kp.samples.length + 1).padStart(3, '0')}`}
                    className="form-input w-full"
                    value={newSampleCode}
                    onChange={(e) => setNewSampleCode(e.target.value)}
                  />
                  <p className="text-[11px] text-text-muted">
                    Nomor urut posisi otomatis: #{kp.samples.length + 1}
                  </p>
                </div>

                <div className="form-group space-y-1">
                  <label className="form-label text-xs">
                    Kondisi Simpan (Opsional Override)
                  </label>
                  <input
                    type="text"
                    placeholder={
                      kp.storageCondition
                        ? `Default: ${kp.storageCondition}`
                        : 'Contoh: Oven 40°C'
                    }
                    className="form-input w-full"
                    value={newSampleStorageOverride}
                    onChange={(e) => setNewSampleStorageOverride(e.target.value)}
                  />
                  {kp.storageCondition && (
                    <p className="text-[11px] text-text-muted">
                      Default Kode Pengujian: <span className="font-semibold">{kp.storageCondition}</span>
                    </p>
                  )}
                </div>

                <div className="form-group space-y-1">
                  <label className="form-label text-xs">
                    Posisi Botol (Opsional Override)
                  </label>
                  <input
                    type="text"
                    placeholder={
                      kp.bottlePosition
                        ? `Default: ${kp.bottlePosition}`
                        : 'Contoh: Terbalik'
                    }
                    className="form-input w-full"
                    value={newSamplePositionOverride}
                    onChange={(e) => setNewSamplePositionOverride(e.target.value)}
                  />
                  {kp.bottlePosition && (
                    <p className="text-[11px] text-text-muted">
                      Default Kode Pengujian: <span className="font-semibold">{kp.bottlePosition}</span>
                    </p>
                  )}
                </div>

                <div className="form-group space-y-1">
                  <label className="form-label text-xs">Catatan Sampel (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Catatan khusus botol ini..."
                    className="form-input w-full"
                    value={newSampleNotes}
                    onChange={(e) => setNewSampleNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 border-t border-border-subtle bg-surface flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSampleModal(false)}
                  className="btn btn-secondary !min-h-[32px] px-3 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addingSample}
                  className="btn btn-primary !min-h-[32px] px-4 text-xs"
                >
                  {addingSample ? 'Menyimpan...' : 'Simpan Sampel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Pengujian (Test Run) */}
      {showAddTestRunModal && selectedSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-xl border border-border-default shadow-xl max-w-md w-full overflow-hidden">
            <form onSubmit={handleAddTestRun}>
              <div className="p-4 border-b border-border-subtle bg-surface-subtle flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary">
                  Tambah Pengujian Baru (Test Run)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddTestRunModal(false)}
                  className="text-text-muted hover:text-text-primary text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4 text-sm">
                <div className="bg-surface-subtle p-3 rounded-input text-xs space-y-1">
                  <div className="text-text-muted">Sampel Target:</div>
                  <div className="font-bold text-text-primary">
                    Sampel #{selectedSample.positionInRun} ({selectedSample.sampleCode || selectedSample.id})
                  </div>
                </div>

                <div className="form-group space-y-1">
                  <label className="form-label text-xs">Pilih Metodologi</label>
                  <select
                    value={selectedRecipeId}
                    onChange={(e) => setSelectedRecipeId(e.target.value)}
                    className="form-select w-full"
                  >
                    <option value="">— Pilih metodologi —</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.forceSetpointN} N, {r.pressDurationMs} ms, {r.strokeMm} mm)
                      </option>
                    ))}
                  </select>
                </div>

                {activeRecipe && (
                  <div className="p-3 bg-surface-subtle rounded-input space-y-2">
                    <div className="text-[11px] font-bold text-text-muted uppercase">Setpoint Terpilih</div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <div className="text-[10px] text-text-muted">Gaya</div>
                        <div className="font-mono font-bold">{activeRecipe.forceSetpointN} N</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted">Durasi</div>
                        <div className="font-mono font-bold">{activeRecipe.pressDurationMs} ms</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted">Stroke</div>
                        <div className="font-mono font-bold">{activeRecipe.strokeMm} mm</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group space-y-1">
                  <label className="form-label text-xs">Indeks Repetisi (Opsional)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 1, 2, 3..."
                    className="form-input w-full"
                    value={testRunRepetition}
                    onChange={(e) => setTestRunRepetition(e.target.value)}
                  />
                </div>

                <div className="form-group space-y-1">
                  <label className="form-label text-xs">Catatan Pengujian (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Catatan pengujian..."
                    className="form-input w-full"
                    value={testRunNotes}
                    onChange={(e) => setTestRunNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 border-t border-border-subtle bg-surface flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddTestRunModal(false)}
                  className="btn btn-secondary !min-h-[32px] px-3 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addingTestRun || !activeRecipe}
                  className="btn btn-primary !min-h-[32px] px-4 text-xs"
                >
                  {addingTestRun ? 'Menambahkan...' : 'Tambah Pengujian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}