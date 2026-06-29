/**
 * CS fundamentals tracker tab for Interview Prep.
 */

import { CS_FUNDAMENTAL_STATUS } from '@/constants';
import { todayIST } from '@/utils';
import type { CSFundamentalStatus } from '@/types';
import type { CSFundamentalsGroup, UpdateCSFundamentalInput } from '@/types/interview-prep';

interface CSFundamentalsTabProps {
  groups: CSFundamentalsGroup[];
  onUpdate: (input: UpdateCSFundamentalInput) => Promise<void>;
}

const STATUS_OPTIONS = Object.values(CS_FUNDAMENTAL_STATUS);

/**
 * Topic-grouped CS fundamentals revision tracker.
 */
export function CSFundamentalsTab({ groups, onUpdate }: CSFundamentalsTabProps) {
  const handleStatusChange = async (id: string, status: CSFundamentalStatus, notes: string): Promise<void> => {
    const lastRevised = status === 'Not Started' ? null : todayIST();
    await onUpdate({ id, status, lastRevised, notes });
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.topic} className="rounded-xl border border-[#E8E3DC] dark:border-[#232830]">
          <div className="flex items-center justify-between border-b border-[#E8E3DC] px-4 py-3 dark:border-[#232830]">
            <h3 className="font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{group.topic}</h3>
            <span className="text-xs text-[#7A736B] dark:text-[#6B7280]">
              {group.strongCount}/{group.totalCount} strong
            </span>
          </div>

          <div className="divide-y divide-[#E8E3DC] dark:divide-[#232830]">
            {group.items.map((item) => (
              <div key={item.id} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_180px_140px] md:items-start">
                <div>
                  <p className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">{item.subtopic}</p>
                  {item.last_revised && (
                    <p className="mt-1 text-xs text-[#7A736B] dark:text-[#6B7280]">Last revised: {item.last_revised}</p>
                  )}
                </div>

                <select
                  value={item.status}
                  onChange={(event) =>
                    void handleStatusChange(item.id, event.target.value as CSFundamentalStatus, item.notes)
                  }
                  className="input-base"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                <input
                  defaultValue={item.notes}
                  onBlur={(event) => {
                    if (event.target.value !== item.notes) {
                      void onUpdate({
                        id: item.id,
                        status: item.status,
                        lastRevised: item.last_revised,
                        notes: event.target.value,
                      });
                    }
                  }}
                  className="input-base"
                  placeholder="Notes"
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
