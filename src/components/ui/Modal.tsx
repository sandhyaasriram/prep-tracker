/**
 * Modal component — overlay dialog for focused interactions.
 * Supports title, body, and footer with customizable actions.
 * Respects prefers-reduced-motion.
 */

import React, { useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ isOpen, onClose, title, children, footer, size = 'md' }, ref) => {
    const handleEscape = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      },
      [onClose]
    );

    useEffect(() => {
      if (!isOpen) {
        return;
      }

      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'auto';
      };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    const sizeClass: Record<string, string> = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animationClass = prefersReducedMotion ? '' : 'animate-in fade-in duration-150';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50" />
        <div
          ref={ref}
          className={`relative w-full ${sizeClass[size]} bg-white dark:bg-[#13161A] rounded-lg shadow-xl ${animationClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-[#E8E3DC] dark:border-[#232830] px-6 py-4">
            <h2 className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{title}</h2>
            <button
              onClick={onClose}
              className="text-[#7A736B] dark:text-[#6B7280] hover:text-[#1A1614] dark:hover:text-[#E8EDF2] transition-colors duration-150"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
          <div className="px-6 py-4">{children}</div>
          {footer && (
            <div className="border-t border-[#E8E3DC] dark:border-[#232830] px-6 py-4 flex gap-2 justify-end">{footer}</div>
          )}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';
