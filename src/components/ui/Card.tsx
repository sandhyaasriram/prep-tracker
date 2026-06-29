/**
 * Card component — container for grouped content with optional header and footer.
 * Supports elevated and flat styles.
 */

import React from 'react';
import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
}

/**
 * Card container for content grouping.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', elevated = false }, ref) => {
    const baseClass =
      'bg-white dark:bg-[#161A20] rounded-lg border border-[#E8E3DC] dark:border-transparent transition-all duration-150';
    const elevatedClass = elevated ? 'shadow-lg' : 'shadow-sm';

    return (
      <div ref={ref} className={`${baseClass} ${elevatedClass} ${className}`}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className = '' }, ref) => (
    <div ref={ref} className={`px-4 py-3 border-b border-[#E8E3DC] dark:border-transparent ${className}`}>
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className = '' }, ref) => (
    <div ref={ref} className={`p-4 ${className}`}>
      {children}
    </div>
  )
);

CardBody.displayName = 'CardBody';

export interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className = '' }, ref) => (
    <div ref={ref} className={`px-4 py-3 border-t border-[#E8E3DC] dark:border-transparent ${className}`}>
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';
