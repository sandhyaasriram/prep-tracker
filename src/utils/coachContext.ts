/**
 * Builds live Supabase context for the AI Coach and fallback briefs.
 */

import { parseISO } from 'date-fns';
import profileSeed from '@/seed/profile.json';
import { supabase } from '@/lib/supabase';
import { PEAK_SEASON_START, WEEKLY_GOALS_TARGETS } from '@/constants';
import { calculateStreak, daysSince, daysUntil, todayIST } from '@/utils';
import type { CoachApplicationStage, CoachContext, CoachWeeklyGoal } from '@/types/coach';

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
  stage: string;
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

interface WeeklyGoalRow {
  category: string;
  goal_text: string;
  completed: boolean;
  start_date: string;
  end_date: string;
}

interface ProjectRow {
  id: string;
  name: string;
  type: string;
}

interface ChecklistRow {
  project_id: string;
  item: string;
  completed: boolean;
}

interface TopicRevisionSummary {
  topicName: string;
  lastSolvedDate: string | null;
  solvedCount: number;
}

function getWeekStart(today: string): Date {
  const date = parseISO(today);
  date.setDate(date.getDate() - 6);
  return date;
}

function buildApplicationsByStage(applications: ApplicationRow[]): CoachApplicationStage[] {
  const stageMap = new Map<string, { count: number; companies: string[] }>();

  for (const application of applications) {
    const existing = stageMap.get(application.stage) ?? { count: 0, companies: [] };
    existing.count += 1;
    if (!existing.companies.includes(application.company)) {
      existing.companies.push(application.company);
    }
    stageMap.set(application.stage, existing);
  }

  return [...stageMap.entries()].map(([stage, data]) => ({
    stage,
    count: data.count,
    companies: data.companies.slice(0, 5),
  }));
}

function buildWeeklyGoalsContext(goals: WeeklyGoalRow[], today: string): {
  weeklyGoals: CoachWeeklyGoal[];
  weeklyGoalsCompleted: number;
  weeklyGoalsTotal: number;
} {
  const currentGoals = goals.filter((goal) => goal.start_date <= today && goal.end_date >= today);
  const weeklyGoals = currentGoals.map((goal) => ({
    category: goal.category,
    goalText: goal.goal_text,
    completed: goal.completed,
  }));

  return {
    weeklyGoals,
    weeklyGoalsCompleted: currentGoals.filter((goal) => goal.completed).length,
    weeklyGoalsTotal: currentGoals.length,
  };
}

function buildProjectGaps(projects: ProjectRow[], checklist: ChecklistRow[]): string[] {
  const existingIds = new Set(projects.filter((project) => project.type === 'existing').map((project) => project.id));
  const projectNameById = new Map(projects.map((project) => [project.id, project.name]));

  return checklist
    .filter((item) => existingIds.has(item.project_id) && !item.completed)
    .slice(0, 5)
    .map((item) => {
      const projectName = projectNameById.get(item.project_id) ?? 'Project';
      return `${projectName}: ${item.item}`;
    });
}

/**
 * Aggregate placement data for coach prompts and fallback briefs.
 */
export async function buildCoachContext(userId: string): Promise<CoachContext> {
  const today = todayIST();
  const weekStart = getWeekStart(today);
  const firstName = profileSeed.name.split(' ')[0] ?? profileSeed.name;

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
    supabase.from('dsa_problems').select('name, solved, solved_date, flagged_for_revision, updated_at, topic_id').eq('user_id', userId),
    supabase.from('dsa_topics').select('id, name').eq('user_id', userId),
    supabase.from('applications').select('company, role, stage, next_deadline').eq('user_id', userId),
    supabase.from('certifications').select('name, status, progress, target_date').eq('user_id', userId),
    supabase.from('mock_interviews').select('date').eq('user_id', userId),
    supabase.from('oa_log').select('topics').eq('user_id', userId),
    supabase.from('weekly_goals').select('category, goal_text, completed, start_date, end_date').eq('user_id', userId),
    supabase.from('projects').select('id, name, type').eq('user_id', userId),
    supabase.from('project_checklist').select('project_id, item, completed'),
  ]);

  const problems = (problemsResult.data ?? []) as Array<DSAProblemRow & { topic_id: string }>;
  const topics = (topicsResult.data ?? []) as DSATopicRow[];
  const applications = (applicationsResult.data ?? []) as ApplicationRow[];
  const certifications = (certificationsResult.data ?? []) as CertificationRow[];
  const mocks = (mocksResult.data ?? []) as MockRow[];
  const oaLogs = (oaResult.data ?? []) as OALogRow[];
  const weeklyGoals = (weeklyGoalsResult.data ?? []) as WeeklyGoalRow[];
  const projects = (projectsResult.data ?? []) as ProjectRow[];
  const checklist = (checklistResult.data ?? []) as ChecklistRow[];

  const dsaSolvedThisWeek = problems.filter((problem) => {
    if (!problem.solved || !problem.solved_date) return false;
    return parseISO(problem.solved_date) >= weekStart;
  }).length;

  const solveDates = problems.filter((p) => p.solved && p.solved_date).map((p) => p.solved_date as string);
  const currentStreak = calculateStreak(solveDates);

  const topicNameById = new Map(topics.map((topic) => [topic.id, topic.name]));
  const topicRevisionMap = new Map<string, TopicRevisionSummary>();

  for (const topic of topics) {
    topicRevisionMap.set(topic.id, { topicName: topic.name, lastSolvedDate: null, solvedCount: 0 });
  }

  for (const problem of problems) {
    if (!problem.solved) continue;
    const summary = topicRevisionMap.get(problem.topic_id);
    if (!summary) continue;
    summary.solvedCount += 1;
    const solvedDate = problem.solved_date;
    if (!solvedDate) continue;
    if (!summary.lastSolvedDate || solvedDate > summary.lastSolvedDate) {
      summary.lastSolvedDate = solvedDate;
    }
  }

  const untouchedDsaTopics = [...topicRevisionMap.values()]
    .filter((summary) => summary.solvedCount === 0)
    .map((summary) => summary.topicName)
    .slice(0, 5);

  const topicsDueForRevision = [...topicRevisionMap.values()]
    .filter((summary) => {
      if (!summary.lastSolvedDate) return false;
      return daysSince(summary.lastSolvedDate) >= 7;
    })
    .map((summary) => summary.topicName);

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

  const { weeklyGoals: currentWeeklyGoals, weeklyGoalsCompleted, weeklyGoalsTotal } = buildWeeklyGoalsContext(
    weeklyGoals,
    today
  );

  const peakSeasonDaysLeft = Math.max(daysUntil(PEAK_SEASON_START), 0);
  const daysUntilPeakSeason = today >= PEAK_SEASON_START ? 0 : peakSeasonDaysLeft;

  return {
    firstName,
    dsaSolvedThisWeek,
    dsaWeeklyTarget: WEEKLY_GOALS_TARGETS.DSA_PROBLEMS,
    currentStreak,
    topicsDueForRevision: uniqueRevisionTopics,
    untouchedDsaTopics,
    upcomingDeadlines,
    applicationsByStage: buildApplicationsByStage(applications),
    weeklyGoals: currentWeeklyGoals,
    weeklyGoalsCompleted,
    weeklyGoalsTotal,
    projectGaps: buildProjectGaps(projects, checklist),
    topOaTopics,
    certificationsBehind,
    mocksThisWeek,
    daysUntilPeakSeason,
  };
}

export { generateCoachFallbackBrief } from '@/utils/coachPrompt';
