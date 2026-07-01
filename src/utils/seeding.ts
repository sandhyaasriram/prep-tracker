/**
 * Seeding utility for first-login data initialization.
 * Loads seed JSON files and inserts them into Supabase only if user has no existing data.
 */

import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
import type {
  DSATopic,
  DSAProblem,
  Certification,
  UserSettings,
  DSADifficulty,
  CertificationStatus,
} from '@/types';

import profileSeed from '@/seed/profile.json';
import dsaProblemsSeed from '@/seed/dsa-problems.json';
import certificationsSeed from '@/seed/certifications.json';
import projectsSeed from '@/seed/projects.json';
import weeklyGoalsSeed from '@/seed/weekly-goals.json';
import { getCalendarWeekRangeByNumber } from '@/utils/calendarWeek';
import csFoundamentalsSeed from '@/seed/cs-fundamentals.json';
import timelineMilestonesSeed from '@/seed/timeline-milestones.json';

const INSERT_BATCH_SIZE = 50;

type UserOwnedTable =
  | 'dsa_topics'
  | 'dsa_problems'
  | 'certifications'
  | 'projects'
  | 'weekly_goals'
  | 'cs_fundamentals'
  | 'timeline_milestones'
  | 'user_settings';

/**
 * Count rows for a user-owned table.
 */
async function getRowCount(table: UserOwnedTable, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

/**
 * Insert rows in batches to avoid PostgREST payload limits.
 */
async function insertInBatches(
  table: 'dsa_problems' | 'weekly_goals' | 'cs_fundamentals' | 'project_checklist',
  rows: Array<Record<string, unknown>>
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + INSERT_BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);

    if (error) {
      throw error;
    }
  }
}

/**
 * Seed all default data for a new user. Idempotent — only inserts if data doesn't exist.
 */
export async function seedUserData(userId: string): Promise<void> {
  try {
    const topicCount = await getRowCount('dsa_topics', userId);

    if (topicCount > 0) {
      console.log('User data already seeded, syncing any missing records.');
      await syncMissingDSAProblems(userId);
      await seedRemainingIfEmpty(userId);
      return;
    }

    console.log('Seeding new user data...');
    await seedDSA(userId);
    await seedRemainingIfEmpty(userId);
    console.log('Seeding complete.');
  } catch (error) {
    console.error('Error seeding user data:', error);
    throw new Error(formatSupabaseError(error));
  }
}

async function seedRemainingIfEmpty(userId: string): Promise<void> {
  if ((await getRowCount('certifications', userId)) === 0) {
    await seedCertifications(userId);
  }

  if ((await getRowCount('projects', userId)) === 0) {
    await seedProjects(userId);
  }

  if ((await getRowCount('weekly_goals', userId)) === 0) {
    await seedWeeklyGoals(userId);
  }

  if ((await getRowCount('cs_fundamentals', userId)) === 0) {
    await seedCSFundamentals(userId);
  }

  if ((await getRowCount('timeline_milestones', userId)) === 0) {
    await seedTimelineMilestones(userId);
  }

  if ((await getRowCount('user_settings', userId)) === 0) {
    await seedUserSettings(userId);
  }
}

async function seedDSA(userId: string): Promise<void> {
  const topicsToInsert: Partial<DSATopic>[] = dsaProblemsSeed.topics.map((topic, index) => ({
    user_id: userId,
    name: topic.name,
    order_index: index + 1,
    target_problem_count: topic.target_problem_count,
  }));

  const { data: insertedTopics, error: topicsError } = await supabase
    .from('dsa_topics')
    .insert(topicsToInsert)
    .select('id, name');

  if (topicsError) {
    throw topicsError;
  }

  const topicMap = new Map(insertedTopics?.map((topic) => [topic.name, topic.id]) ?? []);
  const problemsToInsert: Partial<DSAProblem>[] = [];

  for (const topic of dsaProblemsSeed.topics) {
    const topicId = topicMap.get(topic.name);
    if (!topicId) {
      continue;
    }

    for (const problem of topic.problems) {
      problemsToInsert.push({
        user_id: userId,
        topic_id: topicId,
        name: problem.name,
        difficulty: problem.difficulty as DSADifficulty,
        leetcode_url: problem.leetcode_url,
        solved: problem.solved,
        flagged_for_revision: problem.flagged_for_revision,
        notes: problem.notes,
      });
    }
  }

  await insertInBatches('dsa_problems', problemsToInsert);
}

/**
 * Insert DSA problems from seed that are not yet in Supabase for this user.
 * Safe to run on every login — never overwrites existing rows.
 */
