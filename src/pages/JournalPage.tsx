/**
 * Journal page — daily markdown entries with search and export.
 */

import { useEffect, useMemo, useState } from 'react';
import { Download, Save, Search, Trash2 } from 'lucide-react';
import { Button, Input } from '@/components';
import { JournalDateSidebar } from '@/features/journal/JournalDateSidebar';
import { exportJournalMarkdown, useJournalData } from '@/hooks/useJournalData';
import { formatDisplayDate, todayIST } from '@/utils';
import type { User } from '@supabase/supabase-js';

interface JournalPageProps {
  user: User;
}

/**
 * Daily markdown journal with date navigation and keyword search.
 */
export function JournalPage({ user }: JournalPageProps) {
  const { data, loading, error, upsertEntry, deleteEntry } = useJournalData(user.id);
  const [selectedDate, setSelectedDate] = useState(todayIST());
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const selectedEntry = useMemo(() => {
    return data?.entries.find((entry) => entry.date === selectedDate) ?? null;
  }, [data, selectedDate]);

  useEffect(() => {
    setDraft(selectedEntry?.content_markdown ?? '');
    setSaveMessage(null);
  }, [selectedEntry, selectedDate]);

  const filteredDates = useMemo(() => {
    if (!data || !searchQuery.trim()) {
      return data?.datesWithEntries ?? [];
    }

    const query = searchQuery.trim().toLowerCase();

    return data.entries
      .filter((entry) => entry.content_markdown.toLowerCase().includes(query) || entry.date.includes(query))
      .map((entry) => entry.date);
  }, [data, searchQuery]);

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setSaveMessage(null);

    try {
      await upsertEntry({ date: selectedDate, contentMarkdown: draft });
      setSaveMessage('Saved');
    } catch (saveError) {
      setSaveMessage(saveError instanceof Error ? saveError.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedEntry || !window.confirm(`Delete journal entry for ${formatDisplayDate(selectedDate)}?`)) {
      return;
    }

    await deleteEntry(selectedEntry.id);
    setDraft('');
  };

  if (loading) {
    return <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Loading journal...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#E8622A]/30 bg-[#E8622A]/5 px-4 py-3 text-sm text-[#1A1614] dark:text-[#E8EDF2]">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-3xl text-[#1A1614] dark:text-[#E8EDF2]">Journal</h1>
          <p className="mt-1 text-sm text-[#7A736B] dark:text-[#6B7280]">
            Daily notes, interview reflections, mistakes, and ideas — one entry per day.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download size={14} />}
          onClick={() => exportJournalMarkdown(data.entries)}
          disabled={data.entries.length === 0}
        >
          Export markdown
        </Button>
      </div>

      <Input
        icon={<Search size={14} />}
        placeholder="Search entries by keyword..."
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
      />

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <JournalDateSidebar
          dates={searchQuery.trim() ? filteredDates : data.datesWithEntries}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{formatDisplayDate(selectedDate)}</h2>
            <div className="flex flex-wrap gap-2">
              {selectedEntry && (
                <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => void handleDelete()}>
                  Delete
                </Button>
              )}
              <Button size="sm" icon={<Save size={14} />} disabled={saving} onClick={() => void handleSave()}>
                Save entry
              </Button>
            </div>
          </div>

          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={18}
            className="input-base min-h-[360px] resize-y font-mono text-sm leading-relaxed"
            placeholder="Write in markdown — daily notes, interview debriefs, mistakes, ideas..."
          />

          {saveMessage && <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">{saveMessage}</p>}
        </div>
      </div>
    </div>
  );
}
