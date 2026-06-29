/**
 * Renders transient toast notifications.
 */

import { useEffect, useState } from 'react';
import { toast, type ToastMessage } from '@/utils/toast';

const TOAST_DURATION_MS = 4000;

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return toast.subscribe((nextToast) => {
      setToasts((current) => [...current, nextToast]);

      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== nextToast.id));
      }, TOAST_DURATION_MS);
    });
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={`rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm ${
            item.tone === 'error'
              ? 'border-[#E8622A]/30 bg-[#E8622A]/10 text-[#1A1614] dark:text-[#E8EDF2]'
              : 'border-[#E8E3DC] bg-white/95 text-[#1A1614] dark:border-transparent dark:bg-[#1C2028]/95 dark:text-[#E8EDF2]'
          }`}
          role="status"
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
