/**
 * Journal data hook.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
import { todayIST } from '@/utils';
import { markHydrated, resetHydrated, shouldShowInitialLoading } from '@/utils/hydratedFetch';
import { runOptimisticMutation } from '@/utils/optimisticMutation';
import type { JournalEntry } from '@/types';
import type { JournalViewData, UpsertJournalEntryInput } from '@/types/journal';

interface UseJournalDataResult {
  data: JournalViewData | null;
  loading: boolean;
  error: string | null;
  upsertEntry: (input: UpsertJournalEntryInput) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
}

/**
 * Load and manage daily journal entries.
 */
export function useJournalData(userId: string | null): UseJournalDataResult {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  const fetchData = useCallback(async (options?: { silent?: boolean }): Promise<void> => {
    if (!userId) {
      setEntries([]);
      setLoading(false);
      resetHydrated(hydratedRef);
      return;
    }

    if (shouldShowInitialLoading(hydratedRef, options?.silent)) {
      setLoading(true);
    }
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

      const next = (data ?? []) as JournalEntry[];
      setEntries(next);
    } catch (fetchError) {
      setError(formatSupabaseError(fetchError));
      if (!hydratedRef.current) {
        setEntries([]);
      }
    } finally {
      markHydrated(hydratedRef);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    resetHydrated(hydratedRef);
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
      if (!userId) throw new Error('Not authenticated');

      const existing = entries.find((entry) => entry.date === input.date);
      const previous = entries;

      if (existing) {
        const optimistic = entries.map((entry) =>
          entry.id === existing.id ? { ...entry, content_markdown: input.contentMarkdown } : entry
        );

        await runOptimisticMutation({
          apply: () => {
            setEntries(optimistic);
          },
          revert: () => {
            setEntries(previous);
          },
          persist: async () => {
            const { error: updateError } = await supabase
              .from('journal_entries')
              .update({ content_markdown: input.contentMarkdown })
              .eq('id', existing.id);
            if (updateError) throw updateError;
          },
          errorMessage: 'Could not save journal entry.',
        });
        return;
      }

      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const optimisticEntry: JournalEntry = {
        id: tempId,
        user_id: userId,
        date: input.date,
        content_markdown: input.contentMarkdown,
        created_at: now,
        updated_at: now,
      };
      const optimistic = [optimisticEntry, ...entries];

      await runOptimisticMutation({
        apply: () => {
          setEntries(optimistic);
        },
        revert: () => {
          setEntries(previous);
        },
        persist: async () => {
          const { data: inserted, error: insertError } = await supabase
            .from('journal_entries')
            .insert([
              {
                user_id: userId,
                date: input.date,
                content_markdown: input.contentMarkdown,
              },
            ])
            .select('*')
            .single();
          if (insertError) throw insertError;
          setEntries((current) => {
            const next = current.map((entry) => (entry.id === tempId ? (inserted as JournalEntry) : entry));
            return next;
          });
        },
        errorMessage: 'Could not save journal entry.',
      });
    },
    [userId, entries]
  );

  const deleteEntry = useCallback(
    async (id: string): Promise<void> => {
      const previous = entries;
      const optimistic = entries.filter((entry) => entry.id !== id);

      await runOptimisticMutation({
        apply: () => {
          setEntries(optimistic);
        },
        revert: () => {
          setEntries(previous);
        },
        persist: async () => {
          const { error: deleteError } = await supabase.from('journal_entries').delete().eq('id', id);
          if (deleteError) throw deleteError;
        },
        errorMessage: 'Could not delete journal entry.',
      });
    },
    [entries]
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
