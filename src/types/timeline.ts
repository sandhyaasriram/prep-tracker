/**
 * Timeline domain types.
 */

export type TimelineCategory = 'DSA' | 'Cert' | 'Application' | 'Personal';

export interface TimelineMilestone {
  id: string;
  user_id: string;
  date: string;
  label: string;
  category: TimelineCategory;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface AddTimelineMilestoneInput {
  date: string;
  label: string;
  category: TimelineCategory;
  color?: string;
}

export interface UpdateTimelineMilestoneInput {
  date?: string;
  label?: string;
  category?: TimelineCategory;
  color?: string;
}
