/**
 * AI Coach brief cache and regenerate rate limiting (IST day boundaries).
 */

import { getCachedBrief, setCachedBrief, clearCachedBrief as clearStorageBrief } from '@/utils/storage';
import { todayIST } from '@/utils';
import type { CoachBriefSource } from '@/types/coach';

const REGENERATE_KEY = 'gemini_regenerate_count';
const MAX_REGENERATIONS_PER_DAY = 3;

interface RegenerateCount {
  date: string;
  count: number;
}

function getRegenerateState(): RegenerateCount {
  const stored = localStorage.getItem(REGENERATE_KEY);

  if (!stored) {
    return { date: todayIST(), count: 0 };
  }

  try {
    const parsed = JSON.parse(stored) as RegenerateCount;
    if (parsed.date !== todayIST()) {
      return { date: todayIST(), count: 0 };
    }
    return parsed;
  } catch {
    return { date: todayIST(), count: 0 };
  }
}

/**
 * Whether a cached brief from today (IST) exists.
 */
export function hasValidBriefCache(): boolean {
  const cached = getCachedBrief();
  if (!cached) {
    return false;
  }

  return cached.generatedDate.slice(0, 10) === todayIST();
}

/**
 * Read cached brief text for today, if any.
 */
export function readCachedBriefText(): string | null {
  if (!hasValidBriefCache()) {
    return null;
  }

  return getCachedBrief()?.brief ?? null;
}

/**
 * Read cached brief source for today, if any.
 */
export function readCachedBriefSource(): CoachBriefSource | null {
  if (!hasValidBriefCache()) {
    return null;
  }

  return getCachedBrief()?.source ?? null;
}

/**
 * Persist brief to today's cache.
 */
export function writeCachedBrief(brief: string, source: CoachBriefSource = 'fallback'): void {
  setCachedBrief(brief, source);
}

/**
 * Clear brief cache (for regenerate).
 */
export function clearBriefCache(): void {
  clearStorageBrief();
}

/**
 * Remaining manual regenerations allowed today.
 */
export function getRegenerationsRemaining(): number {
  const state = getRegenerateState();
  return Math.max(0, MAX_REGENERATIONS_PER_DAY - state.count);
}

/**
 * Record a manual regeneration attempt. Returns false if rate limit exceeded.
 */
export function consumeRegeneration(): boolean {
  const state = getRegenerateState();

  if (state.count >= MAX_REGENERATIONS_PER_DAY) {
    return false;
  }

  localStorage.setItem(
    REGENERATE_KEY,
    JSON.stringify({
      date: todayIST(),
      count: state.count + 1,
    })
  );

  return true;
}
