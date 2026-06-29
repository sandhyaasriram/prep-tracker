/**
 * Journal data hook.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
import { todayIST } from '@/utils';
import type { JournalEntry } from '@/types';
import type { JournalViewData, UpsertJournalEntryInput } from '@/types/journal';

interface UseJournalDataResult {
  data: JournalViewData | null;
  loading: boolean;
  error: string | null;
  upsertEntry: (input: UpsertJournalEntryInput) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Load and manage daily journal entries.
 */
export function useJournalData(userId: string | null): UseJournalDataResult {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!userId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setEntries((data ?? []) as JournalEntry[]);
    } catch (fetchError) {
      setError(formatSupabaseError(fetchError));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const data = useMemo((): JournalViewData | null => {
    if (!userId) {
      return null;
    }

    return {
      entries,
      datesWithEntries: entries.map((entry) => entry.date),
    };
  }, [entries, userId]);

  const upsertEntry = useCallback(
    async (input: UpsertJournalEntryInput): Promise<void> => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const existing = entries.find((entry) => entry.date === input.date);

      if (existing) {
        const { error: updateError } = await supabase
          .from('journal_entries')
          .update({ content_markdown: input.contentMarkdown })
          .eq('id', existing.id);

        if (updateError) {
          throw new Error(formatSupabaseError(updateError));
        }
      } else {
        const { error: insertError } = await supabase.from('journal_entries').insert([
          {
            user_id: userId,
            date: input.date,
            content_markdown: input.contentMarkdown,
          },
        ]);

        if (insertError) {
          throw new Error(formatSupabaseError(insertError));
        }
      }

      await fetchData();
    },
    [userId, entries, fetchData]
  );

  const deleteEntry = useCallback(
    async (id: string): Promise<void> => {
      const { error: deleteError } = await supabase.from('journal_entries').delete().eq('id', id);

      if (deleteError) {
        throw new Error(formatSupabaseError(deleteError));
      }

      await fetchData();
    },
    [fetchData]
  );

  return {
    data,
    loading,
    error,
    upsertEntry,
    deleteEntry,
    refresh: fetchData,
  };
}

/**
 * Export journal entries as a single markdown document.
 */
export function exportJournalMarkdown(entries: JournalEntry[]): void {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const body = sorted
    .map((entry) => `## ${entry.date}\n\n${entry.content_markdown.trim() || '_Empty entry_'}\n`)
    .join('\n---\n\n');

  const markdown = `# Placement OS Journal\n\nExported ${todayIST()}\n\n---\n\n${body}`;
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `placementos_journal_${todayIST()}.md`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
