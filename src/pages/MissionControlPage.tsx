/**
 * Mission Control page for Placement OS.
 * Shows the daily command center, weekly progress, deadlines, and recent activity.
 */

import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  MoreVertical,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import { Badge, Card, CardBody, CardHeader } from '@/components';
import profileSeed from '@/seed/profile.json';
import { useMissionControlData } from '@/hooks/useMissionControlData';
import { formatDisplayDate, getCurrentPhase, todayIST } from '@/utils';
import type { User } from '@supabase/supabase-js';

interface MissionControlPageProps {
  user: User;
}

/**
 * Primary landing page after authentication.
 */
export function MissionControlPage({ user }: MissionControlPageProps) {
  const { data, loading, error, toggleMissionTask } = useMissionControlData(user.id);
  const [quickCaptureMessage, setQuickCaptureMessage] = useState<string | null>(null);

  const displayName = data?.firstName ?? profileSeed.name.split(' ')[0] ?? profileSeed.name;
  const currentPhase = data?.currentPhase ?? getCurrentPhase(profileSeed.phase_schedule);
  const currentDateLabel = data?.currentDateLabel ?? formatDisplayDate(todayIST());
  const weeklyProgress = data?.weeklyProgressPercent ?? 0;
  const topMissionTasks = useMemo(() => data?.missionTasks ?? [], [data]);

  const handleQuickCapture = (): void => {
    setQuickCaptureMessage('Quick Capture is coming in Phase 11.');
    window.setTimeout(() => setQuickCaptureMessage(null), 2500);
  };

  if (loading || !data) {
    return (
      <div className="grid min-h-[50vh] place-items-center rounded-2xl border border-[#E8E3DC] bg-white p-8 dark:border-[#232830] dark:bg-[#13161A]">
        <div className="space-y-3 text-center">
          <Sparkles className="mx-auto text-[#5B5FEF]" />
          <p className="font-medium text-[#1A1614] dark:text-[#E8EDF2]">Loading dashboard...</p>
          <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Seeding data and fetching your placement dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-[#C4841A]/30 bg-[#C4841A]/10 px-4 py-3 text-sm text-[#C4841A]">
          The dashboard is running in fallback mode because a data query failed. You can still use the app.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="space-y-6">
          <Card elevated>
            <CardBody className="space-y-6 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E3DC] bg-[#F3F0EB] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280] dark:border-[#232830] dark:bg-[#1C2028]">
                    Good {data.greeting.toLowerCase()}, {displayName}
                  </div>
                  <h1 className="font-display text-4xl leading-tight text-[#1A1614] dark:text-[#E8EDF2] md:text-5xl">
                    Open with intent. <span className="font-sans font-light italic text-[#7A736B] dark:text-[#6B7280]">Work the plan.</span>
                  </h1>
                  <p className="max-w-2xl text-sm font-normal leading-7 text-[#7A736B] dark:text-[#6B7280] md:text-base">
                    Today is <span className="font-medium text-[#1A1614] dark:text-[#E8EDF2]">{currentDateLabel}</span>. You are in the{' '}
                    <span className="font-bold text-[#1A1614] dark:text-[#E8EDF2]">{currentPhase}</span>{' '}
                    <span className="font-light italic">phase</span>.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#E8E3DC] bg-[#F3F0EB] px-4 py-3 text-right dark:border-[#232830] dark:bg-[#1C2028]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">Current streak</p>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    <Flame className="text-[#E8622A]" size={18} />
                    <span className="text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{data.currentStreak}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#7A736B] dark:text-[#6B7280]">days with at least one problem solved</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#7A736B] dark:text-[#6B7280]">Today&apos;s Mission</p>
                      <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">3 to 5 highest ROI tasks</p>
                    </div>
                    <Badge variant="journal">{data.estimatedFocusMinutes} min focus</Badge>
                  </div>

                  <div className="space-y-3">
                    {topMissionTasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => toggleMissionTask(task.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors duration-150 ${
                          task.completed
                            ? 'border-[#2D7A4F]/30 bg-[#2D7A4F]/10'
                            : 'border-[#E8E3DC] bg-white hover:bg-[#F3F0EB] dark:border-[#232830] dark:bg-[#13161A] dark:hover:bg-[#1C2028]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border ${
                              task.completed ? 'border-[#2D7A4F] bg-[#2D7A4F] text-white' : 'border-[#E8E3DC] bg-white dark:border-[#232830] dark:bg-[#13161A]'
                            }`}
                          >
                            {task.completed && <CheckCircle2 size={14} />}
                          </span>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">{task.title}</span>
                              <Badge variant={task.category === 'DSA' ? 'dsa' : task.category === 'Applications' ? 'applications' : task.category === 'Projects' ? 'projects' : task.category === 'Certifications' ? 'certifications' : task.category === 'Interview Prep' ? 'interview' : 'journal'}>
                                {task.category}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-[#7A736B] dark:text-[#6B7280]">
                              <span>{task.estimateMinutes} min</span>
                              <span>{task.note}</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-[#E8E3DC] bg-[#F3F0EB] p-4 dark:border-[#232830] dark:bg-[#1C2028]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#7A736B] dark:text-[#6B7280]">This Week</p>
                      <p className="text-2xl font-display text-[#1A1614] dark:text-[#E8EDF2]">{data.currentWeekLabel}</p>
                    </div>
                    <Badge status={weeklyProgress === 100 ? 'completed' : weeklyProgress >= 50 ? 'in-progress' : 'warning'}>
                      {weeklyProgress}% complete
                    </Badge>
                  </div>
                  <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">{data.weekRangeLabel}</p>

                  <div className="space-y-2 rounded-xl bg-white p-4 dark:bg-[#13161A]">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#7A736B] dark:text-[#6B7280]">Weekly momentum</span>
                      <span className="font-medium text-[#1A1614] dark:text-[#E8EDF2]">
                        {data.weeklyCompleted}/{data.weeklyTotal || 1}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#E8E3DC] dark:bg-[#232830]">
                      <div className="h-full rounded-full bg-[#5B5FEF] transition-all duration-300" style={{ width: `${weeklyProgress}%` }} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-4 dark:bg-[#13161A]">
                      <div className="flex items-center gap-2 text-sm text-[#7A736B] dark:text-[#6B7280]">
                        <Target size={14} /> DSA solved
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{data.totalDsaSolved}</p>
                    </div>
                    <div className="rounded-xl bg-white p-4 dark:bg-[#13161A]">
                      <div className="flex items-center gap-2 text-sm text-[#7A736B] dark:text-[#6B7280]">
                        <Clock3 size={14} /> Focus time
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{Math.round(data.estimatedFocusMinutes / 60)}h</p>
                    </div>
                    <div className="rounded-xl bg-white p-4 dark:bg-[#13161A]">
                      <div className="flex items-center gap-2 text-sm text-[#7A736B] dark:text-[#6B7280]">
                        <CheckCircle2 size={14} /> Applications
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{data.activeApplications}</p>
                    </div>
                    <div className="rounded-xl bg-white p-4 dark:bg-[#13161A]">
                      <div className="flex items-center gap-2 text-sm text-[#7A736B] dark:text-[#6B7280]">
                        <CalendarDays size={14} /> Peak season
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{data.daysUntilPeakSeason}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </section>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#7A736B] dark:text-[#6B7280]">Upcoming deadlines</p>
                  <p className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Next 14 days</p>
                </div>
                <RefreshCw size={14} className="text-[#7A736B] dark:text-[#6B7280]" />
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {data.upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">No deadlines are currently in the next two weeks.</p>
              ) : (
                data.upcomingDeadlines.map((deadline) => (
                  <div key={deadline.id} className="rounded-xl border border-[#E8E3DC] bg-[#F3F0EB] p-3 dark:border-[#232830] dark:bg-[#1C2028]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[#1A1614] dark:text-[#E8EDF2]">{deadline.title}</p>
                        <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">{deadline.type} · due {formatDisplayDate(deadline.dueDate)}</p>
                      </div>
                      <Badge status={deadline.daysUntil <= 3 ? 'warning' : 'in-progress'}>{deadline.daysUntil}d</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#7A736B] dark:text-[#6B7280]">Phase timeline</p>
                  <p className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Placement season</p>
                </div>
                <MoreVertical size={14} className="text-[#7A736B] dark:text-[#6B7280]" />
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {data.phaseSchedule.map((phase, index) => {
                const active = phase.name === data.currentPhase;
                return (
                  <div key={phase.name} className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${active ? 'bg-[#5B5FEF]' : 'bg-[#E8E3DC] dark:bg-[#232830]'}`} />
                    <div className={`flex-1 rounded-xl border px-3 py-2 ${active ? 'border-[#5B5FEF]/30 bg-[#5B5FEF]/10' : 'border-[#E8E3DC] bg-[#F3F0EB] dark:border-[#232830] dark:bg-[#1C2028]'}`}>
                      <p className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">
                        {index + 1}. {phase.name}
                      </p>
                      <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">{formatDisplayDate(phase.start)} – {formatDisplayDate(phase.end)}</p>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <p className="text-sm font-medium text-[#7A736B] dark:text-[#6B7280]">Recent activity</p>
                <p className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">Last 5 updates</p>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {data.recentActivity.length === 0 ? (
                <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">Activity will appear here as you solve problems and update your pipeline.</p>
              ) : (
                data.recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-xl border border-[#E8E3DC] bg-white p-3 dark:border-[#232830] dark:bg-[#13161A]">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#5B5FEF]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-[#1A1614] dark:text-[#E8EDF2]">{item.title}</p>
                        <Badge variant={item.type === 'DSA' ? 'dsa' : item.type === 'Applications' ? 'applications' : item.type === 'Projects' ? 'projects' : item.type === 'Certifications' ? 'certifications' : item.type === 'Interview Prep' ? 'interview' : 'journal'}>
                          {item.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">{item.detail}</p>
                      <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">{formatDisplayDate(item.date)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </aside>
      </div>

      <Card>
        <CardHeader>
          <div>
            <p className="text-sm font-medium text-[#7A736B] dark:text-[#6B7280]">Progress snapshot</p>
            <p className="text-lg font-semibold text-[#1A1614] dark:text-[#E8EDF2]">What matters right now</p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[#E8E3DC] bg-[#F3F0EB] p-4 dark:border-[#232830] dark:bg-[#1C2028]">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">Total DSA solved</p>
              <p className="mt-2 text-3xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{data.totalDsaSolved}</p>
            </div>
            <div className="rounded-2xl border border-[#E8E3DC] bg-[#F3F0EB] p-4 dark:border-[#232830] dark:bg-[#1C2028]">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">Applications active</p>
              <p className="mt-2 text-3xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{data.activeApplications}</p>
            </div>
            <div className="rounded-2xl border border-[#E8E3DC] bg-[#F3F0EB] p-4 dark:border-[#232830] dark:bg-[#1C2028]">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">Mocks done</p>
              <p className="mt-2 text-3xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{data.mocksDone}</p>
            </div>
            <div className="rounded-2xl border border-[#E8E3DC] bg-[#F3F0EB] p-4 dark:border-[#232830] dark:bg-[#1C2028]">
              <p className="text-xs uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]">Days until peak season</p>
              <p className="mt-2 text-3xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]">{data.daysUntilPeakSeason}</p>
            </div>
          </div>
        </CardBody>
      </Card>

      <button
        type="button"
        onClick={handleQuickCapture}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-[#5B5FEF] px-5 py-3 text-sm font-medium text-white shadow-lg transition-transform duration-150 hover:shadow-xl active:scale-95"
        aria-label="Quick capture"
      >
        <Sparkles size={16} />
        Quick Capture
      </button>

      {quickCaptureMessage && (
        <div className="fixed bottom-24 right-6 z-40 rounded-xl bg-[#1A1614] px-4 py-3 text-sm text-white shadow-xl">
          {quickCaptureMessage}
        </div>
      )}
    </div>
  );
}
