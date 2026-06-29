/**
 * View-layer types for the Certifications page.
 */

import type { Certification, CertificationStatus } from '@/types';

export interface CertificationsViewData {
  inProgress: Certification[];
  completed: Certification[];
  stats: {
    total: number;
    inProgressCount: number;
    completedCount: number;
    averageProgress: number | null;
  };
}

export interface AddCertificationInput {
  name: string;
  provider: string;
  status: CertificationStatus;
  targetDate?: string;
  progress?: number;
  certUrl?: string;
  notes?: string;
}

export interface UpdateCertificationInput {
  name?: string;
  provider?: string;
  status?: CertificationStatus;
  targetDate?: string | null;
  progress?: number;
  certUrl?: string;
  notes?: string;
}
