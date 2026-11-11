import React from 'react';
import type { WizardFormData, ForcePresetProvider } from './types';
import { defaultForcePresetProvider } from './types';
import { FormSection } from '../../../components/ui/FormSection';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import type { ObservationObjective } from '@spray-paragon/domain';
import { secondsToPressDurationMs } from '@spray-paragon/domain';

interface Step03ParametersProps {
  formData: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
  isReadOnly?: boolean;
  forcePresetProvider?: ForcePresetProvider;
}

const ALL_OBJECTIVES: Array<{ id: ObservationObjective; label: string; note?: string }> = [
  { id: 'Panjang lintasan', label: 'Panjang lintasan' },
  { id: 'Sebaran', label: 'Sebaran' },
  { id: 'Sudut kontak', label: 'Sudut kontak', note: 'Menunggu konfirmasi semantik Paragon' },
  { id: 'Kecepatan pengeringan', label: 'Kecepatan pengeringan' },
  { id: 'Distribusi droplet', label: 'Distribusi droplet', note: 'Metode pengukuran menunggu konfirmasi Paragon' },
];

export function Step03Parameters({
  formData,
  onChange,
  isReadOnly = false,
  forcePresetProvider = defaultForcePresetProvider,
}: Step03ParametersProps) {
  const isNormalForce = formData.forceMode === 'Normal';
  const normalPresets = forcePresetProvider.getNormalPresets();

  const handleObjectiveToggle = (objId: ObservationObjective) => {
    if (isReadOnly) return;
    const current = formData.observationObjectives;
    const updated = current.includes(objId)
      ? current.filter((o) => o !== objId)
      : [...current, objId];
    onChange({ observationObjectives: updated });
  };

  const handleHoldingTimeChange = (valStr: string) => {
    onChange({ holdingTimeS: valStr });
  };

  const currentSeconds = parseFloat(formData.holdingTimeS) || 0;
  const convertedMs = secondsToPressDurationMs(currentSeconds);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">03. Parameter Uji & Sasaran Observasi</h2>
      </div>

      {/* Observation Objectives */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-text-secondary block">
          Sasaran Observasi
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {ALL_OBJECTIVES.map((item) => {
            const isChecked = formData.observationObjectives.includes(item.id);
            return (
              <label
                key={item.id}
                className={`flex items-start gap-2 p-2 rounded border text-xs cursor-pointer transition-colors ${
                  isChecked
                    ? 'border-primary/50 bg-primary/5 text-text-primary font-medium'
                    : 'border-border-default hover:border-border-strong text-text-secondary bg-surface'
                } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isReadOnly}
                  onChange={() => handleObjectiveToggle(item.id)}
                  className="mt-0.5 rounded border-border-strong text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <div className="min-w-0">
                  <div>{item.label}</div>
                  {item.note && (
                    <div className="text-[10px] text-text-muted mt-0.5 leading-tight">{item.note}</div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Parameter Mesin */}
      <FormSection title="Parameter Mesin">
        <FormField label="Mode Gaya Tekan" required>
          <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-surface-subtle border border-border-subtle rounded">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => onChange({ forceMode: 'Normal' })}
              className={`py-1 px-2.5 rounded text-xs font-medium transition-all ${
                isNormalForce
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Normal (Preset)
            </button>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => onChange({ forceMode: 'Tidak Normal' })}
              className={`py-1 px-2.5 rounded text-xs font-medium transition-all ${
                !isNormalForce
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Tidak Normal (Manual)
            </button>
          </div>
        </FormField>

        {isNormalForce ? (
          <FormField label="Preset Gaya Tekan (N)" required>
            <Select
              value={formData.normalForcePresetN}
              onChange={(e) => onChange({ normalForcePresetN: Number(e.target.value) })}
              disabled={isReadOnly}
            >
              {normalPresets.map((preset) => (
                <option key={preset} value={preset}>
                  {preset} N
                </option>
              ))}
            </Select>
          </FormField>
        ) : (
          <FormField label="Gaya Tekan Kustom (N)" required>
            <Input
              type="number"
              step="1"
              value={formData.customForceN}
              onChange={(e) => onChange({ customForceN: e.target.value })}
              disabled={isReadOnly}
              placeholder="Contoh: 32"
              mono
            />
          </FormField>
        )}

        <FormField
          label="Setting Durasi Tekan / Holding Time (s)"
          hint={
            <span className="font-mono text-primary font-medium">
              Konversi internal mesin: {convertedMs} ms
            </span>
          }
          required
        >
          <Input
            type="number"
            step="0.05"
            value={formData.holdingTimeS}
            onChange={(e) => handleHoldingTimeChange(e.target.value)}
            disabled={isReadOnly}
            placeholder="Contoh: 1.00"
            mono
          />
        </FormField>

        <FormField
          label="Tinggi Botol (mm)"
          hint="Dimensi ketinggian botol (satuan milimeter)"
          required
        >
          <Input
            type="number"
            step="1"
            value={formData.bottleHeightMm}
            onChange={(e) => onChange({ bottleHeightMm: e.target.value })}
            disabled={isReadOnly}
            placeholder="Contoh: 120"
            mono
          />
        </FormField>

        <FormField label="Luas Aktuator (mm²)">
          <Input
            type="number"
            step="1"
            value={formData.actuatorAreaMm2}
            onChange={(e) => onChange({ actuatorAreaMm2: e.target.value })}
            disabled={isReadOnly}
            placeholder="Contoh: 150"
            mono
          />
        </FormField>

        <FormField label="Setting Tinggi Tekan / Stroke (mm)" required>
          <Input
            type="number"
            step="0.1"
            value={formData.strokeMm}
            onChange={(e) => onChange({ strokeMm: e.target.value })}
            disabled={isReadOnly}
            placeholder="Contoh: 10.0"
            mono
          />
        </FormField>
      </FormSection>
    </div>
  );
}
