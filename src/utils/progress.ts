/**
 * Shared progress calculations for nav bar and dashboard.
 */

import profileSeed from '@/seed/profile.json';
import { todayIST } from '@/utils';

interface WeeklyGoalLike {
  start_date: string;
  end_date: string;
  completed: boolean;
}

function chooseCurrentOrUpcomingGoal<T extends WeeklyGoalLike>(goals: T[], today: string): T | undefined {
  const currentGoal = goals.find((goal) => goal.start_date <= today && goal.end_date >= today);
  if (currentGoal) {
    return currentGoal;
  }

  const upcomingGoals = goals
    .filter((goal) => goal.start_date >= today)
    .sort((left, right) => left.start_date.localeCompare(right.start_date));

  return upcomingGoals[0] ?? goals[0];
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
 * Weekly goal completion for the current calendar week.
 */
export function calculateWeeklyProgress(goals: WeeklyGoalLike[], today: string = todayIST()): number {
  const weeklyCompleted = goals.filter(
    (goal) => goal.start_date <= today && goal.end_date >= today && goal.completed
  ).length;
  const weeklyTotal =
    goals.filter((goal) => goal.start_date <= today && goal.end_date >= today).length ||
    (chooseCurrentOrUpcomingGoal(goals, today) ? 1 : 0);

  return weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;
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
