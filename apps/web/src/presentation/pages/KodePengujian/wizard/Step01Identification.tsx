import React from 'react';
import type { WizardFormData } from './types';
import { FormSection } from '../../../components/ui/FormSection';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import type { TrialType, UsagePattern } from '@spray-paragon/domain';

const STANDARD_STORAGE_POSITIONS = ['Tegak', 'Tidur'] as const;
const STANDARD_STORAGE_CONDITIONS = [
  'Ruang',
  'Jemur',
  'Display',
  'Oven 40',
  'Oven 45',
  'Oven 50',
  'Oven 60',
  'Freezer',
  'Siklus',
] as const;

interface Step01IdentificationProps {
  formData: WizardFormData;
  onChange: (patch: Partial<WizardFormData>) => void;
  isReadOnly?: boolean;
  defaultStorageCondition?: string;
  defaultBottlePosition?: string;
}

export function Step01Identification({
  formData,
  onChange,
  isReadOnly = false,
  defaultStorageCondition,
  defaultBottlePosition,
}: Step01IdentificationProps) {
  const isStorageOverridden = Boolean(defaultStorageCondition && formData.storageCondition !== defaultStorageCondition);
  const isPositionOverridden = Boolean(defaultBottlePosition && formData.storagePosition !== defaultBottlePosition);
  const isLegacyPosition = Boolean(formData.storagePosition && !STANDARD_STORAGE_POSITIONS.includes(formData.storagePosition as (typeof STANDARD_STORAGE_POSITIONS)[number]));
  const isLegacyCondition = Boolean(formData.storageCondition && !STANDARD_STORAGE_CONDITIONS.includes(formData.storageCondition as (typeof STANDARD_STORAGE_CONDITIONS)[number]));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-bold text-text-primary">01. Identifikasi Sampel & Konteks Studi</h2>
      </div>

      <FormSection title="Produk & Trial">
        <FormField label="Nama Produk">
          <Input
            value={formData.productName}
            readOnly
            className="bg-surface-subtle/50 text-text-primary cursor-default border-border-subtle"
            placeholder="Nama Produk"
          />
        </FormField>

        <FormField label="No. Formula">
          <Input
            value={formData.formulaNumber}
            onChange={(e) => onChange({ formulaNumber: e.target.value })}
            disabled={isReadOnly}
            placeholder="Contoh: FOR-2026-X01"
            mono
          />
        </FormField>

        <FormField
          label="No. Batch"
          hint="Nomor batch sesuai identitas pengujian Paragon"
        >
          <Input
            value={formData.lotNumber}
            onChange={(e) => onChange({ lotNumber: e.target.value })}
            disabled={isReadOnly}
            placeholder="Contoh: LOT-20261020-01"
            mono
          />
        </FormField>

        <FormField label="KUF">
          <Input
            value={formData.kuf}
            onChange={(e) => onChange({ kuf: e.target.value })}
            disabled={isReadOnly}
            placeholder="Contoh: KUF-HS-009"
            mono
          />
        </FormField>

        <FormField label="Jenis Trial">
          <Select
            value={formData.trialType}
            onChange={(e) => onChange({ trialType: e.target.value as TrialType })}
            disabled={isReadOnly}
          >
            <option value="Lab">Lab</option>
            <option value="PS">PS (Pilot Scale)</option>
            <option value="MP">MP (Mass Production)</option>
          </Select>
        </FormField>

        <FormField label="Benchmark">
          <Input
            value={formData.benchmark}
            onChange={(e) => onChange({ benchmark: e.target.value })}
            disabled={isReadOnly}
            placeholder="Contoh: Standar Komersial A"
          />
        </FormField>

        <FormField
          label="Tujuan Trial"
          className="md:col-span-2 lg:col-span-3"
        >
          <Input
            value={formData.trialObjective}
            onChange={(e) => onChange({ trialObjective: e.target.value })}
            disabled={isReadOnly}
            placeholder="Tujuan trial pengujian..."
          />
        </FormField>
      </FormSection>

      <FormSection title="Sampel">
        <FormField label="Kode Unik Sampel" required>
          <Input
            value={formData.sampleCode}
            onChange={(e) => onChange({ sampleCode: e.target.value })}
            disabled={isReadOnly}
            placeholder="Contoh: SMPL-01"
            mono
          />
        </FormField>

        <FormField label="Tanggal Pengambilan Data" required>
          <Input
            type="date"
            value={formData.acquisitionDate}
            onChange={(e) => onChange({ acquisitionDate: e.target.value })}
            disabled={isReadOnly}
          />
        </FormField>

        <FormField label="Pola Penggunaan">
          <Select
            value={formData.usagePattern}
            onChange={(e) => onChange({ usagePattern: e.target.value as UsagePattern })}
            disabled={isReadOnly}
          >
            <option value="Sekali Pakai">Sekali Pakai</option>
            <option value="Berulang">Berulang</option>
          </Select>
        </FormField>

        <FormField
          label="Posisi Penyimpanan"
          hint={
            isPositionOverridden
              ? `Override khusus sampel (Default KP: ${defaultBottlePosition})`
              : defaultBottlePosition
              ? `Mewarisi default KP (${defaultBottlePosition})`
              : undefined
          }
        >
          <Select
            value={formData.storagePosition}
            onChange={(e) => onChange({ storagePosition: e.target.value })}
            disabled={isReadOnly}
          >
            {STANDARD_STORAGE_POSITIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
            {isLegacyPosition && (
              <option value={formData.storagePosition}>
                {formData.storagePosition} (Legacy)
              </option>
            )}
          </Select>
        </FormField>

        <FormField
          label="Kondisi Penyimpanan"
          hint={
            isStorageOverridden
              ? `Override khusus sampel (Default KP: ${defaultStorageCondition})`
              : defaultStorageCondition
              ? `Mewarisi default KP (${defaultStorageCondition})`
              : undefined
          }
        >
          <Select
            value={formData.storageCondition}
            onChange={(e) => onChange({ storageCondition: e.target.value })}
            disabled={isReadOnly}
          >
            {STANDARD_STORAGE_CONDITIONS.map((cond) => (
              <option key={cond} value={cond}>
                {cond}
              </option>
            ))}
            {isLegacyCondition && (
              <option value={formData.storageCondition}>
                {formData.storageCondition} (Legacy)
              </option>
            )}
          </Select>
        </FormField>
      </FormSection>
    </div>
  );
}
