/**
 * Mission Control data types.
 * Shared between the dashboard hook and page component.
 */

import type { Phase } from '@/types';

export interface MissionTask {
  id: string;
  title: string;
  category: 'DSA' | 'Applications' | 'Projects' | 'Certifications' | 'Interview Prep' | 'Journal';
  estimateMinutes: number;
  completed: boolean;
  note: string;
}

export interface UpcomingDeadline {
  id: string;
  title: string;
  type: 'Application' | 'Certification';
  dueDate: string;
  daysUntil: number;
}

export interface RecentActivityItem {
  id: string;
  title: string;
  detail: string;
  date: string;
  type: 'DSA' | 'Applications' | 'Projects' | 'Certifications' | 'Interview Prep' | 'Journal';
}

export interface MissionControlData {
  firstName: string;
  greeting: string;
  currentDateLabel: string;
  currentPhase: Phase;
  phaseSchedule: Array<{ name: Phase; start: string; end: string }>;
  currentWeekLabel: string;
  weekRangeLabel: string;
  missionTasks: MissionTask[];
  weeklyCompleted: number;
  weeklyTotal: number;
  weeklyProgressPercent: number;
  estimatedFocusMinutes: number;
  currentStreak: number;
  totalDsaSolved: number;
  activeApplications: number;
  mocksDone: number;
  daysUntilPeakSeason: number;
  upcomingDeadlines: UpcomingDeadline[];
  recentActivity: RecentActivityItem[];
}
