/**
 * IST calendar weeks — Sunday 00:00 through Saturday (inclusive dates).
 * Week numbering starts at 1 from the Pre-College phase anchor (profile seed).
 */

import { addDays, differenceInCalendarDays, format, parse } from 'date-fns';
import profileSeed from '@/seed/profile.json';
import { DATE_FORMAT } from '@/constants';
import type { WeekDefinition } from '@/types/weekly-review';
import { todayIST } from '@/utils/istDate';

function sundayOnOrBefore(date: string): string {
  const parsed = parse(date, DATE_FORMAT, new Date());
  const dayOfWeek = parsed.getDay();
  return format(addDays(parsed, -dayOfWeek), DATE_FORMAT);
}

/** Sunday that begins placement calendar week 1 (week of Pre-College phase start). */
export const CALENDAR_WEEK_ANCHOR = sundayOnOrBefore(profileSeed.phase_schedule[0]?.start ?? '2026-06-29');

export interface CalendarWeekRange {
  startDate: string;
  endDate: string;
  weekNumber: number;
}

function parseDate(date: string): Date {
  return parse(date, DATE_FORMAT, new Date());
}

/**
 * Sunday (start) of the IST calendar week containing `date`.
 */
export function getCalendarWeekSunday(date: string): string {
  const parsed = parseDate(date);
  const dayOfWeek = parsed.getDay();
  return format(addDays(parsed, -dayOfWeek), DATE_FORMAT);
}

/**
 * Saturday (end) of the calendar week that begins on `sunday`.
 */
export function getCalendarWeekSaturday(sunday: string): string {
  return format(addDays(parseDate(sunday), 6), DATE_FORMAT);
}

/**
 * Calendar week bounds and 1-based week number for `date`.
 */
export function getCalendarWeekRange(date: string = todayIST()): CalendarWeekRange {
  const startDate = getCalendarWeekSunday(date);
  const endDate = getCalendarWeekSaturday(startDate);
  const weekNumber = getCalendarWeekNumber(date);

  return { startDate, endDate, weekNumber };
}

/**
 * 1-based week index from the anchor Sunday.
 */
export function getCalendarWeekNumber(date: string = todayIST()): number {
  const sunday = getCalendarWeekSunday(date);
  const daysFromAnchor = differenceInCalendarDays(parseDate(sunday), parseDate(CALENDAR_WEEK_ANCHOR));
  return Math.floor(daysFromAnchor / 7) + 1;
}

/**
 * Sunday start date for a given 1-based calendar week number.
 */
export function getCalendarWeekStartByNumber(weekNumber: number): string {
  return format(addDays(parseDate(CALENDAR_WEEK_ANCHOR), (weekNumber - 1) * 7), DATE_FORMAT);
}

/**
 * Date range for a 1-based calendar week number.
 */
export function getCalendarWeekRangeByNumber(weekNumber: number): CalendarWeekRange {
  const startDate = getCalendarWeekStartByNumber(weekNumber);
  const endDate = getCalendarWeekSaturday(startDate);
  return { startDate, endDate, weekNumber };
}

/**
 * Whether a date falls inside a calendar week (inclusive).
 */
export function isDateInCalendarWeek(date: string, weekStart: string, weekEnd: string): boolean {
  return date >= weekStart && date <= weekEnd;
}

/**
 * Goals assigned to the calendar week containing `date` (exact start/end match).
 */
export function goalsInCalendarWeek<T extends { start_date: string; end_date: string }>(
  goals: T[],
  date: string = todayIST()
): T[] {
  const { startDate, endDate } = getCalendarWeekRange(date);
  return goals.filter((goal) => goal.start_date === startDate && goal.end_date === endDate);
}

/**
 * Build week definitions for weekly review navigation (anchor → season end).
 */
export function buildCalendarWeekDefinitions(
  endDate: string = profileSeed.placement_season.end
): WeekDefinition[] {
  const weeks: WeekDefinition[] = [];
  let weekNumber = 1;
  let sunday = CALENDAR_WEEK_ANCHOR;

  while (sunday <= endDate) {
    const saturday = getCalendarWeekSaturday(sunday);
    weeks.push({
      week_number: weekNumber,
      start_date: sunday,
      end_date: saturday,
    });
    sunday = format(addDays(parseDate(saturday), 1), DATE_FORMAT);
    weekNumber += 1;
  }

  return weeks;
}

/**
 * Resolve the active calendar week number for today.
 */
export function getCurrentCalendarWeekNumber(
  weeks: WeekDefinition[],
  today: string = todayIST()
): number {
  const current = weeks.find((week) => isDateInCalendarWeek(today, week.start_date, week.end_date));
  if (current) {
    return current.week_number;
  }

  return getCalendarWeekNumber(today);
}
