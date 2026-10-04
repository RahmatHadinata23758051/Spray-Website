import React from 'react';
import { Status } from '../../components/ui/Status';

export function CalibrationPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-border-default bg-surface px-5 py-4 shadow-sm">
        <div>
          <div className="text-base font-bold tracking-tight text-text-primary">Ikhtisar Stasiun Kamera</div>
          <p className="text-xs text-text-secondary mt-0.5">Pemetaan koordinat fisik, faktor skala, dan referensi spasial untuk stasiun kamera ganda.</p>
        </div>
        <Status tone="success">
          Terkalibrasi
        </Status>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Side Camera Calibration */}
        <section className="surface-panel !rounded-panel overflow-hidden">
          <div className="p-4 border-b border-border-subtle bg-surface-subtle flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">Tolok Ukur Kalibrasi Kamera Samping</h2>
            <span className="font-mono text-xs font-semibold text-primary">CAM-01 (SAMPING)</span>
          </div>
          <div className="p-5 space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div className="border-b border-border-subtle pb-2">
                <dt className="text-text-muted font-medium">Faktor Skala</dt>
                <dd className="font-mono text-base font-bold text-text-primary mt-0.5">0.420 mm / px</dd>
              </div>
              <div className="border-b border-border-subtle pb-2">
                <dt className="text-text-muted font-medium">Jarak Referensi</dt>
                <dd className="font-mono text-base font-bold text-text-primary mt-0.5">100.0 mm</dd>
              </div>
              <div className="border-b border-border-subtle pb-2">
                <dt className="text-text-muted font-medium">Titik Jangkar A</dt>
                <dd className="font-mono font-bold text-text-primary mt-0.5">(120.0, 480.0) px</dd>
              </div>
              <div className="border-b border-border-subtle pb-2">
                <dt className="text-text-muted font-medium">Titik Jangkar B</dt>
                <dd className="font-mono font-bold text-text-primary mt-0.5">(120.0, 241.9) px</dd>
              </div>
            </dl>
            <div className="rounded-md bg-surface-subtle p-3 text-xs border border-border-subtle space-y-1">
              <div className="flex justify-between text-text-secondary"><span className="font-medium">Orientasi:</span><span className="font-mono text-text-primary">Penjajaran Nosel Horizontal</span></div>
              <div className="flex justify-between text-text-secondary"><span className="font-medium">Status:</span><span className="font-semibold text-semantic-success">Terkalibrasi</span></div>
            </div>
          </div>
        </section>

        {/* Front Camera Calibration */}
        <section className="surface-panel !rounded-panel overflow-hidden">
          <div className="p-4 border-b border-border-subtle bg-surface-subtle flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">Tolok Ukur Kalibrasi Kamera Depan</h2>
            <span className="font-mono text-xs font-semibold text-primary">CAM-02 (DEPAN)</span>
          </div>
          <div className="p-5 space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div className="border-b border-border-subtle pb-2">
                <dt className="text-text-muted font-medium">Faktor Skala</dt>
                <dd className="font-mono text-base font-bold text-text-primary mt-0.5">0.420 mm / px</dd>
              </div>
              <div className="border-b border-border-subtle pb-2">
                <dt className="text-text-muted font-medium">Referensi Titik Tengah</dt>
                <dd className="font-mono text-base font-bold text-text-primary mt-0.5">(300.0, 170.0) px</dd>
              </div>
              <div className="border-b border-border-subtle pb-2">
                <dt className="text-text-muted font-medium">Geometri Target</dt>
                <dd className="font-mono font-bold text-text-primary mt-0.5">Target Melingkar</dd>
              </div>
              <div className="border-b border-border-subtle pb-2">
                <dt className="text-text-muted font-medium">Batas ROI</dt>
                <dd className="font-mono font-bold text-text-primary mt-0.5">Area ROI Spasial</dd>
              </div>
            </dl>
            <div className="rounded-md bg-surface-subtle p-3 text-xs border border-border-subtle space-y-1">
              <div className="flex justify-between text-text-secondary"><span className="font-medium">Orientasi:</span><span className="font-mono text-text-primary">Profil Pola Semprot Aksial</span></div>
              <div className="flex justify-between text-text-secondary"><span className="font-medium">Status:</span><span className="font-semibold text-semantic-success">Terkalibrasi</span></div>
            </div>
          </div>
        </section>
      </div>

      {/* Global Configuration Specs Table */}
      <section className="table-shell">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border-default">
            <tr>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-text-muted text-[11px]">Parameter</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-text-muted text-[11px]">Target Kamera Samping</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-text-muted text-[11px]">Target Kamera Depan</th>
              <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-text-muted text-[11px]">Metode Validasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle bg-surface text-xs">
            <tr className="hover:bg-surface-subtle">
              <td className="px-4 py-3 font-semibold text-text-primary">Bidang Pandang Sensor (FOV)</td>
              <td className="px-4 py-3 font-mono text-text-secondary">640 × 480 px (268.8 × 201.6 mm)</td>
              <td className="px-4 py-3 font-mono text-text-secondary">640 × 480 px (268.8 × 201.6 mm)</td>
              <td className="px-4 py-3 text-text-muted">Pola Kisi Target</td>
            </tr>
            <tr className="hover:bg-surface-subtle">
              <td className="px-4 py-3 font-semibold text-text-primary">Rasio Resolusi Piksel</td>
              <td className="px-4 py-3 font-mono text-text-secondary">0.4200 mm/px (±0.005)</td>
              <td className="px-4 py-3 font-mono text-text-secondary">0.4200 mm/px (±0.005)</td>
              <td className="px-4 py-3 text-text-muted">Blok Kaliber Standar</td>
            </tr>
            <tr className="hover:bg-surface-subtle">
              <td className="px-4 py-3 font-semibold text-text-primary">Titik Asal Koordinat</td>
              <td className="px-4 py-3 font-mono text-text-secondary">Dasar Ujung Nosel (0, 0)</td>
              <td className="px-4 py-3 font-mono text-text-secondary">Sumbu Pusat Nosel (300, 170)</td>
              <td className="px-4 py-3 text-text-muted">Pusat Sumbu Optik</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
