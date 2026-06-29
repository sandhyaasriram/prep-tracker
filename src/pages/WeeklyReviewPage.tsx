/**
 * Weekly Review page — structured weekly reflection with auto-pulled stats.
 */

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, Save, Unlock } from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Input } from '@/components';
import { useWeeklyReviewData } from '@/hooks/useWeeklyReviewData';
import { calculateReviewCompletion, isWeekReviewLocked } from '@/utils/weekUtils';
import { formatDisplayDate } from '@/utils';
import type { WeekAutoStats } from '@/types/weekly-review';
import type { User } from '@supabase/supabase-js';

interface WeeklyReviewPageProps {
  user: User;
}

const EMPTY_FORM = {
  biggestWin: '',
  bottleneck: '',
  lessons: '',
  focusNext: '',
  hoursWorked: 0,
  moodRating: null as number | null,
  freeNotes: '',
};

/**
 * Structured weekly reflection with prev/next navigation and auto stats.
 */
export function WeeklyReviewPage({ user }: WeeklyReviewPageProps) {
  const {
    data,
    loading,
    error,
    selectedWeekNumber,
    setSelectedWeekNumber,
    getReviewForWeek,
    getWeekDefinition,
    getAutoStats,
    upsertReview,
  } = useWeeklyReviewData(user.id);

  const [form, setForm] = useState(EMPTY_FORM);
  const [autoStats, setAutoStats] = useState<WeekAutoStats>({ dsaProblemsSolved: 0, mocksDone: 0, applicationsSent: 0 });
  const [unlockedWeeks, setUnlockedWeeks] = useState<Set<number>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const weekDefinition = getWeekDefinition(selectedWeekNumber);
  const review = getReviewForWeek(selectedWeekNumber);
  const weekIndex = data?.weeks.findIndex((week) => week.week_number === selectedWeekNumber) ?? -1;
  const isLocked = weekDefinition ? isWeekReviewLocked(weekDefinition.end_date) && !unlockedWeeks.has(selectedWeekNumber) : false;
  const completion = review ? calculateReviewCompletion(review) : 0;

  useEffect(() => {
    if (review) {
      setForm({
        biggestWin: review.biggest_win,
        bottleneck: review.bottleneck,
        lessons: review.lessons,
        focusNext: review.focus_next,
        hoursWorked: review.hours_worked,
        moodRating: review.mood_rating,
        freeNotes: review.free_notes,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setSaveMessage(null);
  }, [review, selectedWeekNumber]);

  useEffect(() => {
    void getAutoStats(selectedWeekNumber).then(setAutoStats);
  }, [selectedWeekNumber, getAutoStats]);

  const canGoPrev = weekIndex > 0;
  const canGoNext = data ? weekIndex < data.weeks.length - 1 : false;

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setSaveMessage(null);

    try {
      await upsertReview({
        weekNumber: selectedWeekNumber,
        biggestWin: form.biggestWin,
        bottleneck: form.bottleneck,
        lessons: form.lessons,
        focusNext: form.focusNext,
        hoursWorked: form.hoursWorked,
        moodRating: form.moodRating,
        freeNotes: form.freeNotes,
      });
      setSaveMessage('Review saved');
    } catch (saveError) {
      setSaveMessage(saveError instanceof Error ? saveError.message : 'Failed to save review.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Loading weekly review...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#E8622A]/30 bg-[#E8622A]/5 px-4 py-3 text-sm text-[#1A1614] dark:text-[#E8EDF2]">
        {error}
      </div>
    );
  }

  if (!data || !weekDefinition) {
    return (
      <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">
        No weekly goals found yet. Seeded goals will appear here once your workspace is initialized.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl text-[#1A1614] dark:text-[#E8EDF2]">Weekly Review</h1>
          <p className="mt-1 text-sm text-[#7A736B] dark:text-[#6B7280]">
            One structured reflection per week — auto stats from your trackers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled={!canGoPrev} icon={<ChevronLeft size={14} />} onClick={() => setSelectedWeekNumber(data.weeks[weekIndex - 1]?.week_number ?? selectedWeekNumber)}>
            Prev
          </Button>
          <div className="rounded-xl border border-[#E8E3DC] px-4 py-2 text-center dark:border-[#232830]">
            <p className="text-sm font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Week {selectedWeekNumber}</p>
            <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">
              {formatDisplayDate(weekDefinition.start_date)} – {formatDisplayDate(weekDefinition.end_date)}
            </p>
          </div>
          <Button variant="ghost" size="sm" disabled={!canGoNext} icon={<ChevronRight size={14} />} onClick={() => setSelectedWeekNumber(data.weeks[weekIndex + 1]?.week_number ?? selectedWeekNumber)}>
            Next
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge status={completion >= 80 ? 'completed' : 'in-progress'}>{completion}% complete</Badge>
        {selectedWeekNumber === data.currentWeekNumber && <Badge status="in-progress">Current week</Badge>}
        {isLocked && (
          <Badge status="warning">
            <span className="inline-flex items-center gap-1">
              <Lock size={12} /> Locked
            </span>
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardBody className="p-4">
            <p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">DSA solved</p>
            <p className="mt-1 text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{autoStats.dsaProblemsSolved}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Mocks done</p>
            <p className="mt-1 text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{autoStats.mocksDone}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="p-4">
            <p className="text-xs uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">Applications sent</p>
            <p className="mt-1 text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{autoStats.applicationsSent}</p>
          </CardBody>
        </Card>
      </div>

      {isLocked && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#C4841A]/30 bg-[#C4841A]/10 px-4 py-3">
          <p className="text-sm text-[#1A1614] dark:text-[#E8EDF2]">
            This week ended more than 7 days ago and is read-only.
          </p>
          <Button
            variant="secondary"
            size="sm"
            icon={<Unlock size={14} />}
            onClick={() => setUnlockedWeeks((current) => new Set(current).add(selectedWeekNumber))}
          >
            Unlock for editing
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Reflection</p>
              <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">
                Week {selectedWeekNumber} · {formatDisplayDate(weekDefinition.start_date)} to {formatDisplayDate(weekDefinition.end_date)}
              </p>
            </div>
            <Button size="sm" icon={<Save size={14} />} disabled={saving || isLocked} onClick={() => void handleSave()}>
              Save review
            </Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <Field label="Biggest win" value={form.biggestWin} onChange={(value) => setForm((current) => ({ ...current, biggestWin: value }))} disabled={isLocked} />
          <Field label="Biggest bottleneck" value={form.bottleneck} onChange={(value) => setForm((current) => ({ ...current, bottleneck: value }))} disabled={isLocked} />
          <Field label="Lessons learned" value={form.lessons} onChange={(value) => setForm((current) => ({ ...current, lessons: value }))} disabled={isLocked} />
          <Field label="Focus for next week" value={form.focusNext} onChange={(value) => setForm((current) => ({ ...current, focusNext: value }))} disabled={isLocked} />

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Hours worked"
              type="number"
              min={0}
              step={0.5}
              value={form.hoursWorked}
              disabled={isLocked}
              onChange={(event) => setForm((current) => ({ ...current, hoursWorked: Number(event.target.value) || 0 }))}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Overall mood (1–5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    disabled={isLocked}
                    onClick={() => setForm((current) => ({ ...current, moodRating: rating }))}
                    className={`h-9 w-9 rounded-lg border text-sm font-medium transition-colors ${
                      form.moodRating === rating
                        ? 'border-[#5B5FEF] bg-[#5B5FEF]/10 text-[#5B5FEF]'
                        : 'border-[#E8E3DC] text-[#7A736B] dark:border-[#232830] dark:text-[#6B7280]'
                    }`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Free notes</label>
            <textarea
              value={form.freeNotes}
              disabled={isLocked}
              onChange={(event) => setForm((current) => ({ ...current, freeNotes: event.target.value }))}
              rows={8}
              className="input-base min-h-[180px] resize-y text-sm leading-relaxed"
              placeholder="Markdown-friendly notes — patterns, wins, mistakes, next bets..."
            />
          </div>

          {saveMessage && <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">{saveMessage}</p>}
        </CardBody>
      </Card>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function Field({ label, value, onChange, disabled }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">{label}</label>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="input-base resize-y text-sm leading-relaxed"
      />
    </div>
  );
}
