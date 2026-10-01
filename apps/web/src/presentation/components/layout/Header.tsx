import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Page } from '../../navigation';
import { pageDescriptions, pathToLegacyPage } from '../../navigation';

export function Header({ page }: { page?: Page }) {
  const location = useLocation();
  const pathname = location.pathname;

  let title = page || pathToLegacyPage[pathname] || 'Dashboard';
  let description = pageDescriptions[title as Exclude<Page, 'Login'>] || '';
  let subSection: string | null = null;
  let batchIdMatch: string | null = null;

  if (pathname.startsWith('/batches')) {
    title = 'Batches';
    description = pageDescriptions.Batches;

    const parts = pathname.split('/').filter(Boolean); // ['batches', ':batchId', 'analysis']
    if (parts.length === 2 && parts[1] === 'new') {
      subSection = 'New Batch';
    } else if (parts.length >= 2) {
      batchIdMatch = parts[1];
      if (parts.length === 3) {
        if (parts[2] === 'capture') subSection = 'Capture';
        else if (parts[2] === 'analysis') subSection = 'Analysis';
        else if (parts[2] === 'result') subSection = 'Result';
        else subSection = parts[2];
      } else {
        subSection = 'Details';
      }
    }
  }

  const isAnalysisWorkspace = pathname.includes('/analysis');

  return (
    <header className={`context-header ${isAnalysisWorkspace ? 'analysis-context-header' : ''}`}>
      <div className="min-w-0">
        <div className="breadcrumb">
          <span>Spraybot</span>
          <ChevronRight size={12} />
          <span>{title}</span>
          {batchIdMatch && (
            <>
              <ChevronRight size={12} />
              <span className="font-mono">{batchIdMatch}</span>
            </>
          )}
          {subSection && (
            <>
              <ChevronRight size={12} />
              <span>{subSection}</span>
            </>
          )}
        </div>
        <div className="mt-1 flex min-w-0 items-baseline gap-3">
          <h1>{subSection ? `${subSection}` : title}</h1>
          {description && (
            <p className="hidden truncate text-sm text-text-muted xl:block">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="simulation-state" role="status">
          <span aria-hidden="true" />
          Simulation Mode
        </div>
      </div>
    </header>
  );
}
