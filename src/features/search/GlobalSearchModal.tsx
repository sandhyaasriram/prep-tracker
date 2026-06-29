/**
 * Global search command palette — Cmd/Ctrl + K from any page.
 */

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Badge, Input, Modal } from '@/components';
import { navigateToSearchResult } from '@/features/search/navigateToSearchResult';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import type { GlobalSearchResult } from '@/types/global-search';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

/**
 * Search across DSA, applications, journal, projects, and certifications.
 */
export function GlobalSearchModal({ isOpen, onClose, userId }: GlobalSearchModalProps) {
  const { loading, error, query, setQuery, groupedResults } = useGlobalSearch(userId, isOpen);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const flatResults = groupedResults.flatMap((group) => group.items);

  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleSelect = (result: GlobalSearchResult): void => {
    navigateToSearchResult(result);
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(flatResults.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter' && flatResults[activeIndex]) {
      event.preventDefault();
      handleSelect(flatResults[activeIndex]);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Placement OS" size="lg">
      <div className="space-y-4">
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search problems, companies, journal, projects..."
          icon={<Search size={16} />}
        />

        <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">
          Tip: use ↑ ↓ and Enter to navigate results. Shortcut: Ctrl/Cmd + K
        </p>

        {loading && <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Loading search index...</p>}
        {error && <p className="text-sm text-[#E8622A]">{error}</p>}

        {!loading && !error && groupedResults.length === 0 && (
          <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">
            {query.trim() ? 'No matches found.' : 'Start typing to search your workspace.'}
          </p>
        )}

        <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1">
          {groupedResults.map((group) => (
            <section key={group.type}>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-[#7A736B] dark:text-[#6B7280]">
                {group.type}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const itemIndex = flatResults.findIndex((candidate) => candidate.id === item.id && candidate.type === item.type);
                  const active = itemIndex === activeIndex;

                  return (
                    <li key={`${item.type}-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors duration-150 ${
                          active
                            ? 'border-[#5B5FEF]/40 bg-[#5B5FEF]/10'
                            : 'border-[#E8E3DC] bg-white hover:bg-[#F3F0EB] dark:border-[#232830] dark:bg-[#13161A] dark:hover:bg-[#1C2028]'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">{item.title}</p>
                          <p className="truncate text-xs text-[#7A736B] dark:text-[#6B7280]">{item.subtitle}</p>
                        </div>
                        <Badge variant={item.type === 'DSA' ? 'dsa' : item.type === 'Applications' ? 'applications' : item.type === 'Projects' ? 'projects' : item.type === 'Certifications' ? 'certifications' : 'journal'}>
                          {item.type}
                        </Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </Modal>
  );
}
