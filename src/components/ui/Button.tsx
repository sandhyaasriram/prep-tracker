/**
 * Button component — primary interactive element with multiple variants.
 * Supports primary, secondary, and icon-only modes.
 * Respects prefers-reduced-motion.
 */

import React from 'react';
import type { ReactNode } from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  isLoading?: boolean;
  icon?: ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, isLoading = false, icon, className = '', ...props }, ref) => {
    const baseClass =
      'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantClass: Record<string, string> = {
      primary:
        'bg-[#5B5FEF] text-white hover:shadow-md active:scale-95 focus:ring-[#5B5FEF] dark:bg-[#5B5FEF] dark:hover:bg-[#6B6FF5] dark:text-white',
      secondary:
        'bg-[#F3F0EB] text-[#1A1614] hover:shadow-sm active:scale-95 focus:ring-[#5B5FEF] dark:bg-[#1A1F26] dark:text-[#E2E8F0] dark:hover:bg-[#222830]',
      ghost:
        'text-[#1A1614] hover:bg-[#F3F0EB] active:scale-95 focus:ring-[#5B5FEF] dark:text-[#E2E8F0] dark:hover:bg-[#1A1F26]',
    };

    const sizeClass: Record<string, string> = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${baseClass} ${variantClass[variant]} ${sizeClass[size]} dark:focus:ring-[#6B6FF5] dark:focus:ring-offset-[#101216] motion-reduce:active:scale-100 ${className}`}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            {typeof children === 'string' ? children : null}
          </>
        ) : (
          <>
            {icon && <span>{icon}</span>}
            {children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
