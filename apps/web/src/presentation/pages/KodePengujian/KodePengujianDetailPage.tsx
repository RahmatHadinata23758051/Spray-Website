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
import {
  Status,
  Table,
  FormField,
  Input,
  Select,
  ActionBar,
} from '../../components/ui';
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
      <div className="p-4 text-xs text-text-secondary">
        Memuat kode pengujian {kpId}...
      </div>
    );
  }

  if (!kp) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-bold text-text-primary">
          Kode Pengujian Tidak Ditemukan
        </h1>
        <p className="text-xs text-text-secondary">
          Kode Pengujian {kpId} tidak ditemukan atau belum dibuat.
        </p>
        <button
          onClick={() => navigate('/kode-pengujian')}
          className="text-xs font-medium text-primary hover:underline"
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
    <div className="space-y-4">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
        <div>
          <button
            onClick={() => navigate('/kode-pengujian')}
            className="text-xs font-medium text-text-muted hover:text-text-primary mb-1 flex items-center gap-1 transition-colors"
          >
            <span>&larr;</span> <span>Kode Pengujian</span>
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-semibold tracking-tight text-text-primary font-mono">
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
                    className="btn btn-secondary !min-h-[28px] !py-0.5 px-2.5 text-xs font-medium"
                    type="button"
                  >
                    {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan'}
                  </button>
                )}
                {syncFeedback && (
                  <span className="text-xs text-text-muted font-mono ml-1">
                    {syncFeedback}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Header Context Panel - Compact Flat Enterprise Specification Ribbon */}
      <div className="rounded-md border border-border-default bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border-subtle bg-surface-subtle px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-medium text-text-secondary">
            Konteks pengujian bersama
          </span>
          <span className="font-mono text-[11px] text-text-muted">
            ID: {kp.id}
          </span>
        </div>
        <div className="p-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-3 text-xs">
          <div>
            <div className="text-[11px] text-text-muted font-medium">Produk & formula</div>
            <div className="font-medium text-text-primary truncate" title={kp.productSnapshot?.productName}>
              {kp.productSnapshot?.productName || '—'}
            </div>
            <div className="font-mono text-[11px] text-text-secondary">
              {kp.productSnapshot?.productCode || '—'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-text-muted font-medium">Lot / referensi</div>
            <div className="font-mono font-medium text-text-primary">
              {kp.productLot || '—'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-text-muted font-medium">Periode uji</div>
            <div className="font-medium text-text-primary">
              {kp.testPeriod || '—'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-text-muted font-medium">Kondisi simpan</div>
            <div className="font-medium text-text-primary">
              {kp.storageCondition || '—'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-text-muted font-medium">Posisi botol</div>
            <div className="font-medium text-text-primary">
              {kp.bottlePosition || '—'}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-text-muted font-medium">Metodologi default</div>
            <div className="font-medium text-text-primary">
              {kp.defaultRecipeSnapshot?.name || '—'}
            </div>
          </div>
        </div>

        {kp.notes && (
          <div className="border-t border-border-subtle/80 bg-surface-subtle/30 px-4 py-2 text-xs text-text-secondary flex items-start gap-1.5">
            <span className="font-medium text-text-primary">Catatan:</span>
            <span>{kp.notes}</span>
          </div>
        )}
      </div>

      {/* Main Hierarchy: Samples Table & Selected Sample Test Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Samples List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-md border border-border-default bg-surface shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-subtle bg-surface">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-text-primary">
                  Sampel pengujian
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-surface-subtle text-[11px] font-medium text-text-secondary">
                  {kp.samples.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSampleModal(true)}
                className="btn btn-primary !min-h-[30px] px-3 text-xs font-medium"
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
                      Belum ada sampel.
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
                            ? 'bg-primary-soft/40 border-l-2 border-primary font-medium'
                            : 'hover:bg-surface-subtle'
                        }`}
                      >
                        <td className="font-mono text-xs text-text-muted">
                          #{sample.positionInRun}
                        </td>
                        <td>
                          <div className="font-medium text-text-primary text-xs">
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
                            <span className="ml-1 text-[10px] text-primary font-medium">
                              (override)
                            </span>
                          )}
                        </td>
                        <td className="text-xs">
                          {effective.bottlePosition || '—'}
                          {sample.bottlePosition && (
                            <span className="ml-1 text-[10px] text-primary font-medium">
                              (override)
                            </span>
                          )}
                        </td>
                        <td className="text-xs font-medium">
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
        <div className="lg:col-span-5 space-y-3">
          <div className="rounded-md border border-border-default bg-surface shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border-subtle bg-surface flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">
                  {selectedSample
                    ? `Pengujian untuk Sampel #${selectedSample.positionInRun} (${
                        selectedSample.sampleCode || selectedSample.id
                      })`
                    : 'Detail pengujian sampel'}
                </h3>
                <p className="text-[11px] text-text-muted">
                  {sampleTestRuns.length} pengujian tercatat
                </p>
              </div>
              {selectedSample && (
                <button
                  type="button"
                  onClick={() => setShowAddTestRunModal(true)}
                  className="btn btn-primary !min-h-[30px] px-3 text-xs font-medium"
                  id="btn-tambah-pengujian"
                >
                  + Tambah Pengujian
                </button>
              )}
            </div>

            {!selectedSample ? (
              <div className="p-8 text-center text-text-muted text-xs">
                Pilih salah satu sampel untuk melihat pengujian.
              </div>
            ) : sampleTestRuns.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-xs space-y-3">
                <p>Belum ada eksekusi pengujian untuk sampel ini.</p>
                <button
                  type="button"
                  onClick={() => setShowAddTestRunModal(true)}
                  className="btn btn-secondary !min-h-[30px] px-3.5 text-xs font-medium"
                >
                  + Tambah Pengujian Sekarang
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle">
                {sampleTestRuns.map((tr) => (
                  <div key={tr.id} className="p-3.5 space-y-2 hover:bg-surface-subtle/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-medium text-xs text-primary">
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
                      <div className="font-medium text-text-primary">
                        {tr.recipeSnapshot.name}
                      </div>
                      <div className="text-text-muted flex items-center gap-2 mt-0.5 font-mono text-[11px]">
                        <span>{tr.setpoints.forceSetpointN} N</span>
                        <span>•</span>
                        <span>{tr.setpoints.pressDurationMs} ms</span>
                        <span>•</span>
                        <span>{tr.setpoints.strokeMm} mm</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-muted pt-2 border-t border-border-subtle/60">
                      <span>Operator: {tr.operatorName}</span>
                      <div className="flex items-center gap-2">
                        {tr.status === 'PENDING' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/execute?step=1`
                                )
                              }
                              className="btn btn-primary !min-h-[28px] !py-0.5 px-2.5 text-xs font-medium"
                              id={`btn-mulai-pengujian-${tr.id}`}
                            >
                              Mulai Pengujian
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/capture`
                                )
                              }
                              className="text-[11px] text-text-muted hover:text-text-primary px-1.5 transition-colors underline-offset-2 hover:underline"
                              title="Buka studio capture kamera langsung"
                              id={`btn-studio-capture-${tr.id}`}
                            >
                              Studio Capture
                            </button>
                          </div>
                        )}
                        {tr.status === 'CAPTURING' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/execute?step=4`
                                )
                              }
                              className="btn btn-primary !min-h-[28px] !py-0.5 px-2.5 text-xs font-medium"
                              id={`btn-lanjut-pengujian-${tr.id}`}
                            >
                              Lanjutkan
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/capture`
                                )
                              }
                              className="text-[11px] text-text-muted hover:text-text-primary px-1.5 transition-colors underline-offset-2 hover:underline"
                              title="Buka studio capture kamera langsung"
                            >
                              Studio Capture
                            </button>
                          </div>
                        )}
                        {tr.status === 'ANALYZING' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/execute?step=4`
                                )
                              }
                              className="btn btn-primary !min-h-[28px] !py-0.5 px-2.5 text-xs font-medium"
                              id={`btn-buka-analisis-${tr.id}`}
                            >
                              Lanjutkan
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/analysis`
                                )
                              }
                              className="text-[11px] text-text-muted hover:text-text-primary px-1.5 transition-colors underline-offset-2 hover:underline"
                              title="Buka ruang analisis kamera langsung"
                            >
                              Studio Analisis
                            </button>
                          </div>
                        )}
                        {tr.status === 'REVIEW_REQUIRED' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/execute?step=4`
                                )
                              }
                              className="btn btn-primary !min-h-[28px] !py-0.5 px-2.5 text-xs font-medium"
                              id={`btn-tinjau-analisis-${tr.id}`}
                            >
                              Lanjutkan
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/analysis`
                                )
                              }
                              className="text-[11px] text-text-muted hover:text-text-primary px-1.5 transition-colors underline-offset-2 hover:underline"
                              title="Buka tinjauan analisis langsung"
                            >
                              Studio Analisis
                            </button>
                          </div>
                        )}
                        {tr.status === 'FINALIZED' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/kode-pengujian/${kp.id}/samples/${tr.sampleId}/runs/${tr.id}/execute?step=5`
                                )
                              }
                              className="btn btn-secondary !min-h-[28px] !py-0.5 px-2.5 text-xs font-medium"
                              id={`btn-buka-hasil-${tr.id}`}
                            >
                              Lihat Hasil
                            </button>
                          </div>
                        )}
                        <span className="font-mono text-[10px]">{fmt.date(tr.createdAt)}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-md border border-border-default shadow-xl max-w-md w-full overflow-hidden">
            <form onSubmit={handleAddSample}>
              <div className="px-4 py-2.5 border-b border-border-subtle bg-surface-subtle flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Tambah Botol Sampel</h3>
                <button
                  type="button"
                  onClick={() => setShowAddSampleModal(false)}
                  className="text-text-muted hover:text-text-primary text-sm font-semibold leading-none p-1"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-3.5 text-sm">
                <FormField
                  label="Kode / Label Sampel (Opsional)"
                  hint={`Nomor urut posisi otomatis: #${kp.samples.length + 1}`}
                >
                  <Input
                    type="text"
                    placeholder={`Contoh: SMP-${String(kp.samples.length + 1).padStart(3, '0')}`}
                    value={newSampleCode}
                    onChange={(e) => setNewSampleCode(e.target.value)}
                  />
                </FormField>

                <FormField
                  label="Kondisi Simpan (Opsional Override)"
                  hint={
                    kp.storageCondition ? (
                      <>
                        Default: <span className="font-medium">{kp.storageCondition}</span>
                      </>
                    ) : undefined
                  }
                >
                  <Input
                    type="text"
                    placeholder={
                      kp.storageCondition
                        ? `Default: ${kp.storageCondition}`
                        : 'Contoh: Oven 40'
                    }
                    value={newSampleStorageOverride}
                    onChange={(e) => setNewSampleStorageOverride(e.target.value)}
                  />
                </FormField>

                <FormField
                  label="Posisi Botol (Opsional Override)"
                  hint={
                    kp.bottlePosition ? (
                      <>
                        Default: <span className="font-medium">{kp.bottlePosition}</span>
                      </>
                    ) : undefined
                  }
                >
                  <Input
                    type="text"
                    placeholder={
                      kp.bottlePosition
                        ? `Default: ${kp.bottlePosition}`
                        : 'Contoh: Tidur'
                    }
                    value={newSamplePositionOverride}
                    onChange={(e) => setNewSamplePositionOverride(e.target.value)}
                  />
                </FormField>

                <FormField label="Catatan Sampel (Opsional)">
                  <Input
                    type="text"
                    placeholder="Catatan khusus botol ini..."
                    value={newSampleNotes}
                    onChange={(e) => setNewSampleNotes(e.target.value)}
                  />
                </FormField>
              </div>

              <ActionBar
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => setShowAddSampleModal(false)}
                      className="btn btn-secondary !min-h-[32px] px-3 text-xs font-medium"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={addingSample}
                      className="btn btn-primary !min-h-[32px] px-4 text-xs font-medium"
                    >
                      {addingSample ? 'Menyimpan...' : 'Simpan Sampel'}
                    </button>
                  </>
                }
              />
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Pengujian (Test Run) */}
      {showAddTestRunModal && selectedSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-surface rounded-md border border-border-default shadow-xl max-w-md w-full overflow-hidden">
            <form onSubmit={handleAddTestRun}>
              <div className="px-4 py-2.5 border-b border-border-subtle bg-surface-subtle flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">
                  Tambah Pengujian Baru (Test Run)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddTestRunModal(false)}
                  className="text-text-muted hover:text-text-primary text-sm font-semibold leading-none p-1"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-3.5 text-sm">
                <div className="bg-surface-subtle p-2.5 rounded border border-border-subtle text-xs space-y-0.5">
                  <div className="text-[11px] text-text-muted">Sampel Target:</div>
                  <div className="font-semibold text-text-primary">
                    Sampel #{selectedSample.positionInRun} ({selectedSample.sampleCode || selectedSample.id})
                  </div>
                </div>

                <FormField label="Pilih Metodologi">
                  <Select
                    value={selectedRecipeId}
                    onChange={(e) => setSelectedRecipeId(e.target.value)}
                    className="w-full"
                  >
                    <option value="">— Pilih metodologi —</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.forceSetpointN} N, {r.pressDurationMs} ms, {r.strokeMm} mm)
                      </option>
                    ))}
                  </Select>
                </FormField>

                {activeRecipe && (
                  <div className="p-2.5 bg-surface-subtle rounded border border-border-subtle space-y-1.5">
                    <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
                      Setpoint Terpilih
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-surface p-1.5 rounded border border-border-subtle">
                        <div className="text-[10px] text-text-muted">Gaya</div>
                        <div className="font-mono font-medium text-text-primary">{activeRecipe.forceSetpointN} N</div>
                      </div>
                      <div className="bg-surface p-1.5 rounded border border-border-subtle">
                        <div className="text-[10px] text-text-muted">Durasi</div>
                        <div className="font-mono font-medium text-text-primary">{activeRecipe.pressDurationMs} ms</div>
                      </div>
                      <div className="bg-surface p-1.5 rounded border border-border-subtle">
                        <div className="text-[10px] text-text-muted">Stroke</div>
                        <div className="font-mono font-medium text-text-primary">{activeRecipe.strokeMm} mm</div>
                      </div>
                    </div>
                  </div>
                )}

                <FormField label="Indeks Repetisi (Opsional)">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Contoh: 1, 2, 3..."
                    value={testRunRepetition}
                    onChange={(e) => setTestRunRepetition(e.target.value)}
                  />
                </FormField>

                <FormField label="Catatan Pengujian (Opsional)">
                  <Input
                    type="text"
                    placeholder="Catatan pengujian..."
                    value={testRunNotes}
                    onChange={(e) => setTestRunNotes(e.target.value)}
                  />
                </FormField>
              </div>

              <ActionBar
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => setShowAddTestRunModal(false)}
                      className="btn btn-secondary !min-h-[32px] px-3 text-xs font-medium"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={addingTestRun || !activeRecipe}
                      className="btn btn-primary !min-h-[32px] px-4 text-xs font-medium"
                    >
                      {addingTestRun ? 'Menambahkan...' : 'Tambah Pengujian'}
                    </button>
                  </>
                }
              />
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
