/**
 * Timeline milestones data hook.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TIMELINE_CATEGORY_COLORS } from '@/constants';
import { formatSupabaseError } from '@/utils/errors';
import type {
  AddTimelineMilestoneInput,
  TimelineMilestone,
  UpdateTimelineMilestoneInput,
} from '@/types/timeline';

interface UseTimelineDataResult {
  milestones: TimelineMilestone[];
  loading: boolean;
  error: string | null;
  addMilestone: (input: AddTimelineMilestoneInput) => Promise<void>;
  updateMilestone: (id: string, input: UpdateTimelineMilestoneInput) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Load and manage placement season timeline milestones.
 */
export function useTimelineData(userId: string | null): UseTimelineDataResult {
  const [milestones, setMilestones] = useState<TimelineMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!userId) {
      setMilestones([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('timeline_milestones')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setMilestones((data ?? []) as TimelineMilestone[]);
    } catch (fetchError) {
      setError(formatSupabaseError(fetchError));
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const addMilestone = useCallback(
    async (input: AddTimelineMilestoneInput): Promise<void> => {
      if (!userId) {
        throw new Error('Not signed in');
      }

      const { data, error: insertError } = await supabase
        .from('timeline_milestones')
        .insert({
          user_id: userId,
          date: input.date,
          label: input.label.trim(),
          category: input.category,
          color: input.color ?? TIMELINE_CATEGORY_COLORS[input.category],
        })
        .select('*')
        .single();

      if (insertError) {
        throw new Error(formatSupabaseError(insertError));
      }

      setMilestones((current) => [...current, data as TimelineMilestone].sort((a, b) => a.date.localeCompare(b.date)));
    },
    [userId]
  );

  const updateMilestone = useCallback(async (id: string, input: UpdateTimelineMilestoneInput): Promise<void> => {
    const payload: Record<string, string> = {};

    if (input.date !== undefined) payload.date = input.date;
    if (input.label !== undefined) payload.label = input.label.trim();
    if (input.category !== undefined) {
      payload.category = input.category;
      payload.color = input.color ?? TIMELINE_CATEGORY_COLORS[input.category];
    } else if (input.color !== undefined) {
      payload.color = input.color;
    }

    const { data, error: updateError } = await supabase
      .from('timeline_milestones')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(formatSupabaseError(updateError));
    }

    setMilestones((current) =>
      current
        .map((milestone) => (milestone.id === id ? (data as TimelineMilestone) : milestone))
        .sort((a, b) => a.date.localeCompare(b.date))
    );
  }, []);

  const deleteMilestone = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase.from('timeline_milestones').delete().eq('id', id);

    if (deleteError) {
      throw new Error(formatSupabaseError(deleteError));
    }

    setMilestones((current) => current.filter((milestone) => milestone.id !== id));
  }, []);

  return {
    milestones,
    loading,
    error,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    refresh: fetchData,
  };
}
