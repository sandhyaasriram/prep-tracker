/**
 * Optimistic mutation helper — local state first, Supabase sync in background.
 */

import { toast } from '@/utils/toast';
import { formatSupabaseError } from '@/utils/errors';

interface OptimisticMutationOptions {
  apply: () => void;
  revert: () => void;
  persist: () => Promise<void>;
  errorMessage?: string;
}

/**
 * Apply optimistic UI update, persist in background, revert + toast on failure.
 */
export async function runOptimisticMutation({
  apply,
  revert,
  persist,
  errorMessage = 'Save failed. Your change was reverted.',
}: OptimisticMutationOptions): Promise<void> {
  apply();

  try {
    await persist();
  } catch (error) {
    revert();
    toast.error(error instanceof Error ? error.message : formatSupabaseError(error) || errorMessage);
  }
}
