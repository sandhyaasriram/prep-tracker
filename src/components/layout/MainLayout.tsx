/**
 * Main layout wrapper for authenticated Placement OS pages.
 * Renders the sidebar, top navigation, and the primary content area.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { LogOut, LayoutDashboard, BookOpen, FolderKanban, Target, CalendarDays, Settings, Mic, Layers, Award, PenLine, Sparkles, Search } from 'lucide-react';
import { Sidebar, SidebarItem, TopNav } from '@/components';
import { Button } from '@/components/ui';
import { ToastHost } from '@/components/ui/ToastHost';
import { PageContent } from '@/components/layout/PageContent';
import { SkipLink } from '@/components/layout/SkipLink';
import { CoachPanel } from '@/features/coach/CoachPanel';
import { KeyboardShortcutsModal } from '@/features/help/KeyboardShortcutsModal';
import { GlobalSearchModal } from '@/features/search/GlobalSearchModal';
import { useGeminiCoach } from '@/hooks/useGeminiCoach';
import { useUserSettings } from '@/hooks/useUserSettings';
import { getSidebarCollapsed, setSidebarCollapsed } from '@/utils/storage';
import { clearOAuthReturnParams, wasOAuthReturnSuccess } from '@/lib/googleExport';
import type { User } from '@supabase/supabase-js';

export type AppNavRoute =
  | 'Dashboard'
  | 'DSA'
  | 'Applications'
  | 'Interview Prep'
  | 'Projects'
  | 'Certifications'
  | 'Journal'
  | 'Weekly Review'
  | 'Timeline'
  | 'Settings';

interface MainLayoutProps {
  user: User;
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
  { label: 'Projects', icon: Layers },
  { label: 'Certifications', icon: Award },
  { label: 'Journal', icon: PenLine },
  { label: 'Weekly Review', icon: BookOpen },
  { label: 'Timeline', icon: CalendarDays },
  { label: 'Settings', icon: Settings },
];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Authenticated application shell.
 */
export function MainLayout({
  user,
  onSignOut,
  children,
  activeRoute = 'Dashboard',
  onNavigate,
}: MainLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const { loading: settingsLoading } = useUserSettings(user.id);
  const coach = useGeminiCoach(user.id, !settingsLoading);

  useEffect(() => {
    setSidebarCollapsedState(getSidebarCollapsed());
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeRoute]);

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMobileNavOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!wasOAuthReturnSuccess()) {
      return;
    }

    const raw = sessionStorage.getItem('placementos_pending_sheets_export');
    if (raw) {
      try {
        const pending = JSON.parse(raw) as { returnHash?: string };
        if (pending.returnHash) {
          window.location.hash = pending.returnHash.replace(/^#/, '');
        }
      } catch {
        // Ignore malformed pending export payloads.
      }
    }

    clearOAuthReturnParams();
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent): void => {
      const key = event.key.toLowerCase();
      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.shiftKey && key === 'c') {
        event.preventDefault();
        setCoachOpen((open) => !open);
        return;
      }

      if (mod && key === 'k') {
        event.preventDefault();
        setSearchOpen(true);
        return;
      }

      if (event.key === '?' && !isTypingTarget(event.target)) {
        event.preventDefault();
        setShortcutsOpen(true);
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const handleToggleSidebar = (): void => {
    setSidebarCollapsedState((current) => {
      const next = !current;
      setSidebarCollapsed(next);
      return next;
    });
  };

  const navCollapsed = mobileNavOpen ? false : sidebarCollapsed;

  return (
    <div className="min-h-screen bg-[#FAF8F4] text-[#1A1614] dark:bg-[#101216] dark:text-[#E2E8F0]">
      <SkipLink />

      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[#1A1614]/45 backdrop-blur-[1px] lg:hidden"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <Sidebar
        collapsed={navCollapsed}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        onToggleCollapse={handleToggleSidebar}
      >
        {!navCollapsed && (
          <div className="mb-4 px-1">
            <p className="font-display text-2xl text-[#1A1614] dark:text-[#E2E8F0]">Placement OS</p>
            <p className="mt-1 text-xs font-light italic text-[#7A736B] dark:text-[#94A3B8]">Your placement command center</p>
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
                collapsed={navCollapsed}
                onClick={
                  onNavigate
                    ? () => {
                        onNavigate(item.label);
                        setMobileNavOpen(false);
                      }
                    : undefined
                }
              />
            );
          })}
        </div>
      </Sidebar>

      <div
        className={`min-h-screen transition-[padding] duration-200 motion-reduce:transition-none ${
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        } pl-0`}
      >
        <TopNav title={activeRoute} scrollRouteKey={activeRoute} onOpenMobileNav={() => setMobileNavOpen(true)}>
          <Button
            variant="ghost"
            size="sm"
            icon={<Search size={14} />}
            onClick={() => setSearchOpen(true)}
            title="Search (Ctrl/Cmd + K)"
            aria-label="Search"
          >
            <span className="hidden md:inline">Search</span>
          </Button>
          <Button
            variant={coachOpen ? 'primary' : 'ghost'}
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={() => setCoachOpen((open) => !open)}
            title="AI Coach (Ctrl+Shift+C)"
            aria-label="AI Coach"
          >
            <span className="hidden md:inline">Coach</span>
          </Button>
          <div className="hidden items-center gap-2 rounded-full border border-[#E8E3DC] px-3 py-1 text-sm font-normal text-[#7A736B] dark:text-[#6B7280] dark:border-[#232830] md:flex">
            <span className="h-2 w-2 rounded-full bg-[#2D7A4F]" />
            <span>{user.email}</span>
          </div>
          <Button variant="ghost" size="sm" icon={<LogOut size={14} />} onClick={onSignOut} aria-label="Sign out">
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </TopNav>
        <main id="main-content" className="px-4 py-6 md:px-6 lg:px-8" tabIndex={-1}>
          <PageContent routeKey={activeRoute}>{children}</PageContent>
        </main>
      </div>

      <CoachPanel
        isOpen={coachOpen}
        onClose={() => setCoachOpen(false)}
        brief={coach.brief}
        source={coach.source}
        loading={coach.loading}
        error={coach.error}
        regenerationsRemaining={coach.regenerationsRemaining}
        onRegenerate={coach.regenerateBrief}
      />

      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} userId={user.id} />

      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ToastHost />
    </div>
  );
}
