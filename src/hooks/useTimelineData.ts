/**
 * Timeline milestones data hook.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TIMELINE_CATEGORY_COLORS } from '@/constants';
import { formatSupabaseError } from '@/utils/errors';
import { markHydrated, resetHydrated, shouldShowInitialLoading } from '@/utils/hydratedFetch';
import { runOptimisticMutation } from '@/utils/optimisticMutation';
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
  refresh: (options?: { silent?: boolean }) => Promise<void>;
}

function sortMilestones(milestones: TimelineMilestone[]): TimelineMilestone[] {
  return [...milestones].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Load and manage placement season timeline milestones.
 */
export function useTimelineData(userId: string | null): UseTimelineDataResult {
  const [milestones, setMilestones] = useState<TimelineMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  const fetchData = useCallback(async (options?: { silent?: boolean }): Promise<void> => {
    if (!userId) {
      setMilestones([]);
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
      if (!hydratedRef.current) {
        setMilestones([]);
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

  const addMilestone = useCallback(
    async (input: AddTimelineMilestoneInput): Promise<void> => {
      if (!userId) throw new Error('Not signed in');

      const tempId = crypto.randomUUID();
      const optimistic: TimelineMilestone = {
        id: tempId,
        user_id: userId,
        date: input.date,
        label: input.label.trim(),
        category: input.category,
        color: input.color ?? TIMELINE_CATEGORY_COLORS[input.category],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const previous = milestones;

      await runOptimisticMutation({
        apply: () => setMilestones(sortMilestones([...milestones, optimistic])),
        revert: () => setMilestones(previous),
        persist: async () => {
          const { data, error: insertError } = await supabase
            .from('timeline_milestones')
            .insert({
              user_id: userId,
              date: optimistic.date,
              label: optimistic.label,
              category: optimistic.category,
              color: optimistic.color,
            })
            .select('*')
            .single();
          if (insertError) throw insertError;
          setMilestones((current) =>
            sortMilestones(current.map((milestone) => (milestone.id === tempId ? (data as TimelineMilestone) : milestone)))
          );
        },
        errorMessage: 'Could not add milestone.',
      });
    },
    [milestones, userId]
  );

  const updateMilestone = useCallback(
    async (id: string, input: UpdateTimelineMilestoneInput): Promise<void> => {
      const previous = milestones;
      const optimistic = sortMilestones(
        milestones.map((milestone) => {
          if (milestone.id !== id) return milestone;

          const nextCategory = input.category !== undefined ? input.category : milestone.category;
          return {
            ...milestone,
            date: input.date !== undefined ? input.date : milestone.date,
            label: input.label !== undefined ? input.label.trim() : milestone.label,
            category: nextCategory,
            color:
              input.color ??
              (input.category !== undefined ? TIMELINE_CATEGORY_COLORS[nextCategory] : milestone.color),
          };
        })
      );

      await runOptimisticMutation({
        apply: () => setMilestones(optimistic),
        revert: () => setMilestones(previous),
        persist: async () => {
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
          if (updateError) throw updateError;
          setMilestones((current) =>
            sortMilestones(current.map((milestone) => (milestone.id === id ? (data as TimelineMilestone) : milestone)))
          );
        },
        errorMessage: 'Could not update milestone.',
      });
    },
    [milestones]
  );

  const deleteMilestone = useCallback(
    async (id: string): Promise<void> => {
      const previous = milestones;
      const optimistic = milestones.filter((milestone) => milestone.id !== id);

      await runOptimisticMutation({
        apply: () => setMilestones(optimistic),
        revert: () => setMilestones(previous),
        persist: async () => {
          const { error: deleteError } = await supabase.from('timeline_milestones').delete().eq('id', id);
          if (deleteError) throw deleteError;
        },
        errorMessage: 'Could not delete milestone.',
      });
    },
    [milestones]
  );

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
