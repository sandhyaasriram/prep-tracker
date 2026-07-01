/**
 * Shared progress calculations for nav bar and dashboard.
 */

import profileSeed from '@/seed/profile.json';
import { goalsInCalendarWeek } from '@/utils/calendarWeek';
import { todayIST } from '@/utils';

interface WeeklyGoalLike {
  start_date: string;
  end_date: string;
  completed: boolean;
}

/**
 * Calculate percentage complete.
 */
export function calculatePercentage(completed: number, total: number): number {
  if (total === 0) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

/**
 * Weekly goal completion for the current IST calendar week (Sun–Sat).
 */
export function calculateWeeklyProgress(goals: WeeklyGoalLike[], today: string = todayIST()): number {
  const weekGoals = goalsInCalendarWeek(goals, today);
  const weeklyCompleted = weekGoals.filter((goal) => goal.completed).length;
  const weeklyTotal = weekGoals.length;

  return weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;
}

/**
 * Stats for the current IST calendar week.
 */
export function getCalendarWeekGoalStats(goals: WeeklyGoalLike[], today: string = todayIST()): {
  completed: number;
  total: number;
} {
  const weekGoals = goalsInCalendarWeek(goals, today);
  return {
    completed: weekGoals.filter((goal) => goal.completed).length,
    total: weekGoals.length,
  };
}

/**
 * Placement season elapsed progress from profile seed dates.
 */
export function calculateSeasonProgress(today: string = todayIST()): number {
  const start = profileSeed.placement_season.start;
  const end = profileSeed.placement_season.end;

  if (today <= start) {
    return 0;
  }

  if (today >= end) {
    return 100;
  }

  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  const todayMs = new Date(today).getTime();
  const elapsed = todayMs - startMs;
  const total = endMs - startMs;

  return calculatePercentage(elapsed, total);
}
