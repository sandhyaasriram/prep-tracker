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

export interface CoachContext {
  firstName: string;
  dsaSolvedThisWeek: number;
  dsaWeeklyTarget: number;
  currentStreak: number;
  topicsDueForRevision: string[];
  upcomingDeadlines: CoachDeadline[];
  topOaTopics: string[];
  certificationsBehind: CoachCertificationStatus[];
  mocksThisWeek: number;
}

export type CoachBriefSource = 'gemini' | 'fallback';

export interface CoachBriefResult {
  brief: string;
  source: CoachBriefSource;
}
