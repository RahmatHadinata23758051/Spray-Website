import React from 'react';
import type { ModelTestRun } from '../types';
import { FormSection } from '../../../components/ui/FormSection';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

interface Step01ModelIdentProps {
  data: ModelTestRun;
  onChange: (patch: Partial<ModelTestRun>) => void;
  isReadOnly?: boolean;
}

const STORAGE_CONDITIONS = ['Ruang', 'Jemur', 'Display', 'Oven 40', 'Oven 45', 'Oven 50', 'Oven 60', 'Freezer', 'Siklus'] as const;
const BOTTLE_POSITIONS = ['Tegak', 'Tidur'] as const;
const TRIAL_TYPES = ['Optimasi Formula', 'R&D Screening', 'Uji Stabilitas', 'Validasi Nozzle', 'Karakterisasi Spray'] as const;

export function Step01ModelIdent({ data, onChange, isReadOnly = false }: Step01ModelIdentProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">01. Identifikasi</h2>
      </div>

      <FormSection title="Produk &amp; trial">
        <FormField label="Nama produk" required>
          <Input
            value={data.productName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ productName: e.target.value })}
            placeholder="Contoh: Body Mist Aqua 100mL"
            disabled={isReadOnly}
          />
        </FormField>

        <FormField label="No. formula / lot" required>
          <Input
            value={data.formulaNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ formulaNumber: e.target.value, productLot: e.target.value })}
            placeholder="Contoh: LOT-2026-X1"
            mono
            disabled={isReadOnly}
          />
        </FormField>

        <FormField label="Versi model" required>
          <Input
            value={data.modelVersion}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ modelVersion: e.target.value })}
            placeholder="Contoh: v1.0-unet"
            mono
            disabled={isReadOnly}
          />
        </FormField>

        <FormField label="Tipe pengujian">
          <Select
            value={data.trialType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ trialType: e.target.value })}
            disabled={isReadOnly}
          >
            {TRIAL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Operator">
          <Input
            value={data.operatorName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ operatorName: e.target.value })}
            disabled={isReadOnly}
          />
        </FormField>
      </FormSection>

      <FormSection title="Penyimpanan &amp; posisi">
        <FormField label="Kondisi simpan">
          <Select
            value={data.storageCondition}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ storageCondition: e.target.value })}
            disabled={isReadOnly}
          >
            {STORAGE_CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </FormField>

        <FormField label="Posisi botol">
          <Select
            value={data.bottlePosition}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange({ bottlePosition: e.target.value })}
            disabled={isReadOnly}
          >
            {BOTTLE_POSITIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </Select>
        </FormField>
      </FormSection>
    </div>
  );
}
