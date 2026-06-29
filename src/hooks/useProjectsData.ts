/**
 * Projects data hook.
 * Fetches projects with resume checklists and supports promote/update flows.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PROJECT_CHECKLIST_ITEMS } from '@/constants';
import { formatSupabaseError } from '@/utils/errors';
import type { Project, ProjectChecklistItem } from '@/types';
import type { ProjectWithChecklist, ProjectsViewData, UpdateProjectInput } from '@/types/projects';

interface UseProjectsDataResult {
  data: ProjectsViewData | null;
  loading: boolean;
  error: string | null;
  updateProject: (id: string, input: UpdateProjectInput) => Promise<void>;
  promoteProject: (id: string) => Promise<void>;
  toggleChecklistItem: (itemId: string, completed: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

function mergeProjects(projects: Project[], checklist: ProjectChecklistItem[]): ProjectWithChecklist[] {
  const checklistByProject = new Map<string, ProjectChecklistItem[]>();

  for (const item of checklist) {
    const existing = checklistByProject.get(item.project_id) ?? [];
    existing.push(item);
    checklistByProject.set(item.project_id, existing);
  }

  return projects.map((project) => ({
    ...project,
    checklist: (checklistByProject.get(project.id) ?? []).sort((a, b) => a.item.localeCompare(b.item)),
  }));
}

function buildStats(projects: ProjectWithChecklist[]): ProjectsViewData['stats'] {
  const existing = projects.filter((project) => project.type === 'existing');
  const checklistItems = existing.flatMap((project) => project.checklist);
  const checklistComplete = checklistItems.filter((item) => item.completed).length;

  return {
    total: projects.length,
    inProgress: projects.filter((project) => project.status === 'In Progress').length,
    deployed: projects.filter((project) => project.status === 'Deployed').length,
    checklistComplete,
    checklistTotal: checklistItems.length,
  };
}

/**
 * Load and manage project portfolio data.
 */
export function useProjectsData(userId: string | null): UseProjectsDataResult {
  const [projects, setProjects] = useState<ProjectWithChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!userId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const projectsResult = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      if (projectsResult.error) {
        throw projectsResult.error;
      }

      const projectRows = (projectsResult.data ?? []) as Project[];
      const projectIds = projectRows.map((project) => project.id);

      let checklistRows: ProjectChecklistItem[] = [];

      if (projectIds.length > 0) {
        const checklistResult = await supabase.from('project_checklist').select('*').in('project_id', projectIds);

        if (checklistResult.error) {
          throw checklistResult.error;
        }

        checklistRows = (checklistResult.data ?? []) as ProjectChecklistItem[];
      }

      setProjects(mergeProjects(projectRows, checklistRows));
    } catch (fetchError) {
      setError(formatSupabaseError(fetchError));
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const data = useMemo((): ProjectsViewData | null => {
    if (!userId) {
      return null;
    }

    return {
      existing: projects.filter((project) => project.type === 'existing'),
      suggested: projects.filter((project) => project.type === 'suggested'),
      stats: buildStats(projects),
    };
  }, [projects, userId]);

  const updateProject = useCallback(
    async (id: string, input: UpdateProjectInput): Promise<void> => {
      const payload: Record<string, unknown> = {};

      if (input.status !== undefined) payload.status = input.status;
      if (input.githubUrl !== undefined) payload.github_url = input.githubUrl.trim();
      if (input.demoUrl !== undefined) payload.demo_url = input.demoUrl.trim();
      if (input.notes !== undefined) payload.notes = input.notes.trim();

      const { error: updateError } = await supabase.from('projects').update(payload).eq('id', id);

      if (updateError) {
        throw new Error(formatSupabaseError(updateError));
      }

      await fetchData();
    },
    [fetchData]
  );

  const promoteProject = useCallback(
    async (id: string): Promise<void> => {
      const { error: updateError } = await supabase
        .from('projects')
        .update({ type: 'existing', status: 'In Progress' })
        .eq('id', id);

      if (updateError) {
        throw new Error(formatSupabaseError(updateError));
      }

      const checklistPayload = PROJECT_CHECKLIST_ITEMS.map((item) => ({
        project_id: id,
        item,
        completed: false,
      }));

      const { error: checklistError } = await supabase.from('project_checklist').insert(checklistPayload);

      if (checklistError) {
        throw new Error(formatSupabaseError(checklistError));
      }

      await fetchData();
    },
    [fetchData]
  );

  const toggleChecklistItem = useCallback(
    async (itemId: string, completed: boolean): Promise<void> => {
      const { error: updateError } = await supabase.from('project_checklist').update({ completed }).eq('id', itemId);

      if (updateError) {
        throw new Error(formatSupabaseError(updateError));
      }

      await fetchData();
    },
    [fetchData]
  );

  return {
    data,
    loading,
    error,
    updateProject,
    promoteProject,
    toggleChecklistItem,
    refresh: fetchData,
  };
}
