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

      // Applications top-bar progress (swap metric here anytime).
      // Current: % of tracked apps that moved past Wishlist (Applied / OA / Interview / Offer / Rejected).
      // Alternatives: apps applied ÷ target_companies from user_settings, or stage-weighted pipeline score.
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

      if (route === 'Projects') {
        const [projectsResult, checklistResult] = await Promise.all([
          supabase.from('projects').select('id, type').eq('user_id', userId),
          supabase.from('project_checklist').select('completed, project_id'),
        ]);

        if (projectsResult.error) throw projectsResult.error;
        if (checklistResult.error) throw checklistResult.error;

        const existingIds = new Set(
          ((projectsResult.data ?? []) as Array<{ id: string; type: string }>)
            .filter((project) => project.type === 'existing')
            .map((project) => project.id)
        );
        const checklist = (checklistResult.data ?? []) as Array<{ completed: boolean; project_id: string }>;
        const relevant = checklist.filter((item) => existingIds.has(item.project_id));
        const done = relevant.filter((item) => item.completed).length;
        const progress = relevant.length > 0 ? Math.round((done / relevant.length) * 100) : 0;

        setNavProgress({
          progress,
          label: `Resume checklist: ${done}/${relevant.length} items done`,
        });
        return;
      }

      if (route === 'Certifications') {
        const { data, error } = await supabase.from('certifications').select('status, progress').eq('user_id', userId);

        if (error) throw error;

        const certs = (data ?? []) as Array<{ status: string; progress: number }>;
        const inProgress = certs.filter((cert) => cert.status === 'In Progress');

        if (inProgress.length === 0) {
          const completed = certs.filter((cert) => cert.status === 'Completed').length;
          setNavProgress({
            progress: certs.length > 0 ? Math.round((completed / certs.length) * 100) : 0,
            label: `Certifications: ${completed}/${certs.length} completed`,
          });
          return;
        }

        const average = Math.round(inProgress.reduce((sum, cert) => sum + cert.progress, 0) / inProgress.length);
        setNavProgress({
          progress: average,
          label: `Certification progress: ${average}% average`,
        });
        return;
      }

      if (route === 'Journal') {
        const { data, error } = await supabase.from('journal_entries').select('date').eq('user_id', userId);

        if (error) throw error;

        const entryCount = (data ?? []).length;
        setNavProgress({
          progress: Math.min(entryCount * 5, 100),
          label: `Journal: ${entryCount} entries logged`,
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
