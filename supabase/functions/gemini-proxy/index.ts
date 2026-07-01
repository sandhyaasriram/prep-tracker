/**
 * Supabase Edge Function — AI Coach conversational chat via Groq.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_MODEL = 'llama-3.1-8b-instant';

interface CoachChatContext {
  dsaSolvedThisWeek: number;
  dsaWeeklyTarget: number;
  topicsNotTouchedIn7Days: string[];
  currentStreak: number;
  upcomingDeadlines: Array<{ company: string; date: string }>;
  certificationsBehindSchedule: string[];
  mocksThisWeek: number;
  weeklyGoalsCompleted: number;
  weeklyGoalsTotal: number;
  activeApplicationsCount: number;
  currentPhase: string;
  daysUntilPeakSeason: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function formatContextBlock(context: CoachChatContext): string {
  const deadlines =
    context.upcomingDeadlines.length > 0
      ? context.upcomingDeadlines.map((d) => `${d.company} (${d.date})`).join(', ')
      : 'none in the next 2 weeks';

  const untouched =
    context.topicsNotTouchedIn7Days.length > 0 ? context.topicsNotTouchedIn7Days.join(', ') : 'none';

  const certs =
    context.certificationsBehindSchedule.length > 0
      ? context.certificationsBehindSchedule.join(', ')
      : 'none behind schedule';

  return `LIVE PLACEMENT DATA (use specific values — do not invent):
- DSA solved this week: ${context.dsaSolvedThisWeek} / ${context.dsaWeeklyTarget}
- Current DSA streak: ${context.currentStreak} days
- DSA topics untouched or stale (7+ days): ${untouched}
- Weekly goals completed: ${context.weeklyGoalsCompleted} / ${context.weeklyGoalsTotal}
- Mock interviews this week: ${context.mocksThisWeek}
- Active applications: ${context.activeApplicationsCount}
- Current prep phase: ${context.currentPhase}
- Days until peak season (Sep 15 2026): ${context.daysUntilPeakSeason}
- Upcoming deadlines: ${deadlines}
- Certifications behind schedule: ${certs}`;
}

function buildOpeningBriefInstruction(firstName: string, greetingPhrase: string): string {
  return `This is the FIRST message of the day. The conversation history is empty.
Generate ONLY your opening brief in EXACTLY this format (plain text, no markdown):

${greetingPhrase}, ${firstName}.

Here's where things stand:
[2-3 sentences about current data state using the live data above]

Today's highest ROI tasks:

[specific task] — [time estimate] — [one line reason]
[specific task] — [time estimate] — [one line reason]
[specific task] — [time estimate] — [one line reason]
What would you like to work through today?`;
}

function buildSystemPrompt(
  context: CoachChatContext,
  firstName: string,
  greetingPhrase: string,
  isOpeningBrief: boolean
): string {
  const contextBlock = formatContextBlock(context);

  const openingRule = isOpeningBrief
    ? `\n\n${buildOpeningBriefInstruction(firstName, greetingPhrase)}`
    : '';

  return `You are a direct, honest placement preparation mentor for ${firstName}. You have full awareness of the user's live placement data.

${contextBlock}

BEHAVIOR:
- Be direct and data-driven. No motivational fluff. Treat the user as an adult.
- Reference specific companies, topics, certs, and goals from the live data when giving advice.
- If the user's intent is unclear, ask one focused clarifying question before advising.
- Proactively suggest specific plans, timelines, and priorities grounded in the data.
- Remember what was discussed earlier in this conversation — you receive the full message history.
- Keep replies concise unless the user asks for depth. Use plain text only — no markdown.${openingRule}`;
}

async function callGroqChat(
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const groqMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: groqMessages,
      temperature: 0.4,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq API error: ${errorText}`);
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;

  if (!text || typeof text !== 'string') {
    throw new Error('Groq returned an empty response.');
  }

  return text.trim();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const groqApiKey = Deno.env.get('GROQ_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables.');
    }

    if (!groqApiKey) {
      return new Response(JSON.stringify({ error: 'Groq API key not configured.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    if (typeof body.userId !== 'string' || body.userId !== userData.user.id) {
      return new Response(JSON.stringify({ error: 'Invalid userId.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!body.context || typeof body.context !== 'object') {
      return new Response(JSON.stringify({ error: 'Missing context.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages: ChatMessage[] = Array.isArray(body.messages)
      ? body.messages
          .filter(
            (message: unknown): message is ChatMessage =>
              typeof message === 'object' &&
              message !== null &&
              (message as ChatMessage).role !== undefined &&
              ((message as ChatMessage).role === 'user' || (message as ChatMessage).role === 'assistant') &&
              typeof (message as ChatMessage).content === 'string'
          )
          .map((message: ChatMessage) => ({
            role: message.role,
            content: message.content.trim(),
          }))
          .filter((message: ChatMessage) => message.content.length > 0)
      : [];

    const context = body.context as CoachChatContext;
    const firstName =
      typeof body.firstName === 'string' && body.firstName.trim() ? body.firstName.trim() : 'there';
    const greetingPhrase =
      typeof body.greetingPhrase === 'string' && body.greetingPhrase.trim()
        ? body.greetingPhrase.trim()
        : 'Good morning';

    const isOpeningBrief = messages.length === 0;
    const systemPrompt = buildSystemPrompt(context, firstName, greetingPhrase, isOpeningBrief);
    const reply = await callGroqChat(groqApiKey, systemPrompt, messages);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
