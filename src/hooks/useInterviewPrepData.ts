/**
 * Interview Prep data hook.
 * Manages mock interviews, OA logs, and CS fundamentals tracker.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
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
  refresh: () => Promise<void>;
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

  const fetchData = useCallback(async (): Promise<void> => {
    if (!userId) {
      setMocks([]);
      setOaLogs([]);
      setCsItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
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

      setMocks((mocksResult.data ?? []) as MockInterview[]);
      setOaLogs((oaResult.data ?? []) as OALog[]);
      setCsItems((csResult.data ?? []) as CSFundamental[]);
    } catch (fetchError) {
      setError(formatSupabaseError(fetchError));
      setMocks([]);
      setOaLogs([]);
      setCsItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
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
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const payload = {
        user_id: userId,
        date: input.date,
        type: input.type,
        platform: input.platform.trim(),
        topics: input.topics,
        rating: input.rating ?? null,
        went_well: input.wentWell?.trim() ?? '',
        improve: input.improve?.trim() ?? '',
      };

      const { error: insertError } = await supabase.from('mock_interviews').insert([payload]);

      if (insertError) {
        throw new Error(formatSupabaseError(insertError));
      }

      await fetchData();
    },
    [userId, fetchData]
  );

  const deleteMockInterview = useCallback(
    async (id: string): Promise<void> => {
      const { error: deleteError } = await supabase.from('mock_interviews').delete().eq('id', id);

      if (deleteError) {
        throw new Error(formatSupabaseError(deleteError));
      }

      await fetchData();
    },
    [fetchData]
  );

  const addOALog = useCallback(
    async (input: AddOALogInput): Promise<void> => {
      if (!userId) {
        throw new Error('Not authenticated');
      }

      const payload = {
        user_id: userId,
        date: input.date,
        company: input.company.trim(),
        platform: input.platform.trim(),
        total_questions: input.totalQuestions,
        solved: input.solved,
        score: input.score ?? null,
        topics: input.topics,
        notes: input.notes?.trim() ?? '',
      };

      const { error: insertError } = await supabase.from('oa_log').insert([payload]);

      if (insertError) {
        throw new Error(formatSupabaseError(insertError));
      }

      await fetchData();
    },
    [userId, fetchData]
  );

  const deleteOALog = useCallback(
    async (id: string): Promise<void> => {
      const { error: deleteError } = await supabase.from('oa_log').delete().eq('id', id);

      if (deleteError) {
        throw new Error(formatSupabaseError(deleteError));
      }

      await fetchData();
    },
    [fetchData]
  );

  const updateCSFundamental = useCallback(
    async (input: UpdateCSFundamentalInput): Promise<void> => {
      const payload = {
        status: input.status,
        last_revised: input.lastRevised ?? null,
        notes: input.notes?.trim() ?? '',
      };

      const { error: updateError } = await supabase.from('cs_fundamentals').update(payload).eq('id', input.id);

      if (updateError) {
        throw new Error(formatSupabaseError(updateError));
      }

      await fetchData();
    },
    [fetchData]
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
