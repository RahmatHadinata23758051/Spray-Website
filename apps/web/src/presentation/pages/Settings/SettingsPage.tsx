import React, { useState } from 'react';
import { Status } from '../../components/ui/Status';
import { getCaptureSavePolicy, setCaptureSavePolicy } from '../../../application/services';
import type { CaptureSavePolicy } from '@spray-paragon/domain';

export function SettingsPage() {
  const [savePolicy, setSavePolicy] = useState<CaptureSavePolicy>(getCaptureSavePolicy());

  const handlePolicyChange = (newPolicy: CaptureSavePolicy) => {
    setCaptureSavePolicy(newPolicy);
    setSavePolicy(newPolicy);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Top Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-3">
        <div>
          <div className="text-base font-semibold tracking-tight text-text-primary">
            Lingkungan Workstation Lokal
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Konfigurasi stasiun Spraybot dan kebijakan operasional.
          </p>
        </div>
        <Status tone="neutral">Workstation v0.1.0-alpha</Status>
      </div>

      {/* Group: Kebijakan Penyimpanan Akuisisi */}
      <section className="rounded-md border border-border-default bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border-subtle bg-surface-subtle px-4 py-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-text-muted">
            Kebijakan penyimpanan
          </h2>
          <span className="text-[11px] font-mono text-primary font-medium">PENGAMBILAN DATA</span>
        </div>
        <div className="divide-y divide-border-subtle bg-surface text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
            <div>
              <div className="font-medium text-text-primary">Mode Simpan Hasil Tangkapan</div>
              <div className="text-text-muted mt-0.5">
                Simpan langsung atau tinjau terlebih dahulu sebelum menyimpan.
              </div>
            </div>
            <div className="flex items-center gap-1.5 p-0.5 bg-surface-subtle border border-border-default rounded">
              <button
                type="button"
                onClick={() => handlePolicyChange('review')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  savePolicy === 'review'
                    ? 'bg-surface text-primary font-medium shadow-xs border border-border-subtle'
                    : 'text-text-secondary hover:text-text-primary border border-transparent'
                }`}
              >
                Tinjau sebelum menyimpan
              </button>
              <button
                type="button"
                onClick={() => handlePolicyChange('auto')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  savePolicy === 'auto'
                    ? 'bg-primary text-white font-medium shadow-xs border border-primary'
                    : 'text-text-secondary hover:text-text-primary border border-transparent'
                }`}
              >
                Simpan otomatis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Group 1: Hardware Simulation & Acquisition */}
      <section className="rounded-md border border-border-default bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border-subtle bg-surface-subtle px-4 py-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-text-muted">
            Mesin & perangkat keras
          </h2>
          <span className="text-[11px] font-mono text-primary font-medium">STASIONER</span>
        </div>
        <div className="divide-y divide-border-subtle bg-surface text-xs">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div>
              <div className="font-medium text-text-primary">Mode Akuisisi</div>
              <div className="text-text-muted mt-0.5">
                Pengambilan data kamera ganda dengan target terkalibrasi.
              </div>
            </div>
            <span className="font-mono font-medium text-text-secondary bg-surface-subtle px-2 py-0.5 rounded border border-border-subtle text-[11px]">
              Sistem Tertutup
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <div>
              <div className="font-medium text-text-primary">Profil Tangkapan Kamera</div>
              <div className="text-text-muted mt-0.5">
                Frame sinkron Samping CAM-01 + Depan CAM-02 (640×480px).
              </div>
            </div>
            <span className="font-mono font-medium text-text-secondary bg-surface-subtle px-2 py-0.5 rounded border border-border-subtle text-[11px]">
              Linimasa sinkron
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <div>
              <div className="font-medium text-text-primary">Mesin Analisis</div>
              <div className="text-text-muted mt-0.5">
                Ekstraksi geometri plume semprotan otomatis & koreksi operator.
              </div>
            </div>
            <span className="font-mono font-medium text-text-secondary bg-surface-subtle px-2 py-0.5 rounded border border-border-subtle text-[11px]">
              Mesin Visi Luring
            </span>
          </div>
        </div>
      </section>

      {/* Group 2: Persistence & Local Storage */}
      <section className="rounded-md border border-border-default bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border-subtle bg-surface-subtle px-4 py-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-text-muted">
            Penyimpanan & basis data
          </h2>
          <span className="text-[11px] font-mono text-text-secondary font-medium">DB-LOKAL</span>
        </div>
        <div className="divide-y divide-border-subtle bg-surface text-xs">
          <div className="flex items-center justify-between px-4 py-2.5">
            <div>
              <div className="font-medium text-text-primary">Penyedia Persistensi Basis Data</div>
              <div className="text-text-muted mt-0.5">
                Persistensi workstation terisolasi dengan fallback memori.
              </div>
            </div>
            <span className="font-mono font-medium text-semantic-success bg-semantic-success-soft px-2 py-0.5 rounded text-[11px]">
              Penyimpanan Browser / PostgreSQL
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <div>
              <div className="font-medium text-text-primary">Retensi Log Audit</div>
              <div className="text-text-muted mt-0.5">
                Penyimpanan lokal untuk pelacakan edit kalibrasi dan pengukuran.
              </div>
            </div>
            <span className="font-mono font-medium text-text-secondary bg-surface-subtle px-2 py-0.5 rounded border border-border-subtle text-[11px]">
              Tak Terbatas (Stasiun Lokal)
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5">
            <div>
              <div className="font-medium text-text-primary">Mode Autentikasi</div>
              <div className="text-text-muted mt-0.5">
                Sesi autentikasi workstation operator lokal.
              </div>
            </div>
            <span className="font-mono font-medium text-text-secondary bg-surface-subtle px-2 py-0.5 rounded border border-border-subtle text-[11px]">
              Mode Sesi Lokal
            </span>
          </div>
        </div>
      </section>

      {/* Group 3: Station Information */}
      <section className="rounded-md border border-border-default bg-surface shadow-sm overflow-hidden">
        <div className="border-b border-border-subtle bg-surface-subtle px-4 py-2">
          <h2 className="text-xs font-semibold text-text-muted">
            Informasi sistem
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 text-xs bg-surface">
          <div>
            <div className="text-text-muted text-[11px]">Model Stasiun</div>
            <div className="font-mono font-medium text-text-primary mt-0.5">Spraybot-MV01</div>
          </div>
          <div>
            <div className="text-text-muted text-[11px]">Arsitektur UI</div>
            <div className="font-mono font-medium text-text-primary mt-0.5">3-Layer Domain UI</div>
          </div>
          <div>
            <div className="text-text-muted text-[11px]">Node Klien</div>
            <div className="font-mono font-medium text-text-primary mt-0.5">Workstation Paragon</div>
          </div>
          <div>
            <div className="text-text-muted text-[11px]">Status Integritas</div>
            <div className="font-medium text-semantic-success mt-0.5">Terverifikasi</div>
          </div>
        </div>
      </section>
    </div>
  );
}
