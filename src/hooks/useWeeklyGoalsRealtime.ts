/**
 * Supabase realtime subscription for weekly_goals changes (cross-tab sync only).
 */

import { useEffect, useRef } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type WeeklyGoalChangeHandler = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;

/**
 * Invoke callback when the user's weekly_goals rows change on another tab/device.
 */
export function useWeeklyGoalsRealtime(
  userId: string | null,
  scope: string,
  onChange: WeeklyGoalChangeHandler
): void {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`weekly_goals:${userId}:${scope}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_goals',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onChangeRef.current(payload);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, scope]);
}
