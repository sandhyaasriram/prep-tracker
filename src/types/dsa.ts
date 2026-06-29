/**
 * DSA domain types for the tracker page.
 */

import type { DSADifficulty } from '@/types';

export interface DSATopicSummary {
  id: string;
  name: string;
  orderIndex: number;
  targetProblemCount: number;
  solvedCount: number;
  revisionCount: number;
  lastSolvedDate: string | null;
  dueForRevision: boolean;
}

export interface DSAProblemSummary {
  id: string;
  topicId: string;
  topicName: string;
  name: string;
  difficulty: DSADifficulty;
  leetcodeUrl: string | null;
  solved: boolean;
  solvedDate: string | null;
  flaggedForRevision: boolean;
  notes: string;
}

export interface DSAStats {
  totalSolved: number;
  solvedThisWeek: number;
  solvedToday: number;
  currentStreak: number;
  longestStreak: number;
  topicsDueForRevision: number;
  totalProblems: number;
}

export interface DSAViewData {
  stats: DSAStats;
  topics: DSATopicSummary[];
  problemsByTopic: Record<string, DSAProblemSummary[]>;
  revisionQueue: DSAProblemSummary[];
  recentSolves: DSAProblemSummary[];
}
