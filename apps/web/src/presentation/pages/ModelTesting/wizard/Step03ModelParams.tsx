import React from 'react';
import type { ModelTestRun } from '../types';
import { FormSection } from '../../../components/ui/FormSection';
import { FormField } from '../../../components/ui/FormField';

interface Step03ModelParamsProps {
  data: ModelTestRun;
  onChange: (patch: Partial<ModelTestRun>) => void;
  isReadOnly?: boolean;
}

const ALL_OBJECTIVES = [
  { id: 'Panjang lintasan', label: 'Panjang lintasan plume' },
  { id: 'Sebaran', label: 'Sudut sebaran vertikal' },
  { id: 'Karakteristik kabut', label: 'Dispersi & densitas' },
  { id: 'Distribusi droplet', label: 'Pola sebaran partikel' },
];

export function Step03ModelParams({ data, onChange, isReadOnly = false }: Step03ModelParamsProps) {
  const handleObjectiveToggle = (objId: string) => {
    if (isReadOnly) return;
    const current = data.observationObjectives || [];
    const updated = current.includes(objId)
      ? current.filter((o) => o !== objId)
      : [...current, objId];
    onChange({ observationObjectives: updated });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">03. Parameter</h2>
      </div>

      <FormSection title="Sasaran observasi">
        <div className="space-y-2 col-span-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ALL_OBJECTIVES.map((obj) => {
              const isChecked = data.observationObjectives?.includes(obj.id);
              return (
                <label
                  key={obj.id}
                  className={`flex items-start gap-2.5 p-3 rounded-md border text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-primary-soft/30 border-primary text-text-primary font-medium'
                      : 'bg-surface border-border-default text-text-secondary hover:bg-surface-subtle'
                  } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isReadOnly}
                    onChange={() => handleObjectiveToggle(obj.id)}
                    className="mt-0.5 rounded border-border-strong text-primary focus:ring-primary"
                  />
                  <div>
                    <div className="font-medium text-text-primary">{obj.id}</div>
                    <div className="text-[11px] text-text-muted">{obj.label}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </FormSection>

      <FormSection title="Catatan spray manual">
        <FormField label="Catatan" className="col-span-full">
          <textarea
            value={data.notes || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange({ notes: e.target.value })}
            placeholder="Contoh: Spray manual jarak ~20 cm, latar belakang gelap, pencahayaan atas."
            rows={3}
            disabled={isReadOnly}
            className="w-full text-xs rounded-md border border-border-default bg-surface p-2.5 text-text-primary placeholder:text-text-muted outline-none focus:border-primary disabled:bg-surface-subtle disabled:cursor-not-allowed"
          />
        </FormField>
      </FormSection>
    </div>
  );
}
