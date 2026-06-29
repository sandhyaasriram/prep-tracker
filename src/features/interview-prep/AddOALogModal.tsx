/**
 * Modal for logging an online assessment attempt.
 */

import { useState } from 'react';
import { Button, Input, Modal } from '@/components';
import { todayIST } from '@/utils';
import type { AddOALogInput } from '@/types/interview-prep';

interface AddOALogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: AddOALogInput) => Promise<void>;
}

/**
 * Collects OA attempt details.
 */
export function AddOALogModal({ isOpen, onClose, onSubmit }: AddOALogModalProps) {
  const [date, setDate] = useState(todayIST());
  const [company, setCompany] = useState('');
  const [platform, setPlatform] = useState('');
  const [totalQuestions, setTotalQuestions] = useState('3');
  const [solved, setSolved] = useState('2');
  const [score, setScore] = useState('');
  const [topics, setTopics] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = (): void => {
    setDate(todayIST());
    setCompany('');
    setPlatform('');
    setTotalQuestions('3');
    setSolved('2');
    setScore('');
    setTopics('');
    setNotes('');
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
      const payload: AddOALogInput = {
        date,
        company,
        platform,
        totalQuestions: Number(totalQuestions),
        solved: Number(solved),
        topics: topics
          .split(',')
          .map((topic) => topic.trim())
          .filter(Boolean),
        notes,
      };

      if (score) {
        payload.score = Number(score);
      }

      await onSubmit(payload);
      resetForm();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to add OA log.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Log OA attempt"
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={submitting || !company.trim() || !platform.trim()}
            onClick={() => void handleSubmit()}
          >
            Save OA log
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Input label="Company" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Amazon" />
        </div>

        <Input label="Platform" value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="HackerRank, CodeSignal..." />

        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Total questions"
            type="number"
            min="0"
            value={totalQuestions}
            onChange={(event) => setTotalQuestions(event.target.value)}
          />
          <Input label="Solved" type="number" min="0" value={solved} onChange={(event) => setSolved(event.target.value)} />
          <Input
            label="Score / percentile"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={score}
            onChange={(event) => setScore(event.target.value)}
          />
        </div>

        <Input
          label="Topics appeared"
          value={topics}
          onChange={(event) => setTopics(event.target.value)}
          placeholder="Graphs, DP, SQL"
          helperText="Comma-separated"
        />

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="input-base resize-y" />
        </label>

        {error && <p className="text-sm text-[#E8622A]">{error}</p>}
      </div>
    </Modal>
  );
}
