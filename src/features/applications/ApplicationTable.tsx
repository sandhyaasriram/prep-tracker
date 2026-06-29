/**
 * Table view for the application pipeline.
 */

import { ApplicationStageBadge } from './ApplicationStageBadge';
import { formatDisplayDate } from '@/utils';
import type { ApplicationWithRounds } from '@/types/applications';

interface ApplicationTableProps {
  applications: ApplicationWithRounds[];
  onSelect: (application: ApplicationWithRounds) => void;
}

/**
 * Sortable-style table listing all applications.
 */
export function ApplicationTable({ applications, onSelect }: ApplicationTableProps) {
  if (applications.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#E8E3DC] px-4 py-10 text-center text-sm text-[#7A736B] dark:border-[#232830] dark:text-[#6B7280]">
        No applications match your filters.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#E8E3DC] dark:border-[#232830]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#F3F0EB] text-xs uppercase tracking-wide text-[#7A736B] dark:bg-[#1C2028] dark:text-[#6B7280]">
          <tr>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Stage</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium">Applied</th>
            <th className="px-4 py-3 font-medium">Deadline</th>
            <th className="px-4 py-3 font-medium">Rounds</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8E3DC] dark:divide-[#232830]">
          {applications.map((application) => (
            <tr
              key={application.id}
              className="cursor-pointer bg-white transition-colors hover:bg-[#FAF8F4] dark:bg-[#13161A] dark:hover:bg-[#1C2028]"
              onClick={() => onSelect(application)}
            >
              <td className="px-4 py-3 font-medium text-[#1A1614] dark:text-[#E8EDF2]">{application.company}</td>
              <td className="px-4 py-3 text-[#7A736B] dark:text-[#6B7280]">{application.role}</td>
              <td className="px-4 py-3">
                <ApplicationStageBadge stage={application.stage} />
              </td>
              <td className="px-4 py-3 text-[#7A736B] dark:text-[#6B7280]">{application.source}</td>
              <td className="px-4 py-3 text-[#7A736B] dark:text-[#6B7280]">
                {application.date_applied ? formatDisplayDate(application.date_applied) : '—'}
              </td>
              <td className="px-4 py-3 text-[#7A736B] dark:text-[#6B7280]">
                {application.next_deadline ? formatDisplayDate(application.next_deadline) : '—'}
              </td>
              <td className="px-4 py-3 text-[#7A736B] dark:text-[#6B7280]">{application.rounds.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
