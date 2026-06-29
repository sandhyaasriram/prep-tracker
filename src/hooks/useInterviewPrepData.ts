/**
 * Interview Prep data hook.
 * Manages mock interviews, OA logs, and CS fundamentals tracker.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
import { markHydrated, resetHydrated, shouldShowInitialLoading } from '@/utils/hydratedFetch';
import { runOptimisticMutation } from '@/utils/optimisticMutation';
import type { CSFundamental, MockInterview, OALog } from '@/types';
import type {
  AddMockInterviewInput,
  AddOALogInput,
  CSFundamentalsGroup,
  InterviewPrepViewData,
  MockInterviewStats,
  OALogStats,
  UpdateCSFundamentalInput,
} from '@/types/interview-prep';

interface UseInterviewPrepDataResult {
  data: InterviewPrepViewData | null;
  loading: boolean;
  error: string | null;
  addMockInterview: (input: AddMockInterviewInput) => Promise<void>;
  deleteMockInterview: (id: string) => Promise<void>;
  addOALog: (input: AddOALogInput) => Promise<void>;
  deleteOALog: (id: string) => Promise<void>;
  updateCSFundamental: (input: UpdateCSFundamentalInput) => Promise<void>;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
}

function buildMockStats(mocks: MockInterview[]): MockInterviewStats {
  const ratedMocks = mocks.filter((mock) => mock.rating !== null);

  let averageRating: number | null = null;

  if (ratedMocks.length > 0) {
    const sum = ratedMocks.reduce((total, mock) => total + (mock.rating ?? 0), 0);
    averageRating = Math.round((sum / ratedMocks.length) * 10) / 10;
  }

  const improveCounts = new Map<string, number>();

  for (const mock of mocks) {
    const area = mock.improve.trim();
    if (!area) continue;
    improveCounts.set(area, (improveCounts.get(area) ?? 0) + 1);
  }

  let weakestArea: string | null = null;
  let maxCount = 0;

  for (const [area, count] of improveCounts) {
    if (count > maxCount) {
      maxCount = count;
      weakestArea = area;
    }
  }

  return {
    total: mocks.length,
    averageRating,
    weakestArea,
  };
}

function buildOaStats(oaLogs: OALog[]): OALogStats {
  const withQuestions = oaLogs.filter((log) => log.total_questions > 0);

  let averageSolveRate: number | null = null;

  if (withQuestions.length > 0) {
    const totalRate = withQuestions.reduce(
      (sum, log) => sum + (log.solved / log.total_questions) * 100,
      0
    );
    averageSolveRate = Math.round(totalRate / withQuestions.length);
  }

  return {
    total: oaLogs.length,
    averageSolveRate,
  };
}

function groupCSFundamentals(items: CSFundamental[]): CSFundamentalsGroup[] {
  const groups = new Map<string, CSFundamental[]>();

  for (const item of items) {
    const existing = groups.get(item.topic) ?? [];
    existing.push(item);
    groups.set(item.topic, existing);
  }

  return [...groups.entries()].map(([topic, topicItems]) => ({
    topic,
    items: topicItems.sort((a, b) => a.subtopic.localeCompare(b.subtopic)),
    strongCount: topicItems.filter((item) => item.status === 'Strong').length,
    totalCount: topicItems.length,
  }));
}

/**
 * Load and manage interview prep data.
 */
