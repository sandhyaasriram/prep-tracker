/**
 * Journal page — daily markdown entries with search and export.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Plus, Save, Search, Trash2 } from 'lucide-react';
import { Button, Input } from '@/components';
import { JournalDateSidebar } from '@/features/journal/JournalDateSidebar';
import { exportJournalMarkdown, useJournalData } from '@/hooks/useJournalData';
import { formatDisplayDate, todayIST } from '@/utils';
import { consumeJournalNavigationDate } from '@/utils/navigationFocus';
import type { JournalEntry } from '@/types';
import type { User } from '@supabase/supabase-js';

interface JournalPageProps {
  user: User;
}

/**
 * Daily markdown journal with date navigation and keyword search.
 */
export function JournalPage({ user }: JournalPageProps) {
  const { data, loading, error, upsertEntry, deleteEntry } = useJournalData(user.id);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [titleEditDraft, setTitleEditDraft] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draft, setDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedTitleRef = useRef('');
  const lastSavedContentRef = useRef('');
  const lastSavedEntryIdRef = useRef<string | null>(null);

  const selectedEntry = useMemo(() => {
    if (!selectedEntryId || !data) {
      return null;
    }

    return data.entries.find((entry) => entry.id === selectedEntryId) ?? null;
  }, [data, selectedEntryId]);

  const selectedDateEntries = useMemo(() => {
    if (!data) {
      return [];
    }

    const date = selectedEntry?.date ?? todayIST();

    return [...data.entries]
      .filter((entry) => entry.date === date)
      .sort((left, right) => left.created_at.localeCompare(right.created_at));
  }, [data, selectedEntry]);

  const selectedEntryIndex = useMemo(() => {
    if (!selectedEntry) {
      return selectedDateEntries.length + 1;
    }

    const index = selectedDateEntries.findIndex((entry) => entry.id === selectedEntry.id);
    return index >= 0 ? index + 1 : 1;
  }, [selectedDateEntries, selectedEntry]);

  const effectiveTitle = isEditingTitle ? titleEditDraft : titleDraft;
  const normalizedTitle = effectiveTitle.trim();
  const hasUnsavedChanges =
    normalizedTitle !== lastSavedTitleRef.current ||
    draft !== lastSavedContentRef.current ||
    (selectedEntryId ?? null) !== lastSavedEntryIdRef.current;

  const resetToNewEntry = (): void => {
    setSelectedEntryId(null);
    setTitleDraft('');
    setTitleEditDraft('');
    setIsEditingTitle(false);
    setDraft('');
    setSaveMessage(null);
  };

  const clearAutosaveTimer = (): void => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
  };

  const clearSaveMessageTimer = (): void => {
    if (saveMessageTimeoutRef.current) {
      clearTimeout(saveMessageTimeoutRef.current);
      saveMessageTimeoutRef.current = null;
    }
  };

  const setSavedFlash = (): void => {
    clearSaveMessageTimer();
    setSaving(false);
    setSaveMessage('Saved');
    saveMessageTimeoutRef.current = window.setTimeout(() => {
      setSaveMessage(null);
      saveMessageTimeoutRef.current = null;
    }, 2000);
  };

  const commitTitleEdit = (): void => {
    setTitleDraft(titleEditDraft.trim());
    setIsEditingTitle(false);
  };

  const cancelTitleEdit = (): void => {
    setTitleEditDraft(titleDraft);
    setIsEditingTitle(false);
  };

  const saveEntry = async (options?: { silent?: boolean; commitTitle?: boolean }): Promise<void> => {
    const silent = options?.silent ?? false;
    const commitTitle = options?.commitTitle ?? false;

    clearAutosaveTimer();
    clearSaveMessageTimer();

    if (commitTitle && isEditingTitle) {
      const committedTitle = titleEditDraft.trim();
      setTitleDraft(committedTitle);
      setTitleEditDraft(committedTitle);
      setIsEditingTitle(false);
    }

    const titleToSave = (commitTitle && isEditingTitle ? titleEditDraft : effectiveTitle).trim();
    const contentToSave = draft;
    const targetEntry = selectedEntry;

    if (!selectedEntryId && !titleToSave && !contentToSave.trim()) {
      if (!silent) {
        setSaveMessage('');
      }
      return;
    }

    if (
      titleToSave === lastSavedTitleRef.current &&
      contentToSave === lastSavedContentRef.current &&
      (selectedEntryId ?? null) === lastSavedEntryIdRef.current
    ) {
      if (!silent) {
        setSavedFlash();
      }
      return;
    }

    setSaving(true);
    setSaveMessage('Saving...');

    try {
      if (selectedEntryId && !targetEntry) {
        throw new Error('Selected entry is no longer available.');
      }

      const payload = selectedEntryId
        ? {
            id: selectedEntryId,
            date: targetEntry?.date ?? todayIST(),
            title: titleToSave || null,
            contentMarkdown: contentToSave,
          }
        : {
            date: todayIST(),
            title: titleToSave || null,
            contentMarkdown: contentToSave,
          };

      const savedId = await upsertEntry(payload);
      const savedTitle = titleToSave;

      if (!selectedEntryId) {
        setSelectedEntryId(savedId);
      }

      setTitleDraft(savedTitle);
      setTitleEditDraft(savedTitle);
      lastSavedTitleRef.current = savedTitle;
      lastSavedContentRef.current = contentToSave;
      lastSavedEntryIdRef.current = savedId;

      setSavedFlash();
    } catch (saveError) {
      setSaving(false);
      setSaveMessage(saveError instanceof Error ? saveError.message : 'Failed to save.');
    }
  };

  useEffect(() => {
    const pendingDate = consumeJournalNavigationDate();
    if (!pendingDate || !data) {
      return;
    }

    const firstEntryOnDate = [...data.entries]
      .filter((entry) => entry.date === pendingDate)
      .sort((left, right) => left.created_at.localeCompare(right.created_at))[0];

    if (firstEntryOnDate) {
      setSelectedEntryId(firstEntryOnDate.id);
      return;
    }

    resetToNewEntry();
  }, [data]);

  useEffect(() => {
    if (!selectedEntry) {
      lastSavedTitleRef.current = '';
      lastSavedContentRef.current = '';
      lastSavedEntryIdRef.current = null;
      setTitleDraft('');
      setTitleEditDraft('');
      setIsEditingTitle(false);
      setSaveMessage(null);
      return;
    }

    const entryTitle = selectedEntry.title ?? '';
    setTitleDraft(entryTitle);
    setTitleEditDraft(entryTitle);
    setDraft(selectedEntry.content_markdown ?? '');
    setIsEditingTitle(false);
    lastSavedTitleRef.current = entryTitle;
    lastSavedContentRef.current = selectedEntry.content_markdown ?? '';
    lastSavedEntryIdRef.current = selectedEntry.id;
    setSaveMessage(null);
  }, [selectedEntry]);

  useEffect(() => {
    if (!data) {
      return;
    }

    if (!hasUnsavedChanges || saving) {
      clearAutosaveTimer();
      return;
    }

    if (!selectedEntryId && !normalizedTitle && !draft.trim()) {
      clearAutosaveTimer();
      return;
    }

    clearAutosaveTimer();
    autosaveTimeoutRef.current = window.setTimeout(() => {
      void saveEntry({ silent: true });
    }, 2000);

    return () => clearAutosaveTimer();
  }, [draft, effectiveTitle, hasUnsavedChanges, normalizedTitle, saving, selectedEntryId, selectedEntry]);

  useEffect(() => {
    if (!isEditingTitle) {
      return;
    }

    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [isEditingTitle]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveEntry({ commitTitle: true });
      }

      if (event.key === 'Escape' && isEditingTitle) {
        cancelTitleEdit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingTitle, titleEditDraft, draft, selectedEntryId, selectedEntry]);

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
      clearSaveMessageTimer();
    };
  }, []);

  const filteredEntries = useMemo(() => {
    if (!data || !searchQuery.trim()) {
      return data?.entries ?? [];
    }

    const query = searchQuery.trim().toLowerCase();

    return data.entries
      .filter(
        (entry) =>
          entry.content_markdown.toLowerCase().includes(query) ||
          (entry.title ?? '').toLowerCase().includes(query) ||
          entry.date.includes(query)
      );
  }, [data, searchQuery]);

  const handleSave = async (): Promise<void> => {
    await saveEntry({ commitTitle: true });
  };

  const handleDelete = async (): Promise<void> => {
    if (!selectedEntryId || !selectedEntry || !window.confirm(`Delete journal entry for ${formatDisplayDate(selectedEntry.date)}?`)) {
      return;
    }

    clearAutosaveTimer();
    await deleteEntry(selectedEntryId);
    resetToNewEntry();
  };

  if (loading && !data) {
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
          <h1 className="font-display text-3xl text-[#1A1614] dark:text-[#E8EDF2]">Write it down, clear it out.</h1>
          <p className="mt-1 text-sm text-[#7A736B] dark:text-[#6B7280]">
            Daily notes, interview reflections, mistakes, and ideas — capture as many entries as you need.
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
          entries={searchQuery.trim() ? filteredEntries : data.entries}
          selectedEntryId={selectedEntryId}
          onSelectEntry={(entry: JournalEntry) => setSelectedEntryId(entry.id)}
          onEditEntry={(entry: JournalEntry) => {
            setSelectedEntryId(entry.id);
            setTitleEditDraft(entry.title ?? '');
            setTitleDraft(entry.title ?? '');
            setIsEditingTitle(true);
          }}
        />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              {isEditingTitle ? (
                <input
                  ref={titleInputRef}
                  value={titleEditDraft}
                  onChange={(event) => setTitleEditDraft(event.target.value)}
                  onBlur={() => {
                    commitTitleEdit();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitTitleEdit();
                    }

                    if (event.key === 'Escape') {
                      event.preventDefault();
                      cancelTitleEdit();
                    }
                  }}
                  spellCheck={false}
                  className="w-full border-b border-transparent bg-transparent font-display text-lg font-semibold text-[#1A1614] caret-[#5B5FEF] outline-none transition-colors focus:border-[#E8E3DC] dark:text-[#E8EDF2] dark:focus:border-[#232830]"
                />
              ) : (
                <button
                  type="button"
                  onDoubleClick={() => {
                    setTitleEditDraft(titleDraft);
                    setIsEditingTitle(true);
                  }}
                  className="w-full text-left"
                  title="Double-click to edit title"
                >
                  <span className={`font-display text-lg font-semibold ${titleDraft.trim() ? 'text-[#1A1614] dark:text-[#E8EDF2]' : 'text-[#7A736B] dark:text-[#6B7280]'}`}>
                    {titleDraft.trim() || `Entry ${selectedEntryIndex}`}
                  </span>
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={resetToNewEntry}>
                New entry
              </Button>
              {selectedEntryId && (
                <Button variant="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => void handleDelete()}>
                  Delete
                </Button>
              )}
              <Button
                size="sm"
                icon={<Save size={14} />}
                disabled={saving}
                onClick={() => void handleSave()}
                className={hasUnsavedChanges ? '' : 'opacity-60'}
              >
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

          {(saveMessage || saving) && (
            <p className="text-sm text-[#7A736B] transition-opacity duration-300 dark:text-[#6B7280]">
              {saving ? 'Saving...' : saveMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
