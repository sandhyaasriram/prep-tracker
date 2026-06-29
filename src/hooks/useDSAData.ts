/**
 * DSA data hook.
 * Reads topic and problem data from Supabase and builds dashboard-ready summaries.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { calculateLongestStreak, calculateStreak, daysSince, todayIST } from '@/utils';
import type { DSAProblem } from '@/types';
import type { DSAProblemSummary, DSATopicSummary, DSAStats, DSAViewData } from '@/types/dsa';

interface DSAProblemRow {
  id: string;
  topic_id: string;
  name: string;
  difficulty: DSAProblem['difficulty'];
  leetcode_url: string | null;
  solved: boolean;
  solved_date: string | null;
  flagged_for_revision: boolean;
  notes: string;
  updated_at: string;
}

interface DSATopicRow {
  id: string;
  name: string;
  order_index: number;
  target_problem_count: number;
}

interface UseDSADataResult {
  data: DSAViewData | null;
  loading: boolean;
  error: string | null;
  toggleSolved: (problemId: string) => Promise<void>;
  toggleRevision: (problemId: string) => Promise<void>;
  updateNotes: (problemId: string, notes: string) => Promise<void>;
  addCustomProblem: (input: AddCustomProblemInput) => Promise<void>;
}

export interface AddCustomProblemInput {
  topicId: string;
  name: string;
  difficulty: DSAProblem['difficulty'];
  leetcodeUrl?: string;
}

function buildFallbackData(): DSAViewData {
  return {
    stats: {
      totalSolved: 0,
      solvedThisWeek: 0,
      solvedToday: 0,
      currentStreak: 0,
      longestStreak: 0,
      topicsDueForRevision: 0,
      totalProblems: 0,
    },
    topics: [],
    problemsByTopic: {},
    revisionQueue: [],
    recentSolves: [],
  };
}

function computeRevisionDue(lastSolvedDate: string | null): boolean {
  if (!lastSolvedDate) {
    return false;
  }

  return daysSince(lastSolvedDate) >= 7;
}

function buildStats(problems: DSAProblemSummary[]): DSAStats {
  const today = todayIST();
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);

  const solvedProblems = problems.filter((problem) => problem.solved);
  const solvedThisWeek = solvedProblems.filter((problem) => {
    if (!problem.solvedDate) return false;
    return parseISO(problem.solvedDate) >= weekStart;
  }).length;
  const solvedToday = solvedProblems.filter((problem) => problem.solvedDate === today).length;
  const revisionCount = problems.filter((problem) => problem.flaggedForRevision || computeRevisionDue(problem.solvedDate)).length;
  const solveDates = solvedProblems
    .map((problem) => problem.solvedDate)
    .filter((date): date is string => Boolean(date));
  const currentStreak = calculateStreak(solveDates);
  const longestStreak = calculateLongestStreak(solveDates);

  return {
    totalSolved: solvedProblems.length,
    solvedThisWeek,
    solvedToday,
    currentStreak,
    longestStreak,
    topicsDueForRevision: revisionCount,
    totalProblems: problems.length,
  };
}

function groupByTopic(topics: DSATopicRow[], problems: DSAProblemRow[]): {
  topicSummaries: DSATopicSummary[];
  problemsByTopic: Record<string, DSAProblemSummary[]>;
  revisionQueue: DSAProblemSummary[];
  recentSolves: DSAProblemSummary[];
  allProblems: DSAProblemSummary[];
} {
  const problemsByTopic: Record<string, DSAProblemSummary[]> = {};
  const allProblems: DSAProblemSummary[] = [];

  for (const topic of topics) {
    const topicProblems = problems
      .filter((problem) => problem.topic_id === topic.id)
      .map<DSAProblemSummary>((problem) => ({
        id: problem.id,
        topicId: topic.id,
        topicName: topic.name,
        name: problem.name,
        difficulty: problem.difficulty,
        leetcodeUrl: problem.leetcode_url,
        solved: problem.solved,
        solvedDate: problem.solved_date,
        flaggedForRevision: problem.flagged_for_revision,
        notes: problem.notes,
      }));

    problemsByTopic[topic.id] = topicProblems;
    allProblems.push(...topicProblems);
  }

  const topicSummaries = topics.map<DSATopicSummary>((topic) => {
    const topicProblems = problemsByTopic[topic.id] ?? [];
    const solvedProblems = topicProblems.filter((problem) => problem.solved);
    const lastSolvedDate = solvedProblems
      .map((problem) => problem.solvedDate)
      .filter((date): date is string => Boolean(date))
      .sort((left, right) => right.localeCompare(left))[0] ?? null;

    return {
      id: topic.id,
      name: topic.name,
      orderIndex: topic.order_index,
      targetProblemCount: topic.target_problem_count,
      solvedCount: solvedProblems.length,
      revisionCount: topicProblems.filter((problem) => problem.flaggedForRevision || computeRevisionDue(problem.solvedDate)).length,
      lastSolvedDate,
      dueForRevision: topicProblems.some((problem) => problem.flaggedForRevision || computeRevisionDue(problem.solvedDate)),
    };
  });

  const revisionQueue = allProblems
    .filter((problem) => problem.flaggedForRevision || computeRevisionDue(problem.solvedDate))
    .sort((left, right) => {
      const leftDate = left.solvedDate ?? '9999-12-31';
      const rightDate = right.solvedDate ?? '9999-12-31';
      return leftDate.localeCompare(rightDate);
    });

  const recentSolves = allProblems
    .filter((problem) => problem.solved && problem.solvedDate)
    .sort((left, right) => (right.solvedDate ?? '').localeCompare(left.solvedDate ?? ''))
    .slice(0, 8);

  return {
    topicSummaries,
    problemsByTopic,
    revisionQueue,
    recentSolves,
    allProblems,
  };
}

export function useDSAData(userId: string | null): UseDSADataResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<DSATopicRow[]>([]);
  const [problems, setProblems] = useState<DSAProblemRow[]>([]);
  const [reloadToken, setReloadToken] = useState(0);

  const loadData = useCallback(async (): Promise<void> => {
    if (!userId) {
      setTopics([]);
      setProblems([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [topicsResult, problemsResult] = await Promise.all([
        supabase
          .from('dsa_topics')
          .select('id, name, order_index, target_problem_count')
          .eq('user_id', userId)
          .order('order_index', { ascending: true }),
        supabase
          .from('dsa_problems')
          .select('id, topic_id, name, difficulty, leetcode_url, solved, solved_date, flagged_for_revision, notes, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false }),
      ]);

      if (topicsResult.error) throw topicsResult.error;
      if (problemsResult.error) throw problemsResult.error;

      setTopics((topicsResult.data ?? []) as DSATopicRow[]);
      setProblems((problemsResult.data ?? []) as DSAProblemRow[]);
    } catch (loadError) {
      console.error('Failed to load DSA data', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Failed to load DSA data');
      setTopics([]);
      setProblems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData().catch((loadError: unknown) => {
      console.error('Unexpected DSA load error', loadError);
      setError('Unexpected error while loading DSA data');
      setLoading(false);
    });
  }, [loadData, reloadToken]);

  const viewData = useMemo<DSAViewData | null>(() => {
    if (!userId) {
      return null;
    }

    if (topics.length === 0 && problems.length === 0) {
      return buildFallbackData();
    }

    const grouped = groupByTopic(topics, problems);
    const stats = buildStats(grouped.allProblems);

    return {
      stats,
      topics: grouped.topicSummaries,
      problemsByTopic: grouped.problemsByTopic,
      revisionQueue: grouped.revisionQueue,
      recentSolves: grouped.recentSolves,
    };
  }, [problems, topics, userId]);

  const toggleSolved = useCallback(async (problemId: string): Promise<void> => {
    const target = problems.find((problem) => problem.id === problemId);
    if (!target) return;

    const nextSolved = !target.solved;
    const nextSolvedDate = nextSolved ? todayIST() : null;

    const { error: updateError } = await supabase
      .from('dsa_problems')
      .update({
        solved: nextSolved,
        solved_date: nextSolvedDate,
      })
      .eq('id', problemId);

    if (updateError) {
      throw updateError;
    }

    setProblems((current) =>
      current.map((problem) =>
        problem.id === problemId
          ? {
              ...problem,
              solved: nextSolved,
              solved_date: nextSolvedDate,
            }
          : problem
      )
    );
    setReloadToken((value) => value + 1);
  }, [problems]);

  const toggleRevision = useCallback(async (problemId: string): Promise<void> => {
    const target = problems.find((problem) => problem.id === problemId);
    if (!target) return;

    const nextFlagged = !target.flagged_for_revision;

    const { error: updateError } = await supabase
      .from('dsa_problems')
      .update({
        flagged_for_revision: nextFlagged,
      })
      .eq('id', problemId);

    if (updateError) {
      throw updateError;
    }

    setProblems((current) =>
      current.map((problem) =>
        problem.id === problemId
          ? {
              ...problem,
              flagged_for_revision: nextFlagged,
            }
          : problem
      )
    );
    setReloadToken((value) => value + 1);
  }, [problems]);

  const updateNotes = useCallback(async (problemId: string, notes: string): Promise<void> => {
    const { error: updateError } = await supabase
      .from('dsa_problems')
      .update({ notes })
      .eq('id', problemId);

    if (updateError) {
      throw updateError;
    }

    setProblems((current) =>
      current.map((problem) =>
        problem.id === problemId
          ? {
              ...problem,
              notes,
            }
          : problem
      )
    );
  }, []);

  const addCustomProblem = useCallback(
    async (input: AddCustomProblemInput): Promise<void> => {
      if (!userId) {
        throw new Error('User is required to add a problem.');
      }

      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new Error('Problem name is required.');
      }

      const { data: inserted, error: insertError } = await supabase
        .from('dsa_problems')
        .insert({
          user_id: userId,
          topic_id: input.topicId,
          name: trimmedName,
          difficulty: input.difficulty,
          leetcode_url: input.leetcodeUrl?.trim() || null,
          solved: false,
          flagged_for_revision: false,
          notes: '',
        })
        .select('id, topic_id, name, difficulty, leetcode_url, solved, solved_date, flagged_for_revision, notes, updated_at')
        .single();

      if (insertError) {
        throw insertError;
      }

      if (inserted) {
        setProblems((current) => [inserted as DSAProblemRow, ...current]);
      }

      setReloadToken((value) => value + 1);
    },
    [userId]
  );

  return {
    data: viewData,
    loading,
    error,
    toggleSolved,
    toggleRevision,
    updateNotes,
    addCustomProblem,
  };
}
