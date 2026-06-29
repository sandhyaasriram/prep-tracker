/**
 * AI Coach API client — proxied through a Supabase Edge Function (Groq).
 */

import type { CoachBriefResult, CoachBriefSource } from '@/types/coach';
import { getTimeOfDayGreetingPhrase } from '@/utils';

interface CoachProxyResponse {
  brief?: string;
  source?: CoachBriefSource;
  error?: string;
}

/**
 * Call the coach proxy Edge Function to generate an AI brief.
 */
export async function callCoachBrief(accessToken: string, force = false): Promise<CoachBriefResult> {
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
    },
    body: JSON.stringify({
      action: 'generate_brief',
      force,
      greetingPhrase: getTimeOfDayGreetingPhrase(),
    }),
  });

  const data = (await response.json()) as CoachProxyResponse;

  if (!response.ok) {
    throw new Error(data.error ?? `Coach proxy error: ${response.statusText}`);
  }

  if (!data.brief) {
    throw new Error('Coach proxy returned an empty brief.');
  }

  return {
    brief: data.brief,
    source: data.source ?? 'groq',
  };
}

/** @deprecated Use callCoachBrief */
export const callGeminiBrief = callCoachBrief;
