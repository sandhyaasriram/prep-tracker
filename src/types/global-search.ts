/**
 * Global search result types.
 */

export type GlobalSearchResultType =
  | 'DSA'
  | 'Applications'
  | 'Journal'
  | 'Projects'
  | 'Certifications';

export interface GlobalSearchResult {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle: string;
  /** Extra context for navigation (e.g. journal date). */
  meta?: Record<string, string>;
}

export const GLOBAL_SEARCH_GROUP_ORDER: GlobalSearchResultType[] = [
  'DSA',
  'Applications',
  'Journal',
  'Projects',
  'Certifications',
];
