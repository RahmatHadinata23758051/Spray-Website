import React from 'react';
import { LogOut, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Page } from '../../navigation';
import { navigation, legacyPageToPath, pathToLegacyPage, pageLabels } from '../../navigation';
import { WorkstationClock } from './WorkstationClock';

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
      {/* Time Panel */}
      <WorkstationClock collapsed={collapsed} />

      {/* Spraybot Branding Header */}
      {collapsed ? (
        <div className="flex items-center justify-center border-b border-border-subtle py-4">
          <img src="/branding/paragon-mark.png" alt="Paragon Logo" className="w-[32px] h-[32px] object-contain" />
        </div>
      ) : (
        <div className="flex items-center justify-center border-b border-border-subtle p-4 bg-white">
          <img src="/branding/paragon-logo.jpg" alt="Paragon Logo" className="h-11 w-auto max-w-[195px] object-contain mix-blend-multiply" />
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4" aria-label="Navigasi Utama">
        {navigation.map(group => (
          <div className="space-y-1" key={group.label}>
            {!collapsed && (
              <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-text-muted">
                {group.label}
              </div>
            )}
            {group.items.map(({ page: item, icon: Icon }) => {
              const isSelected = currentPage === item;
              return (
                <button 
                  key={item} 
                  title={pageLabels[item]} 
                  aria-label={pageLabels[item]} 
                  aria-current={isSelected ? 'page' : undefined} 
                  onClick={() => handleNav(item)} 
                  className={`nav-item flex w-full items-center ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} rounded-input py-2 text-sm font-semibold transition-colors ${
                    isSelected 
                      ? 'nav-item-selected bg-primary text-white font-bold shadow-sm' 
                      : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                  }`}
                >
                  <Icon size={18} strokeWidth={isSelected ? 2 : 1.75} className="shrink-0" />
                  {!collapsed && <span className="truncate">{pageLabels[item]}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Section & Settings/Logout */}
      <div className="border-t border-border-subtle p-3 space-y-1">
        {collapsed ? (
          <div className="flex items-center justify-center py-2 mb-1" title="Nadia Putri (Operator)">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary font-bold text-xs">
              NP
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-input bg-surface-subtle">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary font-bold text-xs">
              NP
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-bold text-text-primary">Nadia Putri</div>
              <div className="text-[11px] font-semibold text-text-muted">Operator</div>
            </div>
          </div>
        )}
        <button 
          className={`nav-item flex w-full items-center ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} rounded-input py-2 text-sm font-semibold transition-colors ${
            currentPage === 'Settings' 
              ? 'nav-item-selected bg-primary text-white font-bold shadow-sm' 
              : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
          }`}
          title={pageLabels.Settings} 
          aria-label={pageLabels.Settings} 
          onClick={() => handleNav('Settings')}
        >
          <Settings size={18} strokeWidth={1.75} className="shrink-0" />
          {!collapsed && <span>{pageLabels.Settings}</span>}
        </button>
        <button 
          className={`flex w-full items-center ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} rounded-input py-2 text-sm font-semibold text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors`}
          onClick={() => setCollapsed(v => !v)}
          aria-label={collapsed ? "Perluas sidebar" : "Tutup sidebar"}
          title={collapsed ? "Perluas sidebar" : "Tutup sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} strokeWidth={1.75} className="shrink-0" />
          ) : (
            <PanelLeftClose size={18} strokeWidth={1.75} className="shrink-0" />
          )}
          {!collapsed && <span>Sembunyikan</span>}
        </button>
        <button 
          className={`flex w-full items-center ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} rounded-input py-2 text-sm font-semibold text-text-secondary hover:bg-semantic-danger-soft hover:text-semantic-danger transition-colors`} 
          title="Keluar" 
          aria-label="Keluar" 
          onClick={() => handleNav('Login')}
        >
          <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </aside>
  );
}
