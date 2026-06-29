/**
 * DSA tracker page for Placement OS.
 * Shows topic progress, problem lists, revision mode, and CSV export.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  Flame,
  Plus,
  RotateCcw,
  Search,
  Target,
  Timer,
} from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, Input } from '@/components';
import { ExportMenu } from '@/features/export/ExportMenu';
import { AddProblemModal } from '@/features/dsa/AddProblemModal';
import { ProblemDetailPopover } from '@/features/dsa/ProblemDetailPopover';
import type { ProblemSelectHandler } from '@/features/dsa/ProblemListItem';
import { RevisionSessionModal } from '@/features/dsa/RevisionSessionModal';
import { TopicProblemList } from '@/features/dsa/TopicProblemList';
import { useDSAData } from '@/hooks/useDSAData';
import { consumeDsaNavigationSearch } from '@/utils/navigationFocus';
import type { User } from '@supabase/supabase-js';
import type { DSAProblemSummary, DSATopicSummary } from '@/types/dsa';

interface DSAPageProps {
  user: User;
}

const REVISION_MINUTES = 25;

interface OpenProblemPopover {
  problemId: string;
  anchorRect: DOMRect;
}

function getTopicProgressPercent(topic: DSATopicSummary): number {
  if (topic.targetProblemCount === 0) return 0;
  return Math.round((topic.solvedCount / topic.targetProblemCount) * 100);
}

function filterTopicProblems(problems: DSAProblemSummary[], revisionMode: boolean, searchQuery: string): DSAProblemSummary[] {
  const query = searchQuery.trim().toLowerCase();

  return problems.filter((problem) => {
    const matchesRevision = !revisionMode || problem.flaggedForRevision;
    const matchesSearch = !query || problem.name.toLowerCase().includes(query);
    return matchesRevision && matchesSearch;
  });
}

function flattenDSAExport(
  topics: DSATopicSummary[],
  problemsByTopic: Record<string, DSAProblemSummary[]>
): Array<Record<string, string | number | boolean | null>> {
  const rows: Array<Record<string, string | number | boolean | null>> = [];

  for (const topic of topics) {
    const topicProblems = problemsByTopic[topic.id] ?? [];
    for (const problem of topicProblems) {
      rows.push({
        topic: topic.name,
        problem: problem.name,
        difficulty: problem.difficulty,
        solved: problem.solved,
        solved_date: problem.solvedDate,
        flagged_for_revision: problem.flaggedForRevision,
        leetcode_url: problem.leetcodeUrl,
        notes: problem.notes,
      });
    }
  }

  return rows;
}

/**
 * DSA page view.
 */
