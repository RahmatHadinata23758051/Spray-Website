import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  kodePengujianRepository,
} from '../../../application/services';
import type {
  KodePengujian,
  TestRun,
  Sample,
  DeviceConfiguration,
} from '@spray-paragon/domain';
import { evaluateWizardProgress } from '@spray-paragon/domain';
import { Status } from '../../components/ui/Status';
import { ActionBar } from '../../components/ui/ActionBar';
import { createFinalReportCsv } from '../../../application/reporting/createFinalReportCsv';

import type { WizardStep, WizardFormData } from './wizard/types';
import {
  initWizardFormData,
  computeLiveOperationalMetrics,
  parseSetpointsFromForm,
  parseExecutionMeasurementsFromForm,
} from './wizard/types';
import { WizardStepper } from './wizard/WizardStepper';
import { Step01Identification } from './wizard/Step01Identification';
import { Step02DeviceConfig } from './wizard/Step02DeviceConfig';
import { Step03Parameters } from './wizard/Step03Parameters';
import { Step04ExecutionData } from './wizard/Step04ExecutionData';
import { Step05ResultSummary } from './wizard/Step05ResultSummary';

function getMaxAllowedStep(testRun: TestRun): WizardStep {
  if (testRun.status === 'FINALIZED') return 5;
  const wp = evaluateWizardProgress(testRun);
  if (!wp?.step1Completed) return 1;
  if (!wp?.step2Completed) return 2;
  if (!wp?.step3Completed) return 3;
  if (!wp?.step4Completed) return 4;
  return 5;
}

