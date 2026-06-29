/**
 * Navigate to the page for a global search result.
 */

import type { GlobalSearchResult } from '@/types/global-search';
import {
  navigateToHash,
  setDsaNavigationSearch,
  setJournalNavigationDate,
} from '@/utils/navigationFocus';

/**
 * Open the relevant section for a search hit.
 */
export function navigateToSearchResult(result: GlobalSearchResult): void {
  switch (result.type) {
    case 'DSA':
      if (result.meta?.search) {
        setDsaNavigationSearch(result.meta.search);
      } else {
        setDsaNavigationSearch(result.title);
      }
      navigateToHash('dsa');
      break;
    case 'Applications':
      navigateToHash('applications');
      break;
    case 'Journal':
      if (result.meta?.date) {
        setJournalNavigationDate(result.meta.date);
      }
      navigateToHash('journal');
      break;
    case 'Projects':
      navigateToHash('projects');
      break;
    case 'Certifications':
      navigateToHash('certifications');
      break;
    default:
      break;
  }
}
