/**
 * View-layer types for the Applications page.
 */

import type { Application, ApplicationSource, ApplicationStage, InterviewRound } from '@/types';

export interface ApplicationWithRounds extends Application {
  rounds: InterviewRound[];
}

export interface ApplicationFilters {
  stage: ApplicationStage | 'All';
  source: ApplicationSource | 'All';
  dateFrom: string;
  dateTo: string;
}

export interface ApplicationStats {
  total: number;
  active: number;
  offers: number;
  upcomingDeadlines: number;
}

export interface ApplicationsViewData {
  applications: ApplicationWithRounds[];
  allApplications: ApplicationWithRounds[];
  stats: ApplicationStats;
}

export interface AddApplicationInput {
  company: string;
  role: string;
  source: ApplicationSource;
  stage: ApplicationStage;
  dateApplied?: string;
  nextDeadline?: string;
  oaScore?: number;
  notes?: string;
}

export interface UpdateApplicationInput {
  company?: string;
  role?: string;
  source?: ApplicationSource;
  stage?: ApplicationStage;
  dateApplied?: string | null;
  nextDeadline?: string | null;
  oaScore?: number | null;
  notes?: string;
}

export interface AddInterviewRoundInput {
  applicationId: string;
  type: string;
  date?: string;
  outcome?: string;
  notes?: string;
}
