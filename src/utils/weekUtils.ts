/**
 * Week navigation helpers for Weekly Review.
 */

import { addDays, format, parse } from 'date-fns';
import { DATE_FORMAT } from '@/constants';
import type { WeekDefinition } from '@/types/weekly-review';
import {
  buildCalendarWeekDefinitions,
  getCalendarWeekRangeByNumber,
  getCurrentCalendarWeekNumber,
} from '@/utils/calendarWeek';
import { todayIST } from '@/utils';

const REVIEW_LOCK_DAYS = 7;

/**
 * @deprecated Use buildCalendarWeekDefinitions — weeks are IST Sun–Sat, not derived from goal rows.
 */
export function buildWeekDefinitions(
  goals: Array<{ week_number: number; start_date: string; end_date: string }>
): WeekDefinition[] {
  void goals;
  return buildCalendarWeekDefinitions();
}

/**
 * Resolve the active calendar week number for today.
 */
export function getCurrentWeekNumber(weeks: WeekDefinition[], today: string = todayIST()): number {
  return getCurrentCalendarWeekNumber(weeks, today);
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

export { getCalendarWeekRangeByNumber };
