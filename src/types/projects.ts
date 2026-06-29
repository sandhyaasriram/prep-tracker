/**
 * View-layer types for the Projects page.
 */

import type { Project, ProjectChecklistItem, ProjectStatus } from '@/types';

export interface ProjectWithChecklist extends Project {
  checklist: ProjectChecklistItem[];
}

export interface ProjectsViewData {
  existing: ProjectWithChecklist[];
  suggested: ProjectWithChecklist[];
  stats: {
    total: number;
    inProgress: number;
    deployed: number;
    checklistComplete: number;
    checklistTotal: number;
  };
}

export interface UpdateProjectInput {
  status?: ProjectStatus;
  githubUrl?: string;
  demoUrl?: string;
  notes?: string;
}
