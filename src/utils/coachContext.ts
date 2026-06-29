/**
 * Builds live Supabase context for the AI Coach and fallback briefs.
 */

import { parseISO } from 'date-fns';
import profileSeed from '@/seed/profile.json';
import { supabase } from '@/lib/supabase';
import { WEEKLY_GOALS_TARGETS } from '@/constants';
import { calculateStreak, daysSince, daysUntil, todayIST } from '@/utils';
import type { CoachContext } from '@/types/coach';

interface DSAProblemRow {
  name: string;
  solved: boolean;
  solved_date: string | null;
  flagged_for_revision: boolean;
  updated_at: string;
}

interface DSATopicRow {
  id: string;
  name: string;
}

interface ApplicationRow {
  company: string;
  role: string;
  next_deadline: string | null;
}

interface CertificationRow {
  name: string;
  status: string;
  progress: number;
  target_date: string | null;
}

interface MockRow {
  date: string;
}

interface OALogRow {
  topics: string[];
}

interface TopicRevisionSummary {
  topicName: string;
  lastSolvedDate: string | null;
}

function getWeekStart(today: string): Date {
  const date = parseISO(today);
  date.setDate(date.getDate() - 6);
  return date;
}

/**
 * Aggregate placement data for coach prompts and fallback briefs.
 */
export async function buildCoachContext(userId: string): Promise<CoachContext> {
  const today = todayIST();
  const weekStart = getWeekStart(today);
  const firstName = profileSeed.name.split(' ')[0] ?? profileSeed.name;

  const [problemsResult, topicsResult, applicationsResult, certificationsResult, mocksResult, oaResult] =
    await Promise.all([
      supabase.from('dsa_problems').select('name, solved, solved_date, flagged_for_revision, updated_at, topic_id').eq('user_id', userId),
      supabase.from('dsa_topics').select('id, name').eq('user_id', userId),
      supabase.from('applications').select('company, role, next_deadline').eq('user_id', userId),
      supabase.from('certifications').select('name, status, progress, target_date').eq('user_id', userId),
      supabase.from('mock_interviews').select('date').eq('user_id', userId),
      supabase.from('oa_log').select('topics').eq('user_id', userId),
    ]);

  const problems = (problemsResult.data ?? []) as Array<DSAProblemRow & { topic_id: string }>;
  const topics = (topicsResult.data ?? []) as DSATopicRow[];
  const applications = (applicationsResult.data ?? []) as ApplicationRow[];
  const certifications = (certificationsResult.data ?? []) as CertificationRow[];
  const mocks = (mocksResult.data ?? []) as MockRow[];
  const oaLogs = (oaResult.data ?? []) as OALogRow[];

  const dsaSolvedThisWeek = problems.filter((problem) => {
    if (!problem.solved || !problem.solved_date) return false;
    return parseISO(problem.solved_date) >= weekStart;
  }).length;

  const solveDates = problems.filter((p) => p.solved && p.solved_date).map((p) => p.solved_date as string);
  const currentStreak = calculateStreak(solveDates);

  const topicNameById = new Map(topics.map((topic) => [topic.id, topic.name]));
  const topicRevisionMap = new Map<string, TopicRevisionSummary>();

  for (const topic of topics) {
    topicRevisionMap.set(topic.id, { topicName: topic.name, lastSolvedDate: null });
  }

  for (const problem of problems) {
    if (!problem.solved) continue;
    const summary = topicRevisionMap.get(problem.topic_id);
    if (!summary) continue;
    const solvedDate = problem.solved_date;
    if (!solvedDate) continue;
    if (!summary.lastSolvedDate || solvedDate > summary.lastSolvedDate) {
      summary.lastSolvedDate = solvedDate;
    }
  }

  const topicsDueForRevision = [...topicRevisionMap.values()]
    .filter((summary) => {
      if (!summary.lastSolvedDate) return false;
      return daysSince(summary.lastSolvedDate) >= 7;
    })
    .map((summary) => summary.topicName)
    .slice(0, 5);

  const flaggedTopics = problems
    .filter((problem) => problem.flagged_for_revision)
    .map((problem) => topicNameById.get(problem.topic_id))
    .filter((name): name is string => Boolean(name));

  const uniqueRevisionTopics = [...new Set([...topicsDueForRevision, ...flaggedTopics])].slice(0, 5);

  const upcomingDeadlines = [
    ...applications
      .filter((app) => app.next_deadline)
      .map((app) => ({
        title: `${app.company} · ${app.role}`,
        type: 'Application',
        daysUntil: app.next_deadline ? daysUntil(app.next_deadline) : 999,
        dueDate: app.next_deadline ?? today,
      })),
    ...certifications
      .filter((cert) => cert.status === 'In Progress' && cert.target_date)
      .map((cert) => ({
        title: cert.name,
        type: 'Certification',
        daysUntil: cert.target_date ? daysUntil(cert.target_date) : 999,
        dueDate: cert.target_date ?? today,
      })),
  ]
    .filter((deadline) => deadline.daysUntil >= 0 && deadline.daysUntil <= 14)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5)
    .map(({ title, type, daysUntil: days }) => ({ title, type, daysUntil: days }));

  const topicCounts = new Map<string, number>();
  for (const log of oaLogs) {
    for (const topic of log.topics) {
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
      daysUntilTarget: cert.target_date ? daysUntil(cert.target_date) : null,
    }))
    .filter((cert) => cert.progress < 50 || (cert.daysUntilTarget !== null && cert.daysUntilTarget <= 21))
    .slice(0, 3);

  const mocksThisWeek = mocks.filter((mock) => {
    const mockDate = parseISO(mock.date);
    return mockDate >= weekStart && mockDate <= parseISO(today);
  }).length;

  return {
    firstName,
    dsaSolvedThisWeek,
    dsaWeeklyTarget: WEEKLY_GOALS_TARGETS.DSA_PROBLEMS,
    currentStreak,
    topicsDueForRevision: uniqueRevisionTopics,
    upcomingDeadlines,
    topOaTopics,
    certificationsBehind,
    mocksThisWeek,
  };
}

