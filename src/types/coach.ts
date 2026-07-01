/**
 * AI Coach types.
 */

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

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

export interface CoachChatContext {
  dsaSolvedThisWeek: number;
  dsaWeeklyTarget: number;
  topicsNotTouchedIn7Days: string[];
  currentStreak: number;
  upcomingDeadlines: Array<{ company: string; date: string }>;
  certificationsBehindSchedule: string[];
  mocksThisWeek: number;
  weeklyGoalsCompleted: number;
  weeklyGoalsTotal: number;
  activeApplicationsCount: number;
  currentPhase: string;
  daysUntilPeakSeason: number;
}

export interface CoachChatResult {
  reply: string;
}
