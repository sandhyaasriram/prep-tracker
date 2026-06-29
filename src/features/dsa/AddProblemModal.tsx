/**
 * Modal for adding a custom DSA problem to a topic.
 */

import { useState } from 'react';
import { Button, Input, Modal } from '@/components';
import type { DSADifficulty } from '@/types';
import type { AddCustomProblemInput } from '@/hooks/useDSAData';

interface AddProblemModalProps {
  isOpen: boolean;
  topicName: string;
  topicId: string;
  onClose: () => void;
  onSubmit: (input: AddCustomProblemInput) => Promise<void>;
}

const DIFFICULTY_OPTIONS: DSADifficulty[] = ['Easy', 'Medium', 'Hard'];

/**
 * Collects custom problem details and submits them to Supabase.
 */
export function AddProblemModal({ isOpen, topicName, topicId, onClose, onSubmit }: AddProblemModalProps) {
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<DSADifficulty>('Medium');
  const [leetcodeUrl, setLeetcodeUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = (): void => {
    setName('');
    setDifficulty('Medium');
    setLeetcodeUrl('');
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
      const payload: AddCustomProblemInput = {
        topicId,
        name,
        difficulty,
      };

      const trimmedUrl = leetcodeUrl.trim();
      if (trimmedUrl) {
        payload.leetcodeUrl = trimmedUrl;
      }

      await onSubmit(payload);
      resetForm();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to add problem.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Add problem · ${topicName}`}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={submitting || !name.trim()} onClick={() => handleSubmit()}>
            Add problem
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[#7A736B] dark:text-[#6B7280]" htmlFor="custom-problem-name">
            Problem name
          </label>
          <Input
            id="custom-problem-name"
            placeholder="e.g. House Robber"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#7A736B] dark:text-[#6B7280]" htmlFor="custom-problem-difficulty">
            Difficulty
          </label>
          <select
            id="custom-problem-difficulty"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as DSADifficulty)}
            className="w-full rounded-xl border border-[#E8E3DC] bg-white px-3 py-2 text-sm text-[#1A1614] outline-none focus:ring-2 focus:ring-[#5B5FEF] dark:border-[#232830] dark:bg-[#1C2028] dark:text-[#E8EDF2]"
          >
            {DIFFICULTY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-[#7A736B] dark:text-[#6B7280]" htmlFor="custom-problem-url">
            LeetCode URL (optional)
          </label>
          <Input
            id="custom-problem-url"
            placeholder="https://leetcode.com/problems/..."
            value={leetcodeUrl}
            onChange={(event) => setLeetcodeUrl(event.target.value)}
          />
        </div>

        {error && <p className="text-sm text-[#E8622A]">{error}</p>}
      </div>
    </Modal>
  );
}