/**
 * Rules-based brief when Gemini is unavailable or no API key is set.
 */
export function generateCoachFallbackBrief(context: CoachContext): string {
  const tasks: string[] = [];

  if (context.dsaSolvedThisWeek < context.dsaWeeklyTarget) {
    const remaining = context.dsaWeeklyTarget - context.dsaSolvedThisWeek;
    tasks.push(`Solve ${Math.min(remaining, 4)} DSA problems — ${context.dsaSolvedThisWeek}/${context.dsaWeeklyTarget} done this week (${context.currentStreak}d streak).`);
  }

  if (context.topicsDueForRevision.length > 0) {
    tasks.push(`Revise ${context.topicsDueForRevision[0]} — flagged or untouched for 7+ days.`);
  }

  if (context.upcomingDeadlines.length > 0) {
    const nearest = context.upcomingDeadlines[0];
    tasks.push(`Follow up on ${nearest.title} — ${nearest.daysUntil} day${nearest.daysUntil === 1 ? '' : 's'} until deadline.`);
  }

  if (context.mocksThisWeek === 0) {
    tasks.push('Schedule one mock interview or OA-style timed set — none logged this week.');
  }

  if (context.certificationsBehind.length > 0) {
    const cert = context.certificationsBehind[0];
    tasks.push(`Push ${cert.name} to ${Math.min(cert.progress + 10, 100)}% — currently at ${cert.progress}%.`);
  }

  while (tasks.length < 4) {
    const filler =
      tasks.length === 0
        ? 'Review application pipeline and update stages for any stale processes.'
        : "Log today's progress in the journal before end of day.";
    if (!tasks.includes(filler)) {
      tasks.push(filler);
    } else {
      break;
    }
  }

  const focusMinutes = Math.min(120 + tasks.length * 45, 300);
  const focusHours = Math.floor(focusMinutes / 60);
  const focusMins = focusMinutes % 60;

  const whyParts: string[] = [];
  if (context.topOaTopics.length > 0) {
    whyParts.push(`OA history shows ${context.topOaTopics.slice(0, 2).join(' and ')} appearing often — closing gaps there has high ROI.`);
  }
  if (context.dsaSolvedThisWeek < context.dsaWeeklyTarget) {
    whyParts.push(`You are behind the weekly DSA target; catching up now protects your streak and revision rhythm.`);
  }
  if (whyParts.length === 0) {
    whyParts.push('Maintaining momentum across DSA, applications, and certifications compounds through peak season.');
  }

  let watchOut = 'Keep an eye on upcoming deadlines — check every morning.';
  if (context.certificationsBehind.length > 0) {
    const cert = context.certificationsBehind[0];
    if (cert.daysUntilTarget !== null && cert.daysUntilTarget <= 14) {
      watchOut = `${cert.name} is ${cert.progress}% complete with ${cert.daysUntilTarget} days to target — one module today keeps it recoverable.`;
    }
  }

  return `Good morning, ${context.firstName}.

Today's highest ROI tasks:
${tasks.slice(0, 4).map((task, index) => `${index + 1}. ${task}`).join('\n')}

Estimated focus time: ${focusHours}h ${focusMins}m

Why these:
${whyParts.join(' ')}

Watch out for:
${watchOut}`;
}
