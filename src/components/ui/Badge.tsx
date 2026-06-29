/**
 * Badge component — small labeled element for status, category, or difficulty indicators.
 * Supports themed variants and custom colors.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { categoryColors, difficultyColors } from '@/constants/theme';

type BadgeVariant = 'dsa' | 'applications' | 'projects' | 'certifications' | 'interview' | 'journal' | 'difficulty' | 'status';

export interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  status?: 'completed' | 'in-progress' | 'pending' | 'warning';
  className?: string;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = 'status', difficulty, status, className = '' }, ref) => {
    let bgColor = '#E8E3DC';
    let textColor = '#1A1614';

    if (variant === 'difficulty' && difficulty) {
      bgColor = difficultyColors[difficulty];
      textColor = '#FFFFFF';
    } else if (variant === 'dsa') {
      bgColor = categoryColors.DSA;
      textColor = '#FFFFFF';
    } else if (variant === 'applications') {
      bgColor = categoryColors.Applications;
      textColor = '#FFFFFF';
    } else if (variant === 'projects') {
      bgColor = categoryColors.Projects;
      textColor = '#FFFFFF';
    } else if (variant === 'certifications') {
      bgColor = categoryColors.Certifications;
      textColor = '#FFFFFF';
    } else if (variant === 'interview') {
      bgColor = categoryColors['Interview Prep'];
      textColor = '#FFFFFF';
    } else if (variant === 'journal') {
      bgColor = categoryColors.Journal;
      textColor = '#FFFFFF';
    } else if (status === 'completed') {
      bgColor = categoryColors.Projects;
      textColor = '#FFFFFF';
    } else if (status === 'in-progress') {
      bgColor = categoryColors.Certifications;
      textColor = '#FFFFFF';
    } else if (status === 'warning') {
      bgColor = categoryColors.Applications;
      textColor = '#FFFFFF';
    }

    return (
      <span
        ref={ref}
        className={`inline-block px-2 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${className}`}
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
