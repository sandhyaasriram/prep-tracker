/**
 * Context-aware progress for the top nav bar.
 * Uses real Supabase data per active route.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { AppNavRoute } from '@/components/layout/MainLayout';
import { calculateSeasonProgress, calculateWeeklyProgress } from '@/utils/progress';

export interface NavProgress {
  progress: number;
  label: string;
}

interface WeeklyGoalRow {
  start_date: string;
  end_date: string;
  completed: boolean;
}

interface DSAProblemRow {
  solved: boolean;
}

interface ApplicationRow {
  stage: string;
}

interface CSFundamentalRow {
  status: string;
}

const DEFAULT_PROGRESS: NavProgress = { progress: 0, label: 'Loading progress...' };

/**
 * Resolve the top nav progress metric for the current page.
 */
export function useNavProgress(userId: string | null, route: AppNavRoute): NavProgress {
  const [navProgress, setNavProgress] = useState<NavProgress>(DEFAULT_PROGRESS);

  const fetchProgress = useCallback(async (): Promise<void> => {
    if (!userId) {
      setNavProgress({ progress: 0, label: 'Sign in to track progress' });
      return;
    }

    try {
      if (route === 'DSA') {
        const { data, error } = await supabase.from('dsa_problems').select('solved').eq('user_id', userId);

        if (error) {
          throw error;
        }

        const problems = (data ?? []) as DSAProblemRow[];
        const solved = problems.filter((problem) => problem.solved).length;
        const progress = problems.length > 0 ? Math.round((solved / problems.length) * 100) : 0;

        setNavProgress({
          progress,
          label: `DSA progress: ${solved}/${problems.length} problems solved`,
        });
        return;
      }

      if (route === 'Applications') {
        const { data, error } = await supabase.from('applications').select('stage').eq('user_id', userId);

        if (error) {
          throw error;
        }

        const applications = (data ?? []) as ApplicationRow[];
        const advanced = applications.filter((application) => application.stage !== 'Wishlist').length;
        const progress =
          applications.length > 0 ? Math.round((advanced / applications.length) * 100) : 0;

        setNavProgress({
          progress,
          label: `Pipeline progress: ${advanced}/${applications.length} past wishlist`,
        });
        return;
      }

      if (route === 'Interview Prep') {
        const { data, error } = await supabase.from('cs_fundamentals').select('status').eq('user_id', userId);

        if (error) {
          throw error;
        }

        const items = (data ?? []) as CSFundamentalRow[];
        const strong = items.filter((item) => item.status === 'Strong').length;
        const progress = items.length > 0 ? Math.round((strong / items.length) * 100) : 0;

        setNavProgress({
          progress,
          label: `CS fundamentals: ${strong}/${items.length} marked strong`,
        });
        return;
      }

      if (route === 'Timeline') {
        const progress = calculateSeasonProgress();
        setNavProgress({
          progress,
          label: 'Placement season elapsed',
        });
        return;
      }

      const { data, error } = await supabase
        .from('weekly_goals')
        .select('start_date, end_date, completed')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      const goals = (data ?? []) as WeeklyGoalRow[];
      const progress = calculateWeeklyProgress(goals);

      setNavProgress({
        progress,
        label: 'Current weekly goal progress',
      });
    } catch {
      setNavProgress({ progress: 0, label: 'Progress unavailable' });
    }
  }, [route, userId]);

  useEffect(() => {
    void fetchProgress();
  }, [fetchProgress]);

  return navProgress;
}
