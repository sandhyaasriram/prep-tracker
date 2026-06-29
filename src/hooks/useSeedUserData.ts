/**
 * Hook that seeds a user's default data on first login.
 * Uses the seed utility once per authenticated user.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { seedUserData } from '@/utils/seeding';
import { formatSupabaseError } from '@/utils/errors';

export interface UseSeedUserDataResult {
  seeding: boolean;
  seeded: boolean;
  error: string | null;
  retry: () => void;
  dismissError: () => void;
}

export function useSeedUserData(userId: string | null): UseSeedUserDataResult {
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lastSeededUserId = useRef<string | null>(null);

  const retry = useCallback((): void => {
    lastSeededUserId.current = null;
    setError(null);
    setAttempt((current) => current + 1);
  }, []);

  const dismissError = useCallback((): void => {
    setError(null);
  }, []);

  useEffect(() => {
    if (!userId) {
      setSeeded(false);
      setError(null);
      return;
    }

    if (lastSeededUserId.current === userId) {
      setSeeded(true);
      return;
    }

    let cancelled = false;

    const runSeed = async (): Promise<void> => {
      setSeeding(true);
      setError(null);

      try {
        await seedUserData(userId);
        if (cancelled) {
          return;
        }

        lastSeededUserId.current = userId;
        setSeeded(true);
      } catch (seedError) {
        if (cancelled) {
          return;
        }

        console.error('Seeding failed:', seedError);
        setError(formatSupabaseError(seedError));
        setSeeded(true);
      } finally {
        if (!cancelled) {
          setSeeding(false);
        }
      }
    };

    runSeed().catch((unexpectedError: unknown) => {
      console.error('Unexpected seeding error:', unexpectedError);
      if (!cancelled) {
        setError(formatSupabaseError(unexpectedError));
        setSeeding(false);
        setSeeded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [userId, attempt]);

  return { seeding, seeded, error, retry, dismissError };
}
