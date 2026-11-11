import React from 'react';
import type { WizardFormData } from './types';
import { FormSection } from '../../../components/ui/FormSection';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
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
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold text-text-primary">02. Konfigurasi Device / Kemasan</h2>
      </div>

      {/* Device Type Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-surface border border-border-default rounded-md">
        <div>
          <span className="text-xs font-semibold text-text-secondary block">
            Tipe Kemasan / Dispenser <span className="text-semantic-danger font-bold">*</span>
          </span>
        </div>
        <div className="inline-flex rounded-md p-0.5 bg-surface-subtle border border-border-subtle">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => handleDeviceTypeChange('Non-Aerosol')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              !isAerosol
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Non-Aerosol
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => handleDeviceTypeChange('Aerosol')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
              isAerosol
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Aerosol
          </button>
        </div>
      </div>

      {/* Conditional Fields: Aerosol */}
      {isAerosol ? (
        <FormSection title="Spesifikasi Komponen Aerosol">
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

          <FormField label="Rasio Gas">
            <Input
              value={formData.aerosolSpec.gasRatio}
              onChange={(e) => handleAerosolChange('gasRatio', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: 60:40"
              mono
            />
          </FormField>

          <FormField label="Jenis Gas">
            <Input
              value={formData.aerosolSpec.gasType}
              onChange={(e) => handleAerosolChange('gasType', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: Butane / Propane"
            />
          </FormField>

          <FormField label="Tekanan Awal (bar)" required>
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

          <FormField label="Bobot Awal Bruto (g)" required>
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
        <FormSection title="Spesifikasi Komponen Non-Aerosol">
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

          <FormField label="Bobot Awal Bruto (g)" required>
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
