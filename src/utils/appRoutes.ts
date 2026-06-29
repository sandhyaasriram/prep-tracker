/**
 * Path ↔ in-app nav route mappings for React Router.
 */

import type { AppNavRoute } from '@/components/layout/MainLayout';

export const APP_ROUTE_PATHS: Record<AppNavRoute, string> = {
  Dashboard: '/dashboard',
  DSA: '/dsa',
  Applications: '/applications',
  'Interview Prep': '/interview-prep',
  Projects: '/projects',
  Certifications: '/certifications',
  Journal: '/journal',
  'Weekly Review': '/weekly-review',
  Timeline: '/timeline',
  Settings: '/settings',
};

const PATH_TO_APP_ROUTE = Object.fromEntries(
  Object.entries(APP_ROUTE_PATHS).map(([route, path]) => [path, route])
) as Record<string, AppNavRoute>;

const HASH_TO_PATH: Record<string, string> = {
  '': '/dashboard',
  dsa: '/dsa',
  applications: '/applications',
  'interview-prep': '/interview-prep',
  projects: '/projects',
  certifications: '/certifications',
  journal: '/journal',
  'weekly-review': '/weekly-review',
  timeline: '/timeline',
  settings: '/settings',
};

/**
 * Resolve an in-app route from a URL pathname.
 */
export function pathToAppRoute(pathname: string): AppNavRoute | null {
  if (pathname === '/') {
    return 'Dashboard';
  }

  return PATH_TO_APP_ROUTE[pathname] ?? null;
}

/**
 * Map a legacy hash segment to a pathname.
 */
export function hashToPath(hash: string): string {
  const normalized = hash.replace(/^#/, '');
  return HASH_TO_PATH[normalized] ?? '/dashboard';
}

/**
 * Current app path (pathname, or hash fallback on root).
 */
export function getCurrentAppPath(): string {
  const { pathname, hash } = window.location;

  if (pathname && pathname !== '/') {
    return pathname;
  }

  return hashToPath(hash);
}
