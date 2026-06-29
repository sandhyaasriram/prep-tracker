/**
 * TopNav component — top navigation bar with title, actions, and theme toggle.
 * Features a gradient scroll progress bar as signature element.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Menu, Moon, Sun } from 'lucide-react';
import { useScrollProgressFill } from '@/hooks/useScrollProgressFill';
import { getResolvedTheme, subscribeToSystemTheme, toggleTheme, type ResolvedTheme } from '@/lib/theme';

export interface TopNavProps {
  title?: string;
  scrollRouteKey?: string;
  onOpenMobileNav?: () => void;
  children?: ReactNode;
}

/**
 * Sticky top navigation with page scroll progress bar and theme toggle.
 */
export const TopNav = React.forwardRef<HTMLDivElement, TopNavProps>(
  ({ title = 'Placement OS', scrollRouteKey = '', onOpenMobileNav, children }, ref) => {
    const fillRef = useRef<HTMLDivElement>(null);
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
      typeof document !== 'undefined' ? getResolvedTheme() : 'light'
    );

    useScrollProgressFill(fillRef, scrollRouteKey);

    useEffect(() => {
      setResolvedTheme(getResolvedTheme());
      return subscribeToSystemTheme(setResolvedTheme);
    }, []);

    const handleToggleTheme = (): void => {
      setResolvedTheme(toggleTheme());
    };

    const isDark = resolvedTheme === 'dark';

    return (
      <div
        ref={ref}
        className="sticky top-0 z-30 bg-white dark:bg-[#161A20]"
      >
        <div className="flex h-[var(--app-topbar-row-height)] items-center justify-between px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {onOpenMobileNav && (
              <button
                type="button"
                onClick={onOpenMobileNav}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#7A736B] transition-colors duration-150 hover:bg-[#F3F0EB] dark:text-[#94A3B8] dark:hover:bg-[#1A1F26] lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu size={18} />
              </button>
            )}
            <h1 className="truncate font-display text-xl font-bold text-[#1A1614] dark:text-[#E2E8F0]">{title}</h1>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {children}

            <button
              type="button"
              onClick={handleToggleTheme}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#7A736B] dark:text-[#6B7280] transition-colors duration-150 hover:bg-[#F3F0EB] hover:text-[#1A1614] dark:hover:bg-[#1C2028] dark:hover:text-[#E8EDF2]"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        <div
          className="h-[var(--app-progress-height)] w-full bg-[#E8E3DC] dark:bg-[#232830]/40"
          role="progressbar"
          aria-valuenow={0}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Page scroll progress"
        >
          <div
            ref={fillRef}
            className="h-full motion-reduce:transition-none"
            style={{
              width: '0%',
              transition: 'width 0.1s ease-out',
              background: 'linear-gradient(to right, #E8622A, #C4841A, #5B5FEF)',
            }}
          />
        </div>
      </div>
    );
  }
);

TopNav.displayName = 'TopNav';
