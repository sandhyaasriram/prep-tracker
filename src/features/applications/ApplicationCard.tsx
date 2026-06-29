/**
 * Kanban card for a single application in the pipeline.
 */

import { Calendar, GripVertical } from 'lucide-react';
import { ApplicationStageBadge } from './ApplicationStageBadge';
import { formatDisplayDate } from '@/utils';
import type { ApplicationWithRounds } from '@/types/applications';

interface ApplicationCardProps {
  application: ApplicationWithRounds;
  onSelect: (application: ApplicationWithRounds) => void;
  onDragStart: (applicationId: string) => void;
}

/**
 * Compact application card shown inside kanban columns.
 */
export function ApplicationCard({ application, onSelect, onDragStart }: ApplicationCardProps) {
  return (
    <button
      type="button"
      draggable
      onDragStart={() => onDragStart(application.id)}
      onClick={() => onSelect(application)}
      className="w-full rounded-lg border border-[#E8E3DC] bg-white p-3 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md dark:border-[#232830] dark:bg-[#1C2028] motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start gap-2">
        <GripVertical size={14} className="mt-0.5 flex-shrink-0 text-[#7A736B] dark:text-[#6B7280]" />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="truncate font-medium text-[#1A1614] dark:text-[#E8EDF2]">{application.company}</p>
            <p className="truncate text-sm text-[#7A736B] dark:text-[#6B7280]">{application.role}</p>
          </div>
          <ApplicationStageBadge stage={application.stage} />
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#7A736B] dark:text-[#6B7280]">
            <span>{application.source}</span>
            {application.date_applied && <span>Applied {formatDisplayDate(application.date_applied)}</span>}
            {application.next_deadline && (
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} />
                {formatDisplayDate(application.next_deadline)}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
