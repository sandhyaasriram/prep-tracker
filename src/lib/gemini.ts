/**
 * AI Coach API client — proxied through the gemini-proxy Supabase Edge Function (Groq).
 */

import type { CoachChatContext, CoachChatResult } from '@/types/coach';
import { getTimeOfDayGreetingPhrase } from '@/utils';

interface CoachProxyError {
  error?: string;
}

export interface CallCoachChatOptions {
  userId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: CoachChatContext;
  firstName: string;
}

/**
 * Call the coach proxy for a conversational reply.
 */
export async function callCoachChat(accessToken: string, options: CallCoachChatOptions): Promise<CoachChatResult> {
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
    },
    body: JSON.stringify({
      userId: options.userId,
      messages: options.messages,
      context: options.context,
      firstName: options.firstName,
      greetingPhrase: getTimeOfDayGreetingPhrase(),
    }),
  });

  const data = (await response.json()) as CoachChatResult & CoachProxyError;

  if (!response.ok) {
    throw new Error(data.error ?? `Coach proxy error: ${response.statusText}`);
  }

  if (!data.reply) {
    throw new Error('Coach proxy returned an empty reply.');
  }

  return { reply: data.reply };
}
