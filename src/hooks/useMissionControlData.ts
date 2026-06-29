/**
 * Mission Control data hook.
 * Reads dashboard data from Supabase and falls back to seeded defaults when needed.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import profileSeed from '@/seed/profile.json';
import { supabase } from '@/lib/supabase';
import { calculateStreak, daysUntil, formatDisplayDate, getCurrentPhase, todayIST } from '@/utils';
import type { MissionControlData, MissionTask, RecentActivityItem, UpcomingDeadline } from '@/types/mission-control';
import type { DSADifficulty, Phase } from '@/types';

interface DSAProblemRow {
  id: string;
  name: string;
  difficulty: DSADifficulty;
  solved: boolean;
  solved_date: string | null;
  flagged_for_revision: boolean;
  updated_at: string;
  topic_id: string;
  leetcode_url: string | null;
  notes: string;
}

interface DSATopicRow {
  id: string;
  name: string;
  order_index: number;
  target_problem_count: number;
}

interface WeeklyGoalRow {
  id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  category: string;
  goal_text: string;
  completed: boolean;
}

interface ApplicationRow {
  id: string;
  company: string;
  role: string;
  stage: string;
  next_deadline: string | null;
  date_applied: string | null;
  updated_at: string;
  source: string;
}

interface CertificationRow {
  id: string;
  name: string;
  provider: string;
  status: string;
  target_date: string | null;
  progress: number;
  updated_at: string;
}

interface MockInterviewRow {
  id: string;
  date: string;
  type: string;
  platform: string;
  rating: number | null;
  updated_at: string;
}

interface OALogRow {
  id: string;
  date: string;
  company: string;
  platform: string;
  solved: number;
  total_questions: number;
  score: number | null;
  updated_at: string;
}

function buildFallbackMissionControlData(): MissionControlData {
  const currentPhase = getCurrentPhase(profileSeed.phase_schedule) as Phase;
  const today = todayIST();
  const currentDateLabel = formatDisplayDate(today);
  const firstName = profileSeed.name.split(' ')[0] ?? profileSeed.name;
  const currentWeek = profileSeed.phase_schedule.find((phase) => today >= phase.start && today <= phase.end) ?? profileSeed.phase_schedule[0];
  const weekRangeLabel = `${formatDisplayDate(currentWeek.start)} – ${formatDisplayDate(currentWeek.end)}`;

  return {
    firstName,
    greeting: getGreeting(),
    currentDateLabel,
    currentPhase,
    phaseSchedule: profileSeed.phase_schedule.map((phase) => ({
      name: phase.name as Phase,
      start: phase.start,
      end: phase.end,
    })),
    currentWeekLabel: 'Week 1',
    weekRangeLabel,
    missionTasks: buildDefaultMissionTasks(),
    weeklyCompleted: 0,
    weeklyTotal: 0,
    weeklyProgressPercent: 0,
    estimatedFocusMinutes: 180,
    currentStreak: 0,
    totalDsaSolved: 0,
    activeApplications: 0,
    mocksDone: 0,
    daysUntilPeakSeason: Math.max(daysUntil('2026-09-15'), 0),
    upcomingDeadlines: [],
    recentActivity: [],
  };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 18) return 'Afternoon';
  return 'Evening';
}

function buildDefaultMissionTasks(): MissionTask[] {
  return [
    {
      id: 'fallback-goal',
      title: 'Establish a clean daily DSA rhythm and keep the streak alive.',
      category: 'DSA',
      estimateMinutes: 45,
      completed: false,
      note: 'Fallback task until seeded data loads.',
    },
    {
      id: 'fallback-cert',
      title: 'Advance the AWS SAA prep by one module and one quiz.',
      category: 'Certifications',
      estimateMinutes: 45,
      completed: false,
      note: 'Fallback task until seeded data loads.',
    },
    {
      id: 'fallback-journal',
      title: 'Log one honest reflection on what is still shaky.',
      category: 'Journal',
      estimateMinutes: 20,
      completed: false,
      note: 'Fallback task until seeded data loads.',
    },
    {
      id: 'fallback-project',
      title: 'Review the top project storyline and one resume bullet.',
      category: 'Projects',
      estimateMinutes: 30,
      completed: false,
      note: 'Fallback task until seeded data loads.',
    },
  ];
}

function createMissionTasks({
  weeklyGoal,
  topDsaTopic,
  certification,
  application,
}: {
  weeklyGoal: WeeklyGoalRow | undefined;
  topDsaTopic: { name: string; solvedCount: number; totalCount: number } | undefined;
  certification: CertificationRow | undefined;
  application: ApplicationRow | undefined;
}): MissionTask[] {
  const tasks: MissionTask[] = [];

  if (weeklyGoal) {
    tasks.push({
      id: weeklyGoal.id,
      title: weeklyGoal.goal_text,
      category: 'Interview Prep',
      estimateMinutes: 45,
      completed: weeklyGoal.completed,
      note: `${weeklyGoal.category} · Week ${weeklyGoal.week_number}`,
    });
  }

  if (topDsaTopic) {
    tasks.push({
      id: `dsa-${topDsaTopic.name}`,
      title: `Solve one ${topDsaTopic.name} problem and keep the pattern fresh.`,
      category: 'DSA',
      estimateMinutes: 45,
      completed: topDsaTopic.totalCount > 0 && topDsaTopic.solvedCount >= topDsaTopic.totalCount,
      note: `${topDsaTopic.solvedCount}/${topDsaTopic.totalCount} solved`,
    });
  }

  if (certification) {
    tasks.push({
      id: `cert-${certification.id}`,
      title: `Move ${certification.name} forward by one concrete checkpoint.`,
      category: 'Certifications',
      estimateMinutes: 45,
      completed: certification.status === 'Completed',
      note: `${certification.progress}% complete`,
    });
  }

  if (application) {
    tasks.push({
      id: `app-${application.id}`,
      title: `Review ${application.company} and prepare the next move for ${application.role}.`,
      category: 'Applications',
      estimateMinutes: 30,
      completed: application.stage === 'Offer',
      note: `${application.stage}${application.next_deadline ? ` · due ${formatDisplayDate(application.next_deadline)}` : ''}`,
    });
  }

  if (tasks.length < 4) {
    tasks.push({
      id: 'journal-reflection',
      title: 'Write one blunt note about what is slowing you down.',
      category: 'Journal',
      estimateMinutes: 15,
      completed: false,
      note: 'Daily reflection keeps the system honest.',
    });
  }

  return tasks.slice(0, 5);
}

function createActivityItems({
  dsaProblems,
  applications,
  certifications,
  mocks,
  oaLogs,
}: {
  dsaProblems: DSAProblemRow[];
  applications: ApplicationRow[];
  certifications: CertificationRow[];
  mocks: MockInterviewRow[];
  oaLogs: OALogRow[];
}): RecentActivityItem[] {
  const activities: RecentActivityItem[] = [];

  for (const problem of dsaProblems.filter((item) => item.solved && item.solved_date).slice(0, 2)) {
    activities.push({
      id: `dsa-${problem.id}`,
      title: problem.name,
      detail: `${problem.difficulty} · solved`,
      date: problem.solved_date ?? problem.updated_at,
      type: 'DSA',
    });
  }

  for (const application of applications.slice(0, 1)) {
    activities.push({
      id: `application-${application.id}`,
      title: application.company,
      detail: `${application.role} · ${application.stage}`,
      date: application.updated_at,
      type: 'Applications',
    });
  }

  for (const certification of certifications.slice(0, 1)) {
    activities.push({
      id: `cert-${certification.id}`,
      title: certification.name,
      detail: `${certification.provider} · ${certification.status}`,
      date: certification.updated_at,
      type: 'Certifications',
    });
  }

  for (const mock of mocks.slice(0, 1)) {
    activities.push({
      id: `mock-${mock.id}`,
      title: mock.type,
      detail: `${mock.platform} · rating ${mock.rating ?? 'n/a'}`,
      date: mock.updated_at,
      type: 'Interview Prep',
    });
  }

  for (const oa of oaLogs.slice(0, 1)) {
    activities.push({
      id: `oa-${oa.id}`,
      title: oa.company,
      detail: `${oa.solved}/${oa.total_questions} solved`,
      date: oa.updated_at,
      type: 'Interview Prep',
    });
  }

  return activities
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 5);
}

function findTopTopic(topics: DSATopicRow[], problems: DSAProblemRow[]): { name: string; solvedCount: number; totalCount: number } | undefined {
  let bestTopic: { name: string; solvedCount: number; totalCount: number } | undefined;

  for (const topic of topics) {
    const topicProblems = problems.filter((problem) => problem.topic_id === topic.id);
    if (topicProblems.length === 0) continue;

    const solvedCount = topicProblems.filter((problem) => problem.solved).length;
    const candidate = {
      name: topic.name,
      solvedCount,
      totalCount: topicProblems.length,
    };

    if (!bestTopic) {
      bestTopic = candidate;
      continue;
    }

    const bestRatio = bestTopic.solvedCount / bestTopic.totalCount;
    const candidateRatio = candidate.solvedCount / candidate.totalCount;

    if (candidateRatio < bestRatio) {
      bestTopic = candidate;
    }
  }

  return bestTopic;
}

function chooseCurrentOrUpcomingGoal(goals: WeeklyGoalRow[], today: string): WeeklyGoalRow | undefined {
  const currentGoal = goals.find((goal) => goal.start_date <= today && goal.end_date >= today);
  if (currentGoal) return currentGoal;

  const upcomingGoals = goals
    .filter((goal) => goal.start_date >= today)
    .sort((left, right) => left.start_date.localeCompare(right.start_date));

  return upcomingGoals[0] ?? goals[0];
}

export interface UseMissionControlDataResult {
  data: MissionControlData | null;
  loading: boolean;
  error: string | null;
  toggleMissionTask: (taskId: string) => void;
}

export function useMissionControlData(userId: string | null): UseMissionControlDataResult {
  const [data, setData] = useState<MissionControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async (): Promise<void> => {
    if (!userId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const today = todayIST();

      const [topicsResult, problemsResult, goalsResult, applicationsResult, certificationsResult, mocksResult, oaLogsResult] = await Promise.all([
        supabase.from('dsa_topics').select('id, name, order_index, target_problem_count').eq('user_id', userId).order('order_index', { ascending: true }),
        supabase
          .from('dsa_problems')
          .select('id, name, difficulty, solved, solved_date, flagged_for_revision, updated_at, topic_id, leetcode_url, notes')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false }),
        supabase.from('weekly_goals').select('id, week_number, start_date, end_date, category, goal_text, completed').eq('user_id', userId).order('week_number', { ascending: true }),
        supabase.from('applications').select('id, company, role, stage, next_deadline, date_applied, updated_at, source').eq('user_id', userId).order('updated_at', { ascending: false }),
        supabase.from('certifications').select('id, name, provider, status, target_date, progress, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }),
        supabase.from('mock_interviews').select('id, date, type, platform, rating, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }),
        supabase.from('oa_log').select('id, date, company, platform, solved, total_questions, score, updated_at').eq('user_id', userId).order('updated_at', { ascending: false }),
      ]);

      if (topicsResult.error) throw topicsResult.error;
      if (problemsResult.error) throw problemsResult.error;
      if (goalsResult.error) throw goalsResult.error;
      if (applicationsResult.error) throw applicationsResult.error;
      if (certificationsResult.error) throw certificationsResult.error;
      if (mocksResult.error) throw mocksResult.error;
      if (oaLogsResult.error) throw oaLogsResult.error;

      const topics = (topicsResult.data ?? []) as DSATopicRow[];
      const dsaProblems = (problemsResult.data ?? []) as DSAProblemRow[];
      const weeklyGoals = (goalsResult.data ?? []) as WeeklyGoalRow[];
      const applications = (applicationsResult.data ?? []) as ApplicationRow[];
      const certifications = (certificationsResult.data ?? []) as CertificationRow[];
      const mocks = (mocksResult.data ?? []) as MockInterviewRow[];
      const oaLogs = (oaLogsResult.data ?? []) as OALogRow[];

      const currentPhase = getCurrentPhase(profileSeed.phase_schedule) as Phase;
      const firstName = profileSeed.name.split(' ')[0] ?? profileSeed.name;
      const currentDateLabel = formatDisplayDate(today);
      const currentGoal = chooseCurrentOrUpcomingGoal(weeklyGoals, today);
      const topDsaTopic = findTopTopic(topics, dsaProblems);
      const nextCertification = certifications.find((cert) => cert.status === 'In Progress') ?? certifications[0];
      const nextApplication = applications.find((application) => application.stage !== 'Offer' && application.stage !== 'Rejected');

      const missionTasks = createMissionTasks({
        weeklyGoal: currentGoal,
        topDsaTopic,
        certification: nextCertification,
        application: nextApplication,
      });

      const weeklyCompleted = weeklyGoals.filter((goal) => goal.start_date <= today && goal.end_date >= today && goal.completed).length;
      const weeklyTotal = weeklyGoals.filter((goal) => goal.start_date <= today && goal.end_date >= today).length || (currentGoal ? 1 : 0);
      const weeklyProgressPercent = weeklyTotal > 0 ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0;

      const solvedDates = dsaProblems.filter((problem) => problem.solved && problem.solved_date).map((problem) => problem.solved_date as string);
      const activeApplications = applications.filter((application) => application.stage !== 'Offer' && application.stage !== 'Rejected').length;
      const mocksDone = mocks.filter((mock) => {
        const mockDate = mock.date;
        return mockDate >= today && mockDate <= today;
      }).length;

      const upcomingDeadlines: UpcomingDeadline[] = [
        ...applications
          .filter((application) => application.next_deadline)
          .map((application) => ({
            id: `application-${application.id}`,
            title: `${application.company} · ${application.role}`,
            type: 'Application' as const,
            dueDate: application.next_deadline ?? today,
            daysUntil: application.next_deadline ? differenceInCalendarDays(parseISO(application.next_deadline), parseISO(today)) : 0,
          })),
        ...certifications
          .filter((certification) => certification.target_date && certification.status !== 'Completed')
          .map((certification) => ({
            id: `cert-${certification.id}`,
            title: `${certification.name}`,
            type: 'Certification' as const,
            dueDate: certification.target_date ?? today,
            daysUntil: certification.target_date ? differenceInCalendarDays(parseISO(certification.target_date), parseISO(today)) : 0,
          })),
      ]
        .filter((deadline) => deadline.daysUntil >= 0 && deadline.daysUntil <= 14)
        .sort((left, right) => left.daysUntil - right.daysUntil)
        .slice(0, 5);

      const recentActivity = createActivityItems({ dsaProblems, applications, certifications, mocks, oaLogs });

      const missionControlData: MissionControlData = {
        firstName,
        greeting: getGreeting(),
        currentDateLabel,
        currentPhase,
        phaseSchedule: profileSeed.phase_schedule.map((phase) => ({
          name: phase.name as Phase,
          start: phase.start,
          end: phase.end,
        })),
        currentWeekLabel: currentGoal ? `Week ${currentGoal.week_number}` : 'Week 1',
        weekRangeLabel: currentGoal ? `${formatDisplayDate(currentGoal.start_date)} – ${formatDisplayDate(currentGoal.end_date)}` : 'Preparing for the first placement week',
        missionTasks,
        weeklyCompleted,
        weeklyTotal,
        weeklyProgressPercent,
        estimatedFocusMinutes: missionTasks.reduce((total, task) => total + task.estimateMinutes, 0),
        currentStreak: calculateStreak(solvedDates),
        totalDsaSolved: dsaProblems.filter((problem) => problem.solved).length,
        activeApplications,
        mocksDone,
        daysUntilPeakSeason: Math.max(daysUntil('2026-09-15'), 0),
        upcomingDeadlines,
        recentActivity,
      };

      setData(missionControlData);
      setCompletedTaskIds(new Set(missionTasks.filter((task) => task.completed).map((task) => task.id)));
    } catch (hookError) {
      console.error('Mission control data load failed:', hookError);
      setError(hookError instanceof Error ? hookError.message : 'Failed to load mission control data');
      setData(buildFallbackMissionControlData());
      setCompletedTaskIds(new Set());
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh().catch((refreshError: unknown) => {
      console.error('Mission control refresh failed:', refreshError);
      setError('Failed to refresh mission control data');
      setLoading(false);
      setData(buildFallbackMissionControlData());
    });
  }, [refresh]);

  const toggleMissionTask = useCallback((taskId: string) => {
    setCompletedTaskIds((previous) => {
      const next = new Set(previous);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const resolvedData = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      missionTasks: data.missionTasks.map((task) => ({
        ...task,
        completed: completedTaskIds.has(task.id),
      })),
    };
  }, [data, completedTaskIds]);

  return {
    data: resolvedData,
    loading,
    error,
    toggleMissionTask,
  };
}
