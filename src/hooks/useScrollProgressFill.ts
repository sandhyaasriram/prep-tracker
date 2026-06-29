/**
 * Drives the top nav scroll progress fill via direct DOM updates (no React state).
 */

import { useEffect, type RefObject } from 'react';

function updateFillWidth(fill: HTMLDivElement): void {
  const scrollTop = window.scrollY;
  const scrollHeight = document.documentElement.scrollHeight;
  const clientHeight = document.documentElement.clientHeight;
  const maxScroll = scrollHeight - clientHeight;
  const percent = maxScroll <= 0 ? 0 : Math.min(100, Math.max(0, (scrollTop / maxScroll) * 100));

  fill.style.width = `${percent}%`;

  const track = fill.parentElement;
  if (track) {
    track.setAttribute('aria-valuenow', String(Math.round(percent)));
  }
}

/**
 * Attach window scroll tracking to a progress fill element; reset on route change.
 */
export function useScrollProgressFill(
  fillRef: RefObject<HTMLDivElement | null>,
  routeKey: string
): void {
  useEffect(() => {
    const fill = fillRef.current;
    if (fill) {
      fill.style.width = '0%';
      fill.parentElement?.setAttribute('aria-valuenow', '0');
    }
    window.scrollTo(0, 0);
  }, [fillRef, routeKey]);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) {
      return;
    }

    let rafId: number | null = null;

    const scheduleUpdate = (): void => {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        if (fillRef.current) {
          updateFillWidth(fillRef.current);
        }
      });
    };

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    scheduleUpdate();

    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [fillRef, routeKey]);
}
