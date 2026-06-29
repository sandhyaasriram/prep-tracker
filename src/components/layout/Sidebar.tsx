/**
 * Sidebar component — persistent navigation panel.
 * Supports collapsed state persisted to localStorage.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { PanelLeft, PanelLeftClose } from 'lucide-react';

export interface SidebarProps {
  children: ReactNode;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  className?: string;
}

/**
 * Fixed sidebar navigation shell with collapse control.
 */
export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, collapsed, onToggleCollapse, mobileOpen = false, onMobileClose, className = '' }, ref) => {
    const isDrawer = mobileOpen;
    const showExpanded = isDrawer || !collapsed;

    return (
      <aside
        ref={ref}
        id="app-sidebar"
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[#E8E3DC] bg-white transition-transform duration-200 motion-reduce:transition-none dark:border-[#FFFFFF]/[0.06] dark:bg-[#161A20] lg:transition-[width] ${
          showExpanded ? 'w-64' : 'w-16'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${className}`}
      >
        <div className="flex h-[var(--app-chrome-height)] shrink-0 flex-col border-b border-[#E8E3DC] dark:border-[#FFFFFF]/[0.06]">
          <div className="flex h-[var(--app-topbar-row-height)] items-center justify-between px-3">
            {showExpanded && (
              <div className="min-w-0 px-1">
                <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#7A736B] dark:text-[#94A3B8]">Navigation</p>
              </div>
            )}
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#7A736B] dark:text-[#94A3B8] transition-colors duration-150 hover:bg-[#F3F0EB] hover:text-[#1A1614] dark:hover:bg-[#1A1F26] dark:hover:text-[#E2E8F0] ${collapsed ? 'mx-auto' : 'ml-auto'}`}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>
            {onMobileClose && (
              <button
                type="button"
                onClick={onMobileClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#7A736B] dark:text-[#94A3B8] transition-colors duration-150 hover:bg-[#F3F0EB] dark:hover:bg-[#1A1F26] lg:hidden"
                aria-label="Close navigation menu"
              >
                <PanelLeftClose size={18} />
              </button>
            )}
          </div>
          <div className="h-[var(--app-progress-height)] shrink-0 lg:block hidden" aria-hidden="true" />
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-3 scrollbar-soft" aria-label="Main navigation">
          {children}
        </nav>
      </aside>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export interface SidebarItemProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: (() => void) | undefined;
  collapsed?: boolean;
}

/**
 * Single sidebar navigation item.
 */
export const SidebarItem = React.forwardRef<HTMLButtonElement, SidebarItemProps>(
  ({ label, icon, active = false, onClick, collapsed = false }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
        active
          ? 'bg-[#5B5FEF] text-white'
          : 'text-[#1A1614] hover:bg-[#F3F0EB] dark:text-[#E2E8F0] dark:hover:bg-[#1A1F26]'
      } ${collapsed ? 'justify-center px-2' : ''}`}
      title={collapsed ? label : undefined}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      {icon && <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">{icon}</span>}
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  )
);

SidebarItem.displayName = 'SidebarItem';
