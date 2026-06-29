/**
 * Main layout wrapper for authenticated Placement OS pages.
 * Renders the sidebar, top navigation, and the primary content area.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { LogOut, LayoutDashboard, BookOpen, FolderKanban, Target, CalendarDays, Settings, Mic } from 'lucide-react';
import { Sidebar, SidebarItem, TopNav } from '@/components';
import { Button } from '@/components/ui';
import { getSidebarCollapsed, setSidebarCollapsed } from '@/utils/storage';
import type { User } from '@supabase/supabase-js';

export type AppNavRoute = 'Dashboard' | 'DSA' | 'Applications' | 'Interview Prep' | 'Weekly Review' | 'Timeline' | 'Settings';

interface MainLayoutProps {
  user: User;
  progressPercentage: number;
  progressLabel?: string;
  onSignOut: () => void;
  children: ReactNode;
  activeRoute?: AppNavRoute;
  onNavigate?: (route: AppNavRoute) => void;
}

const navigationItems: Array<{ label: AppNavRoute; icon: typeof LayoutDashboard }> = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'DSA', icon: Target },
  { label: 'Applications', icon: FolderKanban },
  { label: 'Interview Prep', icon: Mic },
  { label: 'Weekly Review', icon: BookOpen },
  { label: 'Timeline', icon: CalendarDays },
  { label: 'Settings', icon: Settings },
];

/**
 * Authenticated application shell.
 */
export function MainLayout({
  user,
  progressPercentage,
  progressLabel,
  onSignOut,
  children,
  activeRoute = 'Dashboard',
  onNavigate,
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);

  useEffect(() => {
    setSidebarCollapsedState(getSidebarCollapsed());
  }, []);

  const handleToggleSidebar = (): void => {
    setSidebarCollapsedState((current) => {
      const next = !current;
      setSidebarCollapsed(next);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#1A1614] dark:bg-[#0D0F12] dark:text-[#E8EDF2]">
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={handleToggleSidebar}>
        {!sidebarCollapsed && (
          <div className="mb-4 px-1">
            <p className="font-display text-2xl text-[#1A1614] dark:text-[#E8EDF2]">Placement OS</p>
            <p className="mt-1 text-xs font-light italic text-[#7A736B] dark:text-[#6B7280]">Your placement command center</p>
          </div>
        )}

        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <SidebarItem
                key={item.label}
                label={item.label}
                icon={<Icon size={16} />}
                active={activeRoute === item.label}
                collapsed={sidebarCollapsed}
                onClick={onNavigate ? () => onNavigate(item.label) : undefined}
              />
            );
          })}
        </div>
      </Sidebar>

      <div
        className={`min-h-screen transition-all duration-200 motion-reduce:transition-none ${
          sidebarCollapsed ? 'pl-16' : 'pl-64'
        }`}
      >
        <TopNav
          title={activeRoute}
          progressPercentage={progressPercentage}
          {...(progressLabel !== undefined ? { progressLabel } : {})}
        >
          <div className="hidden items-center gap-2 rounded-full border border-[#E8E3DC] px-3 py-1 text-sm font-normal text-[#7A736B] dark:text-[#6B7280] dark:border-[#232830] md:flex">
            <span className="h-2 w-2 rounded-full bg-[#2D7A4F]" />
            <span>{user.email}</span>
          </div>
          <Button variant="ghost" size="sm" icon={<LogOut size={14} />} onClick={onSignOut}>
            Sign out
          </Button>
        </TopNav>
        <main className="px-4 py-6 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
