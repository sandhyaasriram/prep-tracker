/**
 * Common utility functions for formatting, dates, and data manipulation.
 */

import { addDays, differenceInCalendarDays, format, parse } from 'date-fns';
import { DISPLAY_DATE_FORMAT, DISPLAY_DATETIME_FORMAT, DATE_FORMAT, IST_OFFSET_MS } from '@/constants';

/**
 * Format a date string for display (e.g., "Jan 15, 2026").
 */
export function formatDisplayDate(dateString: string): string {
  try {
    const date = parse(dateString, DATE_FORMAT, new Date());
    return format(date, DISPLAY_DATE_FORMAT);
  } catch {
    return dateString;
  }
}

/**
 * Format a date string with time for display (e.g., "Jan 15, 2026 2:30 PM").
 */
export function formatDisplayDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, DISPLAY_DATETIME_FORMAT);
  } catch {
    return dateString;
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
export function calculatePercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
