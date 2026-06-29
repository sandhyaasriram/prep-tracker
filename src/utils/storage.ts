/**
 * localStorage helpers for theme, layout, and cache management.
 */

const STORAGE_KEYS = {
  THEME: 'theme_preference',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  LAST_OPENED_PAGE: 'last_opened_page',
  GEMINI_BRIEF_CACHE: 'gemini_brief_cache',
  USER_DATA_CACHE: 'user_data_cache',
} as const;

export function getTheme(): 'light' | 'dark' | 'system' {
  const stored = localStorage.getItem(STORAGE_KEYS.THEME);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

export function setTheme(theme: 'light' | 'dark' | 'system'): void {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

export function getSidebarCollapsed(): boolean {
  const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
  return stored ? JSON.parse(stored) : false;
}

export function setSidebarCollapsed(collapsed: boolean): void {
  localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, JSON.stringify(collapsed));
}

export function getLastOpenedPage(): string {
  return localStorage.getItem(STORAGE_KEYS.LAST_OPENED_PAGE) || '';
}

export function setLastOpenedPage(page: string): void {
  localStorage.setItem(STORAGE_KEYS.LAST_OPENED_PAGE, page);
}

export function getCachedBrief(): { brief: string; generatedDate: string; source?: 'gemini' | 'fallback' } | null {
  const stored = localStorage.getItem(STORAGE_KEYS.GEMINI_BRIEF_CACHE);
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setCachedBrief(brief: string, source: 'gemini' | 'fallback' = 'fallback'): void {
  localStorage.setItem(
    STORAGE_KEYS.GEMINI_BRIEF_CACHE,
    JSON.stringify({
      brief,
      source,
      generatedDate: new Date().toISOString(),
    })
  );
}

export function clearCachedBrief(): void {
  localStorage.removeItem(STORAGE_KEYS.GEMINI_BRIEF_CACHE);
}

export function clearAllCache(): void {
  localStorage.removeItem(STORAGE_KEYS.GEMINI_BRIEF_CACHE);
  localStorage.removeItem(STORAGE_KEYS.USER_DATA_CACHE);
}
