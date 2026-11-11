import React from 'react';
import type { WizardStep } from './types';

interface WizardStepperProps {
  currentStep: WizardStep;
  onStepClick: (step: WizardStep) => void;
  completedSteps: Set<WizardStep>;
  isReadOnly?: boolean;
}

interface StepDef {
  step: WizardStep;
  number: string;
  title: string;
  subtitle: string;
}

const STEPS: StepDef[] = [
  { step: 1, number: '01', title: 'Identifikasi', subtitle: 'Sampel & Konteks' },
  { step: 2, number: '02', title: 'Device', subtitle: 'Konfigurasi Kemasan' },
  { step: 3, number: '03', title: 'Parameter', subtitle: 'Setpoints & Observasi' },
  { step: 4, number: '04', title: 'Eksekusi & Data', subtitle: 'Kamera & Aktual Mesin' },
  { step: 5, number: '05', title: 'Hasil', subtitle: 'Ringkasan & Metrik' },
];

export function WizardStepper({
  currentStep,
  onStepClick,
  completedSteps,
  isReadOnly = false,
}: WizardStepperProps) {
  return (
    <nav
      aria-label="Progres Wizard Pengujian"
      className="bg-surface border-b border-border-default px-4 py-2.5 sm:px-6"
    >
      <ol className="flex items-center justify-between max-w-5xl mx-auto gap-2 overflow-x-auto">
        {STEPS.map((s, index) => {
          const isCurrent = currentStep === s.step;
          const isCompleted = completedSteps.has(s.step) || isReadOnly;
          const isAccessible = isReadOnly || isCompleted || s.step <= currentStep;

          return (
            <li key={s.step} className="flex-1 min-w-[140px] flex items-center">
              <button
                type="button"
                disabled={!isAccessible}
                onClick={() => onStepClick(s.step)}
                className={`w-full group text-left flex items-center gap-2.5 p-1.5 rounded transition-colors ${
                  isCurrent
                    ? 'bg-primary/5 text-primary'
                    : isAccessible
                    ? 'hover:bg-surface-subtle text-text-secondary cursor-pointer'
                    : 'text-text-muted opacity-50 cursor-not-allowed'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-primary text-white shadow-xs'
                      : isCompleted
                      ? 'bg-surface-accent text-primary border border-primary/30'
                      : 'bg-surface-subtle text-text-muted border border-border-subtle'
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    s.number
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-xs font-semibold truncate ${
                      isCurrent ? 'text-primary' : 'text-text-primary'
                    }`}
                  >
                    {s.title}
                  </div>
                  <div className="text-[10px] text-text-muted truncate hidden sm:block">
                    {s.subtitle}
                  </div>
                </div>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="hidden md:block w-4 h-[1px] bg-border-subtle mx-1 shrink-0"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
