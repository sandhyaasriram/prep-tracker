/**
 * Expandable topic problem list with per-topic search and virtualization.
 */

import { useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Input } from '@/components';
import { ProblemListItem, type ProblemSelectHandler } from '@/features/dsa/ProblemListItem';
import type { DSAProblemSummary } from '@/types/dsa';

interface TopicProblemListProps {
  topicId: string;
  problems: DSAProblemSummary[];
  selectedProblemId: string | null;
  onSelectProblem: ProblemSelectHandler;
  onToggleSolved: (problemId: string) => Promise<void>;
}

const VIRTUALIZE_THRESHOLD = 12;
const ESTIMATED_ROW_HEIGHT = 44;

/**
 * Lightweight checklist of problems inside an expanded topic.
 */
export function TopicProblemList({
  topicId,
  problems,
  selectedProblemId,
  onSelectProblem,
  onToggleSolved,
}: TopicProblemListProps) {
  const [topicSearch, setTopicSearch] = useState('');
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredProblems = useMemo(() => {
    const query = topicSearch.trim().toLowerCase();
    if (!query) {
      return problems;
    }

    return problems.filter((problem) => problem.name.toLowerCase().includes(query));
  }, [problems, topicSearch]);

  const virtualizer = useVirtualizer({
    count: filteredProblems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8,
  });

  const renderRow = (problem: DSAProblemSummary): JSX.Element => (
    <ProblemListItem
      key={problem.id}
      problem={problem}
      selected={selectedProblemId === problem.id}
      onSelect={onSelectProblem}
      onToggleSolved={onToggleSolved}
    />
  );

  return (
    <div className="space-y-3">
      <Input
        id={`topic-search-${topicId}`}
        icon={<Search size={14} />}
        placeholder="Search in this topic..."
        value={topicSearch}
        onChange={(event) => setTopicSearch(event.target.value)}
      />

      {filteredProblems.length === 0 ? (
        <p className="py-4 text-center text-sm text-[#7A736B] dark:text-[#6B7280]">No problems match your search.</p>
      ) : filteredProblems.length <= VIRTUALIZE_THRESHOLD ? (
        <div className="divide-y divide-[#E8E3DC] dark:divide-[#232830]">{filteredProblems.map((problem) => renderRow(problem))}</div>
      ) : (
        <div ref={parentRef} className="max-h-[420px] overflow-y-auto">
          <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const problem = filteredProblems[virtualItem.index];
              if (!problem) {
                return null;
              }

              return (
                <div
                  key={problem.id}
                  className="absolute left-0 top-0 w-full border-b border-[#E8E3DC] dark:border-[#232830]"
                  style={{
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  {renderRow(problem)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
