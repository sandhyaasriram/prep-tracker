/**
 * Weekly Review data hook — goals, reviews, auto stats, and CRUD.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
import { buildCalendarWeekDefinitions } from '@/utils/calendarWeek';
import { getCurrentWeekNumber } from '@/utils/weekUtils';
import { todayIST } from '@/utils';
import { markHydrated, resetHydrated, shouldShowInitialLoading } from '@/utils/hydratedFetch';
import { runOptimisticMutation } from '@/utils/optimisticMutation';
import type {
  UpsertWeeklyReviewInput,
  WeekAutoStats,
  WeekDefinition,
  WeeklyReview,
  WeeklyReviewViewData,
} from '@/types/weekly-review';

interface UseWeeklyReviewDataResult {
  data: WeeklyReviewViewData | null;
  loading: boolean;
  error: string | null;
  selectedWeekNumber: number;
  setSelectedWeekNumber: (weekNumber: number) => void;
  getReviewForWeek: (weekNumber: number) => WeeklyReview | null;
  getWeekDefinition: (weekNumber: number) => WeekDefinition | undefined;
  getAutoStats: (weekNumber: number) => Promise<WeekAutoStats>;
  upsertReview: (input: UpsertWeeklyReviewInput) => Promise<void>;
  ensureCurrentWeekReview: () => Promise<void>;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
}

async function fetchAutoStats(userId: string, startDate: string, endDate: string): Promise<WeekAutoStats> {
  const [dsaResult, mocksResult, appsResult] = await Promise.all([
    supabase
      .from('dsa_problems')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('solved', true)
      .gte('solved_date', startDate)
      .lte('solved_date', endDate),
    supabase
      .from('mock_interviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate),
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('date_applied', startDate)
      .lte('date_applied', endDate),
  ]);

  if (dsaResult.error) throw dsaResult.error;
  if (mocksResult.error) throw mocksResult.error;
  if (appsResult.error) throw appsResult.error;

  return {
    dsaProblemsSolved: dsaResult.count ?? 0,
    mocksDone: mocksResult.count ?? 0,
    applicationsSent: appsResult.count ?? 0,
  };
}

/**
 * Load weekly goals/reviews and manage structured reflection entries.
 */
