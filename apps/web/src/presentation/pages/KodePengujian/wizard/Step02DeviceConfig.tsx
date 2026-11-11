import React from 'react';
import type { WizardFormData } from './types';
import { FormSection } from '../../../components/ui/FormSection';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Status } from '../../../components/ui/Status';
import type { DeviceType } from '@spray-paragon/domain';

interface Step02DeviceConfigProps {
  formData: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
  isReadOnly?: boolean;
}

export function Step02DeviceConfig({
  formData,
  onChange,
  isReadOnly = false,
}: Step02DeviceConfigProps) {
  const isAerosol = formData.deviceType === 'Aerosol';

  const handleDeviceTypeChange = (type: DeviceType) => {
    if (isReadOnly) return;
    onChange({
      deviceType: type,
      // If switching to Non-Aerosol, clear initialPressureBar from measurements if desired, or keep as is
    });
  };

  const handleAerosolChange = (key: keyof WizardFormData['aerosolSpec'], value: string) => {
    const updated = { ...formData.aerosolSpec, [key]: value };
    const patch: Partial<WizardFormData> = { aerosolSpec: updated };
    if (key === 'initialPressureBar') {
      patch.initialPressureBar = value;
    }
    if (key === 'initialGrossWeightG') {
      patch.initialGrossWeightG = value;
    }
    onChange(patch);
  };

  const handleNonAerosolChange = (key: keyof WizardFormData['nonAerosolSpec'], value: string) => {
    const updated = { ...formData.nonAerosolSpec, [key]: value };
    const patch: Partial<WizardFormData> = { nonAerosolSpec: updated };
    if (key === 'initialGrossWeightG') {
      patch.initialGrossWeightG = value;
    }
    onChange(patch);
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface-subtle/40 border border-border-subtle rounded-md p-3.5 flex items-start justify-between">
        <div>
          <h2 className="text-sm font-bold text-text-primary">02. Konfigurasi Device / Kemasan</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Pilih jenis kemasan dan definisikan spesifikasi komponen botol, aktuator, pump, valve, atau gas.
          </p>
        </div>
        <Status tone="info">Langkah 2 dari 5</Status>
      </div>

      {/* Device Type Selector */}
      <div className="border border-border-default bg-surface rounded-md p-4 space-y-3">
        <label className="text-xs font-semibold text-text-secondary block">
          Tipe Kemasan / Sistem Dispenser <span className="text-semantic-danger font-bold">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => handleDeviceTypeChange('Non-Aerosol')}
            className={`flex flex-col items-center justify-center p-3 rounded border text-xs font-medium transition-all ${
              !isAerosol
                ? 'border-primary bg-primary/5 text-primary font-bold shadow-xs'
                : 'border-border-default hover:border-border-strong text-text-secondary bg-surface'
            }`}
          >
            <span className="text-sm font-bold">Non-Aerosol</span>
            <span className="text-[11px] text-text-muted mt-0.5">Pump / Trigger Spray / Botol</span>
          </button>

          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => handleDeviceTypeChange('Aerosol')}
            className={`flex flex-col items-center justify-center p-3 rounded border text-xs font-medium transition-all ${
              isAerosol
                ? 'border-primary bg-primary/5 text-primary font-bold shadow-xs'
                : 'border-border-default hover:border-border-strong text-text-secondary bg-surface'
            }`}
          >
            <span className="text-sm font-bold">Aerosol</span>
            <span className="text-[11px] text-text-muted mt-0.5">Canister Bertekanan + Gas</span>
          </button>
        </div>
      </div>

      {/* Conditional Fields: Aerosol */}
      {isAerosol ? (
        <FormSection
          title="Spesifikasi Komponen Aerosol"
          description="Lengkapi kode aktuator, kaleng, valve, komposisi gas, dan kondisi awal kaleng"
        >
          <FormField label="Kode Aktuator" required>
            <Input
              value={formData.aerosolSpec.actuatorCode}
              onChange={(e) => handleAerosolChange('actuatorCode', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: ACT-AER-04"
              mono
            />
          </FormField>

          <FormField label="Kode Kaleng / Botol" required>
            <Input
              value={formData.aerosolSpec.canBottleCode}
              onChange={(e) => handleAerosolChange('canBottleCode', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: CAN-ALU-150"
              mono
            />
          </FormField>

          <FormField label="Kode Valve" required>
            <Input
              value={formData.aerosolSpec.valveCode}
              onChange={(e) => handleAerosolChange('valveCode', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: VLV-STD-02"
              mono
            />
          </FormField>

          <FormField label="Rasio Gas" hint="Perbandingan konsentrasi gas propelan">
            <Input
              value={formData.aerosolSpec.gasRatio}
              onChange={(e) => handleAerosolChange('gasRatio', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: 60:40"
              mono
            />
          </FormField>

          <FormField label="Jenis Gas" hint="Zat propelan yang digunakan">
            <Input
              value={formData.aerosolSpec.gasType}
              onChange={(e) => handleAerosolChange('gasType', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: Butane / Propane / DME"
            />
          </FormField>

          <FormField
            label="Tekanan Awal (bar)"
            hint="Tekanan sebelum penekanan dimulai"
            required
          >
            <Input
              type="number"
              step="0.01"
              value={formData.aerosolSpec.initialPressureBar}
              onChange={(e) => handleAerosolChange('initialPressureBar', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: 4.5"
              mono
            />
          </FormField>

          <FormField
            label="Bobot Awal Bruto (g)"
            hint="Berat total botol/kaleng sebelum uji"
            required
          >
            <Input
              type="number"
              step="0.01"
              value={formData.aerosolSpec.initialGrossWeightG}
              onChange={(e) => handleAerosolChange('initialGrossWeightG', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: 145.20"
              mono
            />
          </FormField>
        </FormSection>
      ) : (
        /* Conditional Fields: Non-Aerosol */
        <FormSection
          title="Spesifikasi Komponen Non-Aerosol"
          description="Lengkapi kode botol, pompa (pump), dan bobot awal sebelum pengujian"
        >
          <FormField label="Kode Botol" required>
            <Input
              value={formData.nonAerosolSpec.bottleCode}
              onChange={(e) => handleNonAerosolChange('bottleCode', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: BTL-PET-100"
              mono
            />
          </FormField>

          <FormField label="Kode Pump" required>
            <Input
              value={formData.nonAerosolSpec.pumpCode}
              onChange={(e) => handleNonAerosolChange('pumpCode', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: PMP-FST-18"
              mono
            />
          </FormField>

          <FormField
            label="Bobot Awal Bruto (g)"
            hint="Berat total botol sebelum uji"
            required
          >
            <Input
              type="number"
              step="0.01"
              value={formData.nonAerosolSpec.initialGrossWeightG}
              onChange={(e) => handleNonAerosolChange('initialGrossWeightG', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: 120.45"
              mono
            />
          </FormField>
        </FormSection>
      )}
    </div>
  );
}
