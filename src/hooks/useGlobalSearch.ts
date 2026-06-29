/**
 * Global search hook — indexes searchable records and filters by query.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
import { GLOBAL_SEARCH_GROUP_ORDER, type GlobalSearchResult } from '@/types/global-search';

interface UseGlobalSearchResult {
  index: GlobalSearchResult[];
  loading: boolean;
  error: string | null;
  query: string;
  setQuery: (query: string) => void;
  groupedResults: Array<{ type: GlobalSearchResult['type']; items: GlobalSearchResult[] }>;
  refresh: () => Promise<void>;
}

function matchesQuery(values: Array<string | null | undefined>, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(normalized));
}

/**
 * Build and filter a cross-app search index for the signed-in user.
 */
export function useGlobalSearch(userId: string | null, enabled: boolean): UseGlobalSearchResult {
  const [index, setIndex] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const fetchIndex = useCallback(async (): Promise<void> => {
    if (!userId) {
      setIndex([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [topicsRes, problemsRes, appsRes, journalRes, projectsRes, certsRes] = await Promise.all([
        supabase.from('dsa_topics').select('id, name').eq('user_id', userId),
        supabase.from('dsa_problems').select('id, name, notes, topic_id').eq('user_id', userId),
        supabase.from('applications').select('id, company, role, notes, stage').eq('user_id', userId),
        supabase.from('journal_entries').select('id, date, content_markdown').eq('user_id', userId),
        supabase.from('projects').select('id, name, notes').eq('user_id', userId),
        supabase.from('certifications').select('id, name, notes, provider').eq('user_id', userId),
      ]);

      const firstError =
        topicsRes.error ??
        problemsRes.error ??
        appsRes.error ??
        journalRes.error ??
        projectsRes.error ??
        certsRes.error;

      if (firstError) {
        throw firstError;
      }

      const topicNameById = new Map(
        ((topicsRes.data ?? []) as Array<{ id: string; name: string }>).map((topic) => [topic.id, topic.name])
      );

      const results: GlobalSearchResult[] = [];

      for (const problem of (problemsRes.data ?? []) as Array<{
        id: string;
        name: string;
        notes: string;
        topic_id: string;
      }>) {
        results.push({
          id: problem.id,
          type: 'DSA',
          title: problem.name,
          subtitle: topicNameById.get(problem.topic_id) ?? 'DSA',
          meta: { search: problem.name },
        });
        if (problem.notes.trim()) {
          results.push({
            id: `${problem.id}-notes`,
            type: 'DSA',
            title: problem.notes.trim().slice(0, 80),
            subtitle: `${problem.name} · notes`,
            meta: { search: problem.name },
          });
        }
      }

      for (const app of (appsRes.data ?? []) as Array<{
        id: string;
        company: string;
        role: string;
        notes: string;
        stage: string;
      }>) {
        results.push({
          id: app.id,
          type: 'Applications',
          title: app.company,
          subtitle: `${app.role} · ${app.stage}`,
        });
        if (app.notes.trim()) {
          results.push({
            id: `${app.id}-notes`,
            type: 'Applications',
            title: app.notes.trim().slice(0, 80),
            subtitle: `${app.company} · notes`,
          });
        }
      }

      for (const entry of (journalRes.data ?? []) as Array<{ id: string; date: string; content_markdown: string }>) {
        const preview = entry.content_markdown.trim().replace(/\s+/g, ' ').slice(0, 80);
        results.push({
          id: entry.id,
          type: 'Journal',
          title: entry.date,
          subtitle: preview || 'Empty entry',
          meta: { date: entry.date },
        });
      }

      for (const project of (projectsRes.data ?? []) as Array<{ id: string; name: string; notes: string }>) {
        results.push({
          id: project.id,
          type: 'Projects',
          title: project.name,
          subtitle: project.notes.trim() ? project.notes.trim().slice(0, 80) : 'Project',
        });
      }

      for (const cert of (certsRes.data ?? []) as Array<{ id: string; name: string; notes: string; provider: string }>) {
        results.push({
          id: cert.id,
          type: 'Certifications',
          title: cert.name,
          subtitle: cert.provider,
        });
        if (cert.notes.trim()) {
          results.push({
            id: `${cert.id}-notes`,
            type: 'Certifications',
            title: cert.notes.trim().slice(0, 80),
            subtitle: `${cert.name} · notes`,
          });
        }
      }

      setIndex(results);
    } catch (fetchError) {
      setError(formatSupabaseError(fetchError));
      setIndex([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (enabled) {
      void fetchIndex();
    }
  }, [enabled, fetchIndex]);

  useEffect(() => {
    if (!enabled) {
      setQuery('');
    }
  }, [enabled]);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return index.slice(0, 24);
    }

    return index.filter((item) => {
      if (item.type === 'DSA' && item.meta?.search) {
        return matchesQuery([item.title, item.subtitle, item.meta.search], query);
      }
      return matchesQuery([item.title, item.subtitle], query);
    });
  }, [index, query]);

  const groupedResults = useMemo(() => {
    return GLOBAL_SEARCH_GROUP_ORDER.map((type) => ({
      type,
      items: filtered.filter((item) => item.type === type),
    })).filter((group) => group.items.length > 0);
  }, [filtered]);

  return {
    index,
    loading,
    error,
    query,
    setQuery,
    groupedResults,
    refresh: fetchIndex,
  };
}
