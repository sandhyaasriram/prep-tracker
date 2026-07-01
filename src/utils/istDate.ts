/**
 * IST date/time helpers — always derive calendar date from UTC + offset, never local format().
 */

import { format } from 'date-fns';
import { DATE_FORMAT, IST_OFFSET_MS } from '@/constants';

function shiftToIST(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

/**
 * Format an instant as YYYY-MM-DD in IST.
 */
export function toISTDateString(date: Date = new Date()): string {
  const ist = shiftToIST(date);
  return format(
    new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate())),
    DATE_FORMAT
  );
}

/**
 * Hour of day (0–23) in IST for greetings and time-of-day logic.
 */
export function getISTHour(date: Date = new Date()): number {
  return shiftToIST(date).getUTCHours();
}

export const todayIST = toISTDateString;
