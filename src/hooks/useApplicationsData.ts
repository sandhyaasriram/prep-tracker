/**
 * Applications data hook.
 * Fetches applications with interview rounds and exposes CRUD + filtering.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
import { todayIST } from '@/utils';
import type { Application, ApplicationStage, InterviewRound } from '@/types';
import type {
  AddApplicationInput,
  AddInterviewRoundInput,
  ApplicationFilters,
  ApplicationWithRounds,
  ApplicationsViewData,
  UpdateApplicationInput,
} from '@/types/applications';

interface UseApplicationsDataResult {
  data: ApplicationsViewData | null;
  loading: boolean;
  error: string | null;
  filters: ApplicationFilters;
  setFilters: (filters: ApplicationFilters) => void;
  addApplication: (input: AddApplicationInput) => Promise<void>;
  updateApplication: (id: string, input: UpdateApplicationInput) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  updateStage: (id: string, stage: ApplicationStage) => Promise<void>;
  addInterviewRound: (input: AddInterviewRoundInput) => Promise<void>;
  deleteInterviewRound: (roundId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_FILTERS: ApplicationFilters = {
  stage: 'All',
  source: 'All',
  dateFrom: '',
  dateTo: '',
};

function buildStats(applications: ApplicationWithRounds[]): ApplicationsViewData['stats'] {
  const today = todayIST();
  const active = applications.filter((app) => app.stage !== 'Offer' && app.stage !== 'Rejected').length;
  const offers = applications.filter((app) => app.stage === 'Offer').length;
  const upcomingDeadlines = applications.filter(
    (app) => app.next_deadline && app.next_deadline >= today && app.stage !== 'Rejected' && app.stage !== 'Offer'
  ).length;

  return {
    total: applications.length,
    active,
    offers,
    upcomingDeadlines,
  };
}

function applyFilters(applications: ApplicationWithRounds[], filters: ApplicationFilters): ApplicationWithRounds[] {
  return applications.filter((app) => {
    if (filters.stage !== 'All' && app.stage !== filters.stage) {
      return false;
    }

    if (filters.source !== 'All' && app.source !== filters.source) {
      return false;
    }

    if (filters.dateFrom && app.date_applied && app.date_applied < filters.dateFrom) {
      return false;
    }

    if (filters.dateTo && app.date_applied && app.date_applied > filters.dateTo) {
      return false;
    }

    if (filters.dateFrom && !app.date_applied) {
      return false;
    }

    if (filters.dateTo && !app.date_applied) {
      return false;
    }

    return true;
  });
}

function mergeApplications(
  applications: Application[],
  rounds: InterviewRound[]
): ApplicationWithRounds[] {
  const roundsByApp = new Map<string, InterviewRound[]>();

  for (const round of rounds) {
    const existing = roundsByApp.get(round.application_id) ?? [];
    existing.push(round);
    roundsByApp.set(round.application_id, existing);
  }

  return applications.map((application) => ({
    ...application,
    rounds: (roundsByApp.get(application.id) ?? []).sort((a, b) => a.round_number - b.round_number),
  }));
}

/**
 * Load and manage application pipeline data.
 */
