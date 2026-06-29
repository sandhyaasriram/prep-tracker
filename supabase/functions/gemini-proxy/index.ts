/**
 * Supabase Edge Function — proxies Gemini API calls using the user's stored API key.
 * Prompt is built server-side from live Supabase data.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoachContextPayload {
  firstName: string;
  dsaSolvedThisWeek: number;
  dsaWeeklyTarget: number;
  currentStreak: number;
  topicsDueForRevision: string[];
  upcomingDeadlines: Array<{ title: string; daysUntil: number; type: string }>;
  topOaTopics: string[];
  certificationsBehind: Array<{ name: string; progress: number; targetDate: string | null; daysUntilTarget: number | null }>;
  mocksThisWeek: number;
}

function buildPrompt(context: CoachContextPayload): string {
  return `You are a direct, honest placement preparation coach for ${context.firstName}. No motivational fluff.

Using this live data:
- DSA solved this week: ${context.dsaSolvedThisWeek}/${context.dsaWeeklyTarget}
- Current streak: ${context.currentStreak} days
- Topics due for revision: ${context.topicsDueForRevision.join(', ') || 'none'}
- Upcoming deadlines (14d): ${context.upcomingDeadlines.map((d) => `${d.title} (${d.daysUntil}d)`).join('; ') || 'none'}
- Top OA topics: ${context.topOaTopics.join(', ') || 'none'}
- Certs behind: ${context.certificationsBehind.map((c) => `${c.name} ${c.progress}%`).join('; ') || 'none'}
- Mocks this week: ${context.mocksThisWeek}

Return ONLY a brief in this exact format:

Good morning, ${context.firstName}.

Today's highest ROI tasks:
1. [Specific task] — [time estimate]
2. [Specific task] — [time estimate]
3. [Specific task] — [time estimate]
4. [Specific task] — [time estimate]

Estimated focus time: Xh Ym

Why these:
[2–3 sentences of honest reasoning]

Watch out for:
[1 honest warning]`;
}

const GEMINI_MODEL = 'gemini-2.5-flash';

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || typeof text !== 'string') {
    throw new Error('Gemini returned an empty response.');
  }

  return text.trim();
}

function daysUntil(dateString: string, today: string): number {
  const target = new Date(`${dateString}T00:00:00Z`).getTime();
  const current = new Date(`${today}T00:00:00Z`).getTime();
  return Math.ceil((target - current) / (1000 * 60 * 60 * 24));
}

function getTodayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function getWeekStart(today: string): string {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 6);
  return date.toISOString().slice(0, 10);
}

async function buildServerCoachContext(supabase: ReturnType<typeof createClient>, userId: string): Promise<CoachContextPayload> {
  const today = getTodayUtcDate();
  const weekStart = getWeekStart(today);

  const [problemsResult, topicsResult, applicationsResult, certificationsResult, mocksResult, oaResult, settingsResult] =
    await Promise.all([
      supabase.from('dsa_problems').select('solved, solved_date, flagged_for_revision, topic_id').eq('user_id', userId),
      supabase.from('dsa_topics').select('id, name').eq('user_id', userId),
      supabase.from('applications').select('company, role, next_deadline').eq('user_id', userId),
      supabase.from('certifications').select('name, status, progress, target_date').eq('user_id', userId),
      supabase.from('mock_interviews').select('date').eq('user_id', userId),
      supabase.from('oa_log').select('topics').eq('user_id', userId),
      supabase.from('user_settings').select('college').eq('user_id', userId).maybeSingle(),
    ]);

  const problems = problemsResult.data ?? [];
  const topics = topicsResult.data ?? [];
  const applications = applicationsResult.data ?? [];
  const certifications = certificationsResult.data ?? [];
  const mocks = mocksResult.data ?? [];
  const oaLogs = oaResult.data ?? [];

  const dsaSolvedThisWeek = problems.filter((problem) => problem.solved && problem.solved_date && problem.solved_date >= weekStart).length;

  const solveDates = problems.filter((p) => p.solved && p.solved_date).map((p) => p.solved_date as string);
  let currentStreak = 0;
  if (solveDates.length > 0) {
    const uniqueDates = [...new Set(solveDates)].sort().reverse();
    currentStreak = 1;
    for (let i = 1; i < uniqueDates.length; i += 1) {
      const prev = new Date(`${uniqueDates[i - 1]}T00:00:00Z`);
      const curr = new Date(`${uniqueDates[i]}T00:00:00Z`);
      const gap = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (gap === 1) currentStreak += 1;
      else break;
    }
  }

  const topicNameById = new Map(topics.map((topic) => [topic.id, topic.name]));
  const lastSolvedByTopic = new Map<string, string>();

  for (const problem of problems) {
    if (!problem.solved || !problem.solved_date) continue;
    const existing = lastSolvedByTopic.get(problem.topic_id);
    if (!existing || problem.solved_date > existing) {
      lastSolvedByTopic.set(problem.topic_id, problem.solved_date);
    }
  }

  const topicsDueForRevision = [...lastSolvedByTopic.entries()]
    .filter(([, solvedDate]) => daysUntil(solvedDate, today) <= -7)
    .map(([topicId]) => topicNameById.get(topicId))
    .filter((name): name is string => Boolean(name))
    .slice(0, 5);

  const upcomingDeadlines = [
    ...applications
      .filter((app) => app.next_deadline)
      .map((app) => ({
        title: `${app.company} · ${app.role}`,
        type: 'Application',
        daysUntil: daysUntil(app.next_deadline as string, today),
      })),
    ...certifications
      .filter((cert) => cert.status === 'In Progress' && cert.target_date)
      .map((cert) => ({
        title: cert.name,
        type: 'Certification',
        daysUntil: daysUntil(cert.target_date as string, today),
      })),
  ]
    .filter((deadline) => deadline.daysUntil >= 0 && deadline.daysUntil <= 14)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  const topicCounts = new Map<string, number>();
  for (const log of oaLogs) {
    for (const topic of log.topics ?? []) {
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
  }

  const topOaTopics = [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  const certificationsBehind = certifications
    .filter((cert) => cert.status === 'In Progress' && cert.target_date)
    .map((cert) => ({
      name: cert.name,
      progress: cert.progress,
      targetDate: cert.target_date,
      daysUntilTarget: daysUntil(cert.target_date as string, today),
    }))
    .filter((cert) => cert.progress < 50 || (cert.daysUntilTarget !== null && cert.daysUntilTarget <= 21))
    .slice(0, 3);

  const mocksThisWeek = mocks.filter((mock) => mock.date >= weekStart && mock.date <= today).length;

  return {
    firstName: 'Sandhyaa',
    dsaSolvedThisWeek,
    dsaWeeklyTarget: 15,
    currentStreak,
    topicsDueForRevision,
    upcomingDeadlines,
    topOaTopics,
    certificationsBehind,
    mocksThisWeek,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables.');
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
    if (body.action !== 'generate_brief') {
      return new Response(JSON.stringify({ error: 'Unsupported action.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: settings, error: settingsError } = await adminClient
      .from('user_settings')
      .select('gemini_api_key_encrypted')
      .eq('user_id', userData.user.id)
      .maybeSingle();

    if (settingsError) {
      throw settingsError;
    }

    const apiKey = settings?.gemini_api_key_encrypted?.trim();
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Gemini API key not configured.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const context = await buildServerCoachContext(adminClient, userData.user.id);
    const prompt = buildPrompt(context);
    const brief = await callGemini(apiKey, prompt);

    return new Response(JSON.stringify({ brief, source: 'gemini' }), {
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
