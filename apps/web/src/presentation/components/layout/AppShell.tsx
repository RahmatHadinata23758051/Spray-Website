import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { Page } from '../../navigation';
import { pathToLegacyPage, legacyPageToPath } from '../../navigation';

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const page = pathToLegacyPage[location.pathname] || 'Dashboard';
  const isAnalysisPage = location.pathname.includes('/analysis');

  const setPage = (nextPage: Page) => {
    navigate(legacyPageToPath[nextPage] || '/dashboard');
  };

  return (
    <div className={`app-shell ${collapsed ? 'app-shell-collapsed' : ''}`}>
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        page={page} 
        setPage={setPage} 
      />
      <main className={`app-main ${isAnalysisPage ? 'analysis-page' : ''}`}>
        <Header page={page} />
        <div className="workspace">
          <Outlet context={{ setPage }} />
        </div>
      </main>
    </div>
  );
}