export function useWeeklyReviewData(userId: string | null): UseWeeklyReviewDataResult {
  const [weeks, setWeeks] = useState<WeekDefinition[]>([]);
  const [reviews, setReviews] = useState<WeeklyReview[]>([]);
  const [selectedWeekNumber, setSelectedWeekNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  const fetchData = useCallback(async (options?: { silent?: boolean }): Promise<void> => {
    if (!userId) {
      setWeeks([]);
      setReviews([]);
      setLoading(false);
      resetHydrated(hydratedRef);
      return;
    }

    if (shouldShowInitialLoading(hydratedRef, options?.silent)) {
      setLoading(true);
    }
    setError(null);

    try {
      const [goalsResult, reviewsResult] = await Promise.all([
        supabase.from('weekly_goals').select('week_number, start_date, end_date').eq('user_id', userId),
        supabase.from('weekly_reviews').select('*').eq('user_id', userId).order('week_number', { ascending: true }),
      ]);

      if (goalsResult.error) throw goalsResult.error;
      if (reviewsResult.error) throw reviewsResult.error;

      const weekDefinitions = buildCalendarWeekDefinitions();
      const reviewRows = (reviewsResult.data ?? []) as WeeklyReview[];

      setWeeks(weekDefinitions);
      setReviews(reviewRows);
      setSelectedWeekNumber((current) => {
        if (weekDefinitions.some((week) => week.week_number === current)) {
          return current;
        }
        return getCurrentWeekNumber(weekDefinitions);
      });
    } catch (fetchError) {
      setError(formatSupabaseError(fetchError));
      if (!hydratedRef.current) {
        setWeeks([]);
        setReviews([]);
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

  const getReviewForWeek = useCallback(
    (weekNumber: number): WeeklyReview | null => {
      return reviews.find((review) => review.week_number === weekNumber) ?? null;
    },
    [reviews]
  );

  const getWeekDefinition = useCallback(
    (weekNumber: number): WeekDefinition | undefined => {
      return weeks.find((week) => week.week_number === weekNumber);
    },
    [weeks]
  );

  const ensureCurrentWeekReview = useCallback(async (): Promise<void> => {
    if (!userId || weeks.length === 0) {
      return;
    }

    const weekNumber = getCurrentWeekNumber(weeks, todayIST());
    if (reviews.some((review) => review.week_number === weekNumber)) {
      return;
    }

    const { data, error: insertError } = await supabase
      .from('weekly_reviews')
      .insert({
        user_id: userId,
        week_number: weekNumber,
      })
      .select('*')
      .single();

    if (insertError) {
      throw new Error(formatSupabaseError(insertError));
    }

    setReviews((current) => [...current, data as WeeklyReview].sort((a, b) => a.week_number - b.week_number));
  }, [userId, weeks, reviews]);

  useEffect(() => {
    if (!loading && userId && weeks.length > 0) {
      void ensureCurrentWeekReview().catch((ensureError) => {
        console.warn('Failed to auto-create weekly review:', ensureError);
      });
    }
  }, [loading, userId, weeks, ensureCurrentWeekReview]);

  const upsertReview = useCallback(
    async (input: UpsertWeeklyReviewInput): Promise<void> => {
      if (!userId) throw new Error('Not signed in');

      const existing = getReviewForWeek(input.weekNumber);
      const previous = reviews;
      const payload = {
        biggest_win: input.biggestWin,
        bottleneck: input.bottleneck,
        lessons: input.lessons,
        focus_next: input.focusNext,
        hours_worked: input.hoursWorked,
        mood_rating: input.moodRating,
        free_notes: input.freeNotes,
      };

      if (existing) {
        const optimistic = reviews.map((review) =>
          review.id === existing.id ? { ...review, ...payload } : review
        );

        await runOptimisticMutation({
          apply: () => {
            setReviews(optimistic);
          },
          revert: () => {
            setReviews(previous);
          },
          persist: async () => {
            const { data, error: updateError } = await supabase
              .from('weekly_reviews')
              .update(payload)
              .eq('id', existing.id)
              .select('*')
              .single();
            if (updateError) throw updateError;
            setReviews((current) => {
              const next = current.map((review) => (review.id === existing.id ? (data as WeeklyReview) : review));
              return next;
            });
          },
          errorMessage: 'Could not save weekly review.',
        });
        return;
      }

      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const optimisticReview: WeeklyReview = {
        id: tempId,
        user_id: userId,
        week_number: input.weekNumber,
        ...payload,
        created_at: now,
        updated_at: now,
      };
      const optimistic = [...reviews, optimisticReview].sort((a, b) => a.week_number - b.week_number);

      await runOptimisticMutation({
        apply: () => {
          setReviews(optimistic);
        },
        revert: () => {
          setReviews(previous);
        },
        persist: async () => {
          const { data, error: insertError } = await supabase
            .from('weekly_reviews')
            .insert({
              user_id: userId,
              week_number: input.weekNumber,
              ...payload,
            })
            .select('*')
            .single();
          if (insertError) throw insertError;
          setReviews((current) => {
            const next = current
              .map((review) => (review.id === tempId ? (data as WeeklyReview) : review))
              .sort((a, b) => a.week_number - b.week_number);
            return next;
          });
        },
        errorMessage: 'Could not save weekly review.',
      });
    },
    [userId, getReviewForWeek, reviews, weeks]
  );

  const getAutoStats = useCallback(
    async (weekNumber: number): Promise<WeekAutoStats> => {
      if (!userId) {
        return { dsaProblemsSolved: 0, mocksDone: 0, applicationsSent: 0 };
      }

      const week = getWeekDefinition(weekNumber);
      if (!week) {
        return { dsaProblemsSolved: 0, mocksDone: 0, applicationsSent: 0 };
      }

      return fetchAutoStats(userId, week.start_date, week.end_date);
    },
    [userId, getWeekDefinition]
  );

  const data = useMemo((): WeeklyReviewViewData | null => {
    if (weeks.length === 0 && loading) {
      return null;
    }

    return {
      weeks,
      reviews,
      currentWeekNumber: getCurrentWeekNumber(weeks),
    };
  }, [weeks, reviews, loading]);

  return {
    data,
    loading,
    error,
    selectedWeekNumber,
    setSelectedWeekNumber,
    getReviewForWeek,
    getWeekDefinition,
    getAutoStats,
    upsertReview,
    ensureCurrentWeekReview,
    refresh: fetchData,
  };
}
