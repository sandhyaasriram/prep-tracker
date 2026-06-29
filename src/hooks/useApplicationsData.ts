/**
 * Applications data hook.
 * Fetches applications with interview rounds and exposes CRUD + filtering.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
import { todayIST } from '@/utils';
import { markHydrated, resetHydrated, shouldShowInitialLoading } from '@/utils/hydratedFetch';
import { runOptimisticMutation } from '@/utils/optimisticMutation';
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
  const hydratedRef = useRef(false);

  const fetchData = useCallback(async (options?: { silent?: boolean }): Promise<void> => {
    if (!userId) {
      setAllApplications([]);
      setLoading(false);
      resetHydrated(hydratedRef);
      return;
    }

    if (shouldShowInitialLoading(hydratedRef, options?.silent)) {
      setLoading(true);
    }
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

      const merged = mergeApplications(applications, rounds);
      setAllApplications(merged);
    } catch (fetchError) {
      setError(formatSupabaseError(fetchError));
      if (!hydratedRef.current) {
        setAllApplications([]);
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
      if (!userId) throw new Error('Not authenticated');

      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const optimisticApp: ApplicationWithRounds = {
        id: tempId,
        user_id: userId,
        company: input.company.trim(),
        role: input.role.trim(),
        source: input.source,
        stage: input.stage,
        date_applied: input.dateApplied ?? null,
        next_deadline: input.nextDeadline ?? null,
        oa_score: input.oaScore ?? null,
        notes: input.notes?.trim() ?? '',
        created_at: now,
        updated_at: now,
        rounds: [],
      };
      const previous = allApplications;

      await runOptimisticMutation({
        apply: () => {
          const next = [optimisticApp, ...allApplications];
          setAllApplications(next);
        },
        revert: () => {
          setAllApplications(previous);
        },
        persist: async () => {
          const { data: inserted, error: insertError } = await supabase
            .from('applications')
            .insert([
              {
                user_id: userId,
                company: optimisticApp.company,
                role: optimisticApp.role,
                source: optimisticApp.source,
                stage: optimisticApp.stage,
                date_applied: optimisticApp.date_applied,
                next_deadline: optimisticApp.next_deadline,
                oa_score: optimisticApp.oa_score,
                notes: optimisticApp.notes,
              },
            ])
            .select('*')
            .single();
          if (insertError) throw insertError;
          setAllApplications((current) => {
            const next = current.map((app) =>
              app.id === tempId ? { ...(inserted as Application), rounds: [] } : app
            );
            return next;
          });
        },
        errorMessage: 'Could not add application.',
      });
    },
    [allApplications, userId]
  );

  const updateApplication = useCallback(
    async (id: string, input: UpdateApplicationInput): Promise<void> => {
      const previous = allApplications;
      const optimistic = allApplications.map((app) =>
        app.id !== id
          ? app
          : {
              ...app,
              company: input.company !== undefined ? input.company.trim() : app.company,
              role: input.role !== undefined ? input.role.trim() : app.role,
              source: input.source !== undefined ? input.source : app.source,
              stage: input.stage !== undefined ? input.stage : app.stage,
              date_applied: input.dateApplied !== undefined ? input.dateApplied : app.date_applied,
              next_deadline: input.nextDeadline !== undefined ? input.nextDeadline : app.next_deadline,
              oa_score: input.oaScore !== undefined ? input.oaScore : app.oa_score,
              notes: input.notes !== undefined ? input.notes.trim() : app.notes,
            }
      );

      await runOptimisticMutation({
        apply: () => {
          setAllApplications(optimistic);
        },
        revert: () => {
          setAllApplications(previous);
        },
        persist: async () => {
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
          if (updateError) throw updateError;
        },
        errorMessage: 'Could not update application.',
      });
    },
    [allApplications]
  );

  const deleteApplication = useCallback(
    async (id: string): Promise<void> => {
      const previous = allApplications;
      const optimistic = allApplications.filter((app) => app.id !== id);
      await runOptimisticMutation({
        apply: () => {
          setAllApplications(optimistic);
        },
        revert: () => {
          setAllApplications(previous);
        },
        persist: async () => {
          const { error: deleteError } = await supabase.from('applications').delete().eq('id', id);
          if (deleteError) throw deleteError;
        },
        errorMessage: 'Could not delete application.',
      });
    },
    [allApplications]
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
      if (!application) throw new Error('Application not found');

      const tempId = crypto.randomUUID();
      const nextRound: InterviewRound = {
        id: tempId,
        application_id: input.applicationId,
        round_number: application.rounds.length + 1,
        type: input.type,
        date: input.date ?? null,
        outcome: input.outcome?.trim() ?? '',
        notes: input.notes?.trim() ?? '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const previous = allApplications;
      const optimistic = allApplications.map((app) =>
        app.id === input.applicationId ? { ...app, rounds: [...app.rounds, nextRound] } : app
      );

      await runOptimisticMutation({
        apply: () => setAllApplications(optimistic),
        revert: () => setAllApplications(previous),
        persist: async () => {
          const { data: inserted, error: insertError } = await supabase
            .from('interview_rounds')
            .insert([
              {
                application_id: input.applicationId,
                round_number: nextRound.round_number,
                type: input.type,
                date: input.date ?? null,
                outcome: input.outcome?.trim() ?? '',
                notes: input.notes?.trim() ?? '',
              },
            ])
            .select('*')
            .single();
          if (insertError) throw insertError;
          setAllApplications((current) =>
            current.map((app) =>
              app.id === input.applicationId
                ? {
                    ...app,
                    rounds: app.rounds.map((round) =>
                      round.id === tempId ? (inserted as InterviewRound) : round
                    ),
                  }
                : app
            )
          );
        },
        errorMessage: 'Could not add interview round.',
      });
    },
    [allApplications]
  );

  const deleteInterviewRound = useCallback(
    async (roundId: string): Promise<void> => {
      const previous = allApplications;
      const optimistic = allApplications.map((app) => ({
        ...app,
        rounds: app.rounds.filter((round) => round.id !== roundId),
      }));

      await runOptimisticMutation({
        apply: () => setAllApplications(optimistic),
        revert: () => setAllApplications(previous),
        persist: async () => {
          const { error: deleteError } = await supabase.from('interview_rounds').delete().eq('id', roundId);
          if (deleteError) throw deleteError;
        },
        errorMessage: 'Could not delete interview round.',
      });
    },
    [allApplications]
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
