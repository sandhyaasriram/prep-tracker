/**
 * Full workspace export, import, and reset helpers.
 */

import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
import { seedUserData } from '@/utils/seeding';
import { exportToJSON } from '@/utils';

export const BACKUP_VERSION = 1;

export interface PlacementOSBackup {
  version: number;
  exported_at: string;
  user_id: string;
  tables: Record<string, unknown[]>;
}

const USER_TABLES = [
  'dsa_topics',
  'dsa_problems',
  'weekly_goals',
  'weekly_reviews',
  'applications',
  'mock_interviews',
  'oa_log',
  'cs_fundamentals',
  'projects',
  'certifications',
  'journal_entries',
  'timeline_milestones',
  'user_settings',
] as const;

/**
 * Export all user-owned rows as a JSON backup object.
 */
export async function exportUserBackup(userId: string): Promise<PlacementOSBackup> {
  const tables: Record<string, unknown[]> = {};

  for (const table of USER_TABLES) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId);
    if (error) {
      throw new Error(formatSupabaseError(error));
    }
    tables[table] = data ?? [];
  }

  const { data: applications, error: appsError } = await supabase
    .from('applications')
    .select('id')
    .eq('user_id', userId);

  if (appsError) {
    throw new Error(formatSupabaseError(appsError));
  }

  const applicationIds = (applications ?? []).map((row) => row.id as string);

  if (applicationIds.length > 0) {
    const { data: rounds, error: roundsError } = await supabase
      .from('interview_rounds')
      .select('*')
      .in('application_id', applicationIds);

    if (roundsError) {
      throw new Error(formatSupabaseError(roundsError));
    }

    tables.interview_rounds = rounds ?? [];
  } else {
    tables.interview_rounds = [];
  }

  const projectIds = ((tables.projects ?? []) as Array<{ id: string }>).map((project) => project.id);

  if (projectIds.length > 0) {
    const { data: checklist, error: checklistError } = await supabase
      .from('project_checklist')
      .select('*')
      .in('project_id', projectIds);

    if (checklistError) {
      throw new Error(formatSupabaseError(checklistError));
    }

    tables.project_checklist = checklist ?? [];
  } else {
    tables.project_checklist = [];
  }

  return {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    user_id: userId,
    tables,
  };
}

/**
 * Download all user data as JSON.
 */
export async function downloadUserBackup(userId: string): Promise<void> {
  const backup = await exportUserBackup(userId);
  exportToJSON(backup, `placementos_backup_${backup.exported_at.slice(0, 10)}.json`);
}

/**
 * Delete all user-owned data (for import reset or danger zone).
 */
export async function deleteAllUserData(userId: string): Promise<void> {
  const { data: applications, error: appsError } = await supabase
    .from('applications')
    .select('id')
    .eq('user_id', userId);

  if (appsError) {
    throw new Error(formatSupabaseError(appsError));
  }

  const applicationIds = (applications ?? []).map((row) => row.id as string);
  if (applicationIds.length > 0) {
    const { error } = await supabase.from('interview_rounds').delete().in('application_id', applicationIds);
    if (error) {
      throw new Error(formatSupabaseError(error));
    }
  }

  const { data: projects, error: projectsError } = await supabase.from('projects').select('id').eq('user_id', userId);
  if (projectsError) {
    throw new Error(formatSupabaseError(projectsError));
  }

  const projectIds = (projects ?? []).map((row) => row.id as string);
  if (projectIds.length > 0) {
    const { error } = await supabase.from('project_checklist').delete().in('project_id', projectIds);
    if (error) {
      throw new Error(formatSupabaseError(error));
    }
  }

  for (const table of USER_TABLES) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) {
      throw new Error(formatSupabaseError(error));
    }
  }
}

/**
 * Import a JSON backup for the signed-in user.
 */
export async function importUserBackup(userId: string, backup: PlacementOSBackup): Promise<void> {
  if (!backup.tables || typeof backup.tables !== 'object') {
    throw new Error('Invalid backup file: missing tables.');
  }

  await deleteAllUserData(userId);

  const insertOrder: string[] = [
    'dsa_topics',
    'dsa_problems',
    'weekly_goals',
    'weekly_reviews',
    'applications',
    'interview_rounds',
    'mock_interviews',
    'oa_log',
    'cs_fundamentals',
    'projects',
    'project_checklist',
    'certifications',
    'journal_entries',
    'timeline_milestones',
    'user_settings',
  ];

  for (const table of insertOrder) {
    const rows = (backup.tables[table] ?? []) as Array<Record<string, unknown>>;
    if (rows.length === 0) {
      continue;
    }

    const normalized =
      table === 'interview_rounds' || table === 'project_checklist'
        ? rows
        : rows.map((row) => ({
            ...row,
            user_id: userId,
          }));

    const { error } = await supabase.from(table).insert(normalized);
    if (error) {
      throw new Error(`Import failed on ${table}: ${formatSupabaseError(error)}`);
    }
  }
}

/**
 * Reset workspace to seeded defaults.
 */
export async function resetUserData(userId: string): Promise<void> {
  await deleteAllUserData(userId);
  await seedUserData(userId);
}
