/**
 * Timeline page — placement season milestones with today indicator.
 */

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Card, CardBody, CardHeader } from '@/components';
import { AddMilestoneModal } from '@/features/timeline/AddMilestoneModal';
import { TimelineTrack } from '@/features/timeline/TimelineTrack';
import { useTimelineData } from '@/hooks/useTimelineData';
import profileSeed from '@/seed/profile.json';
import { formatDisplayDate, getCurrentPhase, todayIST } from '@/utils';
import type { TimelineMilestone } from '@/types/timeline';
import type { User } from '@supabase/supabase-js';

interface TimelinePageProps {
  user: User;
}

/**
 * Full placement season timeline with custom milestones.
 */
export function TimelinePage({ user }: TimelinePageProps) {
  const { milestones, loading, error, addMilestone, deleteMilestone } = useTimelineData(user.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<TimelineMilestone | null>(null);

  const currentPhase = getCurrentPhase(profileSeed.phase_schedule);
  const today = todayIST();

  const handleDelete = async (milestone: TimelineMilestone): Promise<void> => {
    if (!window.confirm(`Delete milestone "${milestone.label}"?`)) {
      return;
    }

    await deleteMilestone(milestone.id);
    if (selected?.id === milestone.id) {
      setSelected(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Loading timeline...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl text-[#1A1614] dark:text-[#E8EDF2]">Timeline</h1>
          <p className="mt-1 text-sm text-[#7A736B] dark:text-[#6B7280]">
            {formatDisplayDate(profileSeed.placement_season.start)} – {formatDisplayDate(profileSeed.placement_season.end)} ·{' '}
            <span className="font-medium text-[#1A1614] dark:text-[#E8EDF2]">{currentPhase}</span> phase
          </p>
        </div>
        <Button size="sm" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
          Add milestone
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-[#E8622A]/30 bg-[#E8622A]/5 px-4 py-3 text-sm text-[#1A1614] dark:text-[#E8EDF2]">
          {error}
        </div>
      )}

      <Card elevated>
        <CardHeader>
          <p className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Placement season</p>
          <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">Today: {formatDisplayDate(today)}</p>
        </CardHeader>
        <CardBody>
          <TimelineTrack milestones={milestones} onSelectMilestone={setSelected} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">All milestones</p>
        </CardHeader>
        <CardBody className="space-y-2">
          {milestones.length === 0 ? (
            <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">No milestones yet.</p>
          ) : (
            milestones.map((milestone) => (
              <div
                key={milestone.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
                  selected?.id === milestone.id
                    ? 'border-[#5B5FEF]/30 bg-[#5B5FEF]/5'
                    : 'border-[#E8E3DC] bg-[#F3F0EB] dark:border-[#232830] dark:bg-[#1C2028]'
                }`}
              >
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelected(milestone)}>
                  <p className="truncate text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">{milestone.label}</p>
                  <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">
                    {formatDisplayDate(milestone.date)} · {milestone.category}
                  </p>
                </button>
                <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => void handleDelete(milestone)}>
                  Delete
                </Button>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <AddMilestoneModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={addMilestone} />
    </div>
  );
}
