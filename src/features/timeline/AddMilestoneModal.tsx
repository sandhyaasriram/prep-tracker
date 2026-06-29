/**
 * Modal for adding a timeline milestone.
 */

import { useState } from 'react';
import { Button, Input, Modal } from '@/components';
import { TIMELINE_CATEGORIES, TIMELINE_CATEGORY_COLORS } from '@/constants';
import type { AddTimelineMilestoneInput, TimelineCategory } from '@/types/timeline';
import { todayIST } from '@/utils';

interface AddMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: AddTimelineMilestoneInput) => Promise<void>;
}

/**
 * Form modal to create a custom timeline milestone.
 */
export function AddMilestoneModal({ isOpen, onClose, onSubmit }: AddMilestoneModalProps) {
  const [date, setDate] = useState(todayIST());
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState<TimelineCategory>('Personal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (): Promise<void> => {
    setSaving(true);
    setError(null);

    try {
      await onSubmit({ date, label, category, color: TIMELINE_CATEGORY_COLORS[category] });
      setLabel('');
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to add milestone.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add milestone">
      <div className="space-y-4">
        <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <Input label="Label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Milestone title" />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Category</label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as TimelineCategory)}
            className="input-base w-full text-sm"
          >
            {TIMELINE_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-[#E8622A]">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={saving || !label.trim()} onClick={() => void handleSubmit()}>
            Add milestone
          </Button>
        </div>
      </div>
    </Modal>
  );
}
