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

/** Delete children before parents so RLS-backed cascades do not block wipes. */
const DELETE_USER_TABLES_ORDER = [
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
  'dsa_topics',
] as const;

const INSERT_BATCH_SIZE = 50;

async function resolveAuthenticatedUserId(expectedUserId?: string): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not signed in. Sign out, sign in again, then retry import.');
  }

  if (expectedUserId && expectedUserId !== user.id) {
    throw new Error('Session mismatch. Refresh the page and retry import.');
  }

  return user.id;
}

async function insertRowsInBatches(table: string, rows: Array<Record<string, unknown>>): Promise<void> {
  for (let index = 0; index < rows.length; index += INSERT_BATCH_SIZE) {
    const batch = rows.slice(index, index + INSERT_BATCH_SIZE);
    const { error } = await supabase.from(table).insert(batch);

    if (error) {
      throw error;
    }
  }
}

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

  for (const table of DELETE_USER_TABLES_ORDER) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) {
      throw new Error(`Failed to clear ${table}: ${formatSupabaseError(error)}`);
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

  const activeUserId = await resolveAuthenticatedUserId(userId);

  await deleteAllUserData(activeUserId);

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
            user_id: activeUserId,
          }));

    try {
      await insertRowsInBatches(table, normalized);
    } catch (error) {
      const message = formatSupabaseError(error);
      if (message.includes('row-level security')) {
        throw new Error(
          `Import failed on ${table}: ${message}. Confirm you are signed in and that supabase/schema.sql RLS policies are applied in your Supabase project.`
        );
      }

      throw new Error(`Import failed on ${table}: ${message}`);
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
