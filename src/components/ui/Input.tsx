/**
 * Input component — text input with support for labels, errors, and icons.
 * Supports standard, error, and disabled states.
 */

import React from 'react';
import type { ReactNode } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="block text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">{label}</label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            className={`w-full px-3 py-2 rounded-lg bg-white dark:bg-[#1C2028] text-[#1A1614] dark:text-[#E8EDF2] border transition-all duration-150 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              error
                ? 'border-[#E8622A] focus:ring-[#E8622A]'
                : 'border-[#E8E3DC] dark:border-[#232830] focus:border-transparent focus:ring-[#5B5FEF] dark:focus:ring-[#6B6FF5]'
            } ${className}`}
            {...props}
          />
          {icon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A736B] dark:text-[#6B7280]">{icon}</span>}
        </div>
        {error && <p className="text-xs text-[#E8622A]">{error}</p>}
        {helperText && !error && <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
