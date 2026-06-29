/**
 * Modal for adding a new application to the pipeline.
 */

import { useState } from 'react';
import { Button, Input, Modal } from '@/components';
import { APPLICATION_STAGE_ORDER, APPLICATION_SOURCES } from '@/constants';
import { todayIST } from '@/utils';
import type { ApplicationSource, ApplicationStage } from '@/types';
import type { AddApplicationInput } from '@/types/applications';

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: AddApplicationInput) => Promise<void>;
}

const SOURCE_OPTIONS = Object.values(APPLICATION_SOURCES);
const STAGE_OPTIONS = APPLICATION_STAGE_ORDER;

/**
 * Collects application details and inserts into Supabase.
 */
export function AddApplicationModal({ isOpen, onClose, onSubmit }: AddApplicationModalProps) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [source, setSource] = useState<ApplicationSource>('Off-campus');
  const [stage, setStage] = useState<ApplicationStage>('Wishlist');
  const [dateApplied, setDateApplied] = useState('');
  const [nextDeadline, setNextDeadline] = useState('');
  const [oaScore, setOaScore] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = (): void => {
    setCompany('');
    setRole('');
    setSource('Off-campus');
    setStage('Wishlist');
    setDateApplied('');
    setNextDeadline('');
    setOaScore('');
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
      const payload: AddApplicationInput = {
        company,
        role,
        source,
        stage,
        notes,
      };

      if (dateApplied) payload.dateApplied = dateApplied;
      if (nextDeadline) payload.nextDeadline = nextDeadline;
      if (oaScore) payload.oaScore = Number(oaScore);

      await onSubmit(payload);
      resetForm();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to add application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add application"
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={submitting || !company.trim() || !role.trim()} onClick={() => void handleSubmit()}>
            Add application
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Company" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Amazon" />
          <Input label="Role" value={role} onChange={(event) => setRole(event.target.value)} placeholder="SDE Intern" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Source</span>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as ApplicationSource)}
              className="input-base"
            >
              {SOURCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Stage</span>
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value as ApplicationStage)}
              className="input-base"
            >
              {STAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Date applied" type="date" value={dateApplied} onChange={(event) => setDateApplied(event.target.value)} />
          <Input
            label="Next deadline"
            type="date"
            value={nextDeadline}
            min={todayIST()}
            onChange={(event) => setNextDeadline(event.target.value)}
          />
        </div>

        <Input
          label="OA score (optional)"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={oaScore}
          onChange={(event) => setOaScore(event.target.value)}
          placeholder="85"
        />

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Notes</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            className="input-base resize-y"
            placeholder="Referral contact, prep notes..."
          />
        </label>

        {error && <p className="text-sm text-[#E8622A]">{error}</p>}
      </div>
    </Modal>
  );
}
