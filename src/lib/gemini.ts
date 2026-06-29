/**
 * Gemini API client helper (frontend-side).
 * All Gemini calls are proxied through a Supabase Edge Function.
 */

import type { CoachBriefResult, CoachBriefSource } from '@/types/coach';

interface GeminiProxyResponse {
  brief?: string;
  source?: CoachBriefSource;
  error?: string;
}

/**
 * Call the Gemini proxy Edge Function to generate an AI brief.
 */
export async function callGeminiBrief(accessToken: string, force = false): Promise<CoachBriefResult> {
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
    }),
  });

  const data = (await response.json()) as GeminiProxyResponse;

  if (!response.ok) {
    throw new Error(data.error ?? `Gemini proxy error: ${response.statusText}`);
  }

  if (!data.brief) {
    throw new Error('Gemini proxy returned an empty brief.');
  }

  return {
    brief: data.brief,
    source: data.source ?? 'gemini',
  };
}