export function DSAPage({ user }: DSAPageProps) {
  const { data, loading, error, toggleSolved, toggleRevision, updateNotes, addCustomProblem } = useDSAData(user.id);
  const [expandedTopicIds, setExpandedTopicIds] = useState<string[]>([]);
  const [revisionMode, setRevisionMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openPopover, setOpenPopover] = useState<OpenProblemPopover | null>(null);

  useEffect(() => {
    const pendingSearch = consumeDsaNavigationSearch();
    if (pendingSearch) {
      setSearchQuery(pendingSearch);
    }
  }, []);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const [addProblemTopic, setAddProblemTopic] = useState<{ id: string; name: string } | null>(null);
  const [revisionSessionOpen, setRevisionSessionOpen] = useState(false);

  const selectedProblemId = openPopover?.problemId ?? null;

  const selectedProblem = useMemo((): DSAProblemSummary | null => {
    if (!selectedProblemId || !data) {
      return null;
    }

    for (const topic of data.topics) {
      const match = (data.problemsByTopic[topic.id] ?? []).find((problem) => problem.id === selectedProblemId);
      if (match) {
        return match;
      }
    }

    return null;
  }, [data, selectedProblemId]);

  const handleSelectProblem = useCallback<ProblemSelectHandler>((problemId, anchorElement) => {
    setOpenPopover((current) => {
      if (current?.problemId === problemId) {
        return null;
      }

      return {
        problemId,
        anchorRect: anchorElement.getBoundingClientRect(),
      };
    });
  }, []);

  const handleClosePopover = useCallback((): void => {
    setOpenPopover(null);
  }, []);

  const visibleTopics = useMemo(() => {
    if (!data) return [];

    return data.topics.filter((topic) => {
      const topicProblems = data.problemsByTopic[topic.id] ?? [];
      const filteredProblems = filterTopicProblems(topicProblems, revisionMode, searchQuery);

      if (revisionMode && filteredProblems.length === 0) {
        return false;
      }

      if (!searchQuery.trim()) {
        return revisionMode ? topic.dueForRevision || filteredProblems.length > 0 : true;
      }

      const query = searchQuery.toLowerCase();
      const topicMatches = topic.name.toLowerCase().includes(query);
      return topicMatches || filteredProblems.length > 0;
    });
  }, [data, revisionMode, searchQuery]);

  const revisionQueue = data?.revisionQueue ?? [];
  const stats = data?.stats;

  const toggleTopic = (topicId: string): void => {
    setExpandedTopicIds((current) =>
      current.includes(topicId) ? current.filter((id) => id !== topicId) : [...current, topicId]
    );
  };

  const exportRows = useMemo((): Record<string, unknown>[] => {
    if (!data) {
      return [];
    }

    return flattenDSAExport(data.topics, data.problemsByTopic);
  }, [data]);

  const showMessage = (message: string): void => {
    setLocalMessage(message);
    window.setTimeout(() => setLocalMessage(null), 2500);
  };

  const handleStartRevisionSession = (): void => {
    if (revisionQueue.length === 0) {
      showMessage('Add problems to your revision queue first.');
      return;
    }

    setRevisionSessionOpen(true);
  };

  if (loading && !data) {
    return (
      <div className="grid min-h-[50vh] place-items-center rounded-2xl border border-[#E8E3DC] bg-white p-8 dark:border-[#232830] dark:bg-[#13161A]">
        <div className="space-y-3 text-center">
          <Flame className="mx-auto text-[#E8622A]" />
          <p className="font-medium text-[#1A1614] dark:text-[#E8EDF2]">Loading DSA tracker...</p>
          <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Fetching topics, problems, and revision status.</p>
        </div>
      </div>
    );
  }

  if (!data || !stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card elevated>
        <CardBody className="space-y-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E3DC] bg-[#F3F0EB] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280] dark:border-[#232830] dark:bg-[#1C2028]">
                <Target size={12} />
                DSA tracker
              </div>
              <h1 className="font-display text-4xl leading-tight text-[#1A1614] dark:text-[#E8EDF2] md:text-5xl">
                Solve, revise, repeat.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[#7A736B] dark:text-[#6B7280] md:text-base">
                Striver A2Z roadmap with {stats.totalProblems} LeetCode problems across {data.topics.length} topics. Click a
                problem for details.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={revisionMode ? 'primary' : 'secondary'}
                size="sm"
                icon={<RotateCcw size={14} />}
                onClick={() => setRevisionMode((current) => !current)}
              >
                {revisionMode ? 'Revision mode on' : 'Revision mode off'}
              </Button>
              <Button variant="secondary" size="sm" icon={<Timer size={14} />} onClick={handleStartRevisionSession}>
                Start revision session
              </Button>
              <ExportMenu
                csvSection="dsa"
                sheetSectionName="DSA"
                rows={exportRows}
                userEmail={user.email ?? 'your account'}
                onMessage={showMessage}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl border border-[#E8E3DC] bg-white p-4 dark:border-[#232830] dark:bg-[#13161A]">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">Total solved</p>
              <p className="mt-2 text-3xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{stats.totalSolved}</p>
            </div>
            <div className="rounded-2xl border border-[#E8E3DC] bg-white p-4 dark:border-[#232830] dark:bg-[#13161A]">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">This week</p>
              <p className="mt-2 text-3xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{stats.solvedThisWeek}</p>
            </div>
            <div className="rounded-2xl border border-[#E8E3DC] bg-white p-4 dark:border-[#232830] dark:bg-[#13161A]">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">Today</p>
              <p className="mt-2 text-3xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{stats.solvedToday}</p>
            </div>
            <div className="rounded-2xl border border-[#E8E3DC] bg-white p-4 dark:border-[#232830] dark:bg-[#13161A]">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">Current streak</p>
              <div className="mt-2 flex items-center gap-2">
                <Flame className="text-[#E8622A]" size={22} />
                <p className="text-3xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{stats.currentStreak}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-[#E8E3DC] bg-white p-4 dark:border-[#232830] dark:bg-[#13161A]">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">Longest streak</p>
              <p className="mt-2 text-3xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{stats.longestStreak}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {error && (
        <div className="rounded-xl border border-[#C4841A]/30 bg-[#C4841A]/10 px-4 py-3 text-sm text-[#C4841A]">
          DSA data loaded in fallback mode because one of the Supabase queries failed.
        </div>
      )}

      {localMessage && (
        <div className="rounded-xl border border-[#2D7A4F]/30 bg-[#2D7A4F]/10 px-4 py-3 text-sm text-[#2D7A4F]">
          {localMessage}
        </div>
      )}

      <Card>
        <CardBody className="flex flex-col gap-4 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-xl space-y-2">
            <label className="text-sm font-medium text-[#7A736B] dark:text-[#6B7280]" htmlFor="dsa-search">
              Search topics or problems
            </label>
            <Input
              id="dsa-search"
              icon={<Search size={14} />}
              placeholder="Search DSA..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-[#E8E3DC] bg-[#F3F0EB] px-4 py-3 text-sm text-[#7A736B] dark:text-[#6B7280] dark:border-[#232830] dark:bg-[#1C2028]">
              {revisionQueue.length} in revision queue
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#E8E3DC] bg-white px-4 py-3 text-sm text-[#7A736B] dark:text-[#6B7280] dark:border-[#232830] dark:bg-[#13161A]">
              <Clock3 size={14} />
              {REVISION_MINUTES} min per revision problem
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="space-y-4">
          {visibleTopics.length === 0 ? (
            <Card>
              <CardBody className="p-6 text-sm text-[#7A736B] dark:text-[#6B7280]">No topics match the current search or revision filter.</CardBody>
            </Card>
          ) : (
            visibleTopics.map((topic) => {
              const isExpanded = expandedTopicIds.includes(topic.id) || revisionMode || Boolean(searchQuery.trim());
              const topicProblems = filterTopicProblems(data.problemsByTopic[topic.id] ?? [], revisionMode, searchQuery);
              const progressPercent = getTopicProgressPercent(topic);

              return (
                <Card key={topic.id}>
                  <CardHeader>
                    <button
                      type="button"
                      onClick={() => toggleTopic(topic.id)}
                      className="flex w-full items-center justify-between gap-4 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-2xl text-[#1A1614] dark:text-[#E8EDF2]">{topic.name}</h2>
                          {topic.dueForRevision && <Badge status="warning">Due for revision</Badge>}
                        </div>
                        <p className="mt-1 text-sm text-[#7A736B] dark:text-[#6B7280]">
                          {topic.solvedCount}/{topic.targetProblemCount} solved · last solved{' '}
                          {topic.lastSolvedDate ?? 'never'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                          <p className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">{progressPercent}%</p>
                          <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">complete</p>
                        </div>
                        {isExpanded ? (
                          <ChevronDown size={18} className="text-[#7A736B] dark:text-[#6B7280]" />
                        ) : (
                          <ChevronRight size={18} className="text-[#7A736B] dark:text-[#6B7280]" />
                        )}
                      </div>
                    </button>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#E8E3DC] dark:bg-[#232830]">
                      <div
                        className="h-full rounded-full bg-[#5B5FEF] transition-all duration-300 motion-reduce:transition-none"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardBody className="space-y-3 pt-2">
                      <div className="flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Plus size={14} />}
                          onClick={() => setAddProblemTopic({ id: topic.id, name: topic.name })}
                        >
                          Add custom problem
                        </Button>
                      </div>
                      <TopicProblemList
                        topicId={topic.id}
                        problems={topicProblems}
                        selectedProblemId={selectedProblemId}
                        onSelectProblem={handleSelectProblem}
                        onToggleSolved={toggleSolved}
                      />
                    </CardBody>
                  )}
                </Card>
              );
            })
          )}
        </section>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[#7A736B] dark:text-[#6B7280]">Revision queue</p>
                <Button variant="secondary" size="sm" icon={<Timer size={14} />} onClick={handleStartRevisionSession}>
                  Start
                </Button>
              </div>
            </CardHeader>
            <CardBody className="space-y-2">
              {revisionQueue.length === 0 ? (
                <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Flag problems or wait 7+ days after solving to populate this queue.</p>
              ) : (
                revisionQueue.slice(0, 10).map((problem) => (
                  <button
                    key={problem.id}
                    type="button"
                    data-problem-id={problem.id}
                    onClick={(event) => handleSelectProblem(problem.id, event.currentTarget)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors duration-150 ${
                      selectedProblemId === problem.id
                        ? 'border-[#5B5FEF]/30 bg-[#5B5FEF]/10'
                        : 'border-[#E8E3DC] bg-[#F3F0EB] hover:bg-[#EDE8E0] dark:border-[#232830] dark:bg-[#1C2028] dark:hover:bg-[#1C2028]'
                    }`}
                  >
                    <p className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">{problem.name}</p>
                    <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">
                      {problem.topicName} · {problem.difficulty}
                    </p>
                  </button>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-sm font-medium text-[#7A736B] dark:text-[#6B7280]">Recent solves</p>
            </CardHeader>
            <CardBody className="space-y-2">
              {data.recentSolves.length === 0 ? (
                <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Solved problems will show up here.</p>
              ) : (
                data.recentSolves.map((problem) => (
                  <button
                    key={problem.id}
                    type="button"
                    data-problem-id={problem.id}
                    onClick={(event) => handleSelectProblem(problem.id, event.currentTarget)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors duration-150 ${
                      selectedProblemId === problem.id
                        ? 'border-[#5B5FEF]/30 bg-[#5B5FEF]/10'
                        : 'border-[#E8E3DC] bg-white hover:bg-[#F3F0EB] dark:border-[#232830] dark:bg-[#13161A] dark:hover:bg-[#1C2028]'
                    }`}
                  >
                    <p className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">{problem.name}</p>
                    <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">
                      {problem.topicName} · solved {problem.solvedDate}
                    </p>
                  </button>
                ))
              )}
            </CardBody>
          </Card>
        </aside>
      </div>

      {selectedProblem && openPopover && (
        <ProblemDetailPopover
          key={selectedProblem.id}
          problem={selectedProblem}
          anchorRect={openPopover.anchorRect}
          onClose={handleClosePopover}
          onToggleRevision={toggleRevision}
          onSaveNotes={updateNotes}
        />
      )}

      {addProblemTopic && (
        <AddProblemModal
          isOpen={Boolean(addProblemTopic)}
          topicId={addProblemTopic.id}
          topicName={addProblemTopic.name}
          onClose={() => setAddProblemTopic(null)}
          onSubmit={addCustomProblem}
        />
      )}

      <RevisionSessionModal
        isOpen={revisionSessionOpen}
        problems={revisionQueue}
        minutesPerProblem={REVISION_MINUTES}
        onClose={() => setRevisionSessionOpen(false)}
        onMarkSolved={toggleSolved}
      />
    </div>
  );
}
