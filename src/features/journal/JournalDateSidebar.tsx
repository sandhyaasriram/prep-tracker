/**
 * Journal date sidebar — calendar-style date list.
 */

import { formatDisplayDate, todayIST } from '@/utils';
import type { JournalEntry } from '@/types';

interface JournalDateSidebarProps {
  entries: JournalEntry[];
  selectedEntryId: string | null;
  onSelectEntry: (entry: JournalEntry) => void;
  onEditEntry: (entry: JournalEntry) => void;
}

/**
 * Scrollable list of entries grouped by date.
 */
export function JournalDateSidebar({ entries, selectedEntryId, onSelectEntry, onEditEntry }: JournalDateSidebarProps) {
  const today = todayIST();
  const grouped = new Map<string, JournalEntry[]>();

  for (const entry of entries) {
    const existing = grouped.get(entry.date) ?? [];
    existing.push(entry);
    grouped.set(entry.date, existing);
  }

  const sortedDates = [...grouped.keys()].sort((left, right) => right.localeCompare(left));
  const dates = [today, ...sortedDates.filter((date) => date !== today)];

  return (
    <aside className="rounded-xl border border-[#E8E3DC] dark:border-[#232830]">
      <div className="border-b border-[#E8E3DC] px-4 py-3 dark:border-[#232830]">
        <p className="text-xs font-medium uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Entries</p>
      </div>
      <div className="max-h-[480px] overflow-y-auto p-2">
        {dates.map((date) => {
          const dateEntries = [...(grouped.get(date) ?? [])].sort((left, right) =>
            left.created_at.localeCompare(right.created_at)
          );

          if (dateEntries.length === 0) {
            return null;
          }

          return (
            <div key={date} className="mb-2 rounded-lg border border-[#E8E3DC] px-2 py-2 dark:border-[#232830]">
              <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">
                {date === today ? `Today · ${formatDisplayDate(today)}` : formatDisplayDate(date)}
              </p>
              <ul className="mt-1 space-y-1">
                {dateEntries.map((entry, index) => {
                  const fallbackTitle = `Entry ${index + 1}`;

                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => onSelectEntry(entry)}
                        onDoubleClick={() => onEditEntry(entry)}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          selectedEntryId === entry.id
                            ? 'bg-[#5B5FEF] text-white'
                            : 'text-[#1A1614] hover:bg-[#F3F0EB] dark:text-[#E8EDF2] dark:hover:bg-[#1C2028]'
                        }`}
                      >
                        {entry.title?.trim() || fallbackTitle}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        {entries.length === 0 && (
          <p className="px-3 py-4 text-xs text-[#7A736B] dark:text-[#6B7280]">No past entries yet. Start with today.</p>
        )}
      </div>
    </aside>
  );
}