export function useApplicationsData(userId: string | null): UseApplicationsDataResult {
  const [allApplications, setAllApplications] = useState<ApplicationWithRounds[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ApplicationFilters>(DEFAULT_FILTERS);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!userId) {
      setAllApplications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const applicationsResult = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (applicationsResult.error) {
        throw applicationsResult.error;
      }

      const applications = (applicationsResult.data ?? []) as Application[];
      const applicationIds = applications.map((app) => app.id);

      let rounds: InterviewRound[] = [];

      if (applicationIds.length > 0) {
        const roundsResult = await supabase
          .from('interview_rounds')
          .select('*')
          .in('application_id', applicationIds)
          .order('round_number', { ascending: true });

        if (roundsResult.error) {
          throw roundsResult.error;
        }

        rounds = (roundsResult.data ?? []) as InterviewRound[];
      }

      setAllApplications(mergeApplications(applications, rounds));
    } catch (fetchError) {
      setError(formatSupabaseError(fetchError));
      setAllApplications([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredApplications = useMemo(
    () => applyFilters(allApplications, filters),
    [allApplications, filters]
  );

  const data = useMemo((): ApplicationsViewData | null => {
    if (!userId) {
      return null;
    }

    return {
      applications: filteredApplications,
      allApplications,
      stats: buildStats(allApplications),
    };
  }, [filteredApplications, allApplications, userId]);

  const addApplication = useCallback(
    async (input: AddApplicationInput): Promise<void> => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const payload = {
        user_id: userId,
        company: input.company.trim(),
        role: input.role.trim(),
        source: input.source,
        stage: input.stage,
        date_applied: input.dateApplied ?? null,
        next_deadline: input.nextDeadline ?? null,
        oa_score: input.oaScore ?? null,
        notes: input.notes?.trim() ?? '',
      };

      const { error: insertError } = await supabase.from('applications').insert([payload]);

      if (insertError) {
        throw new Error(formatSupabaseError(insertError));
      }

      await fetchData();
    },
    [userId, fetchData]
  );

  const updateApplication = useCallback(
    async (id: string, input: UpdateApplicationInput): Promise<void> => {
      const payload: Record<string, unknown> = {};

      if (input.company !== undefined) payload.company = input.company.trim();
      if (input.role !== undefined) payload.role = input.role.trim();
      if (input.source !== undefined) payload.source = input.source;
      if (input.stage !== undefined) payload.stage = input.stage;
      if (input.dateApplied !== undefined) payload.date_applied = input.dateApplied;
      if (input.nextDeadline !== undefined) payload.next_deadline = input.nextDeadline;
      if (input.oaScore !== undefined) payload.oa_score = input.oaScore;
      if (input.notes !== undefined) payload.notes = input.notes.trim();

      const { error: updateError } = await supabase.from('applications').update(payload).eq('id', id);

      if (updateError) {
        throw new Error(formatSupabaseError(updateError));
      }

      await fetchData();
    },
    [fetchData]
  );

  const deleteApplication = useCallback(
    async (id: string): Promise<void> => {
      const { error: deleteError } = await supabase.from('applications').delete().eq('id', id);

      if (deleteError) {
        throw new Error(formatSupabaseError(deleteError));
      }

      await fetchData();
    },
    [fetchData]
  );

  const updateStage = useCallback(
    async (id: string, stage: ApplicationStage): Promise<void> => {
      await updateApplication(id, { stage });
    },
    [updateApplication]
  );

  const addInterviewRound = useCallback(
    async (input: AddInterviewRoundInput): Promise<void> => {
      const application = allApplications.find((app) => app.id === input.applicationId);

      if (!application) {
        throw new Error('Application not found');
      }

      const nextRoundNumber = application.rounds.length + 1;

      const payload = {
        application_id: input.applicationId,
        round_number: nextRoundNumber,
        type: input.type,
        date: input.date ?? null,
        outcome: input.outcome?.trim() ?? '',
        notes: input.notes?.trim() ?? '',
      };

      const { error: insertError } = await supabase.from('interview_rounds').insert([payload]);

      if (insertError) {
        throw new Error(formatSupabaseError(insertError));
      }

      await fetchData();
    },
    [allApplications, fetchData]
  );

  const deleteInterviewRound = useCallback(
    async (roundId: string): Promise<void> => {
      const { error: deleteError } = await supabase.from('interview_rounds').delete().eq('id', roundId);

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
    filters,
    setFilters,
    addApplication,
    updateApplication,
    deleteApplication,
    updateStage,
    addInterviewRound,
    deleteInterviewRound,
    refresh: fetchData,
  };
}
