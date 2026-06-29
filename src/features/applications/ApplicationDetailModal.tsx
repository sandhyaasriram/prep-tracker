/**
 * Detail modal for viewing and editing an application and its interview rounds.
 */

import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button, Input, Modal } from '@/components';
import { APPLICATION_STAGE_ORDER, APPLICATION_SOURCES, INTERVIEW_OUTCOMES, INTERVIEW_ROUND_TYPES } from '@/constants';
import { ApplicationStageBadge } from './ApplicationStageBadge';
import { formatDisplayDate } from '@/utils';
import type { ApplicationSource, ApplicationStage } from '@/types';
import type { AddInterviewRoundInput, ApplicationWithRounds, UpdateApplicationInput } from '@/types/applications';

interface ApplicationDetailModalProps {
  application: ApplicationWithRounds | null;
  onClose: () => void;
  onUpdate: (id: string, input: UpdateApplicationInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddRound: (input: AddInterviewRoundInput) => Promise<void>;
  onDeleteRound: (roundId: string) => Promise<void>;
}

const SOURCE_OPTIONS = Object.values(APPLICATION_SOURCES);

/**
 * Full application editor with interview round logging.
 */
export function ApplicationDetailModal({
  application,
  onClose,
  onUpdate,
  onDelete,
  onAddRound,
  onDeleteRound,
}: ApplicationDetailModalProps) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [source, setSource] = useState<ApplicationSource>('Off-campus');
  const [stage, setStage] = useState<ApplicationStage>('Wishlist');
  const [dateApplied, setDateApplied] = useState('');
  const [nextDeadline, setNextDeadline] = useState('');
  const [oaScore, setOaScore] = useState('');
  const [notes, setNotes] = useState('');
  const [roundType, setRoundType] = useState<string>(INTERVIEW_ROUND_TYPES[0]);
  const [roundDate, setRoundDate] = useState('');
  const [roundOutcome, setRoundOutcome] = useState<string>(INTERVIEW_OUTCOMES[0]);
  const [roundNotes, setRoundNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingRound, setAddingRound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!application) {
      return;
    }

    setCompany(application.company);
    setRole(application.role);
    setSource(application.source);
    setStage(application.stage);
    setDateApplied(application.date_applied ?? '');
    setNextDeadline(application.next_deadline ?? '');
    setOaScore(application.oa_score !== null ? String(application.oa_score) : '');
    setNotes(application.notes);
    setError(null);
  }, [application]);

  if (!application) {
    return null;
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setError(null);

    try {
      await onUpdate(application.id, {
        company,
        role,
        source,
        stage,
        dateApplied: dateApplied || null,
        nextDeadline: nextDeadline || null,
        oaScore: oaScore ? Number(oaScore) : null,
        notes,
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save application.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!window.confirm(`Delete ${application.company} — ${application.role}?`)) {
      return;
    }

    await onDelete(application.id);
    onClose();
  };

  const handleAddRound = async (): Promise<void> => {
    setAddingRound(true);
    setError(null);

    try {
      const payload: AddInterviewRoundInput = {
        applicationId: application.id,
        type: roundType,
        outcome: roundOutcome,
        notes: roundNotes,
      };

      if (roundDate) {
        payload.date = roundDate;
      }

      await onAddRound(payload);
      setRoundDate('');
      setRoundNotes('');
    } catch (roundError) {
      setError(roundError instanceof Error ? roundError.message : 'Failed to add round.');
    } finally {
      setAddingRound(false);
    }
  };

  return (
    <Modal
      isOpen={Boolean(application)}
      onClose={onClose}
      title={`${application.company} · ${application.role}`}
      size="xl"
      footer={
        <>
          <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => void handleDelete()}>
            Delete
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" disabled={saving} onClick={() => void handleSave()}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <ApplicationStageBadge stage={stage} />
          <span className="text-xs text-[#7A736B] dark:text-[#6B7280]">
            {application.rounds.length} interview round{application.rounds.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Company" value={company} onChange={(event) => setCompany(event.target.value)} />
          <Input label="Role" value={role} onChange={(event) => setRole(event.target.value)} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Source</span>
            <select value={source} onChange={(event) => setSource(event.target.value as ApplicationSource)} className="input-base">
              {SOURCE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Stage</span>
            <select value={stage} onChange={(event) => setStage(event.target.value as ApplicationStage)} className="input-base">
              {APPLICATION_STAGE_ORDER.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <Input
            label="OA score"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={oaScore}
            onChange={(event) => setOaScore(event.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Date applied" type="date" value={dateApplied} onChange={(event) => setDateApplied(event.target.value)} />
          <Input label="Next deadline" type="date" value={nextDeadline} onChange={(event) => setNextDeadline(event.target.value)} />
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="input-base resize-y" />
        </label>

        <div className="rounded-xl border border-[#E8E3DC] p-4 dark:border-[#232830]">
          <h3 className="text-sm font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Interview rounds</h3>

          {application.rounds.length === 0 ? (
            <p className="mt-2 text-sm text-[#7A736B] dark:text-[#6B7280]">No rounds logged yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {application.rounds.map((round) => (
                <li
                  key={round.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-[#F3F0EB] px-3 py-2 dark:bg-[#1C2028]"
                >
                  <div>
                    <p className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">
                      Round {round.round_number}: {round.type}
                    </p>
                    <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">
                      {round.date ? formatDisplayDate(round.date) : 'No date'} · {round.outcome || 'Pending'}
                    </p>
                    {round.notes && <p className="mt-1 text-xs text-[#7A736B] dark:text-[#6B7280]">{round.notes}</p>}
                  </div>
                  <button
                    type="button"
                    className="text-xs text-[#E8622A] hover:underline"
                    onClick={() => void onDeleteRound(round.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#7A736B] dark:text-[#6B7280]">Type</span>
              <select value={roundType} onChange={(event) => setRoundType(event.target.value)} className="input-base">
                {INTERVIEW_ROUND_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <Input label="Date" type="date" value={roundDate} onChange={(event) => setRoundDate(event.target.value)} />
            <label className="block space-y-1">
              <span className="text-xs font-medium text-[#7A736B] dark:text-[#6B7280]">Outcome</span>
              <select value={roundOutcome} onChange={(event) => setRoundOutcome(event.target.value)} className="input-base">
                {INTERVIEW_OUTCOMES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
            <label className="block flex-1 space-y-1">
              <span className="text-xs font-medium text-[#7A736B] dark:text-[#6B7280]">Round notes</span>
              <input
                value={roundNotes}
                onChange={(event) => setRoundNotes(event.target.value)}
                className="input-base"
                placeholder="Topics asked, feedback..."
              />
            </label>
            <Button size="sm" disabled={addingRound} onClick={() => void handleAddRound()}>
              Add round
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-[#E8622A]">{error}</p>}
      </div>
    </Modal>
  );
}
