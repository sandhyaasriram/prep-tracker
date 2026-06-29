/**
 * Stage badge colors for the application pipeline.
 */

import type { ApplicationStage } from '@/types';

export const stageBadgeStyles: Record<ApplicationStage, { bg: string; text: string }> = {
  Wishlist: { bg: '#E8E3DC', text: '#1A1614' },
  Applied: { bg: '#5B5FEF', text: '#FFFFFF' },
  'Online Assessment': { bg: '#D4941A', text: '#FFFFFF' },
  Interview: { bg: '#B85C7A', text: '#FFFFFF' },
  Offer: { bg: '#3D9B63', text: '#FFFFFF' },
  Rejected: { bg: '#6B7280', text: '#FFFFFF' },
};
