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
  className?: string;
}

/**
 * Fixed sidebar navigation shell with collapse control.
 */
export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, collapsed, onToggleCollapse, className = '' }, ref) => {
    return (
      <aside
        ref={ref}
        className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[#E8E3DC] bg-white transition-all duration-200 motion-reduce:transition-none dark:border-[#232830] dark:bg-[#13161A] ${
          collapsed ? 'w-16' : 'w-64'
        } ${className}`}
      >
        <div className="flex h-[var(--app-chrome-height)] shrink-0 flex-col border-b border-[#E8E3DC] dark:border-[#232830]">
          <div className="flex h-[var(--app-topbar-row-height)] items-center justify-between px-3">
            {!collapsed && (
              <div className="min-w-0 px-1">
                <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-[#7A736B] dark:text-[#6B7280]">Navigation</p>
              </div>
            )}
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#7A736B] dark:text-[#6B7280] transition-colors duration-150 hover:bg-[#F3F0EB] hover:text-[#1A1614] dark:hover:bg-[#1C2028] dark:hover:text-[#E8EDF2] ${collapsed ? 'mx-auto' : 'ml-auto'}`}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
          <div className="h-[var(--app-progress-height)] shrink-0" aria-hidden="true" />
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-3">{children}</nav>
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
          : 'text-[#1A1614] hover:bg-[#F3F0EB] dark:text-[#E8EDF2] dark:hover:bg-[#1C2028]'
      } ${collapsed ? 'justify-center px-2' : ''}`}
      title={collapsed ? label : undefined}
      aria-label={label}
    >
      {icon && <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center">{icon}</span>}
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  )
);

SidebarItem.displayName = 'SidebarItem';