export function useInterviewPrepData(userId: string | null): UseInterviewPrepDataResult {
  const [mocks, setMocks] = useState<MockInterview[]>([]);
  const [oaLogs, setOaLogs] = useState<OALog[]>([]);
  const [csItems, setCsItems] = useState<CSFundamental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hydratedRef = useRef(false);

  const fetchData = useCallback(async (options?: { silent?: boolean }): Promise<void> => {
    if (!userId) {
      setMocks([]);
      setOaLogs([]);
      setCsItems([]);
      setLoading(false);
      resetHydrated(hydratedRef);
      return;
    }

    if (shouldShowInitialLoading(hydratedRef, options?.silent)) {
      setLoading(true);
    }
    setError(null);

    try {
      const [mocksResult, oaResult, csResult] = await Promise.all([
        supabase.from('mock_interviews').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('oa_log').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('cs_fundamentals').select('*').eq('user_id', userId).order('topic', { ascending: true }),
      ]);

      if (mocksResult.error) throw mocksResult.error;
      if (oaResult.error) throw oaResult.error;
      if (csResult.error) throw csResult.error;

      const nextMocks = (mocksResult.data ?? []) as MockInterview[];
      const nextOa = (oaResult.data ?? []) as OALog[];
      const nextCs = (csResult.data ?? []) as CSFundamental[];

      setMocks(nextMocks);
      setOaLogs(nextOa);
      setCsItems(nextCs);
    } catch (fetchError) {
      setError(formatSupabaseError(fetchError));
      if (!hydratedRef.current) {
        setMocks([]);
        setOaLogs([]);
        setCsItems([]);
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

  const data = useMemo((): InterviewPrepViewData | null => {
    if (!userId) {
      return null;
    }

    return {
      mocks,
      mockStats: buildMockStats(mocks),
      oaLogs,
      oaStats: buildOaStats(oaLogs),
      csGroups: groupCSFundamentals(csItems),
    };
  }, [mocks, oaLogs, csItems, userId]);

  const addMockInterview = useCallback(
    async (input: AddMockInterviewInput): Promise<void> => {
      if (!userId) throw new Error('Not authenticated');

      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const optimistic: MockInterview = {
        id: tempId,
        user_id: userId,
        date: input.date,
        type: input.type,
        platform: input.platform.trim(),
        topics: input.topics,
        rating: input.rating ?? null,
        went_well: input.wentWell?.trim() ?? '',
        improve: input.improve?.trim() ?? '',
        created_at: now,
        updated_at: now,
      };
      const previous = mocks;

      await runOptimisticMutation({
        apply: () => setMocks([optimistic, ...mocks]),
        revert: () => setMocks(previous),
        persist: async () => {
          const { data: inserted, error: insertError } = await supabase
            .from('mock_interviews')
            .insert([
              {
                user_id: userId,
                date: optimistic.date,
                type: optimistic.type,
                platform: optimistic.platform,
                topics: optimistic.topics,
                rating: optimistic.rating,
                went_well: optimistic.went_well,
                improve: optimistic.improve,
              },
            ])
            .select('*')
            .single();
          if (insertError) throw insertError;
          setMocks((current) =>
            current.map((mock) => (mock.id === tempId ? (inserted as MockInterview) : mock))
          );
        },
        errorMessage: 'Could not add mock interview.',
      });
    },
    [mocks, userId]
  );

  const deleteMockInterview = useCallback(
    async (id: string): Promise<void> => {
      const previous = mocks;
      const optimistic = mocks.filter((mock) => mock.id !== id);

      await runOptimisticMutation({
        apply: () => setMocks(optimistic),
        revert: () => setMocks(previous),
        persist: async () => {
          const { error: deleteError } = await supabase.from('mock_interviews').delete().eq('id', id);
          if (deleteError) throw deleteError;
        },
        errorMessage: 'Could not delete mock interview.',
      });
    },
    [mocks]
  );

  const addOALog = useCallback(
    async (input: AddOALogInput): Promise<void> => {
      if (!userId) throw new Error('Not authenticated');

      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      const optimistic: OALog = {
        id: tempId,
        user_id: userId,
        date: input.date,
        company: input.company.trim(),
        platform: input.platform.trim(),
        total_questions: input.totalQuestions,
        solved: input.solved,
        score: input.score ?? null,
        topics: input.topics,
        notes: input.notes?.trim() ?? '',
        created_at: now,
        updated_at: now,
      };
      const previous = oaLogs;

      await runOptimisticMutation({
        apply: () => setOaLogs([optimistic, ...oaLogs]),
        revert: () => setOaLogs(previous),
        persist: async () => {
          const { data: inserted, error: insertError } = await supabase
            .from('oa_log')
            .insert([
              {
                user_id: userId,
                date: optimistic.date,
                company: optimistic.company,
                platform: optimistic.platform,
                total_questions: optimistic.total_questions,
                solved: optimistic.solved,
                score: optimistic.score,
                topics: optimistic.topics,
                notes: optimistic.notes,
              },
            ])
            .select('*')
            .single();
          if (insertError) throw insertError;
          setOaLogs((current) =>
            current.map((log) => (log.id === tempId ? (inserted as OALog) : log))
          );
        },
        errorMessage: 'Could not add OA log.',
      });
    },
    [oaLogs, userId]
  );

  const deleteOALog = useCallback(
    async (id: string): Promise<void> => {
      const previous = oaLogs;
      const optimistic = oaLogs.filter((log) => log.id !== id);

      await runOptimisticMutation({
        apply: () => setOaLogs(optimistic),
        revert: () => setOaLogs(previous),
        persist: async () => {
          const { error: deleteError } = await supabase.from('oa_log').delete().eq('id', id);
          if (deleteError) throw deleteError;
        },
        errorMessage: 'Could not delete OA log.',
      });
    },
    [oaLogs]
  );

  const updateCSFundamental = useCallback(
    async (input: UpdateCSFundamentalInput): Promise<void> => {
      const previous = csItems;
      const optimistic = csItems.map((item) =>
        item.id !== input.id
          ? item
          : {
              ...item,
              status: input.status,
              last_revised: input.lastRevised !== undefined ? input.lastRevised : item.last_revised,
              notes: input.notes !== undefined ? input.notes.trim() : item.notes,
            }
      );

      await runOptimisticMutation({
        apply: () => {
          setCsItems(optimistic);
        },
        revert: () => {
          setCsItems(previous);
        },
        persist: async () => {
          const payload = {
            status: input.status,
            last_revised: input.lastRevised ?? null,
            notes: input.notes?.trim() ?? '',
          };
          const { error: updateError } = await supabase.from('cs_fundamentals').update(payload).eq('id', input.id);
          if (updateError) throw updateError;
        },
        errorMessage: 'Could not update CS fundamental.',
      });
    },
    [csItems]
  );

  return {
    data,
    loading,
    error,
    addMockInterview,
    deleteMockInterview,
    addOALog,
    deleteOALog,
    updateCSFundamental,
    refresh: fetchData,
  };
}
