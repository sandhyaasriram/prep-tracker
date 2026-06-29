/**
 * Peak season stat — countdown or active indicator for the dashboard.
 */

import { useMemo } from 'react';
import { CalendarDays } from 'lucide-react';
import { getPeakSeasonDashboardState } from '@/utils';

interface PeakSeasonStatProps {
  size?: 'sm' | 'lg';
}

/**
 * Shows days until peak season, or an active state with pulsing indicator.
 */
export function PeakSeasonStat({ size = 'sm' }: PeakSeasonStatProps) {
  const peakSeason = useMemo(() => getPeakSeasonDashboardState(), []);

  const valueClass =
    size === 'lg'
      ? 'mt-2 text-3xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]'
      : 'mt-2 text-2xl font-semibold text-[#1A1614] dark:text-[#E8EDF2]';

  const labelClass =
    size === 'lg'
      ? 'text-xs uppercase tracking-[0.18em] text-[#7A736B] dark:text-[#6B7280]'
      : 'flex items-center gap-2 text-sm text-[#7A736B] dark:text-[#6B7280]';

  if (peakSeason.isActive) {
    return (
      <>
        <div className={labelClass}>
          {size === 'sm' && <CalendarDays size={14} />}
          <span className="inline-flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full bg-[#5B5FEF] motion-reduce:animate-none motion-safe:animate-pulse"
              aria-hidden="true"
            />
            Peak season active
          </span>
        </div>
        <p className={valueClass}>In progress</p>
      </>
    );
  }

  const label = size === 'lg' ? 'days till peak season' : 'Peak season';
  const value = size === 'lg' ? String(peakSeason.daysLeft) : `${peakSeason.daysLeft} days left`;

  return (
    <>
      <div className={labelClass}>
        {size === 'sm' && <CalendarDays size={14} />}
        {label}
      </div>
      <p className={valueClass}>{value}</p>
    </>
  );
}
