import React from 'react';
import type { WizardFormData, ForcePresetProvider } from './types';
import { defaultForcePresetProvider } from './types';
import { FormSection } from '../../../components/ui/FormSection';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Status } from '../../../components/ui/Status';
import type { ObservationObjective } from '@spray-paragon/domain';
import { secondsToPressDurationMs } from '@spray-paragon/domain';

interface Step03ParametersProps {
  formData: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
  isReadOnly?: boolean;
  forcePresetProvider?: ForcePresetProvider;
}

const ALL_OBJECTIVES: Array<{ id: ObservationObjective; label: string; note?: string }> = [
  { id: 'Panjang lintasan', label: 'Panjang lintasan', note: 'Spray Length' },
  { id: 'Sebaran', label: 'Sebaran', note: 'Spray Angle / Cone Width' },
  { id: 'Sudut kontak', label: 'Sudut kontak', note: 'Menunggu konfirmasi semantik Paragon' },
  { id: 'Kecepatan pengeringan', label: 'Kecepatan pengeringan' },
  { id: 'Distribusi droplet', label: 'Distribusi droplet', note: 'Fasilitas optik droplet terpisah' },
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
    <div className="space-y-6">
      <div className="bg-surface-subtle/40 border border-border-subtle rounded-md p-3.5 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-bold text-text-primary">03. Parameter Uji & Sasaran Observasi</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Tentukan sasaran pengamatan visual, mode gaya aktuator, durasi penekanan, dan dimensi geometri botol.
          </p>
        </div>
        <Status tone="info">Langkah 3 dari 5</Status>
      </div>

      {/* Observation Objectives */}
      <div className="border border-border-default bg-surface rounded-md p-4 space-y-3">
        <div className="border-b border-border-subtle pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
            Sasaran Pengamatan (Observation Objectives)
          </h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Pilih parameter yang menjadi fokus verifikasi dan evaluasi pada pengujian ini
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {ALL_OBJECTIVES.map((item) => {
            const isChecked = formData.observationObjectives.includes(item.id);
            return (
              <label
                key={item.id}
                className={`flex items-start gap-2.5 p-2.5 rounded border text-xs cursor-pointer transition-colors ${
                  isChecked
                    ? 'border-primary/50 bg-primary/5 text-text-primary'
                    : 'border-border-default hover:border-border-strong text-text-secondary bg-surface'
                } ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isReadOnly}
                  onChange={() => handleObjectiveToggle(item.id)}
                  className="mt-0.5 rounded border-border-strong text-primary focus:ring-primary"
                />
                <div className="min-w-0">
                  <div className="font-medium">{item.label}</div>
                  {item.note && (
                    <div className="text-[10px] text-text-muted mt-0.5">{item.note}</div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Force Mode & Setpoint */}
      <FormSection
        title="Pengaturan Gaya Tekan (Actuator Force)"
        description="Pilih mode gaya normal berdasarkan preset standar atau kustom (tidak normal)"
      >
        <FormField label="Mode Gaya Tekan" required>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => onChange({ forceMode: 'Normal' })}
              className={`py-1.5 px-3 rounded text-xs font-semibold border transition-all ${
                isNormalForce
                  ? 'border-primary bg-primary text-white shadow-xs'
                  : 'border-border-default hover:border-border-strong text-text-secondary bg-surface'
              }`}
            >
              Normal (Preset)
            </button>
            <button
              type="button"
              disabled={isReadOnly}
              onClick={() => onChange({ forceMode: 'Tidak Normal' })}
              className={`py-1.5 px-3 rounded text-xs font-semibold border transition-all ${
                !isNormalForce
                  ? 'border-primary bg-primary text-white shadow-xs'
                  : 'border-border-default hover:border-border-strong text-text-secondary bg-surface'
              }`}
            >
              Tidak Normal (Manual)
            </button>
          </div>
        </FormField>

        {isNormalForce ? (
          <FormField
            label="Preset Gaya Tekan (N)"
            hint="Preset gaya adalah fixture sementara menunggu konfirmasi standar resmi Paragon"
            required
          >
            <Select
              value={formData.normalForcePresetN}
              onChange={(e) => onChange({ normalForcePresetN: Number(e.target.value) })}
              disabled={isReadOnly}
            >
              {normalPresets.map((preset) => (
                <option key={preset} value={preset}>
                  {preset} N (Preset Standar)
                </option>
              ))}
            </Select>
          </FormField>
        ) : (
          <FormField
            label="Gaya Tekan Kustom (N)"
            hint="Kekuatan tekan manual aktuator"
            required
          >
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
      </FormSection>

      {/* Duration & Geometry Setpoints */}
      <FormSection
        title="Pengaturan Durasi & Geometri Botol"
        description="Setting parameter durasi penekanan, stroke dispenser, tinggi botol, dan luas penampang"
      >
        <FormField
          label="Setting Durasi Tekan / Holding Time (s)"
          hint={
            <span className="font-mono text-primary font-semibold">
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
          label="Setting Tinggi Tekan / Stroke (mm)"
          hint="Kedalaman langkah mekanis penekanan aktuator"
          required
        >
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

        <FormField
          label="Luas Aktuator (mm²)"
          hint="Luas bidang kontak ujung aktuator semprot"
        >
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
      </FormSection>
    </div>
  );
}
