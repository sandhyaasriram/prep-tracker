/**
 * AI Coach hook — brief generation, caching, and regenerate rate limits.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { callGeminiBrief } from '@/lib/gemini';
import {
  clearBriefCache,
  consumeRegeneration,
  getRegenerationsRemaining,
  hasValidBriefCache,
  readCachedBriefSource,
  readCachedBriefText,
  writeCachedBrief,
} from '@/utils/coachCache';
import { buildCoachContext, generateCoachFallbackBrief } from '@/utils/coachContext';
import type { CoachBriefSource } from '@/types/coach';

interface LoadBriefOptions {
  force?: boolean;
  /** Use after saving a key before settings state has re-rendered. */
  assumeGeminiKey?: boolean;
}

interface UseGeminiCoachResult {
  brief: string;
  source: CoachBriefSource;
  loading: boolean;
  error: string | null;
  regenerationsRemaining: number;
  loadBrief: (options?: LoadBriefOptions) => Promise<void>;
  regenerateBrief: () => Promise<void>;
}

/**
 * Manage daily AI coach brief with cache and fallback behavior.
 */
export function useGeminiCoach(
  userId: string | null,
  hasGeminiKey: boolean,
  settingsReady: boolean
): UseGeminiCoachResult {
  const [brief, setBrief] = useState('');
  const [source, setSource] = useState<CoachBriefSource>('fallback');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenerationsRemaining, setRegenerationsRemaining] = useState(getRegenerationsRemaining());

  const loadBrief = useCallback(
    async (options?: LoadBriefOptions): Promise<void> => {
      if (!userId || !settingsReady) {
        return;
      }

      const force = options?.force ?? false;
      const canUseGemini = options?.assumeGeminiKey ?? hasGeminiKey;

      if (!force && hasValidBriefCache()) {
        const cached = readCachedBriefText();
        const cachedSource = readCachedBriefSource();
        if (cached) {
          setBrief(cached);
          setSource(cachedSource ?? (canUseGemini ? 'gemini' : 'fallback'));
          setError(null);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const context = await buildCoachContext(userId);
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        let geminiFailed = false;

        if (canUseGemini && accessToken) {
          try {
            const result = await callGeminiBrief(accessToken, force);
            setBrief(result.brief);
            setSource(result.source);
            writeCachedBrief(result.brief, result.source);
            setRegenerationsRemaining(getRegenerationsRemaining());
            return;
          } catch (proxyError) {
            geminiFailed = true;
            console.warn('Gemini proxy unavailable, using fallback brief.', proxyError);
            const message =
              proxyError instanceof Error ? proxyError.message : 'Gemini request failed.';
            setError(`AI brief unavailable (${message}). Using rules-based brief below.`);
          }
        }

        const fallbackBrief = generateCoachFallbackBrief(context);
        setBrief(fallbackBrief);
        setSource('fallback');
        writeCachedBrief(fallbackBrief, 'fallback');

        if (!canUseGemini && !geminiFailed) {
          setError('Add your Gemini API key in the section above to enable AI-generated briefs.');
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load coach brief.';
        setError(message);

        try {
          const context = await buildCoachContext(userId);
          setBrief(generateCoachFallbackBrief(context));
          setSource('fallback');
        } catch {
          setBrief('Unable to load your coach brief. Check your connection and try Regenerate.');
          setSource('fallback');
        }
      } finally {
        setLoading(false);
        setRegenerationsRemaining(getRegenerationsRemaining());
      }
    },
    [userId, hasGeminiKey, settingsReady]
  );

  const regenerateBrief = useCallback(async (): Promise<void> => {
    if (!consumeRegeneration()) {
      setError('Regenerate limit reached (3 per day). Try again tomorrow.');
      setRegenerationsRemaining(0);
      return;
    }

    clearBriefCache();
    setRegenerationsRemaining(getRegenerationsRemaining());
    await loadBrief({ force: true, assumeGeminiKey: hasGeminiKey });
  }, [loadBrief, hasGeminiKey]);

  useEffect(() => {
    if (userId && settingsReady) {
      void loadBrief();
    }
  }, [userId, hasGeminiKey, settingsReady, loadBrief]);

  return {
    brief,
    source,
    loading,
    error,
    regenerationsRemaining,
    loadBrief,
    regenerateBrief,
  };
}
