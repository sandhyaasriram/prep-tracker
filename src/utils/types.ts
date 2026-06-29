/**
 * Type guard and assertion utilities.
 */

import type {
  Phase,
  DSADifficulty,
  ApplicationStage,
  ApplicationSource,
  ProjectStatus,
  MockType,
  CertificationStatus,
  CSFundamentalStatus,
} from '@/types';

export function isPhase(value: unknown): value is Phase {
  return ['Pre-College', 'Early Semester', 'Peak Season', 'Late Season'].includes(value as string);
}

export function isDSADifficulty(value: unknown): value is DSADifficulty {
  return ['Easy', 'Medium', 'Hard'].includes(value as string);
}

export function isApplicationStage(value: unknown): value is ApplicationStage {
  return ['Wishlist', 'Applied', 'Online Assessment', 'Interview', 'Offer', 'Rejected'].includes(
    value as string
  );
}

export function isApplicationSource(value: unknown): value is ApplicationSource {
  return ['CDC', 'Off-campus', 'Referral'].includes(value as string);
}

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return ['Planning', 'In Progress', 'Complete', 'Deployed', 'Archived'].includes(value as string);
}

export function isMockType(value: unknown): value is MockType {
  return ['Behavioural', 'DSA', 'CS Fundamentals', 'Full Technical', 'HR'].includes(value as string);
}

export function isCertificationStatus(value: unknown): value is CertificationStatus {
  return ['In Progress', 'Completed'].includes(value as string);
}

export function isCSFundamentalStatus(value: unknown): value is CSFundamentalStatus {
  return ['Not Started', 'Reading', 'Revised', 'Strong'].includes(value as string);
}
