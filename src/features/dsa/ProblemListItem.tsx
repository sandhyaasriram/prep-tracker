/**
 * Minimal DSA problem row for checklist-style topic lists.
 * Shows checkbox, name, and difficulty badge only.
 */

import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components';
import type { DSAProblemSummary } from '@/types/dsa';

export type ProblemSelectHandler = (problemId: string, anchorElement: HTMLElement) => void;

interface ProblemListItemProps {
  problem: DSAProblemSummary;
  selected: boolean;
  onSelect: ProblemSelectHandler;
  onToggleSolved: (problemId: string) => Promise<void>;
}

/**
 * Compact problem row for fast scanning and check-off.
 */
export function ProblemListItem({ problem, selected, onSelect, onToggleSolved }: ProblemListItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-problem-id={problem.id}
      onClick={(event) => onSelect(problem.id, event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(problem.id, event.currentTarget);
        }
      }}
      className={`group flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 motion-reduce:transition-none ${
        selected
          ? 'bg-[#5B5FEF]/10 ring-1 ring-[#5B5FEF]/30'
          : 'hover:bg-[#F3F0EB] dark:hover:bg-[#1C2028]'
      } ${problem.solved ? 'opacity-80' : ''}`}
      aria-selected={selected}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleSolved(problem.id).catch(console.error);
        }}
        className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ${
          problem.solved
            ? 'border-[#2D7A4F] bg-[#2D7A4F] text-white'
            : 'border-[#E8E3DC] bg-white group-hover:border-[#5B5FEF]/40 dark:border-[#232830] dark:bg-[#13161A]'
        }`}
        aria-label={`Mark ${problem.name} as ${problem.solved ? 'unsolved' : 'solved'}`}
      >
        {problem.solved && <CheckCircle2 size={13} />}
      </button>

      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          problem.solved
            ? 'font-medium text-[#1A1614] line-through decoration-[#7A736B]/50 dark:text-[#E8EDF2]'
            : 'text-[#1A1614] dark:text-[#E8EDF2]'
        }`}
      >
        {problem.name}
      </span>

      <Badge variant="difficulty" difficulty={problem.difficulty}>
        {problem.difficulty}
      </Badge>
    </div>
  );
}
