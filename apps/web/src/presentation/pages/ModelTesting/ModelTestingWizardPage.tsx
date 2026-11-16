import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { modelTestingRepository } from './modelTestingRepository';
import type { ModelTestRun, ModelWizardStep } from './types';
import { Step01ModelIdent } from './wizard/Step01ModelIdent';
import { Step02ModelDevice } from './wizard/Step02ModelDevice';
import { Step03ModelParams } from './wizard/Step03ModelParams';
import { Step04ModelExecution } from './wizard/Step04ModelExecution';
import { Step05ModelResult } from './wizard/Step05ModelResult';
import { Status } from '../../components/ui/Status';
import { Check, ChevronRight } from 'lucide-react';

const STEP_LABELS: Record<ModelWizardStep, string> = {
  1: 'Identifikasi',
  2: 'Device',
  3: 'Parameter',
  4: 'Eksekusi',
  5: 'Hasil',
};

export function ModelTestingWizardPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [testRun, setTestRun] = useState<ModelTestRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<ModelWizardStep>(1);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    const rawStep = searchParams.get('step');
    const parsedStep = Number(rawStep);
    if (parsedStep >= 1 && parsedStep <= 5) {
      setStep(parsedStep as ModelWizardStep);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    if (!testId) return;

    modelTestingRepository.get(testId).then((res) => {
      if (!active) return;
      if (!res) {
        navigate('/uji-model');
        return;
      }
      setTestRun(res);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [testId, navigate]);

  const handleStepChange = (newStep: ModelWizardStep) => {
    setStep(newStep);
    setSearchParams({ step: String(newStep) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePatch = async (patch: Partial<ModelTestRun>) => {
    if (!testRun) return;
    const updated = { ...testRun, ...patch };
    setTestRun(updated);
    try {
      await modelTestingRepository.update(testRun.id, patch);
    } catch (err) {
      console.error('Failed to auto-save patch', err);
    }
  };

  const handleSaveDraft = async () => {
    if (!testRun) return;
    try {
      await modelTestingRepository.update(testRun.id, testRun);
      setSaveStatus('Draf berhasil disimpan.');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch {
      setSaveStatus('Gagal menyimpan draf.');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleFinalize = async () => {
    if (!testRun) return;
    try {
      await modelTestingRepository.update(testRun.id, {
        status: 'FINALIZED',
      });
      navigate('/uji-model');
    } catch (err) {
      console.error('Gagal memfinalisasi uji model', err);
    }
  };

  if (loading || !testRun) {
    return (
      <div className="p-8 text-center text-xs text-text-secondary">
        Memuat data pengujian...
      </div>
    );
  }

  const isReadOnly = testRun.status === 'FINALIZED';
  const hasFrames = testRun.frames && testRun.frames.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-surface-subtle">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-border-default bg-surface shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <nav className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <Link to="/dashboard" className="hover:text-text-primary transition-colors">Spraybot</Link>
              <ChevronRight size={10} />
              <Link to="/uji-model" className="hover:text-text-primary transition-colors">Uji Model</Link>
              <ChevronRight size={10} />
              <span className="font-mono text-text-primary">{testRun.id}</span>
            </nav>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-text-primary">
                {testRun.productName || 'Uji Model'}
              </h1>
              <Status tone={isReadOnly ? 'success' : 'info'}>
                {isReadOnly ? 'Selesai' : testRun.status === 'REVIEW' ? 'Ditinjau' : 'Draf'}
              </Status>
            </div>
          </div>

          <Link
            to="/uji-model"
            className="btn btn-secondary !min-h-[28px] px-2.5 text-xs font-medium"
          >
            Kembali
          </Link>
        </div>

        {/* Stepper Navigation */}
        <div className="border-t border-border-subtle bg-surface px-4 sm:px-6 py-2">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-1 overflow-x-auto">
            {([1, 2, 3, 4, 5] as ModelWizardStep[]).map((s) => {
              const isActive = step === s;
              const isPast = step > s || (s === 4 && hasFrames) || isReadOnly;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleStepChange(s)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-colors min-w-[120px] text-left ${
                    isActive
                      ? 'bg-primary text-white font-medium shadow-xs'
                      : isPast
                      ? 'bg-surface-subtle hover:bg-surface text-text-primary'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono font-medium ${
                    isActive
                      ? 'bg-white text-primary'
                      : isPast
                      ? 'bg-primary/20 text-primary'
                      : 'bg-surface-subtle text-text-muted border border-border-default'
                  }`}>
                    {isPast && !isActive ? <Check size={10} strokeWidth={3} /> : s}
                  </div>
                  <span className="truncate">{STEP_LABELS[s]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-20">
        {saveStatus && (
          <div className="mb-4 p-2.5 rounded text-xs border font-medium bg-semantic-success-soft text-semantic-success border-semantic-success/30">
            {saveStatus}
          </div>
        )}

        {isReadOnly && (
          <div className="mb-4 p-3 rounded-md bg-surface border border-border-default flex items-center gap-2 text-xs text-text-secondary">
            <span className="w-2 h-2 rounded-full bg-semantic-success shrink-0" />
            <span>
              <strong>Terkunci:</strong> Pengujian telah difinalisasi.
            </span>
          </div>
        )}

        {step === 1 && (
          <Step01ModelIdent data={testRun} onChange={handlePatch} isReadOnly={isReadOnly} />
        )}
        {step === 2 && (
          <Step02ModelDevice data={testRun} onChange={handlePatch} isReadOnly={isReadOnly} />
        )}
        {step === 3 && (
          <Step03ModelParams data={testRun} onChange={handlePatch} isReadOnly={isReadOnly} />
        )}
        {step === 4 && (
          <Step04ModelExecution data={testRun} onChange={handlePatch} isReadOnly={isReadOnly} />
        )}
        {step === 5 && (
          <Step05ModelResult data={testRun} onChange={handlePatch} isReadOnly={isReadOnly} />
        )}
      </main>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 z-20 mt-auto border-t border-border-default bg-surface shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div>
            {!isReadOnly && step < 5 && (
              <button
                type="button"
                onClick={handleSaveDraft}
                className="btn btn-secondary !min-h-[30px] px-3.5 text-xs font-medium"
              >
                Simpan Draf
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => handleStepChange((step - 1) as ModelWizardStep)}
                className="btn btn-secondary !min-h-[30px] px-3.5 text-xs font-medium"
              >
                Sebelumnya
              </button>
            )}

            {step < 4 && (
              <button
                type="button"
                onClick={() => handleStepChange((step + 1) as ModelWizardStep)}
                className="btn btn-primary !min-h-[30px] px-4 text-xs font-medium"
              >
                Selanjutnya
              </button>
            )}

            {step === 4 && (
              <button
                type="button"
                disabled={!hasFrames}
                onClick={() => handleStepChange(5)}
                className="btn btn-primary !min-h-[30px] px-4 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {hasFrames ? 'Lanjut ke Hasil' : 'Menunggu video'}
              </button>
            )}

            {step === 5 && (
              <button
                type="button"
                onClick={handleFinalize}
                className="btn btn-primary !min-h-[30px] px-4 text-xs font-medium"
              >
                {isReadOnly ? 'Kembali' : 'Finalisasi'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
