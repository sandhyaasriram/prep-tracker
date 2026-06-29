/**
 * Kanban board grouped by application pipeline stage.
 */

import { useState } from 'react';
import { APPLICATION_STAGE_ORDER } from '@/constants';
import { ApplicationCard } from './ApplicationCard';
import type { ApplicationStage } from '@/types';
import type { ApplicationWithRounds } from '@/types/applications';

interface ApplicationKanbanProps {
  applications: ApplicationWithRounds[];
  onSelect: (application: ApplicationWithRounds) => void;
  onStageChange: (applicationId: string, stage: ApplicationStage) => Promise<void>;
}

/**
 * Horizontal kanban columns with drag-and-drop stage changes.
 */
export function ApplicationKanban({ applications, onSelect, onStageChange }: ApplicationKanbanProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const appsByStage = APPLICATION_STAGE_ORDER.reduce<Record<ApplicationStage, ApplicationWithRounds[]>>(
    (acc, stage) => {
      acc[stage] = applications.filter((app) => app.stage === stage);
      return acc;
    },
    {} as Record<ApplicationStage, ApplicationWithRounds[]>
  );

  const handleDrop = async (stage: ApplicationStage): Promise<void> => {
    if (!draggingId) {
      return;
    }

    const application = applications.find((app) => app.id === draggingId);

    if (!application || application.stage === stage) {
      setDraggingId(null);
      return;
    }

    await onStageChange(draggingId, stage);
    setDraggingId(null);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {APPLICATION_STAGE_ORDER.map((stage) => (
        <div
          key={stage}
          className="min-w-[240px] flex-1 rounded-xl border border-[#E8E3DC] bg-[#F3F0EB]/60 p-3 dark:border-[#232830] dark:bg-[#13161A]"
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => void handleDrop(stage)}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{stage}</h3>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs text-[#7A736B] dark:bg-[#1C2028] dark:text-[#6B7280]">
              {appsByStage[stage].length}
            </span>
          </div>
          <div className="space-y-2">
            {appsByStage[stage].map((application) => (
              <ApplicationCard
                key={application.id}
                application={application}
                onSelect={onSelect}
                onDragStart={setDraggingId}
              />
            ))}
            {appsByStage[stage].length === 0 && (
              <p className="rounded-lg border border-dashed border-[#E8E3DC] px-3 py-6 text-center text-xs text-[#7A736B] dark:border-[#232830] dark:text-[#6B7280]">
                Drop here
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
