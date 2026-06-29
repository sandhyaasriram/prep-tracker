/**
 * Journal date sidebar — calendar-style date list.
 */

import { formatDisplayDate, todayIST } from '@/utils';

interface JournalDateSidebarProps {
  dates: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

/**
 * Scrollable list of dates with journal entries.
 */
export function JournalDateSidebar({ dates, selectedDate, onSelectDate }: JournalDateSidebarProps) {
  const today = todayIST();

  return (
    <aside className="rounded-xl border border-[#E8E3DC] dark:border-[#232830]">
      <div className="border-b border-[#E8E3DC] px-4 py-3 dark:border-[#232830]">
        <p className="text-xs font-medium uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Entries</p>
      </div>
      <ul className="max-h-[480px] overflow-y-auto p-2">
        <li>
          <button
            type="button"
            onClick={() => onSelectDate(today)}
            className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              selectedDate === today
                ? 'bg-[#5B5FEF] text-white'
                : 'text-[#1A1614] hover:bg-[#F3F0EB] dark:text-[#E8EDF2] dark:hover:bg-[#1C2028]'
            }`}
          >
            Today · {formatDisplayDate(today)}
          </button>
        </li>
        {dates
          .filter((date) => date !== today)
          .map((date) => (
            <li key={date}>
              <button
                type="button"
                onClick={() => onSelectDate(date)}
                className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedDate === date
                    ? 'bg-[#5B5FEF] text-white'
                    : 'text-[#1A1614] hover:bg-[#F3F0EB] dark:text-[#E8EDF2] dark:hover:bg-[#1C2028]'
                }`}
              >
                {formatDisplayDate(date)}
              </button>
            </li>
          ))}
        {dates.length === 0 && (
          <li className="px-3 py-4 text-xs text-[#7A736B] dark:text-[#6B7280]">No past entries yet. Start with today.</li>
        )}
      </ul>
    </aside>
  );
}
