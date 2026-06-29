/**
 * Helpers for fetch-once-then-local-state data hooks.
 */

import type { MutableRefObject } from 'react';

export function shouldShowInitialLoading(hydratedRef: MutableRefObject<boolean>, silent?: boolean): boolean {
  return !silent && !hydratedRef.current;
}

export function markHydrated(hydratedRef: MutableRefObject<boolean>): void {
  hydratedRef.current = true;
}

export function resetHydrated(hydratedRef: MutableRefObject<boolean>): void {
  hydratedRef.current = false;
}
