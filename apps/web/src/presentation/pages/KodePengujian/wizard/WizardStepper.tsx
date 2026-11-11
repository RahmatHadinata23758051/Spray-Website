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
  ariaLabel: string;
}

const STEPS: StepDef[] = [
  { step: 1, number: '01', title: 'Identifikasi', ariaLabel: '01 Identifikasi' },
  { step: 2, number: '02', title: 'Device', ariaLabel: '02 Device' },
  { step: 3, number: '03', title: 'Parameter', ariaLabel: '03 Parameter' },
  { step: 4, number: '04', title: 'Eksekusi', ariaLabel: '04 Eksekusi & Data' },
  { step: 5, number: '05', title: 'Hasil', ariaLabel: '05 Hasil' },
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
      className="bg-surface border-b border-border-default px-4 py-2 sm:px-6"
    >
      <ol className="flex items-center justify-between max-w-5xl mx-auto gap-1 sm:gap-2 overflow-x-auto">
        {STEPS.map((s, index) => {
          const isCurrent = currentStep === s.step;
          const isCompleted = completedSteps.has(s.step) || isReadOnly;
          const isAccessible = isReadOnly || isCompleted || s.step <= currentStep;

          return (
            <li key={s.step} className="flex-1 min-w-[110px] flex items-center">
              <button
                type="button"
                disabled={!isAccessible}
                onClick={() => onStepClick(s.step)}
                aria-label={s.ariaLabel}
                className={`w-full group text-left flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors ${
                  isCurrent
                    ? 'bg-primary/5 text-primary'
                    : isAccessible
                    ? 'hover:bg-surface-subtle text-text-secondary cursor-pointer'
                    : 'text-text-muted opacity-40 cursor-not-allowed'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 transition-colors ${
                    isCurrent
                      ? 'bg-primary text-white shadow-xs'
                      : isCompleted
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-surface-subtle text-text-muted border border-border-subtle'
                  }`}
                >
                  {isCompleted && !isCurrent ? (
                    <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
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
                <span
                  className={`font-semibold truncate text-xs ${
                    isCurrent ? 'text-primary' : isCompleted ? 'text-text-primary' : 'text-text-muted'
                  }`}
                >
                  {s.title}
                </span>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  aria-hidden="true"
                  className="hidden md:block w-3 h-[1px] bg-border-subtle mx-0.5 shrink-0"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
