/**
 * User settings hook — reads and updates user_settings row.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
import type { UserSettings } from '@/types';

interface UseUserSettingsResult {
  settings: UserSettings | null;
  loading: boolean;
  hasGeminiKey: boolean;
  updateGeminiApiKey: (apiKey: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Load and update user preferences stored in Supabase.
 */
export function useUserSettings(userId: string | null): UseUserSettingsResult {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async (options?: { silent?: boolean }): Promise<void> => {
    if (!userId) {
      setSettings(null);
      setLoading(false);
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();

      if (error) {
        throw error;
      }

      setSettings((data as UserSettings | null) ?? null);
    } catch (fetchError) {
      console.error('Failed to load user settings:', fetchError);
      setSettings(null);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [userId]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const updateGeminiApiKey = useCallback(
    async (apiKey: string): Promise<void> => {
      if (!userId) {
        throw new Error('Not signed in');
      }

      const { error } = await supabase
        .from('user_settings')
        .update({ gemini_api_key_encrypted: apiKey.trim() })
        .eq('user_id', userId);

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      await fetchSettings({ silent: true });
    },
    [userId, fetchSettings]
  );

  return {
    settings,
    loading,
    hasGeminiKey: Boolean(settings?.gemini_api_key_encrypted?.trim()),
    updateGeminiApiKey,
    refresh: fetchSettings,
  };
}
