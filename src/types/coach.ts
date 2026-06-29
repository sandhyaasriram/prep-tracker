/**
 * AI Coach types.
 */

export interface CoachDeadline {
  title: string;
  daysUntil: number;
  type: string;
}

export interface CoachCertificationStatus {
  name: string;
  progress: number;
  targetDate: string | null;
  daysUntilTarget: number | null;
}

export interface CoachApplicationStage {
  stage: string;
  count: number;
  companies: string[];
}

export interface CoachWeeklyGoal {
  category: string;
  goalText: string;
  completed: boolean;
}

export interface CoachContext {
  firstName: string;
  dsaSolvedThisWeek: number;
  dsaWeeklyTarget: number;
  currentStreak: number;
  topicsDueForRevision: string[];
  untouchedDsaTopics: string[];
  upcomingDeadlines: CoachDeadline[];
  applicationsByStage: CoachApplicationStage[];
  weeklyGoals: CoachWeeklyGoal[];
  weeklyGoalsCompleted: number;
  weeklyGoalsTotal: number;
  projectGaps: string[];
  topOaTopics: string[];
  certificationsBehind: CoachCertificationStatus[];
  mocksThisWeek: number;
  daysUntilPeakSeason: number;
}

export type CoachBriefSource = 'groq' | 'fallback';

export interface CoachBriefResult {
  brief: string;
  source: CoachBriefSource;
}