export async function syncMissingDSAProblems(userId: string): Promise<void> {
  const { data: existingTopics, error: topicsError } = await supabase
    .from('dsa_topics')
    .select('id, name')
    .eq('user_id', userId);

  if (topicsError) {
    throw topicsError;
  }

  if (!existingTopics || existingTopics.length === 0) {
    return;
  }

  const topicMap = new Map(existingTopics.map((topic) => [topic.name, topic.id]));

  const { data: existingProblems, error: problemsError } = await supabase
    .from('dsa_problems')
    .select('topic_id, name')
    .eq('user_id', userId);

  if (problemsError) {
    throw problemsError;
  }

  const existingKeys = new Set(
    (existingProblems ?? []).map((problem) => `${problem.topic_id}::${problem.name}`)
  );

  const problemsToInsert: Partial<DSAProblem>[] = [];

  for (const topic of dsaProblemsSeed.topics) {
    const topicId = topicMap.get(topic.name);
    if (!topicId) {
      continue;
    }

    for (const problem of topic.problems) {
      const key = `${topicId}::${problem.name}`;
      if (existingKeys.has(key)) {
        continue;
      }

      problemsToInsert.push({
        user_id: userId,
        topic_id: topicId,
        name: problem.name,
        difficulty: problem.difficulty as DSADifficulty,
        leetcode_url: problem.leetcode_url,
        solved: problem.solved,
        flagged_for_revision: problem.flagged_for_revision,
        notes: problem.notes,
      });
    }
  }

  if (problemsToInsert.length === 0) {
    return;
  }

  await insertInBatches('dsa_problems', problemsToInsert);
  console.log(`Synced ${problemsToInsert.length} missing DSA problems.`);
}

async function seedCertifications(userId: string): Promise<void> {
  const toInsert: Partial<Certification>[] = certificationsSeed.certifications.map((cert) => ({
    user_id: userId,
    name: cert.name,
    provider: cert.provider,
    status: cert.status as CertificationStatus,
    target_date: cert.target_date,
    progress: cert.progress,
    cert_url: cert.cert_url,
    notes: cert.notes,
  }));

  const { error } = await supabase.from('certifications').insert(toInsert);

  if (error) {
    throw error;
  }
}

async function seedProjects(userId: string): Promise<void> {
  const toInsert = projectsSeed.projects.map((proj) => ({
    user_id: userId,
    name: proj.name,
    tech_stack: proj.tech_stack,
    status: proj.status,
    github_url: proj.github_url,
    demo_url: proj.demo_url,
    type: proj.type,
    placement_relevance: proj.placement_relevance,
    notes: proj.notes,
  }));

  const { data: insertedProjects, error: projectsError } = await supabase
    .from('projects')
    .insert(toInsert)
    .select('id, name');

  if (projectsError) {
    throw projectsError;
  }

  const checklistsToInsert: Array<{ project_id: string; item: string; completed: boolean }> = [];

  for (const project of insertedProjects ?? []) {
    const items = projectsSeed.checklists[project.name as keyof typeof projectsSeed.checklists] ?? [];
    for (const item of items) {
      checklistsToInsert.push({
        project_id: project.id,
        item,
        completed: false,
      });
    }
  }

  await insertInBatches('project_checklist', checklistsToInsert);
}

async function seedWeeklyGoals(userId: string): Promise<void> {
  const toInsert = weeklyGoalsSeed.weeks.map((goal) => {
    const { startDate, endDate } = getCalendarWeekRangeByNumber(goal.week_number);

    return {
      user_id: userId,
      week_number: goal.week_number,
      start_date: startDate,
      end_date: endDate,
      category: goal.category,
      goal_text: goal.goal_text,
      completed: goal.completed,
      notes: goal.notes,
    };
  });

  await insertInBatches('weekly_goals', toInsert);
}

async function seedCSFundamentals(userId: string): Promise<void> {
  const toInsert: Array<{
    user_id: string;
    topic: string;
    subtopic: string;
    status: string;
    last_revised: null;
    notes: string;
  }> = [];

  for (const topicGroup of csFoundamentalsSeed.topics) {
    for (const subtopic of topicGroup.subtopics) {
      toInsert.push({
        user_id: userId,
        topic: topicGroup.topic,
        subtopic,
        status: 'Not Started',
        last_revised: null,
        notes: '',
      });
    }
  }

  await insertInBatches('cs_fundamentals', toInsert);
}

async function seedTimelineMilestones(userId: string): Promise<void> {
  const toInsert = timelineMilestonesSeed.milestones.map((milestone) => ({
    user_id: userId,
    date: milestone.date,
    label: milestone.label,
    category: milestone.category,
    color: milestone.color,
  }));

  const { error } = await supabase.from('timeline_milestones').insert(toInsert);

  if (error) {
    throw error;
  }
}

async function seedUserSettings(userId: string): Promise<void> {
  const toInsert: Partial<UserSettings> = {
    user_id: userId,
    target_companies: profileSeed.target_companies,
    graduation_year: profileSeed.graduation_year,
    college: profileSeed.college,
    gemini_api_key_encrypted: '',
    theme: 'system',
    sidebar_collapsed: false,
    last_opened_page: '',
  };

  const { error } = await supabase.from('user_settings').insert([toInsert]);

  if (error) {
    throw error;
  }
}
