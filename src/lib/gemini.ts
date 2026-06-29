/**
 * Gemini API client helper (frontend-side).
 * The actual API call is proxied through a Supabase Edge Function for security.
 */

/**
 * Call the Gemini proxy Edge Function to generate an AI brief.
 * @param userContext Object containing DSA stats, applications, certifications, etc.
 * @returns Generated brief string from Gemini
 */
export async function callGeminiBrief(userContext: Record<string, unknown>): Promise<string> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-proxy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'generate_brief',
          context: userContext,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini proxy error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.brief || '';
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

/**
 * Get cached brief from localStorage or generate a new one.
 */
export async function getCachedOrGenerateBrief(userContext: Record<string, unknown>): Promise<string> {
  const cacheKey = 'gemini_brief_cache';
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const { brief, generatedDate } = JSON.parse(cached);
      const now = new Date();
      const lastGen = new Date(generatedDate);

      // If generated today (in IST), return cached
      if (now.toDateString() === lastGen.toDateString()) {
        return brief;
      }
    } catch {
      // Invalid cache, regenerate
    }
  }

  // Generate new brief
  const brief = await callGeminiBrief(userContext);

  // Cache it
  localStorage.setItem(
    cacheKey,
    JSON.stringify({
      brief,
      generatedDate: new Date().toISOString(),
    })
  );

  return brief;
}

/**
 * Clear cached brief (e.g., for "Regenerate" button).
 */
export function clearCachedBrief(): void {
  localStorage.removeItem('gemini_brief_cache');
}

/**
 * Fallback rules-based brief if Gemini is unavailable.
 */
export function generateFallbackBrief(stats: {
  dsaSolvedThisWeek: number;
  topicsNotTouchedDays: string[];
  upcomingDeadlines: Array<{ company: string; days: number }>;
  currentStreak: number;
}): string {
  const tasks: string[] = [];

  if (stats.dsaSolvedThisWeek < 10) {
    tasks.push(`Solve 3+ DSA problems today — you're at ${stats.dsaSolvedThisWeek} for the week. ${stats.currentStreak}d streak to maintain.`);
  }

  if (stats.topicsNotTouchedDays.length > 0) {
    tasks.push(`Revise ${stats.topicsNotTouchedDays[0]} — last touched 7+ days ago.`);
  }

  if (stats.upcomingDeadlines.length > 0) {
    const nearestDeadline = stats.upcomingDeadlines[0];
    tasks.push(`Follow up on ${nearestDeadline.company} — ${nearestDeadline.days} days until decision.`);
  }

  if (tasks.length === 0) {
    tasks.push('Continue your DSA revision and monitor application statuses.');
  }

  return `Good morning.

Today's highest ROI tasks:
${tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Focus time: 3–4h for solid progress.

Why these: Maintaining streak momentum, avoiding revision gaps, and staying on top of open processes.

Watch out for: Application deadlines coming up — check every morning.`;
}
