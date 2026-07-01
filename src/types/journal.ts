/**
 * View-layer types for the Journal page.
 */

import type { JournalEntry } from '@/types';

export interface JournalViewData {
  entries: JournalEntry[];
  datesWithEntries: string[];
}

export interface UpsertJournalEntryInput {
  id?: string;
  date: string;
  title: string | null;
  contentMarkdown: string;
}
