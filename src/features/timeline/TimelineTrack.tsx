/**
 * Horizontal placement season timeline with today indicator.
 * Wide scroll track, alternating label lanes, and collision offsets for crowded dates.
 */

import { useMemo } from 'react';
import { HorizontalScrollArea } from '@/components';
import profileSeed from '@/seed/profile.json';
import { TIMELINE_CATEGORY_COLORS } from '@/constants';
import { formatDisplayDate, todayIST } from '@/utils';
import type { TimelineCategory, TimelineMilestone } from '@/types/timeline';

interface TimelineTrackProps {
  milestones: TimelineMilestone[];
  onSelectMilestone?: (milestone: TimelineMilestone) => void;
}

const PIXELS_PER_DAY = 22;
const MIN_LABEL_GAP_PX = 152;
const TRACK_PADDING_PX = 56;
const LABEL_WIDTH_PX = 140;

interface PlacedMilestone {
  milestone: TimelineMilestone;
  xPx: number;
  labelOffsetPx: number;
  lane: 'above' | 'below';
}

function parseDay(date: string): number {
  return new Date(`${date}T00:00:00`).getTime();
}

function daysBetween(start: string, end: string): number {
  return Math.round((parseDay(end) - parseDay(start)) / (1000 * 60 * 60 * 24));
}

function milestoneColor(milestone: TimelineMilestone): string {
  if (milestone.color?.startsWith('#')) {
    return milestone.color;
  }

  return TIMELINE_CATEGORY_COLORS[milestone.category as TimelineCategory] ?? '#7A736B';
}

function computeTrackRange(milestones: TimelineMilestone[], seasonStart: string, seasonEnd: string, today: string) {
  const dates = [seasonStart, seasonEnd, today, ...milestones.map((milestone) => milestone.date)];
  const sorted = [...dates].sort();
  const earliest = sorted[0] ?? seasonStart;
  const latest = sorted[sorted.length - 1] ?? seasonEnd;

  const padDays = 12;
  const start = new Date(parseDay(earliest) - padDays * 86400000).toISOString().slice(0, 10);
  const end = new Date(parseDay(latest) + padDays * 86400000).toISOString().slice(0, 10);
  const totalDays = Math.max(daysBetween(start, end), 1);

  return { start, end, totalDays };
}

function layoutMilestones(milestones: TimelineMilestone[], rangeStart: string): PlacedMilestone[] {
  const sorted = [...milestones].sort((left, right) => left.date.localeCompare(right.date));

  const placed = sorted.map((milestone, index) => ({
    milestone,
    xPx: TRACK_PADDING_PX + daysBetween(rangeStart, milestone.date) * PIXELS_PER_DAY,
    labelOffsetPx: 0,
    lane: (index % 2 === 0 ? 'below' : 'above') as 'above' | 'below',
  }));

  for (let index = 1; index < placed.length; index += 1) {
    const previous = placed[index - 1];
    const current = placed[index];
    if (!previous || !current) {
      continue;
    }

    const previousLabelCenter = previous.xPx + previous.labelOffsetPx;
    const currentLabelCenter = current.xPx + current.labelOffsetPx;

    if (currentLabelCenter - previousLabelCenter < MIN_LABEL_GAP_PX) {
      current.labelOffsetPx = previousLabelCenter + MIN_LABEL_GAP_PX - current.xPx;
    }
  }

  return placed;
}

/**
 * Visual horizontal timeline for the placement season.
 */
export function TimelineTrack({ milestones, onSelectMilestone }: TimelineTrackProps) {
  const seasonStart = profileSeed.placement_season.start;
  const seasonEnd = profileSeed.placement_season.end;
  const today = todayIST();

  const { trackWidth, todayPx, placedMilestones } = useMemo(() => {
    const { start, totalDays } = computeTrackRange(milestones, seasonStart, seasonEnd, today);
    const width = TRACK_PADDING_PX * 2 + totalDays * PIXELS_PER_DAY;
    const todayX = TRACK_PADDING_PX + daysBetween(start, today) * PIXELS_PER_DAY;

    return {
      trackWidth: Math.max(width, 1400),
      todayPx: todayX,
      placedMilestones: layoutMilestones(milestones, start),
    };
  }, [milestones, seasonStart, seasonEnd, today]);

  const railTop = 160;

  return (
    <HorizontalScrollArea>
      <div className="relative" style={{ width: trackWidth, height: 340 }}>
        <div
          className="absolute h-1 rounded-full bg-[#E8E3DC] dark:bg-[#232830]"
          style={{ left: TRACK_PADDING_PX, right: TRACK_PADDING_PX, top: railTop }}
        />

        <div className="absolute z-10 flex -translate-x-1/2 flex-col items-center" style={{ left: todayPx, top: railTop - 72 }}>
          <span className="rounded-full bg-[#5B5FEF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
            Today
          </span>
          <div className="mt-2 h-16 w-0.5 bg-[#5B5FEF]" />
        </div>

        {placedMilestones.map(({ milestone, xPx, labelOffsetPx, lane }) => {
          const isPast = milestone.date < today;

          return (
            <div key={milestone.id} className="absolute z-20" style={{ left: xPx, top: railTop }}>
              <button
                type="button"
                className="absolute left-0 top-0 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md dark:border-[#13161A]"
                style={{
                  backgroundColor: milestoneColor(milestone),
                  opacity: isPast ? 0.85 : 1,
                }}
                onClick={() => onSelectMilestone?.(milestone)}
                aria-label={milestone.label}
              />

              <button
                type="button"
                className="absolute -translate-x-1/2 rounded-xl border border-[#E8E3DC] bg-white px-3 py-2.5 text-center shadow-sm transition-shadow hover:shadow-md dark:border-[#232830] dark:bg-[#1C2028]"
                style={{
                  width: LABEL_WIDTH_PX,
                  left: labelOffsetPx,
                  ...(lane === 'above' ? { bottom: 28 } : { top: 28 }),
                }}
                onClick={() => onSelectMilestone?.(milestone)}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7A736B] dark:text-[#6B7280]">
                  {formatDisplayDate(milestone.date)}
                </p>
                <p className="mt-1.5 text-xs font-medium leading-snug text-[#1A1614] dark:text-[#E8EDF2]">
                  {milestone.label}
                </p>
                <p className="mt-1 text-[10px] text-[#7A736B] dark:text-[#6B7280]">{milestone.category}</p>
              </button>
            </div>
          );
        })}

        <div
          className="pointer-events-none absolute flex justify-between text-[11px] text-[#7A736B] dark:text-[#6B7280]"
          style={{ left: TRACK_PADDING_PX, right: TRACK_PADDING_PX, bottom: 18 }}
        >
          <span>{formatDisplayDate(seasonStart)}</span>
          <span>{formatDisplayDate(seasonEnd)}</span>
        </div>
      </div>
    </HorizontalScrollArea>
  );
}
