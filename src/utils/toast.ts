/**
 * Lightweight toast notifications (non-blocking errors and feedback).
 */

export type ToastTone = 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  tone: ToastTone;
}

type ToastListener = (toast: ToastMessage) => void;

const listeners = new Set<ToastListener>();

function emit(message: string, tone: ToastTone): void {
  const toast: ToastMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message,
    tone,
  };

  for (const listener of listeners) {
    listener(toast);
  }
}

export const toast = {
  error(message: string): void {
    emit(message, 'error');
  },
  info(message: string): void {
    emit(message, 'info');
  },
  subscribe(listener: ToastListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
