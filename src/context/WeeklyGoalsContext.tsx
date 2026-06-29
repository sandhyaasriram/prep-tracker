/**
 * App-level weekly goals state — single source of truth for checkboxes.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useWeeklyGoalsRealtime } from '@/hooks/useWeeklyGoalsRealtime';
import { formatSupabaseError } from '@/utils/errors';
import { markHydrated, resetHydrated, shouldShowInitialLoading } from '@/utils/hydratedFetch';
import { toast } from '@/utils/toast';

export interface WeeklyGoalRow {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  category: string;
  goal_text: string;
  completed: boolean;
}

interface WeeklyGoalsContextValue {
  goals: WeeklyGoalRow[];
  loading: boolean;
  toggleWeeklyGoal: (goalId: string) => void;
  isWeeklyGoal: (taskId: string) => boolean;
  refreshGoals: (options?: { silent?: boolean }) => Promise<void>;
}

const WeeklyGoalsContext = createContext<WeeklyGoalsContextValue | null>(null);

export function WeeklyGoalsProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [goals, setGoals] = useState<WeeklyGoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const goalsRef = useRef<WeeklyGoalRow[]>([]);
  const goalIdsRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);
  const localMutationRef = useRef(false);

  const refreshGoals = useCallback(
    async (options?: { silent?: boolean }): Promise<void> => {
      if (!userId) {
        goalsRef.current = [];
        goalIdsRef.current = new Set();
        setGoals([]);
        setLoading(false);
        resetHydrated(hydratedRef);
        return;
      }

      if (shouldShowInitialLoading(hydratedRef, options?.silent)) {
        setLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from('weekly_goals')
          .select('id, week_number, start_date, end_date, category, goal_text, completed')
          .eq('user_id', userId)
          .order('week_number', { ascending: true });

        if (error) throw error;

        const nextGoals = (data ?? []) as WeeklyGoalRow[];
        goalsRef.current = nextGoals;
        goalIdsRef.current = new Set(nextGoals.map((goal) => goal.id));
        setGoals(nextGoals);
      } catch (fetchError) {
        if (!hydratedRef.current) {
          goalsRef.current = [];
          goalIdsRef.current = new Set();
          setGoals([]);
        }
        console.error('Weekly goals load failed:', formatSupabaseError(fetchError));
      } finally {
        markHydrated(hydratedRef);
        setLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    resetHydrated(hydratedRef);
    void refreshGoals();
  }, [refreshGoals]);

  useWeeklyGoalsRealtime(userId, 'weekly-goals-context', (payload) => {
    if (localMutationRef.current || payload.eventType !== 'UPDATE' || !payload.new) {
      return;
    }

    const row = payload.new as unknown as WeeklyGoalRow;
    if (!goalIdsRef.current.has(row.id)) {
      return;
    }

    const nextGoals = goalsRef.current.map((goal) => (goal.id === row.id ? { ...goal, ...row } : goal));
    goalsRef.current = nextGoals;
    setGoals(nextGoals);
  });

  const toggleWeeklyGoal = useCallback(
    (goalId: string) => {
      if (!userId || !goalIdsRef.current.has(goalId)) {
        return;
      }

      const previousGoals = goalsRef.current;
      const goal = previousGoals.find((item) => item.id === goalId);
      if (!goal) return;

      const nextCompleted = !goal.completed;
      const nextGoals = previousGoals.map((item) =>
        item.id === goalId ? { ...item, completed: nextCompleted } : item
      );

      goalsRef.current = nextGoals;
      setGoals(nextGoals);

      localMutationRef.current = true;
      void supabase
        .from('weekly_goals')
        .update({ completed: nextCompleted })
        .eq('id', goalId)
        .eq('user_id', userId)
        .then(({ error: updateError }) => {
          localMutationRef.current = false;
          if (updateError) {
            goalsRef.current = previousGoals;
            setGoals(previousGoals);
            toast.error('Could not update weekly goal.');
          }
        });
    },
    [userId]
  );

  const isWeeklyGoal = useCallback((taskId: string) => goalIdsRef.current.has(taskId), []);

  const value = useMemo(
    () => ({
      goals,
      loading,
      toggleWeeklyGoal,
      isWeeklyGoal,
      refreshGoals,
    }),
    [goals, loading, toggleWeeklyGoal, isWeeklyGoal, refreshGoals]
  );

  return <WeeklyGoalsContext.Provider value={value}>{children}</WeeklyGoalsContext.Provider>;
}

export function useWeeklyGoals(): WeeklyGoalsContextValue {
  const context = useContext(WeeklyGoalsContext);

  if (!context) {
    throw new Error('useWeeklyGoals must be used within WeeklyGoalsProvider');
  }

  return context;
}
