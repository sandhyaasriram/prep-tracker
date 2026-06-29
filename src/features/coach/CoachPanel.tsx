/**
 * AI Coach side panel — daily brief and regenerate.
 */

import { RefreshCw, Sparkles, X } from 'lucide-react';
import { Button } from '@/components';
import type { CoachBriefSource } from '@/types/coach';

interface CoachPanelProps {
  isOpen: boolean;
  onClose: () => void;
  brief: string;
  source: CoachBriefSource;
  loading: boolean;
  error: string | null;
  regenerationsRemaining: number;
  onRegenerate: () => Promise<void>;
}

/**
 * Collapsible right-side panel for the daily AI coach brief.
 */
export function CoachPanel({
  isOpen,
  onClose,
  brief,
  source,
  loading,
  error,
  regenerationsRemaining,
  onRegenerate,
}: CoachPanelProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/20 md:bg-transparent"
        aria-label="Close AI coach"
        onClick={onClose}
      />

      <aside className="fixed right-0 top-[var(--app-chrome-height)] z-50 flex h-[calc(100vh-var(--app-chrome-height))] w-full max-w-md flex-col border-l border-[#E8E3DC] bg-white shadow-xl dark:border-transparent dark:bg-[#13161A]">
        <div className="flex items-center justify-between border-b border-[#E8E3DC] px-4 py-3 dark:border-transparent">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#5B5FEF]" />
            <div>
              <p className="text-sm font-semibold text-[#1A1614] dark:text-[#E8EDF2]">AI Coach</p>
              <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">
                {source === 'groq' ? 'AI brief' : 'Rules-based brief'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7A736B] hover:bg-[#F3F0EB] dark:text-[#6B7280] dark:hover:bg-[#1C2028]"
            aria-label="Close coach panel"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && (
            <div className="mb-3 flex items-center gap-2 text-xs text-[#7A736B] dark:text-[#6B7280]">
              <RefreshCw size={12} className="animate-spin" />
              Generating brief…
            </div>
          )}

          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#1A1614] dark:text-[#E8EDF2] dark:leading-loose">
            {brief || (loading ? '' : 'Your daily brief will appear here. Click Regenerate if nothing loads.')}
          </pre>

          {error && <p className="mt-3 text-sm text-[#E8622A]">{error}</p>}
        </div>

        <div className="border-t border-[#E8E3DC] px-4 py-3 dark:border-transparent">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">{regenerationsRemaining} regenerations left today</p>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={14} />}
              disabled={loading || regenerationsRemaining === 0}
              onClick={() => void onRegenerate()}
            >
              Regenerate
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
