import React from 'react';
import { PanelLeftClose, PanelLeftOpen, LogOut, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Page } from '../../navigation';
import { navigation, legacyPageToPath, pathToLegacyPage } from '../../navigation';

export function Sidebar({ 
  collapsed, 
  setCollapsed, 
  page, 
  setPage 
}: { 
  collapsed: boolean; 
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>; 
  page?: Page; 
  setPage?: (p: Page) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentPage = page || pathToLegacyPage[location.pathname] || 'Dashboard';

  const handleNav = (targetPage: Page) => {
    if (setPage) {
      setPage(targetPage);
    } else {
      navigate(legacyPageToPath[targetPage] || '/dashboard');
    }
  };

  return (
    <aside className="app-sidebar">
      <div className="product-header">
        <div className="product-mark" aria-hidden="true"><span /><span /><span /></div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold tracking-[-0.01em] text-nav-text">Spraybot</div>
            <div className="truncate text-[11px] text-nav-muted">R&amp;D Spray Analysis</div>
          </div>
        )}
        <button 
          className="sidebar-toggle" 
          onClick={() => setCollapsed(value => !value)} 
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} 
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
      <nav className="sidebar-nav" aria-label="Primary navigation">
        {navigation.map(group => (
          <div className="nav-group" key={group.label}>
            {!collapsed && <div className="nav-group-label">{group.label}</div>}
            {group.items.map(({ page: item, icon: Icon }) => (
              <button 
                key={item} 
                title={collapsed ? item : undefined} 
                aria-label={collapsed ? item : undefined} 
                aria-current={currentPage === item ? 'page' : undefined} 
                onClick={() => handleNav(item)} 
                className={`nav-item ${currentPage === item ? 'nav-item-selected' : ''}`}
              >
                <Icon size={17} strokeWidth={1.75} />
                <span>{item}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="session-area">
        {!collapsed && (
          <div className="session-identity">
            <div className="session-avatar" aria-hidden="true">NP</div>
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-nav-text">Nadia Putri</div>
              <div className="text-[11px] text-nav-muted">Operator</div>
            </div>
          </div>
        )}
        <button 
          className={`nav-item ${currentPage === 'Settings' ? 'nav-item-selected' : ''}`}
          title={collapsed ? 'Settings' : undefined} 
          aria-label={collapsed ? 'Settings' : undefined} 
          onClick={() => handleNav('Settings')}
        >
          <Settings size={17} strokeWidth={1.75} />
          <span>Settings</span>
        </button>
        <button 
          className="nav-item" 
          title={collapsed ? 'Logout' : undefined} 
          aria-label={collapsed ? 'Logout' : undefined} 
          onClick={() => handleNav('Login')}
        >
          <LogOut size={17} strokeWidth={1.75} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
