/**
 * Modal for adding a new certification.
 */

import { useState } from 'react';
import { Button, Input, Modal } from '@/components';
import type { CertificationStatus } from '@/types';
import type { AddCertificationInput } from '@/types/certifications';

interface AddCertificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: AddCertificationInput) => Promise<void>;
}

/**
 * Collects certification details for insert.
 */
export function AddCertificationModal({ isOpen, onClose, onSubmit }: AddCertificationModalProps) {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [status, setStatus] = useState<CertificationStatus>('In Progress');
  const [targetDate, setTargetDate] = useState('');
  const [progress, setProgress] = useState('0');
  const [certUrl, setCertUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = (): void => {
    setName('');
    setProvider('');
    setStatus('In Progress');
    setTargetDate('');
    setProgress('0');
    setCertUrl('');
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
      const payload: AddCertificationInput = {
        name,
        provider,
        status,
        notes,
      };

      if (targetDate) payload.targetDate = targetDate;
      if (certUrl) payload.certUrl = certUrl;
      if (status === 'In Progress') payload.progress = Number(progress);

      await onSubmit(payload);
      resetForm();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to add certification.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add certification"
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={submitting || !name.trim() || !provider.trim()} onClick={() => void handleSubmit()}>
            Add certification
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} placeholder="AWS Solutions Architect Associate" />
          <Input label="Provider" value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="AWS, Coursera..." />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as CertificationStatus)} className="input-base">
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </label>
          <Input label="Target date" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
        </div>

        {status === 'In Progress' && (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Progress ({progress}%)</span>
            <input type="range" min="0" max="100" value={progress} onChange={(event) => setProgress(event.target.value)} className="w-full accent-[#5B5FEF]" />
          </label>
        )}

        <Input label="Certificate URL" value={certUrl} onChange={(event) => setCertUrl(event.target.value)} placeholder="https://..." />

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} className="input-base resize-y" />
        </label>

        {error && <p className="text-sm text-[#E8622A]">{error}</p>}
      </div>
    </Modal>
  );
}
