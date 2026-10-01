import { ChevronRight } from 'lucide-react';
import type { Page } from '../../navigation';
import { pageDescriptions } from '../../navigation';
import type { Test } from '../../../domain/types';

export function Header({ page, selected }: { page: Page; selected: Test }) {
  const isContextRoute = ['Capture', 'Analysis', 'Result'].includes(page);
  return (
    <header className={`context-header ${page === 'Analysis' ? 'analysis-context-header' : ''}`}>
      <div className="min-w-0">
        <div className="breadcrumb">
          <span>Spraybot</span>
          <ChevronRight size={12} />
          <span>{page}</span>
          {isContextRoute && (
            <>
              <ChevronRight size={12} />
              <span className="font-mono">{selected.id}</span>
            </>
          )}
        </div>
        <div className="mt-1 flex min-w-0 items-baseline gap-3">
          <h1>{page}</h1>
          <p className="hidden truncate text-sm text-text-muted xl:block">
            {pageDescriptions[page as Exclude<Page, 'Login'>]}
          </p>
        </div>
        {isContextRoute && (
          <div className="context-record">
            <span className="font-medium text-text-primary">{selected.productName}</span>
            <span>{selected.sampleId}</span>
          </div>
        )}
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
