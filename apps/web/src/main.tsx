import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './styles/index.css';

class AppErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean; errorMessage?: string }> {
  state: { hasError: boolean; errorMessage?: string } = { hasError: false };

  static getDerivedStateFromError(error: Error): { hasError: boolean; errorMessage?: string } {
    return { hasError: true, errorMessage: error?.message || 'Terjadi kesalahan tidak terduga.' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application render error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--bg-canvas)] px-6">
          <section className="w-full max-w-lg rounded-panel border border-border-default bg-surface p-6 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-semantic-danger">Halaman gagal dimuat</p>
            <h1 className="mt-2 text-xl font-bold text-text-primary">Terjadi kesalahan saat membuka halaman ini.</h1>
            <p className="mt-2 text-sm text-text-secondary">Muat ulang halaman atau kembali ke daftar batch untuk melanjutkan.</p>
            {this.state.errorMessage && (
              <p className="mt-3 break-words rounded-md border border-border-default bg-surface-subtle px-3 py-2 text-left font-mono text-[11px] text-text-muted">
                {this.state.errorMessage}
              </p>
            )}
            <div className="mt-5 flex justify-center gap-3">
              <button type="button" className="btn btn-secondary" onClick={() => window.location.reload()}>Muat ulang</button>
              <button type="button" className="btn btn-primary" onClick={() => { window.location.href = '/batches'; }}>Daftar batch</button>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppErrorBoundary>
  </React.StrictMode>
);