export function TestExecutionWizardPage() {
  const { kpId, sampleId, runId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [context, setContext] = useState<{
    kp: KodePengujian;
    sample: Sample;
    testRun: TestRun;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Wizard active step
  const [step, setStep] = useState<WizardStep>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());

  // Form State
  const [formData, setFormData] = useState<WizardFormData | null>(null);

  // Load Context
  const loadContext = useCallback(async () => {
    if (!kpId || !sampleId || !runId) {
      setError('Parameter URL tidak lengkap');
      setLoading(false);
      return;
    }

    try {
      const kp = await kodePengujianRepository.get(kpId);
      if (!kp) {
        setError(`Kode Pengujian ${kpId} tidak ditemukan`);
        return;
      }
      const sample = kp.samples.find((s) => s.id === sampleId);
      if (!sample) {
        setError(`Sampel ${sampleId} tidak ditemukan dalam Kode Pengujian ${kpId}`);
        return;
      }
      const testRun = kp.testRuns.find((t) => t.id === runId && t.sampleId === sampleId);
      if (!testRun) {
        setError(`Pengujian ${runId} tidak ditemukan untuk Sampel ${sampleId}`);
        return;
      }

      setContext({ kp, sample, testRun });
      setFormData(initWizardFormData(kp, sample, testRun));

      // Determine initial step safely
      const maxAllowed = getMaxAllowedStep(testRun);
      const queryStep = parseInt(searchParams.get('step') || '', 10);
      let targetStep: WizardStep = 1;
      if (queryStep >= 1 && queryStep <= 5) {
        targetStep = (testRun.status === 'FINALIZED' ? queryStep : Math.min(queryStep, maxAllowed)) as WizardStep;
      } else if (testRun.status === 'FINALIZED') {
        targetStep = 5;
      } else if (['CAPTURING', 'ANALYZING', 'REVIEW_REQUIRED'].includes(testRun.status)) {
        targetStep = Math.min(4, maxAllowed) as WizardStep;
      } else {
        targetStep = 1;
      }
      setStep(targetStep);

      // Compute completed steps
      const completed = new Set<WizardStep>();
      if (testRun.status === 'FINALIZED') {
        completed.add(1);
        completed.add(2);
        completed.add(3);
        completed.add(4);
        completed.add(5);
      } else {
        const wp = evaluateWizardProgress(testRun, {
          sampleCode: sample.sampleCode,
          deviceType: sample.deviceConfiguration?.deviceType,
          strokeMm: testRun.setpoints?.strokeMm,
          holdingTimeS: testRun.setpoints ? String(testRun.setpoints.pressDurationMs / 1000) : undefined,
        });
        if (wp?.step1Completed) completed.add(1);
        if (wp?.step2Completed) completed.add(2);
        if (wp?.step3Completed) completed.add(3);
        if (wp?.step4Completed) completed.add(4);
      }
      setCompletedSteps(completed);
    } catch (err) {
      console.error('Failed to load test run wizard context', err);
      setError('Gagal memuat konteks pengujian');
    } finally {
      setLoading(false);
    }
  }, [kpId, sampleId, runId, searchParams]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  const isReadOnly = context?.testRun.status === 'FINALIZED';

  const handleFormChange = (patch: Partial<WizardFormData>) => {
    if (isReadOnly) return;
    setFormData((prev) => (prev ? { ...prev, ...patch } : null));
    setSaveStatus(null);
  };

  const handleStepClick = (targetStep: WizardStep) => {
    if (!context) return;
    const maxAllowed = getMaxAllowedStep(context.testRun);
    if (!isReadOnly && targetStep > maxAllowed) {
      return;
    }
    setStep(targetStep);
    setSearchParams({ step: targetStep.toString() });
  };

  // Save Draft
  const handleSaveDraft = async (): Promise<boolean> => {
    if (!context || !formData || isReadOnly) return true;
    if (isSaving) return false;
    setIsSaving(true);
    setSaveStatus(null);

    try {
      const { kp, sample, testRun } = context;

      // 1. Update KP metadata if changed (Do NOT mutate parent observationObjectives!)
      const kpPatch = {
        formulaNumber: formData.formulaNumber || undefined,
        productLot: formData.lotNumber || undefined,
        kuf: formData.kuf || undefined,
        trialObjective: formData.trialObjective || undefined,
        benchmark: formData.benchmark || undefined,
        trialType: formData.trialType,
      };
      await kodePengujianRepository.updateParentMetadata(kp.id, kpPatch);

      // 2. Build device configuration
      let devConfig: DeviceConfiguration | undefined = undefined;
      if (formData.deviceType === 'Aerosol') {
        devConfig = {
          deviceType: 'Aerosol',
          aerosol: {
            actuatorCode: formData.aerosolSpec.actuatorCode || undefined,
            canOrBottleCode: formData.aerosolSpec.canBottleCode || undefined,
            valveCode: formData.aerosolSpec.valveCode || undefined,
            gasRatio: formData.aerosolSpec.gasRatio || undefined,
            gasType: formData.aerosolSpec.gasType || undefined,
          },
        };
      } else {
        devConfig = {
          deviceType: 'Non-Aerosol',
          nonAerosol: {
            bottleCode: formData.nonAerosolSpec.bottleCode || undefined,
            pumpCode: formData.nonAerosolSpec.pumpCode || undefined,
          },
        };
      }

      // Update Sample
      await kodePengujianRepository.updateSample(kp.id, sample.id, {
        sampleCode: formData.sampleCode || undefined,
        storageCondition: formData.storageCondition || undefined,
        bottlePosition: formData.storagePosition || undefined,
        usagePattern: formData.usagePattern,
        deviceConfiguration: devConfig,
      });

      // 3. Update TestRun
      const setpoints = parseSetpointsFromForm(formData);
      const executionMeasurements = parseExecutionMeasurementsFromForm(formData);
      const operationalDerivedMetrics = computeLiveOperationalMetrics(formData);

      // Evaluate actual step completion using domain evaluator
      const updatedWp = evaluateWizardProgress(testRun, {
        sampleCode: formData.sampleCode,
        deviceType: formData.deviceType,
        strokeMm: formData.strokeMm,
        holdingTimeS: formData.holdingTimeS,
      });

      const updatedTr = await kodePengujianRepository.updateTestRun(kp.id, testRun.id, {
        setpoints,
        executionMeasurements,
        operationalDerivedMetrics,
        observationObjectives: formData.observationObjectives,
        acquisitionDate: formData.acquisitionDate || undefined,
        notes: formData.observationNotes || undefined,
        wizardProgress: updatedWp,
      });

      setContext((c) => (c ? { ...c, testRun: updatedTr } : null));
      setSaveStatus('Draf pengujian berhasil disimpan.');
      setCompletedSteps((prev) => {
        const next = new Set(prev);
        if (updatedWp.step1Completed) next.add(1);
        if (updatedWp.step2Completed) next.add(2);
        if (updatedWp.step3Completed) next.add(3);
        if (updatedWp.step4Completed) next.add(4);
        return next;
      });
      return true;
    } catch (err) {
      console.error('Failed to save draft', err);
      setSaveStatus('Gagal menyimpan draf pengujian.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNextStep = async () => {
    if (!formData || isSaving) return;
    if (!isReadOnly) {
      const ok = await handleSaveDraft();
      if (!ok) return;
    }
    if (step < 5) {
      if (step === 4) {
        const wp = evaluateWizardProgress(context?.testRun ?? { status: 'PENDING' }, {
          sampleCode: formData.sampleCode,
          deviceType: formData.deviceType,
          strokeMm: formData.strokeMm,
          holdingTimeS: formData.holdingTimeS,
        });
        if (!wp.step4Completed) {
          setSaveStatus('Eksekusi penangkapan frame (Capture) harus diselesaikan sebelum melihat ringkasan hasil.');
          return;
        }
      }
      const nextStep = (step + 1) as WizardStep;
      setStep(nextStep);
      setSearchParams({ step: nextStep.toString() });
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      const prevStep = (step - 1) as WizardStep;
      setStep(prevStep);
      setSearchParams({ step: prevStep.toString() });
    }
  };

  const handleOpenCapture = () => {
    if (!context) return;
    navigate(
      `/kode-pengujian/${context.kp.id}/samples/${context.sample.id}/runs/${context.testRun.id}/capture?returnTo=wizard`
    );
  };

  const handleOpenAnalysis = () => {
    if (!context) return;
    navigate(
      `/kode-pengujian/${context.kp.id}/samples/${context.sample.id}/runs/${context.testRun.id}/analysis?returnTo=wizard`
    );
  };

  const handleDownloadCsv = () => {
    if (!context?.testRun.finalReport) {
      alert('Laporan final belum selesai. Finalisasi pengujian terlebih dahulu untuk mengunduh laporan.');
      return;
    }
    const csv = createFinalReportCsv(context.testRun.finalReport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${context.kp.id}-${context.sample.sampleCode || context.sample.id}-${context.testRun.id}-hasil.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBackToKp = () => {
    if (kpId) {
      navigate(`/kode-pengujian/${kpId}`);
    } else {
      navigate('/kode-pengujian');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-text-muted">
        Memuat Wizard Pengujian Spraybot...
      </div>
    );
  }

  if (error || !context || !formData) {
    return (
      <div className="max-w-xl mx-auto p-8 space-y-4">
        <h2 className="text-base font-bold text-text-primary">Kesalahan Alur Pengujian</h2>
        <p className="text-xs text-text-secondary">{error || 'Data pengujian tidak valid'}</p>
        <button
          type="button"
          onClick={handleBackToKp}
          className="btn btn-secondary !min-h-[30px] px-3 text-xs"
        >
          &larr; Kembali ke Detail Kode Pengujian
        </button>
      </div>
    );
  }

  const { kp, sample, testRun } = context;

  return (
    <div className="flex flex-col min-h-screen bg-surface-subtle/30">
      {/* Top Header / Breadcrumb Bar */}
      <header className="bg-surface border-b border-border-default px-5 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <button
                type="button"
                onClick={handleBackToKp}
                className="hover:text-primary transition-colors hover:underline"
              >
                {kp.id}
              </button>
              <span>/</span>
              <span>Sampel {sample.sampleCode || sample.id}</span>
              <span>/</span>
              <span className="font-mono text-text-primary font-medium">{testRun.id}</span>
            </div>
            <h1 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span>Wizard Eksekusi Pengujian Spray</span>
              <span className="font-mono text-xs font-normal text-text-muted">
                ({kp.productSnapshot?.productName || kp.id})
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            {isReadOnly ? (
              <Status tone="success">Finalized (Read-Only)</Status>
            ) : (
              <Status tone="info">Status: {testRun.status}</Status>
            )}

            <button
              type="button"
              onClick={handleBackToKp}
              className="btn btn-secondary !min-h-[28px] !py-0.5 px-2.5 text-xs font-medium"
            >
              Kembali ke KP
            </button>
          </div>
        </div>
      </header>

      {/* Read-only notification banner if finalized */}
      {isReadOnly && (
        <div className="bg-semantic-warning/10 border-b border-semantic-warning/30 px-5 py-2">
          <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-semantic-warning">
            <span className="font-medium">
              Mode Pratinjau Terkunci: Pengujian ini telah difinalisasi. Semua data parameter dan pengukuran terkunci permanen.
            </span>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="underline font-semibold hover:text-text-primary"
            >
              Unduh CSV
            </button>
          </div>
        </div>
      )}

      {/* Stepper Navigation */}
      <WizardStepper
        currentStep={step}
        onStepClick={handleStepClick}
        completedSteps={completedSteps}
        isReadOnly={isReadOnly}
      />

      {/* Main Form Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-24">
        {saveStatus && (
          <div
            className={`mb-4 p-2.5 rounded text-xs border font-medium ${
              saveStatus.includes('berhasil')
                ? 'bg-semantic-success/10 border-semantic-success/30 text-semantic-success'
                : 'bg-semantic-danger/10 border-semantic-danger/30 text-semantic-danger'
            }`}
          >
            {saveStatus}
          </div>
        )}

        {step === 1 && (
          <Step01Identification
            formData={formData}
            onChange={handleFormChange}
            isReadOnly={isReadOnly}
            defaultStorageCondition={kp.storageCondition}
            defaultBottlePosition={kp.bottlePosition}
          />
        )}

        {step === 2 && (
          <Step02DeviceConfig
            formData={formData}
            onChange={handleFormChange}
            isReadOnly={isReadOnly}
          />
        )}

        {step === 3 && (
          <Step03Parameters
            formData={formData}
            onChange={handleFormChange}
            isReadOnly={isReadOnly}
          />
        )}

        {step === 4 && (
          <Step04ExecutionData
            formData={formData}
            onChange={handleFormChange}
            testRun={testRun}
            kpId={kp.id}
            sampleId={sample.id}
            isReadOnly={isReadOnly}
            onOpenCapture={handleOpenCapture}
            onOpenAnalysis={handleOpenAnalysis}
          />
        )}

        {step === 5 && (
          <Step05ResultSummary
            formData={formData}
            kp={kp}
            sample={sample}
            testRun={testRun}
            onDownloadCsv={handleDownloadCsv}
            onBackToKp={handleBackToKp}
          />
        )}
      </main>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <ActionBar
          info={
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span>KP: {kp.id}</span>
              <span>•</span>
              <span>Sampel: {sample.sampleCode || sample.id}</span>
              <span>•</span>
              <span>Langkah {step} dari 5</span>
            </div>
          }
          actions={
            <>
              {!isReadOnly && step < 5 && (
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="btn btn-secondary !min-h-[30px] px-3.5 text-xs font-medium"
                  id="btn-simpan-draf"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Draf'}
                </button>
              )}

              {step > 1 && (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="btn btn-secondary !min-h-[30px] px-3.5 text-xs font-medium"
                  id="btn-sebelumnya"
                >
                  &larr; Sebelumnya
                </button>
              )}

              {step < 5 && (
                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={isSaving}
                  className="btn btn-primary !min-h-[30px] px-4 text-xs font-medium"
                  id="btn-selanjutnya"
                >
                  {isSaving ? 'Menyimpan...' : 'Selanjutnya \u2192'}
                </button>
              )}

              {step === 5 && (
                <button
                  type="button"
                  onClick={handleBackToKp}
                  className="btn btn-primary !min-h-[30px] px-4 text-xs font-medium"
                  id="btn-selesai"
                >
                  Selesai & Tutup
                </button>
              )}
            </>
          }
        />
      </div>
    </div>
  );
}
