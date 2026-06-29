/**
 * Computes fixed viewport position for a row-anchored problem popover.
 */

export const POPOVER_WIDTH = 380;
export const POPOVER_MAX_HEIGHT = 480;
const VIEWPORT_PADDING = 8;
const ROW_GAP = 8;

export interface PopoverPosition {
  top: number;
  left: number;
  placement: 'above' | 'below';
  originX: number;
  originY: number;
}

/**
 * Position the popover relative to a problem row, clamped inside the viewport.
 */
export function computePopoverPosition(anchorRect: DOMRect, popoverHeight: number = POPOVER_MAX_HEIGHT): PopoverPosition {
  const viewportMid = window.innerHeight / 2;
  const rowMidY = anchorRect.top + anchorRect.height / 2;
  const showAbove = rowMidY > viewportMid;

  let top = showAbove ? anchorRect.top - ROW_GAP - popoverHeight : anchorRect.bottom + ROW_GAP;
  let left = anchorRect.right;

  left = Math.max(VIEWPORT_PADDING, Math.min(left, window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING));

  if (top < VIEWPORT_PADDING) {
    top = VIEWPORT_PADDING;
  }

  if (top + popoverHeight > window.innerHeight - VIEWPORT_PADDING) {
    top = Math.max(VIEWPORT_PADDING, window.innerHeight - popoverHeight - VIEWPORT_PADDING);
  }

  const originX = Math.min(Math.max(anchorRect.right - left, 16), POPOVER_WIDTH - 16);
  const originY = showAbove ? popoverHeight : 0;

  return {
    top,
    left,
    placement: showAbove ? 'above' : 'below',
    originX,
    originY,
  };
}

/**
 * Re-read anchor rect from the DOM when the row is still mounted.
 */
export function getAnchorRect(problemId: string): DOMRect | null {
  const element = document.querySelector(`[data-problem-id="${problemId}"]`);
  if (!element) {
    return null;
  }

  return element.getBoundingClientRect();
}
