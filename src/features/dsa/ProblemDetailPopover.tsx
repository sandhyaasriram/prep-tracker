/**
 * Row-anchored floating popover for DSA problem details.
 * Persists while scrolling until explicitly dismissed.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, RefreshCw, X } from 'lucide-react';
import { Badge, Button } from '@/components';
import {
  POPOVER_MAX_HEIGHT,
  POPOVER_WIDTH,
  computePopoverPosition,
  type PopoverPosition,
} from '@/features/dsa/popoverPosition';
import type { DSAProblemSummary } from '@/types/dsa';

interface ProblemDetailPopoverProps {
  problem: DSAProblemSummary;
  anchorRect: DOMRect;
  onClose: () => void;
  onToggleRevision: (problemId: string) => Promise<void>;
  onSaveNotes: (problemId: string, notes: string) => Promise<void>;
}

/**
 * Floating detail popover anchored to the selected problem row.
 */
export function ProblemDetailPopover({
  problem,
  anchorRect,
  onClose,
  onToggleRevision,
  onSaveNotes,
}: ProblemDetailPopoverProps) {
  const [noteDraft, setNoteDraft] = useState(problem.notes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>(() => computePopoverPosition(anchorRect));
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    setNoteDraft(problem.notes);
  }, [problem.id, problem.notes]);

  useLayoutEffect(() => {
    const measuredHeight = popoverRef.current?.offsetHeight ?? POPOVER_MAX_HEIGHT;
    setPosition(computePopoverPosition(anchorRect, Math.min(measuredHeight, POPOVER_MAX_HEIGHT)));
  }, [anchorRect, problem.id]);

  useEffect(() => {
    setVisible(false);
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [problem.id]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSaveNotes = async (): Promise<void> => {
    if (noteDraft === problem.notes) {
      return;
    }

    setSavingNotes(true);
    try {
      await onSaveNotes(problem.id, noteDraft);
    } finally {
      setSavingNotes(false);
    }
  };

  const prefersReducedMotion = reducedMotion;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={`Details for ${problem.name}`}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${POPOVER_WIDTH}px`,
        maxHeight: `${POPOVER_MAX_HEIGHT}px`,
        transformOrigin: `${position.originX}px ${position.originY}px`,
      }}
      className={`fixed z-[70] flex flex-col overflow-hidden rounded-2xl border border-[#E8E3DC] bg-white shadow-[0_18px_40px_rgba(26,22,20,0.14)] transition-[opacity,transform] duration-200 ease-out motion-reduce:transition-none dark:border-[#232830] dark:bg-[#13161A] dark:shadow-[0_18px_40px_rgba(0,0,0,0.45)] ${
        visible && !prefersReducedMotion ? 'scale-100 opacity-100' : visible ? 'opacity-100' : 'scale-[0.96] opacity-0'
      }`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-[#E8E3DC] px-4 py-3 dark:border-[#232830]">
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">{problem.topicName}</p>
          <h2 className="font-display text-lg leading-snug text-[#1A1614] dark:text-[#E8EDF2]">{problem.name}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="difficulty" difficulty={problem.difficulty}>
              {problem.difficulty}
            </Badge>
            {problem.solved && <Badge status="completed">Solved</Badge>}
            {problem.flaggedForRevision && <Badge status="warning">Revision</Badge>}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[#7A736B] dark:text-[#6B7280] transition-colors hover:bg-[#F3F0EB] hover:text-[#1A1614] dark:hover:bg-[#1C2028] dark:hover:text-[#E8EDF2]"
          aria-label="Close popover"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto px-4 py-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">LeetCode</p>
          {problem.leetcodeUrl ? (
            <a
              href={problem.leetcodeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#5B5FEF] hover:underline"
            >
              Open problem <ExternalLink size={14} />
            </a>
          ) : (
            <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Custom problem — no link</p>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">First solved</p>
          <p className="text-sm text-[#1A1614] dark:text-[#E8EDF2]">{problem.solvedDate ?? 'Not yet solved'}</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">Revision</p>
          <Button
            variant={problem.flaggedForRevision ? 'primary' : 'secondary'}
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={() => onToggleRevision(problem.id)}
          >
            {problem.flaggedForRevision ? 'Flagged for revision' : 'Flag for revision'}
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">Notes</p>
            <Button size="sm" variant="secondary" disabled={savingNotes} onClick={() => handleSaveNotes()}>
              Save
            </Button>
          </div>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Approach, pitfalls, time complexity..."
            className="min-h-28 w-full resize-y rounded-xl border border-[#E8E3DC] bg-[#F3F0EB] px-3 py-2 text-sm text-[#1A1614] outline-none focus:ring-2 focus:ring-[#5B5FEF] dark:border-[#232830] dark:bg-[#1C2028] dark:text-[#E8EDF2]"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
