/**
 * TopNav component — top navigation bar with title, actions, and theme toggle.
 * Features a gradient progress bar as signature element.
 */

import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getResolvedTheme, subscribeToSystemTheme, toggleTheme, type ResolvedTheme } from '@/lib/theme';

export interface TopNavProps {
  title?: string;
  progressPercentage?: number;
  children?: ReactNode;
}

/**
 * Sticky top navigation with weekly progress bar and theme toggle.
 */
export const TopNav = React.forwardRef<HTMLDivElement, TopNavProps>(
  ({ title = 'Placement OS', progressPercentage = 0, children }, ref) => {
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
      typeof document !== 'undefined' ? getResolvedTheme() : 'light'
    );

    useEffect(() => {
      setResolvedTheme(getResolvedTheme());
      return subscribeToSystemTheme(setResolvedTheme);
    }, []);

    const handleToggleTheme = (): void => {
      setResolvedTheme(toggleTheme());
    };

    const clampedProgress = Math.min(Math.max(progressPercentage, 0), 100);
    const isDark = resolvedTheme === 'dark';

    return (
      <div
        ref={ref}
        className="sticky top-0 z-30 border-b border-[#E8E3DC] bg-white dark:border-[#232830] dark:bg-[#13161A]"
      >
        <div className="flex items-center justify-between px-4 py-4 md:px-6">
          <h1 className="font-display text-xl font-bold text-[#1A1614] dark:text-[#E8EDF2]">{title}</h1>

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

        {clampedProgress > 0 && (
          <div className="h-1 w-full bg-[#E8E3DC] dark:bg-[#232830]">
            <div
              className="h-full transition-all duration-500 motion-reduce:transition-none"
              style={{
                width: `${clampedProgress}%`,
                background: 'linear-gradient(to right, #E8622A, #C4841A, #5B5FEF)',
              }}
            />
          </div>
        )}
      </div>
    );
  }
);

TopNav.displayName = 'TopNav';
