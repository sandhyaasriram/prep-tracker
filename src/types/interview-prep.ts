/**
 * View-layer types for the Interview Prep page.
 */

import type { CSFundamental, CSFundamentalStatus, MockInterview, MockType, OALog } from '@/types';

export type InterviewPrepTab = 'mocks' | 'oa' | 'cs';

export interface MockInterviewStats {
  total: number;
  averageRating: number | null;
  weakestArea: string | null;
}

export interface OALogStats {
  total: number;
  averageSolveRate: number | null;
}

export interface CSFundamentalsGroup {
  topic: string;
  items: CSFundamental[];
  strongCount: number;
  totalCount: number;
}

export interface InterviewPrepViewData {
  mocks: MockInterview[];
  mockStats: MockInterviewStats;
  oaLogs: OALog[];
  oaStats: OALogStats;
  csGroups: CSFundamentalsGroup[];
}

export interface AddMockInterviewInput {
  date: string;
  type: MockType;
  platform: string;
  topics: string[];
  rating?: number;
  wentWell?: string;
  improve?: string;
}

export interface AddOALogInput {
  date: string;
  company: string;
  platform: string;
  totalQuestions: number;
  solved: number;
  score?: number;
  topics: string[];
  notes?: string;
}

export interface UpdateCSFundamentalInput {
  id: string;
  status: CSFundamentalStatus;
  lastRevised?: string | null;
  notes?: string;
}
