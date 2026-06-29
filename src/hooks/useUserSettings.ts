/**
 * User settings hook — reads and updates user_settings row.
 */

import { useCallback, useEffect, useState } from 'react';
import { applyTheme, getResolvedTheme } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { formatSupabaseError } from '@/utils/errors';
import { setTheme as setLocalTheme } from '@/utils/storage';
import type { UserSettings } from '@/types';

export interface UpdateProfileInput {
  college: string;
  graduationYear: number;
  targetCompanies: string[];
}

interface UseUserSettingsResult {
  settings: UserSettings | null;
  loading: boolean;
  hasGeminiKey: boolean;
  updateGeminiApiKey: (apiKey: string) => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<void>;
  updateThemePreference: (theme: UserSettings['theme']) => Promise<void>;
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

  useEffect(() => {
    if (settings?.theme) {
      setLocalTheme(settings.theme);
      if (settings.theme === 'light' || settings.theme === 'dark') {
        applyTheme(settings.theme);
      } else {
        applyTheme(getResolvedTheme());
      }
    }
  }, [settings?.theme]);

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

  const updateProfile = useCallback(
    async (input: UpdateProfileInput): Promise<void> => {
      if (!userId) {
        throw new Error('Not signed in');
      }

      const { error } = await supabase
        .from('user_settings')
        .update({
          college: input.college.trim(),
          graduation_year: input.graduationYear,
          target_companies: input.targetCompanies,
        })
        .eq('user_id', userId);

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      await fetchSettings({ silent: true });
    },
    [userId, fetchSettings]
  );

  const updateThemePreference = useCallback(
    async (theme: UserSettings['theme']): Promise<void> => {
      if (!userId) {
        throw new Error('Not signed in');
      }

      const { error } = await supabase.from('user_settings').update({ theme }).eq('user_id', userId);

      if (error) {
        throw new Error(formatSupabaseError(error));
      }

      setLocalTheme(theme);
      if (theme === 'light' || theme === 'dark') {
        applyTheme(theme);
      } else {
        applyTheme(getResolvedTheme());
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
    updateProfile,
    updateThemePreference,
    refresh: fetchSettings,
  };
}
