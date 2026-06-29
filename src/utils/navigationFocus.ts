/**
 * Session storage helpers for cross-page navigation focus.
 */

const JOURNAL_DATE_KEY = 'placementos_journal_date';
const DSA_SEARCH_KEY = 'placementos_dsa_search';

/**
 * Store a journal date to open after navigating to the journal page.
 */
export function setJournalNavigationDate(date: string): void {
  sessionStorage.setItem(JOURNAL_DATE_KEY, date);
}

/**
 * Read and clear a pending journal date navigation.
 */
export function consumeJournalNavigationDate(): string | null {
  const value = sessionStorage.getItem(JOURNAL_DATE_KEY);
  if (value) {
    sessionStorage.removeItem(JOURNAL_DATE_KEY);
  }
  return value;
}

/**
 * Store a DSA search query to apply on the DSA page.
 */
export function setDsaNavigationSearch(query: string): void {
  sessionStorage.setItem(DSA_SEARCH_KEY, query);
}

/**
 * Read and clear a pending DSA search navigation.
 */
export function consumeDsaNavigationSearch(): string | null {
  const value = sessionStorage.getItem(DSA_SEARCH_KEY);
  if (value) {
    sessionStorage.removeItem(DSA_SEARCH_KEY);
  }
  return value;
}

/**
 * Navigate to a hash route.
 */
export function navigateToHash(hash: string): void {
  window.location.hash = hash.replace(/^#/, '');
}
