/**
 * Week navigation helpers for Weekly Review.
 */

import { addDays, format, parse } from 'date-fns';
import { DATE_FORMAT } from '@/constants';
import type { WeekDefinition } from '@/types/weekly-review';
import { todayIST } from '@/utils';

const REVIEW_LOCK_DAYS = 7;

/**
 * Build unique week definitions from weekly goal rows.
 */
export function buildWeekDefinitions(
  goals: Array<{ week_number: number; start_date: string; end_date: string }>
): WeekDefinition[] {
  const weekMap = new Map<number, WeekDefinition>();

  for (const goal of goals) {
    const existing = weekMap.get(goal.week_number);
    if (!existing) {
      weekMap.set(goal.week_number, {
        week_number: goal.week_number,
        start_date: goal.start_date,
        end_date: goal.end_date,
      });
      continue;
    }

    if (goal.start_date < existing.start_date) {
      existing.start_date = goal.start_date;
    }
    if (goal.end_date > existing.end_date) {
      existing.end_date = goal.end_date;
    }
  }

  return [...weekMap.values()].sort((left, right) => left.week_number - right.week_number);
}

/**
 * Resolve the active week for today, falling back to nearest week.
 */
export function getCurrentWeekNumber(weeks: WeekDefinition[], today: string = todayIST()): number {
  const current = weeks.find((week) => today >= week.start_date && today <= week.end_date);
  if (current) {
    return current.week_number;
  }

  const upcoming = weeks.find((week) => week.start_date > today);
  if (upcoming) {
    return upcoming.week_number;
  }

  return weeks[weeks.length - 1]?.week_number ?? 1;
}

/**
 * Whether a week is locked for editing (ended more than 7 days ago).
 */
export function isWeekReviewLocked(endDate: string, today: string = todayIST()): boolean {
  const end = parse(endDate, DATE_FORMAT, new Date());
  const lockDate = format(addDays(end, REVIEW_LOCK_DAYS), DATE_FORMAT);
  return today > lockDate;
}

/**
 * Completion score for a weekly review (0–100).
 */
export function calculateReviewCompletion(review: {
  biggest_win: string;
  bottleneck: string;
  lessons: string;
  focus_next: string;
  hours_worked: number;
  mood_rating: number | null;
  free_notes: string;
}): number {
  const fields = [
    review.biggest_win.trim(),
    review.bottleneck.trim(),
    review.lessons.trim(),
    review.focus_next.trim(),
    review.free_notes.trim(),
  ];
  const filled = fields.filter(Boolean).length;
  const extras = (review.hours_worked > 0 ? 1 : 0) + (review.mood_rating !== null ? 1 : 0);
  const total = fields.length + 2;

  return Math.round(((filled + extras) / total) * 100);
}
