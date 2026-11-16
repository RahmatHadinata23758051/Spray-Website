import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { modelTestingRepository } from './modelTestingRepository';
import { FormSection } from '../../components/ui/FormSection';
import { FormField } from '../../components/ui/FormField';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ChevronRight } from 'lucide-react';

export function NewModelTestingPage() {
  const navigate = useNavigate();

  const [productName, setProductName] = useState('Body Mist 100mL');
  const [formulaNumber, setFormulaNumber] = useState('LOT-2026-X1');
  const [modelVersion, setModelVersion] = useState('v1.0-unet');
  const [deviceType, setDeviceType] = useState<'Aerosol' | 'Non-Aerosol'>('Non-Aerosol');
  const [operatorName, setOperatorName] = useState('Nadia Putri');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !formulaNumber.trim() || !modelVersion.trim()) return;

    try {
      setIsSubmitting(true);
      const created = await modelTestingRepository.create({
        title: `Uji Segmentasi - ${productName}`,
        productName: productName.trim(),
        productLot: formulaNumber.trim(),
        formulaNumber: formulaNumber.trim(),
        trialType: 'R&D Screening',
        storageCondition: 'Ruang',
        bottlePosition: 'Tegak',
        modelVersion: modelVersion.trim(),
        operatorName: operatorName.trim(),
        status: 'READY_FOR_UPLOAD',
        deviceType,
        aerosolSpec: {
          actuatorCode: 'ACT-AER-01',
          canBottleCode: 'CAN-ALU-100',
          valveCode: 'VLV-STD-01',
          gasRatio: '60:40',
          gasType: 'Butane / Propane',
          initialPressureBar: '4.5',
          initialGrossWeightG: '120.50',
        },
        nonAerosolSpec: {
          bottleCode: 'BTL-PET-100',
          pumpCode: 'PMP-FOG-01',
          pumpSubType: 'Spray Cair',
          dipTubeDiameterMm: '1.5',
          initialGrossWeightG: '115.20',
        },
        observationObjectives: ['Panjang lintasan', 'Sebaran'],
        frames: [],
        selectedSupportingFrameIndexes: [],
      });

      navigate(`/uji-model/${created.id}/execute?step=1`);
    } catch (err) {
      console.error('Failed to create model test run', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <nav className="flex items-center gap-1.5 text-xs text-text-muted">
        <Link to="/dashboard" className="hover:text-text-primary">Spraybot</Link>
        <ChevronRight size={12} />
        <Link to="/uji-model" className="hover:text-text-primary">Uji Model</Link>
        <ChevronRight size={12} />
        <span className="text-text-primary font-medium">Baru</span>
      </nav>

      <div className="rounded-md border border-border-default bg-surface shadow-xs overflow-hidden">
        <div className="border-b border-border-subtle bg-surface px-5 py-3.5">
          <h1 className="text-sm font-semibold text-text-primary">
            Uji Model Baru
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <FormSection title="Produk &amp; model">
            <FormField label="Nama produk" required>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Contoh: Body Mist Aqua 100mL"
                required
              />
            </FormField>

            <FormField label="No. formula / lot" required>
              <Input
                value={formulaNumber}
                onChange={(e) => setFormulaNumber(e.target.value)}
                placeholder="Contoh: LOT-2026-X1"
                mono
                required
              />
            </FormField>

            <FormField label="Versi model" required>
              <Input
                value={modelVersion}
                onChange={(e) => setModelVersion(e.target.value)}
                placeholder="Contoh: v1.0-unet"
                mono
                required
              />
            </FormField>

            <FormField label="Tipe kemasan" required>
              <Select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as 'Aerosol' | 'Non-Aerosol')}
              >
                <option value="Non-Aerosol">Non-Aerosol</option>
                <option value="Aerosol">Aerosol</option>
              </Select>
            </FormField>

            <FormField label="Operator">
              <Input
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
              />
            </FormField>
          </FormSection>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            <Link
              to="/uji-model"
              className="btn btn-secondary !min-h-[32px] px-4 text-xs font-medium"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary !min-h-[32px] px-4 text-xs font-medium"
            >
              {isSubmitting ? 'Memproses...' : 'Lanjut'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
