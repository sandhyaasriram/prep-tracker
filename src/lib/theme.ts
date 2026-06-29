/**
 * Theme helpers for Placement OS.
 * Persists preference in localStorage and applies `data-theme` on the document root.
 */

import { getTheme, setTheme } from '@/utils/storage';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/**
 * Resolve the effective theme from stored preference and system settings.
 */
export function getResolvedTheme(): ResolvedTheme {
  const stored = getTheme();

  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Apply a theme to the document root.
 */
export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Initialize theme on app boot.
 */
export function initializeTheme(): void {
  applyTheme(getResolvedTheme());
}

/**
 * Toggle between light and dark mode.
 */
export function toggleTheme(): ResolvedTheme {
  const nextTheme: ResolvedTheme = getResolvedTheme() === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
  applyTheme(nextTheme);
  return nextTheme;
}

/**
 * Subscribe to system theme changes when preference is "system".
 */
export function subscribeToSystemTheme(onChange: (theme: ResolvedTheme) => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = (): void => {
    if (getTheme() === 'system') {
      const resolved = mediaQuery.matches ? 'dark' : 'light';
      applyTheme(resolved);
      onChange(resolved);
    }
  };

  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
}
