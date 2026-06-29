/**
 * Global TypeScript types for Placement OS.
 */

export type Phase = 'Pre-College' | 'Early Semester' | 'Peak Season' | 'Late Season';

export type DSADifficulty = 'Easy' | 'Medium' | 'Hard';

export type ApplicationStage = 'Wishlist' | 'Applied' | 'Online Assessment' | 'Interview' | 'Offer' | 'Rejected';

export type ApplicationSource = 'CDC' | 'Off-campus' | 'Referral';

export type MockType = 'Behavioural' | 'DSA' | 'CS Fundamentals' | 'Full Technical' | 'HR';

export type ProjectStatus = 'Planning' | 'In Progress' | 'Complete' | 'Deployed' | 'Archived';

export type ProjectType = 'existing' | 'suggested';

export type CertificationStatus = 'In Progress' | 'Completed';

export type CSFundamentalStatus = 'Not Started' | 'Reading' | 'Revised' | 'Strong';

export interface DSATopic {
  id: string;
  user_id: string;
  name: string;
  order_index: number;
  target_problem_count: number;
  created_at: string;
  updated_at: string;
}

export interface DSAProblem {
  id: string;
  user_id: string;
  topic_id: string;
  name: string;
  difficulty: DSADifficulty;
  leetcode_url: string | null;
  solved: boolean;
  solved_date: string | null;
  flagged_for_revision: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  company: string;
  role: string;
  source: ApplicationSource;
  stage: ApplicationStage;
  date_applied: string | null;
  next_deadline: string | null;
  oa_score: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewRound {
  id: string;
  application_id: string;
  round_number: number;
  type: string;
  date: string | null;
  outcome: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MockInterview {
  id: string;
  user_id: string;
  date: string;
  type: MockType;
  platform: string;
  topics: string[];
  rating: number | null;
  went_well: string;
  improve: string;
  created_at: string;
  updated_at: string;
}

export interface CSFundamental {
  id: string;
  user_id: string;
  topic: string;
  subtopic: string;
  status: CSFundamentalStatus;
  last_revised: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface OALog {
  id: string;
  user_id: string;
  date: string;
  company: string;
  platform: string;
  total_questions: number;
  solved: number;
  score: number | null;
  topics: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  tech_stack: string[];
  status: ProjectStatus;
  github_url: string;
  demo_url: string;
  type: ProjectType;
  placement_relevance: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Certification {
  id: string;
  user_id: string;
  name: string;
  provider: string;
  status: CertificationStatus;
  target_date: string | null;
  progress: number;
  cert_url: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  date: string;
  content_markdown: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  target_companies: string[];
  graduation_year: number;
  college: string;
  gemini_api_key_encrypted: string;
  theme: 'light' | 'dark' | 'system';
  sidebar_collapsed: boolean;
  last_opened_page: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  gpa: number;
  college: string;
}
