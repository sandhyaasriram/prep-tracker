/**
 * Error handling and logging utilities.
 */

interface PostgrestErrorShape {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}

/**
 * Extract a readable message from Supabase/PostgREST errors.
 */
export function formatSupabaseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const shaped = error as PostgrestErrorShape;
    const parts = [shaped.message, shaped.details, shaped.hint].filter(Boolean);

    if (parts.length > 0) {
      const message = parts.join(' — ');

      if (shaped.code === '42P01') {
        return `${message}. Run supabase/schema.sql in your Supabase SQL editor first.`;
      }

      if (shaped.code === '23505') {
        return `${message}. Existing seed data was detected — refresh to resume syncing.`;
      }

      return message;
    }
  }

  return 'Failed to seed user data';
}

/**
 * Log an error with context.
 */
export function logError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  console.error(`[${context}]`, message);
  if (stack) console.error(stack);
}

/**
 * Throw a user-friendly error message.
 */
export class AppError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Handle async errors in callbacks.
 */
export function handleAsyncError(callback: () => Promise<void>): (e: unknown) => Promise<void> {
  return async (_e: unknown) => {
    try {
      await callback();
    } catch (error) {
      logError('Async Error', error);
    }
  };
}
