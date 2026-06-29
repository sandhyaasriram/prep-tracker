/**
 * Common utility functions for formatting, dates, and data manipulation.
 */

import { addDays, differenceInCalendarDays, format, parse } from 'date-fns';
import { DISPLAY_DATE_FORMAT, DISPLAY_DATETIME_FORMAT, DATE_FORMAT, IST_OFFSET_MS, PEAK_SEASON_START } from '@/constants';

const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T/;

/**
 * Format a UTC ISO timestamp for display in IST (e.g. "29 Jun 26 · 23:10 IST").
 * Date-only strings (YYYY-MM-DD) render as "29 Jun 26" without a time segment.
 */
export function formatTimestampIST(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = parse(value, DATE_FORMAT, new Date());
    return format(date, 'dd MMM yy');
  }

  if (!ISO_TIMESTAMP_PATTERN.test(value)) {
    return value;
  }

  const utc = new Date(value);
  if (Number.isNaN(utc.getTime())) {
    return value;
  }

  const ist = new Date(utc.getTime() + IST_OFFSET_MS);
  const datePart = format(
    new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate())),
    'dd MMM yy'
  );
  const hours = String(ist.getUTCHours()).padStart(2, '0');
  const minutes = String(ist.getUTCMinutes()).padStart(2, '0');

  return `${datePart} · ${hours}:${minutes} IST`;
}

/**
 * Format a date string for display (e.g., "Jan 15, 2026").
 */
export function formatDisplayDate(dateString: string): string {
  if (ISO_TIMESTAMP_PATTERN.test(dateString)) {
    return formatTimestampIST(dateString).split(' · ')[0] ?? formatTimestampIST(dateString);
  }

  try {
    const date = parse(dateString, DATE_FORMAT, new Date());
    return format(date, DISPLAY_DATE_FORMAT);
  } catch {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return format(parse(dateString, DATE_FORMAT, new Date()), DISPLAY_DATE_FORMAT);
    }
    return '—';
  }
}

/**
 * Format a date string with time for display (e.g., "Jan 15, 2026 2:30 PM").
 */
export function formatDisplayDateTime(dateString: string): string {
  if (ISO_TIMESTAMP_PATTERN.test(dateString)) {
    return formatTimestampIST(dateString);
  }

  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return format(date, DISPLAY_DATETIME_FORMAT);
  } catch {
    return '—';
  }
}

/**
 * Convert UTC date to IST string (YYYY-MM-DD).
 */
export function toIST(utcDate: Date): string {
  const istDate = new Date(utcDate.getTime() + IST_OFFSET_MS);
  return format(istDate, DATE_FORMAT);
}

/**
 * Get today's date as YYYY-MM-DD string in IST.
 */
export function todayIST(): string {
  return toIST(new Date());
}

/**
 * Check if date string is today (in IST).
 */
export function isDateToday(dateString: string): boolean {
  return dateString === todayIST();
}

/**
 * Check if date string is in the past.
 */
export function isDatePast(dateString: string): boolean {
  return dateString < todayIST();
}

/**
 * Check if date string is in the future.
 */
export function isDateFuture(dateString: string): boolean {
  return dateString > todayIST();
}

/**
 * Get days until a date.
 */
export function daysUntil(dateString: string): number {
  const today = new Date(todayIST());
  const target = parse(dateString, DATE_FORMAT, new Date());
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get days since a date.
 */
export function daysSince(dateString: string): number {
  return -daysUntil(dateString);
}

export type TimeOfDayGreeting = 'Morning' | 'Afternoon' | 'Evening';

/**
 * Time-of-day greeting label based on the user's local clock.
 * 5am–11:59am → Morning; 12pm–4:59pm → Afternoon; 5pm–4:59am → Evening.
 */
export function getTimeOfDayGreeting(date = new Date()): TimeOfDayGreeting {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return 'Morning';
  }

  if (hour >= 12 && hour < 17) {
    return 'Afternoon';
  }

  return 'Evening';
}

/**
 * Full greeting phrase for coach briefs (e.g. "Good morning").
 */
export function getTimeOfDayGreetingPhrase(date = new Date()): string {
  return `Good ${getTimeOfDayGreeting(date).toLowerCase()}`;
}

export interface PeakSeasonDashboardState {
  isActive: boolean;
  daysLeft: number;
}

/**
 * Peak season countdown / active state for the dashboard.
 */
export function getPeakSeasonDashboardState(referenceDate = todayIST()): PeakSeasonDashboardState {
  const isActive = referenceDate >= PEAK_SEASON_START;
  const daysLeft = Math.max(daysUntil(PEAK_SEASON_START), 0);

  return { isActive, daysLeft };
}

/**
 * Format a number as percentage string.
 */
export function formatPercent(value: number, decimals = 0): string {
  return `${(value).toFixed(decimals)}%`;
}

/**
 * Export data as CSV blob.
 * @param data Array of objects to export
 * @param filename Name of the CSV file
 */
export function exportToCSV(data: unknown[], filename: string): void {
  if (data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0] as Record<string, unknown>);

  // Build CSV string
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = (row as Record<string, unknown>)[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        })
        .join(',')
    ),
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export data as JSON blob.
 * @param data Object or array to export
 * @param filename Name of the JSON file
 */
export function exportToJSON(data: unknown, filename: string): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Generate a CSV filename with IST timestamp.
 */
export function generateCSVFilename(section: string): string {
  return `placementos_${section}_${todayIST()}.csv`;
}

/**
 * Calculate current consecutive-day streak ending today or yesterday.
 */
export function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const uniqueDates = [...new Set(dates)].sort().reverse();
  const today = todayIST();
  const yesterday = format(addDays(parse(today, DATE_FORMAT, new Date()), -1), DATE_FORMAT);

  const mostRecent = uniqueDates[0];
  if (mostRecent !== today && mostRecent !== yesterday) {
    return 0;
  }

  let streak = 0;
  let expectedDate = parse(mostRecent, DATE_FORMAT, new Date());

  for (const dateStr of uniqueDates) {
    const date = parse(dateStr, DATE_FORMAT, new Date());

    if (format(date, DATE_FORMAT) === format(expectedDate, DATE_FORMAT)) {
      streak++;
      expectedDate = addDays(expectedDate, -1);
    } else if (format(date, DATE_FORMAT) < format(expectedDate, DATE_FORMAT)) {
      break;
    }
  }

  return streak;
}

/**
 * Calculate the longest consecutive-day streak across all solve dates.
 */
export function calculateLongestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const uniqueDates = [...new Set(dates)].sort();
  let longest = 1;
  let current = 1;

  for (let index = 1; index < uniqueDates.length; index += 1) {
    const previous = parse(uniqueDates[index - 1] ?? '', DATE_FORMAT, new Date());
    const currentDate = parse(uniqueDates[index] ?? '', DATE_FORMAT, new Date());
    const dayGap = differenceInCalendarDays(currentDate, previous);

    if (dayGap === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else if (dayGap > 1) {
      current = 1;
    }
  }

  return longest;
}

/**
 * Determine current placement phase based on today's date.
 */
export function getCurrentPhase(phaseSchedule: Array<{ name: string; start: string; end: string }>): string {
  const today = todayIST();

  for (const phase of phaseSchedule) {
    if (today >= phase.start && today <= phase.end) {
      return phase.name;
    }
  }

  return phaseSchedule[phaseSchedule.length - 1]?.name || 'Unknown';
}

/**
 * Calculate percentage complete.
 */
export { calculatePercentage, calculateSeasonProgress, calculateWeeklyProgress } from './progress';
