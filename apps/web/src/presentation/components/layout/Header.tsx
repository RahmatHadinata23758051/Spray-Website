import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Page } from '../../navigation';
import { pageDescriptions, pathToLegacyPage, pageLabels } from '../../navigation';

export function Header({ page }: { page?: Page }) {
  const location = useLocation();
  const pathname = location.pathname;

  let title = page || pathToLegacyPage[pathname] || 'Dashboard';
  let description = pageDescriptions[title as Exclude<Page, 'Login'>] || '';
  let subSectionLabel: string | null = null;
  let batchIdMatch: string | null = null;

  if (pathname.startsWith('/batches')) {
    title = 'Batches';
    description = pageDescriptions.Batches;

    const parts = pathname.split('/').filter(Boolean); // ['batches', ':batchId', 'analysis']
    if (parts.length === 2 && parts[1] === 'new') {
      subSectionLabel = 'Batch Baru';
    } else if (parts.length >= 2) {
      description = '';
      batchIdMatch = parts[1];
      if (parts.length === 3) {
        if (parts[2] === 'capture') { subSectionLabel = 'Pengambilan Data'; }
        else if (parts[2] === 'analysis') { subSectionLabel = 'Analisis'; }
        else if (parts[2] === 'result') { subSectionLabel = 'Hasil'; }
        else { subSectionLabel = parts[2]; }
      } else {
        subSectionLabel = 'Detail Batch';
      }
    }
  }

  const isAnalysisWorkspace = pathname.includes('/analysis');

  return (
    <header className={`flex items-center justify-between gap-4 pb-6 pt-2 ${isAnalysisWorkspace ? 'pb-4' : ''}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
          <span>Spraybot</span>
          <ChevronRight size={13} className="text-border-strong shrink-0" />
          <span>{pageLabels[title as Page] || title}</span>
          {batchIdMatch && (
            <>
              <ChevronRight size={13} className="text-border-strong shrink-0" />
              <span className="font-mono text-text-secondary">{batchIdMatch}</span>
            </>
          )}
          {subSectionLabel && (
            <>
              <ChevronRight size={13} className="text-border-strong shrink-0" />
              <span className="text-text-primary font-bold">{subSectionLabel}</span>
            </>
          )}
        </div>
        <div className="mt-1 flex items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            {subSectionLabel ? subSectionLabel : (pageLabels[title as Page] || title)}
          </h1>
          {description && (
            <p className="hidden truncate text-sm text-text-secondary xl:block">
              {description}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
