import React from 'react';
import { Status } from '../../components/ui/Status';

export function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-border-default bg-surface px-5 py-4 shadow-sm">
        <div>
          <div className="text-base font-bold tracking-tight text-text-primary">
            Lingkungan Workstation Lokal
          </div>
          <p className="text-xs text-text-secondary mt-0.5">Konfigurasi sistem untuk stasiun analisis Spraybot.</p>
        </div>
        <Status tone="neutral">Workstation v0.1.0-alpha</Status>
      </div>

      {/* Group 1: Hardware Simulation & Acquisition */}
      <section className="surface-panel !rounded-panel overflow-hidden">
        <div className="border-b border-border-subtle bg-surface-subtle px-5 py-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">Mesin & Perangkat Keras</h2>
          <span className="text-[11px] font-mono text-primary font-semibold">STASIONER</span>
        </div>
        <div className="divide-y divide-border-subtle bg-surface text-xs">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <div className="font-semibold text-text-primary">Mode Akuisisi</div>
              <div className="text-text-muted mt-0.5">Pengambilan data kamera ganda menggunakan target uji coba multi-frame yang telah direkam sebelumnya.</div>
            </div>
            <span className="font-mono font-bold text-text-secondary bg-surface-subtle px-2.5 py-1 rounded border border-border-subtle">
              Sistem Tertutup
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <div className="font-semibold text-text-primary">Profil Tangkapan Kamera</div>
              <div className="text-text-muted mt-0.5">Bingkai sinkron (Samping CAM-01 + Depan CAM-02 pada 640×480px, 100 momen).</div>
            </div>
            <span className="font-mono font-bold text-text-secondary bg-surface-subtle px-2.5 py-1 rounded border border-border-subtle">
              Linimasa 100-momen sinkron
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <div className="font-semibold text-text-primary">Mesin Analisis</div>
              <div className="text-text-muted mt-0.5">Mesin inferensi visi komputer untuk ekstraksi geometri plume semprotan.</div>
            </div>
            <span className="font-mono font-bold text-text-secondary bg-surface-subtle px-2.5 py-1 rounded border border-border-subtle">
              Mesin Visi Luring
            </span>
          </div>
        </div>
      </section>

      {/* Group 2: Persistence & Local Storage */}
      <section className="surface-panel !rounded-panel overflow-hidden">
        <div className="border-b border-border-subtle bg-surface-subtle px-5 py-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">Penyimpanan & Kontrak Data</h2>
          <span className="text-[11px] font-mono text-text-secondary font-semibold">DB-LOKAL</span>
        </div>
        <div className="divide-y divide-border-subtle bg-surface text-xs">
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <div className="font-semibold text-text-primary">Penyedia Persistensi Basis Data</div>
              <div className="text-text-muted mt-0.5">Persistensi workstation terisolasi dengan fallback memori.</div>
            </div>
            <span className="font-mono font-bold text-semantic-success bg-semantic-success-soft px-2.5 py-1 rounded">
              Penyimpanan Browser / PostgreSQL
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <div className="font-semibold text-text-primary">Retensi Log Audit</div>
              <div className="text-text-muted mt-0.5">Penyimpanan tak terbatas untuk pelacakan edit kalibrasi dan penimpaan pengukuran.</div>
            </div>
            <span className="font-mono font-bold text-text-secondary bg-surface-subtle px-2.5 py-1 rounded border border-border-subtle">
              Tak Terbatas (Stasiun Lokal)
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-3.5">
            <div>
              <div className="font-semibold text-text-primary">Mode Autentikasi</div>
              <div className="text-text-muted mt-0.5">Sesi autentikasi workstation operator lokal.</div>
            </div>
            <span className="font-mono font-bold text-text-secondary bg-surface-subtle px-2.5 py-1 rounded border border-border-subtle">
              Mode Sesi Lokal
            </span>
          </div>
        </div>
      </section>

      {/* Group 3: Station Information */}
      <section className="surface-panel !rounded-panel overflow-hidden">
        <div className="border-b border-border-subtle bg-surface-subtle px-5 py-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-muted">Informasi Sistem & Integritas</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 text-xs bg-surface">
          <div>
            <div className="text-text-muted">Model Stasiun</div>
            <div className="font-mono font-bold text-text-primary mt-1">Spraybot-MV01</div>
          </div>
          <div>
            <div className="text-text-muted">Arsitektur UI</div>
            <div className="font-mono font-bold text-text-primary mt-1">3-Layer Domain UI</div>
          </div>
          <div>
            <div className="text-text-muted">Node Klien</div>
            <div className="font-mono font-bold text-text-primary mt-1">Workstation Paragon</div>
          </div>
          <div>
            <div className="text-text-muted">Gerbang Integritas</div>
            <div className="font-semibold text-semantic-success mt-1">Terverifikasi (160/160 pass)</div>
          </div>
        </div>
      </section>
    </div>
  );
}
