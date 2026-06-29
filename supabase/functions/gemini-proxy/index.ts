/**
 * Supabase Edge Function — proxies Groq API calls for the AI Coach brief.
 * Prompt is built server-side from live Supabase data.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PEAK_SEASON_START = '2026-09-15';
const GROQ_MODEL = 'llama-3.1-8b-instant';

interface CoachContextPayload {
  firstName: string;
  dsaSolvedThisWeek: number;
  dsaWeeklyTarget: number;
  currentStreak: number;
  topicsDueForRevision: string[];
  untouchedDsaTopics: string[];
  upcomingDeadlines: Array<{ title: string; daysUntil: number; type: string }>;
  applicationsByStage: Array<{ stage: string; count: number; companies: string[] }>;
  weeklyGoals: Array<{ category: string; goalText: string; completed: boolean }>;
  weeklyGoalsCompleted: number;
  weeklyGoalsTotal: number;
  projectGaps: string[];
  topOaTopics: string[];
  certificationsBehind: Array<{ name: string; progress: number; targetDate: string | null; daysUntilTarget: number | null }>;
  mocksThisWeek: number;
  daysUntilPeakSeason: number;
}

function buildPrompt(context: CoachContextPayload, greetingPhrase: string): string {
  const appsByStage =
    context.applicationsByStage
      .map((entry) => `${entry.stage}: ${entry.count}${entry.companies.length ? ` (${entry.companies.join(', ')})` : ''}`)
      .join('; ') || 'none';

  const weeklyGoalsLines =
    context.weeklyGoals.length > 0
      ? context.weeklyGoals.map((goal) => `- [${goal.completed ? 'x' : ' '}] ${goal.category}: ${goal.goalText}`).join('\n')
      : '- none';

  const projectGaps = context.projectGaps.length > 0 ? context.projectGaps.join('; ') : 'none';
  const untouchedTopics = context.untouchedDsaTopics.length > 0 ? context.untouchedDsaTopics.join(', ') : 'none';
  const revisionTopics = context.topicsDueForRevision.length > 0 ? context.topicsDueForRevision.join(', ') : 'none';
  const deadlines =
    context.upcomingDeadlines.map((d) => `${d.title} (${d.daysUntil}d, ${d.type})`).join('; ') || 'none';
  const certs =
    context.certificationsBehind
      .map((c) => `${c.name} ${c.progress}%${c.daysUntilTarget !== null ? `, ${c.daysUntilTarget}d left` : ''}`)
      .join('; ') || 'none';

  return `You are a direct, honest placement preparation coach for ${context.firstName}. No motivational fluff. No markdown. No extra sections.

LIVE DATA — use specific names from this data in every task:
- DSA solved this week: ${context.dsaSolvedThisWeek}/${context.dsaWeeklyTarget} (streak: ${context.currentStreak} days)
- DSA topics untouched (0 solved): ${untouchedTopics}
- DSA topics due for revision (7+ days): ${revisionTopics}
- Applications by stage: ${appsByStage}
- Upcoming deadlines (14d): ${deadlines}
- Weekly goals (${context.weeklyGoalsCompleted}/${context.weeklyGoalsTotal} done):
${weeklyGoalsLines}
- Project/resume gaps: ${projectGaps}
- Top OA topics: ${context.topOaTopics.join(', ') || 'none'}
- Certs behind: ${certs}
- Mocks this week: ${context.mocksThisWeek}
- Days until peak season (Sep 15 2026): ${context.daysUntilPeakSeason}

RULES:
- Every task MUST cite a specific company, topic, cert, project gap, or weekly goal from the data above.
- If any deadline is within 7 days, at least one task MUST name that company or cert explicitly.
- If any DSA topic has 0 solved, at least one task MUST name that exact topic.
- Time estimates must use formats like "45 min" or "1h 30m".
- Do NOT add headings beyond the template below.
- Do NOT use bullets except the numbered tasks 1–4.
- Output MUST match the template EXACTLY — no preamble, no closing remark, no markdown.

Return ONLY this brief:

${greetingPhrase}, ${context.firstName}.

Today's highest ROI tasks:
1. [Specific task] — [time estimate]
2. [Specific task] — [time estimate]
3. [Specific task] — [time estimate]
4. [Specific task] — [time estimate]

Estimated focus time: Xh Ym

Why these:
[2–3 sentences of honest reasoning tied to the data above]

Watch out for:
[1 honest warning referencing specific data]`;
}

async function callGroq(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You follow output templates exactly. No markdown. No extra commentary.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
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

async function buildServerCoachContext(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<CoachContextPayload> {
  const today = getTodayUtcDate();
  const weekStart = getWeekStart(today);

  const [
    problemsResult,
    topicsResult,
    applicationsResult,
    certificationsResult,
    mocksResult,
    oaResult,
    weeklyGoalsResult,
    projectsResult,
    checklistResult,
  ] = await Promise.all([
    supabase.from('dsa_problems').select('solved, solved_date, flagged_for_revision, topic_id').eq('user_id', userId),
    supabase.from('dsa_topics').select('id, name').eq('user_id', userId),
    supabase.from('applications').select('company, role, stage, next_deadline').eq('user_id', userId),
    supabase.from('certifications').select('name, status, progress, target_date').eq('user_id', userId),
    supabase.from('mock_interviews').select('date').eq('user_id', userId),
    supabase.from('oa_log').select('topics').eq('user_id', userId),
    supabase.from('weekly_goals').select('category, goal_text, completed, start_date, end_date').eq('user_id', userId),
    supabase.from('projects').select('id, name, type').eq('user_id', userId),
    supabase.from('project_checklist').select('project_id, item, completed'),
  ]);

  const problems = problemsResult.data ?? [];
  const topics = topicsResult.data ?? [];
  const applications = applicationsResult.data ?? [];
  const certifications = certificationsResult.data ?? [];
  const mocks = mocksResult.data ?? [];
  const oaLogs = oaResult.data ?? [];
  const weeklyGoals = weeklyGoalsResult.data ?? [];
  const projects = projectsResult.data ?? [];
  const checklist = checklistResult.data ?? [];

  const dsaSolvedThisWeek = problems.filter(
    (problem) => problem.solved && problem.solved_date && problem.solved_date >= weekStart
  ).length;

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
  const topicStats = new Map<string, { lastSolvedDate: string | null; solvedCount: number }>();

  for (const topic of topics) {
    topicStats.set(topic.id, { lastSolvedDate: null, solvedCount: 0 });
  }

  for (const problem of problems) {
    if (!problem.solved) continue;
    const stats = topicStats.get(problem.topic_id);
    if (!stats) continue;
    stats.solvedCount += 1;
    if (problem.solved_date && (!stats.lastSolvedDate || problem.solved_date > stats.lastSolvedDate)) {
      stats.lastSolvedDate = problem.solved_date;
    }
  }

  const untouchedDsaTopics = [...topicStats.entries()]
    .filter(([, stats]) => stats.solvedCount === 0)
    .map(([topicId]) => topicNameById.get(topicId))
    .filter((name): name is string => Boolean(name))
    .slice(0, 5);

  const topicsDueForRevision = [...topicStats.entries()]
    .filter(([, stats]) => stats.lastSolvedDate && daysUntil(stats.lastSolvedDate, today) <= -7)
    .map(([topicId]) => topicNameById.get(topicId))
    .filter((name): name is string => Boolean(name))
    .slice(0, 5);

  const stageMap = new Map<string, { count: number; companies: string[] }>();
  for (const application of applications) {
    const existing = stageMap.get(application.stage) ?? { count: 0, companies: [] };
    existing.count += 1;
    if (!existing.companies.includes(application.company)) {
      existing.companies.push(application.company);
    }
    stageMap.set(application.stage, existing);
  }

  const applicationsByStage = [...stageMap.entries()].map(([stage, data]) => ({
    stage,
    count: data.count,
    companies: data.companies.slice(0, 5),
  }));

  const currentWeeklyGoals = weeklyGoals.filter((goal) => goal.start_date <= today && goal.end_date >= today);

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

  const existingProjectIds = new Set(
    projects.filter((project) => project.type === 'existing').map((project) => project.id)
  );
  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));
  const projectGaps = checklist
    .filter((item) => existingProjectIds.has(item.project_id) && !item.completed)
    .slice(0, 5)
    .map((item) => `${projectNameById.get(item.project_id) ?? 'Project'}: ${item.item}`);

  const peakSeasonDaysLeft = Math.max(daysUntil(PEAK_SEASON_START, today), 0);
  const daysUntilPeakSeason = today >= PEAK_SEASON_START ? 0 : peakSeasonDaysLeft;

  return {
    firstName: 'Sandhyaa',
    dsaSolvedThisWeek,
    dsaWeeklyTarget: 15,
    currentStreak,
    topicsDueForRevision,
    untouchedDsaTopics,
    upcomingDeadlines,
    applicationsByStage,
    weeklyGoals: currentWeeklyGoals.map((goal) => ({
      category: goal.category,
      goalText: goal.goal_text,
      completed: goal.completed,
    })),
    weeklyGoalsCompleted: currentWeeklyGoals.filter((goal) => goal.completed).length,
    weeklyGoalsTotal: currentWeeklyGoals.length,
    projectGaps,
    topOaTopics,
    certificationsBehind,
    mocksThisWeek,
    daysUntilPeakSeason,
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
    const groqApiKey = Deno.env.get('GROQ_API_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
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
    if (body.action !== 'generate_brief') {
      return new Response(JSON.stringify({ error: 'Unsupported action.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const greetingPhrase =
      typeof body.greetingPhrase === 'string' && body.greetingPhrase.trim()
        ? body.greetingPhrase.trim()
        : 'Good morning';

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const context = await buildServerCoachContext(adminClient, userData.user.id);
    const prompt = buildPrompt(context, greetingPhrase);
    const brief = await callGroq(groqApiKey, prompt);

    return new Response(JSON.stringify({ brief, source: 'groq' }), {
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
