/**
 * Modal for logging a mock interview session.
 */

import { useState } from 'react';
import { Button, Input, Modal } from '@/components';
import { MOCK_TYPES } from '@/constants';
import { todayIST } from '@/utils';
import type { MockType } from '@/types';
import type { AddMockInterviewInput } from '@/types/interview-prep';

interface AddMockInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: AddMockInterviewInput) => Promise<void>;
}

const TYPE_OPTIONS = Object.values(MOCK_TYPES);

/**
 * Collects mock interview details.
 */
export function AddMockInterviewModal({ isOpen, onClose, onSubmit }: AddMockInterviewModalProps) {
  const [date, setDate] = useState(todayIST());
  const [type, setType] = useState<MockType>('DSA');
  const [platform, setPlatform] = useState('');
  const [topics, setTopics] = useState('');
  const [rating, setRating] = useState('3');
  const [wentWell, setWentWell] = useState('');
  const [improve, setImprove] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = (): void => {
    setDate(todayIST());
    setType('DSA');
    setPlatform('');
    setTopics('');
    setRating('3');
    setWentWell('');
    setImprove('');
    setError(null);
  };

  const handleClose = (): void => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (): Promise<void> => {
    setSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        date,
        type,
        platform,
        topics: topics
          .split(',')
          .map((topic) => topic.trim())
          .filter(Boolean),
        rating: Number(rating),
        wentWell,
        improve,
      });
      resetForm();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to add mock interview.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Log mock interview"
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={submitting || !platform.trim()} onClick={() => void handleSubmit()}>
            Save mock
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Type</span>
            <select value={type} onChange={(event) => setType(event.target.value as MockType)} className="input-base">
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Input label="Platform" value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="Pramp, peer, company..." />

        <Input
          label="Topics covered"
          value={topics}
          onChange={(event) => setTopics(event.target.value)}
          placeholder="Arrays, Behavioural, OS"
          helperText="Comma-separated"
        />

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Self rating (1–5)</span>
          <select value={rating} onChange={(event) => setRating(event.target.value)} className="input-base">
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value} star{value === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">What went well</span>
          <textarea value={wentWell} onChange={(event) => setWentWell(event.target.value)} rows={2} className="input-base resize-y" />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">What to improve</span>
          <textarea value={improve} onChange={(event) => setImprove(event.target.value)} rows={2} className="input-base resize-y" />
        </label>

        {error && <p className="text-sm text-[#E8622A]">{error}</p>}
      </div>
    </Modal>
  );
}
