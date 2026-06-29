/**
 * Horizontal scroll viewport with a custom styled scrollbar (grey default, indigo when active).
 * Hides the native OS scrollbar for consistent look across platforms.
 */

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

interface HorizontalScrollAreaProps {
  children: ReactNode;
  className?: string;
}

const SCROLL_STEP_PX = 96;
const KEYBOARD_HIGHLIGHT_MS = 700;
const THUMB_ACTIVE_COLOR = '#1c228d';

/**
 * Scrollable row with a custom horizontal scrollbar track below the content.
 */
export function HorizontalScrollArea({ children, className = '' }: HorizontalScrollAreaProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const highlightTimeoutRef = useRef<number>();
  const [metrics, setMetrics] = useState({ scrollLeft: 0, scrollWidth: 0, clientWidth: 0 });
  const [dragging, setDragging] = useState(false);
  const [hoveringScrollbar, setHoveringScrollbar] = useState(false);
  const [keyboardHighlight, setKeyboardHighlight] = useState(false);

  const updateMetrics = useCallback((): void => {
    const element = viewportRef.current;
    if (!element) {
      return;
    }

    setMetrics({
      scrollLeft: element.scrollLeft,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    });
  }, []);

  const triggerKeyboardHighlight = useCallback((): void => {
    setKeyboardHighlight(true);
    window.clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = window.setTimeout(() => setKeyboardHighlight(false), KEYBOARD_HIGHLIGHT_MS);
  }, []);

  const scrollByStep = useCallback(
    (direction: -1 | 1): void => {
      const element = viewportRef.current;
      if (!element) {
        return;
      }

      element.scrollLeft += direction * SCROLL_STEP_PX;
      triggerKeyboardHighlight();
      updateMetrics();
    },
    [triggerKeyboardHighlight, updateMetrics]
  );

  useEffect(() => {
    updateMetrics();

    const element = viewportRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => updateMetrics());
    observer.observe(element);
    if (element.firstElementChild) {
      observer.observe(element.firstElementChild);
    }

    window.addEventListener('resize', updateMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateMetrics);
      window.clearTimeout(highlightTimeoutRef.current);
    };
  }, [updateMetrics]);

  const maxScroll = Math.max(metrics.scrollWidth - metrics.clientWidth, 0);
  const needsScroll = maxScroll > 1;
  const trackInnerWidth = Math.max(metrics.clientWidth - 16, 0);
  const thumbWidth = needsScroll
    ? Math.max(56, (metrics.clientWidth / metrics.scrollWidth) * trackInnerWidth)
    : trackInnerWidth;
  const thumbTravel = Math.max(trackInnerWidth - thumbWidth, 0);
  const thumbLeft = maxScroll > 0 ? (metrics.scrollLeft / maxScroll) * thumbTravel : 0;
  const isThumbActive = dragging || hoveringScrollbar || keyboardHighlight;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!needsScroll) {
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollByStep(-1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollByStep(1);
    }
  };

  useEffect(() => {
    if (!hoveringScrollbar || !needsScroll) {
      return;
    }

    const handleWindowKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollByStep(-1);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollByStep(1);
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [hoveringScrollbar, needsScroll, scrollByStep]);

  const handleThumbPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);

    const startX = event.clientX;
    const startScroll = viewportRef.current?.scrollLeft ?? 0;

    const handleMove = (moveEvent: PointerEvent): void => {
      if (!viewportRef.current || thumbTravel <= 0) {
        return;
      }

      const delta = moveEvent.clientX - startX;
      const scrollDelta = (delta / thumbTravel) * maxScroll;
      viewportRef.current.scrollLeft = startScroll + scrollDelta;
    };

    const handleUp = (): void => {
      setDragging(false);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      updateMetrics();
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (!viewportRef.current || event.target !== event.currentTarget || maxScroll <= 0) {
      return;
    }

    triggerKeyboardHighlight();

    const trackRect = event.currentTarget.getBoundingClientRect();
    const clickOffset = event.clientX - trackRect.left - thumbWidth / 2;
    const nextLeft = Math.min(Math.max(clickOffset, 0), thumbTravel);
    viewportRef.current.scrollLeft = (nextLeft / thumbTravel) * maxScroll;
    updateMetrics();
  };

  return (
    <div className={`outline-none ${className}`} tabIndex={needsScroll ? 0 : -1} onKeyDown={handleKeyDown}>
      <div ref={viewportRef} className="scrollbar-none overflow-x-auto px-1 pb-1 pt-1" onScroll={updateMetrics}>
        {children}
      </div>

      {needsScroll && (
        <div
          className="px-2 pt-2"
          onMouseEnter={() => setHoveringScrollbar(true)}
          onMouseLeave={() => setHoveringScrollbar(false)}
        >
          <div
            className="relative h-2 rounded-full bg-[#F3F0EB] dark:bg-[#1C2028]"
            onPointerDown={handleTrackPointerDown}
          >
            <div
              role="scrollbar"
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={maxScroll}
              aria-valuenow={metrics.scrollLeft}
              className={`absolute top-0 h-2 cursor-grab rounded-full active:cursor-grabbing ${
                isThumbActive ? '' : 'bg-[#C9C2B8] dark:bg-[#4B5563]'
              }`}
              style={{
                width: thumbWidth,
                transform: `translateX(${thumbLeft}px)`,
                ...(isThumbActive ? { backgroundColor: THUMB_ACTIVE_COLOR } : {}),
              }}
              onPointerDown={handleThumbPointerDown}
            />
          </div>
        </div>
      )}
    </div>
  );
}
