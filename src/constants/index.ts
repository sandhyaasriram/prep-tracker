/**
 * App-wide constants and enumerations.
 */

export const APP_NAME = 'Placement OS';
export const APP_VERSION = '0.1.0';

export const PHASES = {
  PRE_COLLEGE: 'Pre-College',
  EARLY_SEMESTER: 'Early Semester',
  PEAK_SEASON: 'Peak Season',
  LATE_SEASON: 'Late Season',
} as const;

export const DSA_DIFFICULTIES = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
} as const;

export const APPLICATION_STAGES = {
  WISHLIST: 'Wishlist',
  APPLIED: 'Applied',
  ONLINE_ASSESSMENT: 'Online Assessment',
  INTERVIEW: 'Interview',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
} as const;

export const APPLICATION_SOURCES = {
  CDC: 'CDC',
  OFF_CAMPUS: 'Off-campus',
  REFERRAL: 'Referral',
} as const;

export const APPLICATION_STAGE_ORDER = [
  APPLICATION_STAGES.WISHLIST,
  APPLICATION_STAGES.APPLIED,
  APPLICATION_STAGES.ONLINE_ASSESSMENT,
  APPLICATION_STAGES.INTERVIEW,
  APPLICATION_STAGES.OFFER,
  APPLICATION_STAGES.REJECTED,
] as const;

export const INTERVIEW_ROUND_TYPES = [
  'Technical',
  'DSA',
  'Behavioural',
  'HR',
  'Managerial',
  'System Design',
  'Other',
] as const;

export const INTERVIEW_OUTCOMES = ['Scheduled', 'Passed', 'Failed', 'No show', 'Pending'] as const;

export const PROJECT_STATUS = {
  PLANNING: 'Planning',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  DEPLOYED: 'Deployed',
  ARCHIVED: 'Archived',
} as const;

export const PROJECT_CHECKLIST_ITEMS = [
  'README done',
  'Deployed',
  'Added to resume',
  'LinkedIn post',
  'Demo video',
] as const;

export const MOCK_TYPES = {
  BEHAVIOURAL: 'Behavioural',
  DSA: 'DSA',
  CS_FUNDAMENTALS: 'CS Fundamentals',
  FULL_TECHNICAL: 'Full Technical',
  HR: 'HR',
} as const;

export const CERTIFICATION_STATUS = {
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
} as const;

export const CS_FUNDAMENTAL_STATUS = {
  NOT_STARTED: 'Not Started',
  READING: 'Reading',
  REVISED: 'Revised',
  STRONG: 'Strong',
} as const;

export const TIMELINE_CATEGORIES = ['DSA', 'Cert', 'Application', 'Personal'] as const;

export const TIMELINE_CATEGORY_COLORS: Record<(typeof TIMELINE_CATEGORIES)[number], string> = {
  DSA: '#5B5FEF',
  Cert: '#C4841A',
  Application: '#E8622A',
  Personal: '#7A736B',
};

export const TIMELINE_COLOR_LABELS = ['Indigo', 'Amber', 'Terracotta', 'Warm Grey'] as const;

export const THEME_OPTIONS = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

// Date formatting constants
export const DATE_FORMAT = 'yyyy-MM-dd';
export const DISPLAY_DATE_FORMAT = 'MMM d, yyyy';
export const DISPLAY_DATETIME_FORMAT = 'MMM d, yyyy h:mm a';

// DSA revision threshold (days)
export const DSA_REVISION_THRESHOLD_DAYS = 7;

// Weekly goals targets (customize per week)
export const WEEKLY_GOALS_TARGETS = {
  DSA_PROBLEMS: 15,
  HOURS_LOGGED: 20,
  APPLICATIONS_SENT: 3,
  MOCKS_DONE: 1,
} as const;

// Cache durations (in milliseconds)
export const CACHE_DURATIONS = {
  GEMINI_BRIEF: 24 * 60 * 60 * 1000, // 24 hours
  USER_DATA: 5 * 60 * 1000, // 5 minutes
  APPLICATION_LIST: 10 * 60 * 1000, // 10 minutes
} as const;

// IST timezone offset
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
