import type { Page } from '../../navigation';

export function NotFoundPage({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <div className="surface-panel p-8 text-center space-y-4">
      <div>
        <h2 className="text-xl font-bold text-text-primary">404 - Page Not Found</h2>
        <p className="mt-1 text-sm text-text-secondary">The requested URL route does not exist.</p>
      </div>
      <div>
        <button 
          onClick={() => setPage('Dashboard')} 
          className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}
