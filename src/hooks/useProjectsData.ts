/**
 * Projects data hook.
 * Fetches projects with resume checklists and supports promote/update flows.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PROJECT_CHECKLIST_ITEMS } from '@/constants';
import { formatSupabaseError } from '@/utils/errors';
import { markHydrated, resetHydrated, shouldShowInitialLoading } from '@/utils/hydratedFetch';
import { runOptimisticMutation } from '@/utils/optimisticMutation';
import type { Project, ProjectChecklistItem } from '@/types';
import type { CreateProjectInput, ProjectWithChecklist, ProjectsViewData, UpdateProjectInput } from '@/types/projects';

interface UseProjectsDataResult {
  data: ProjectsViewData | null;
  loading: boolean;
  error: string | null;
  updateProject: (id: string, input: UpdateProjectInput) => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<void>;
  promoteProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  toggleChecklistItem: (itemId: string, completed: boolean) => Promise<void>;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
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
  const hydratedRef = useRef(false);

  const fetchData = useCallback(async (options?: { silent?: boolean }): Promise<void> => {
    if (!userId) {
      setProjects([]);
      setLoading(false);
      resetHydrated(hydratedRef);
      return;
    }

    if (shouldShowInitialLoading(hydratedRef, options?.silent)) {
      setLoading(true);
    }
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

      const merged = mergeProjects(projectRows, checklistRows);
      setProjects(merged);
    } catch (fetchError) {
      setError(formatSupabaseError(fetchError));
      if (!hydratedRef.current) {
        setProjects([]);
      }
    } finally {
      markHydrated(hydratedRef);
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    resetHydrated(hydratedRef);
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
      const previous = projects;
      const optimistic = projects.map((project) =>
        project.id !== id
          ? project
          : {
              ...project,
              status: input.status !== undefined ? input.status : project.status,
              github_url: input.githubUrl !== undefined ? input.githubUrl.trim() : project.github_url,
              demo_url: input.demoUrl !== undefined ? input.demoUrl.trim() : project.demo_url,
              notes: input.notes !== undefined ? input.notes.trim() : project.notes,
            }
      );

      await runOptimisticMutation({
        apply: () => {
          setProjects(optimistic);
        },
        revert: () => {
          setProjects(previous);
        },
        persist: async () => {
          const payload: Record<string, unknown> = {};
          if (input.status !== undefined) payload.status = input.status;
          if (input.githubUrl !== undefined) payload.github_url = input.githubUrl.trim();
          if (input.demoUrl !== undefined) payload.demo_url = input.demoUrl.trim();
          if (input.notes !== undefined) payload.notes = input.notes.trim();
          const { error: updateError } = await supabase.from('projects').update(payload).eq('id', id);
          if (updateError) throw updateError;
        },
        errorMessage: 'Could not update project.',
      });
    },
    [projects]
  );

  const createProject = useCallback(
    async (input: CreateProjectInput): Promise<void> => {
      if (!userId) {
        return;
      }

      const previous = projects;
      const now = new Date().toISOString();
      const tempId = crypto.randomUUID();
      const tempChecklist: ProjectChecklistItem[] = PROJECT_CHECKLIST_ITEMS.map((item) => ({
        id: crypto.randomUUID(),
        project_id: tempId,
        item,
        completed: false,
        created_at: now,
        updated_at: now,
      }));
      const tempProject: ProjectWithChecklist = {
        id: tempId,
        user_id: userId,
        name: input.name.trim(),
        tech_stack: input.techStack,
        status: input.status,
        github_url: input.githubUrl.trim(),
        demo_url: input.demoUrl.trim(),
        type: 'existing',
        placement_relevance: input.placementRelevance.trim(),
        notes: input.notes.trim(),
        created_at: now,
        updated_at: now,
        checklist: tempChecklist,
      };

      const optimistic = [tempProject, ...projects];

      await runOptimisticMutation({
        apply: () => {
          setProjects(optimistic);
        },
        revert: () => {
          setProjects(previous);
        },
        persist: async () => {
          const { data: insertedProject, error: insertProjectError } = await supabase
            .from('projects')
            .insert({
              user_id: userId,
              name: input.name.trim(),
              tech_stack: input.techStack,
              status: input.status,
              github_url: input.githubUrl.trim(),
              demo_url: input.demoUrl.trim(),
              placement_relevance: input.placementRelevance.trim(),
              notes: input.notes.trim(),
              type: 'existing',
            })
            .select('*')
            .single();

          if (insertProjectError) {
            throw insertProjectError;
          }

          const checklistPayload = PROJECT_CHECKLIST_ITEMS.map((item) => ({
            project_id: insertedProject.id,
            item,
            completed: false,
          }));

          const { data: insertedChecklist, error: checklistError } = await supabase
            .from('project_checklist')
            .insert(checklistPayload)
            .select('*');

          if (checklistError) {
            throw checklistError;
          }

          const realProject = insertedProject as Project;

          setProjects((current) =>
            current.map((project) =>
              project.id === tempId
                ? { ...realProject, checklist: (insertedChecklist ?? []) as ProjectChecklistItem[] }
                : project
            )
          );
        },
        errorMessage: 'Could not create project.',
      });
    },
    [projects, userId]
  );

  const promoteProject = useCallback(
    async (id: string): Promise<void> => {
      const previous = projects;
      const now = new Date().toISOString();
      const tempChecklist: ProjectChecklistItem[] = PROJECT_CHECKLIST_ITEMS.map((item) => ({
        id: crypto.randomUUID(),
        project_id: id,
        item,
        completed: false,
        created_at: now,
        updated_at: now,
      }));
      const optimistic = projects.map((project) =>
        project.id === id
          ? { ...project, type: 'existing' as const, status: 'In Progress' as const, checklist: tempChecklist }
          : project
      );

      await runOptimisticMutation({
        apply: () => {
          setProjects(optimistic);
        },
        revert: () => {
          setProjects(previous);
        },
        persist: async () => {
          const { error: updateError } = await supabase
            .from('projects')
            .update({ type: 'existing', status: 'In Progress' })
            .eq('id', id);
          if (updateError) throw updateError;

          const checklistPayload = PROJECT_CHECKLIST_ITEMS.map((item) => ({
            project_id: id,
            item,
            completed: false,
          }));

          const { data: inserted, error: checklistError } = await supabase
            .from('project_checklist')
            .insert(checklistPayload)
            .select('*');
          if (checklistError) throw checklistError;

          setProjects((current) => {
            const next = current.map((project) =>
              project.id === id
                ? { ...project, checklist: (inserted ?? []) as ProjectChecklistItem[] }
                : project
            );
            return next;
          });
        },
        errorMessage: 'Could not promote project.',
      });
    },
    [projects]
  );

  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      const previous = projects;
      const optimistic = projects.filter((project) => project.id !== id);

      await runOptimisticMutation({
        apply: () => {
          setProjects(optimistic);
        },
        revert: () => {
          setProjects(previous);
        },
        persist: async () => {
          const { error: checklistError } = await supabase.from('project_checklist').delete().eq('project_id', id);
          if (checklistError) {
            throw checklistError;
          }

          const { error: projectError } = await supabase.from('projects').delete().eq('id', id);
          if (projectError) {
            throw projectError;
          }
        },
        errorMessage: 'Could not delete project.',
      });
    },
    [projects]
  );

  const toggleChecklistItem = useCallback(
    async (itemId: string, completed: boolean): Promise<void> => {
      const previous = projects;
      const optimistic = projects.map((project) => ({
        ...project,
        checklist: project.checklist.map((item) =>
          item.id === itemId ? { ...item, completed } : item
        ),
      }));

      await runOptimisticMutation({
        apply: () => {
          setProjects(optimistic);
        },
        revert: () => {
          setProjects(previous);
        },
        persist: async () => {
          const { error: updateError } = await supabase.from('project_checklist').update({ completed }).eq('id', itemId);
          if (updateError) throw updateError;
        },
        errorMessage: 'Could not update checklist item.',
      });
    },
    [projects]
  );

  return {
    data,
    loading,
    error,
    updateProject,
    createProject,
    promoteProject,
    deleteProject,
    toggleChecklistItem,
    refresh: fetchData,
  };
}
