import React from 'react';
import type { ModelTestRun } from '../types';
import type { DeviceType } from '@spray-paragon/domain';
import { FormSection } from '../../../components/ui/FormSection';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

interface Step02ModelDeviceProps {
  data: ModelTestRun;
  onChange: (patch: Partial<ModelTestRun>) => void;
  isReadOnly?: boolean;
}

const PUMP_SUB_TYPES = ['Krim / Losion', 'Serum', 'Minyak', 'Spray Cair', 'Busa'] as const;

export function Step02ModelDevice({ data, onChange, isReadOnly = false }: Step02ModelDeviceProps) {
  const isAerosol = data.deviceType === 'Aerosol';

  const handleDeviceTypeChange = (type: DeviceType) => {
    if (isReadOnly) return;
    onChange({ deviceType: type });
  };

  const handleAerosolChange = (key: keyof ModelTestRun['aerosolSpec'], value: string) => {
    onChange({
      aerosolSpec: {
        ...data.aerosolSpec,
        [key]: value,
      },
    });
  };

  const handleNonAerosolChange = (key: keyof ModelTestRun['nonAerosolSpec'], value: string) => {
    onChange({
      nonAerosolSpec: {
        ...data.nonAerosolSpec,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">02. Device</h2>
      </div>

      {/* Device Type Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-surface border border-border-default rounded-md">
        <div>
          <span className="text-xs font-semibold text-text-primary block">
            Tipe kemasan <span className="text-semantic-danger font-medium">*</span>
          </span>
        </div>
        <div className="inline-flex rounded-md p-0.5 bg-surface-subtle border border-border-subtle">
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => handleDeviceTypeChange('Non-Aerosol')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              !isAerosol
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            Non-Aerosol
          </button>
          <button
            type="button"
            disabled={isReadOnly}
            onClick={() => handleDeviceTypeChange('Aerosol')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              isAerosol
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            Aerosol
          </button>
        </div>
      </div>

      {/* Conditional Fields: Aerosol */}
      {isAerosol ? (
        <FormSection title="Komponen aerosol">
          <FormField label="Kode aktuator" required>
            <Input
              value={data.aerosolSpec.actuatorCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAerosolChange('actuatorCode', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: ACT-AER-04"
              mono
            />
          </FormField>

          <FormField label="Kode kaleng / botol" required>
            <Input
              value={data.aerosolSpec.canBottleCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAerosolChange('canBottleCode', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: CAN-ALU-150"
              mono
            />
          </FormField>

          <FormField label="Kode valve" required>
            <Input
              value={data.aerosolSpec.valveCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAerosolChange('valveCode', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: VLV-STD-02"
              mono
            />
          </FormField>

          <FormField label="Rasio gas">
            <Input
              value={data.aerosolSpec.gasRatio}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAerosolChange('gasRatio', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: 60:40"
              mono
            />
          </FormField>

          <FormField label="Jenis gas">
            <Input
              value={data.aerosolSpec.gasType}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAerosolChange('gasType', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: Butane / Propane"
            />
          </FormField>

          <FormField label="Tekanan awal (bar)" required>
            <Input
              value={data.aerosolSpec.initialPressureBar}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAerosolChange('initialPressureBar', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: 4.5"
              mono
            />
          </FormField>

          <FormField label="Bobot awal bruto (g)" required>
            <Input
              value={data.aerosolSpec.initialGrossWeightG}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAerosolChange('initialGrossWeightG', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: 145.20"
              mono
            />
          </FormField>
        </FormSection>
      ) : (
        <FormSection title="Komponen non-aerosol">
          <FormField label="Kode botol" required>
            <Input
              value={data.nonAerosolSpec.bottleCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNonAerosolChange('bottleCode', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: BTL-PET-100"
              mono
            />
          </FormField>

          <FormField label="Kode pompa" required>
            <Input
              value={data.nonAerosolSpec.pumpCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNonAerosolChange('pumpCode', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: PMP-FOG-01"
              mono
            />
          </FormField>

          <FormField label="Sub-tipe pompa" required>
            <Select
              value={data.nonAerosolSpec.pumpSubType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleNonAerosolChange('pumpSubType', e.target.value)}
              disabled={isReadOnly}
            >
              {PUMP_SUB_TYPES.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Diameter selang (mm)">
            <Input
              value={data.nonAerosolSpec.dipTubeDiameterMm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNonAerosolChange('dipTubeDiameterMm', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: 1.5"
              mono
            />
          </FormField>

          <FormField label="Bobot awal bruto (g)" required>
            <Input
              value={data.nonAerosolSpec.initialGrossWeightG}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNonAerosolChange('initialGrossWeightG', e.target.value)}
              disabled={isReadOnly}
              placeholder="Contoh: 120.50"
              mono
            />
          </FormField>
        </FormSection>
      )}
    </div>
  );
}
