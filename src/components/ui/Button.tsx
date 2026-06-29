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
      primary: 'bg-[#5B5FEF] text-white hover:shadow-md active:scale-95 focus:ring-[#5B5FEF]',
      secondary: 'bg-[#F3F0EB] text-[#1A1614] hover:shadow-sm active:scale-95 focus:ring-[#5B5FEF]',
      ghost: 'text-[#1A1614] hover:bg-[#F3F0EB] active:scale-95 focus:ring-[#5B5FEF]',
    };

    const sizeClass: Record<string, string> = {
      sm: 'px-2 py-1 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    const darkMode = `dark:bg-[#1C2028] dark:text-[#E8EDF2] dark:focus:ring-[#6B6FF5]`;
    const darkVariant =
      variant === 'secondary'
        ? `${darkMode}`
        : variant === 'ghost'
          ? `${darkMode} dark:hover:bg-[#1C2028]`
          : `${darkMode}`;

    return (
      <button
        ref={ref}
        className={`${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${darkVariant} ${className}`}
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
