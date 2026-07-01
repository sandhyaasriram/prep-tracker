/**
 * AI Coach chat — persistent daily conversation stored in Supabase.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { callCoachChat } from '@/lib/gemini';
import { buildCoachChatContext } from '@/utils/coachContext';
import { formatSupabaseError } from '@/utils/errors';
import { todayIST } from '@/utils';
import type { CoachChatContext, CoachMessage } from '@/types/coach';

interface UseCoachDataResult {
  messages: CoachMessage[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  sendMessage: (content: string) => Promise<void>;
  startNewConversation: () => Promise<void>;
  dismissError: () => void;
}

interface CoachMessageRow {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

function mapRow(row: CoachMessageRow): CoachMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    created_at: row.created_at,
  };
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Not signed in. Sign in to use the AI Coach.');
  }

  return token;
}

async function fetchTodayMessages(userId: string): Promise<CoachMessage[]> {
  const today = todayIST();
  const { data, error } = await supabase
    .from('coach_messages')
    .select('id, role, content, created_at')
    .eq('user_id', userId)
    .eq('date', today)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapRow(row as CoachMessageRow));
}

async function insertMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<CoachMessage> {
  const today = todayIST();
  const { data, error } = await supabase
    .from('coach_messages')
    .insert({ user_id: userId, date: today, role, content })
    .select('id, role, content, created_at')
    .single();

  if (error) {
    throw error;
  }

  return mapRow(data as CoachMessageRow);
}

async function requestCoachReply(
  userId: string,
  history: CoachMessage[],
  context: CoachChatContext,
  firstName: string
): Promise<string> {
  const token = await getAccessToken();
  const result = await callCoachChat(token, {
    userId,
    messages: history.map((message) => ({ role: message.role, content: message.content })),
    context,
    firstName,
  });

  return result.reply;
}

/**
 * Manage persistent daily AI coach chat.
 */
export function useCoachData(userId: string | null): UseCoachDataResult {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bootstrapRef = useRef<string | null>(null);

  const generateOpeningBrief = useCallback(async (activeUserId: string): Promise<CoachMessage[]> => {
    const existing = await fetchTodayMessages(activeUserId);
    if (existing.length > 0) {
      return existing;
    }

    const { firstName, ...context } = await buildCoachChatContext(activeUserId);
    const reply = await requestCoachReply(activeUserId, [], context, firstName);

    const afterReply = await fetchTodayMessages(activeUserId);
    if (afterReply.length > 0) {
      return afterReply;
    }

    const assistantMessage = await insertMessage(activeUserId, 'assistant', reply);
    return [assistantMessage];
  }, []);

  const loadTodayConversation = useCallback(async (): Promise<void> => {
    if (!userId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const todayMessages = await fetchTodayMessages(userId);

      if (todayMessages.length > 0) {
        setMessages(todayMessages);
        return;
      }

      const opening = await generateOpeningBrief(userId);
      setMessages(opening);
    } catch (loadError) {
      bootstrapRef.current = null;
      setError(loadError instanceof Error ? loadError.message : formatSupabaseError(loadError));
    } finally {
      setLoading(false);
    }
  }, [generateOpeningBrief, userId]);

  useEffect(() => {
    if (!userId) {
      bootstrapRef.current = null;
      setMessages([]);
      return;
    }

    if (bootstrapRef.current === userId) {
      return;
    }

    bootstrapRef.current = userId;
    void loadTodayConversation();
  }, [loadTodayConversation, userId]);

  const sendMessage = useCallback(
    async (content: string): Promise<void> => {
      const trimmed = content.trim();
      if (!userId || !trimmed || sending) {
        return;
      }

      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticUser: CoachMessage = {
        id: optimisticId,
        role: 'user',
        content: trimmed,
        created_at: new Date().toISOString(),
      };

      const priorMessages = messages;
      setSending(true);
      setError(null);
      setMessages((current) => [...current, optimisticUser]);

      try {
        const savedUser = await insertMessage(userId, 'user', trimmed);
        const historyWithUser = [...priorMessages, savedUser];
        setMessages(historyWithUser);

        const { firstName, ...context } = await buildCoachChatContext(userId);
        const reply = await requestCoachReply(userId, historyWithUser, context, firstName);
        const savedAssistant = await insertMessage(userId, 'assistant', reply);
        setMessages((current) => [...current, savedAssistant]);
      } catch (sendError) {
        setMessages((current) => current.filter((message) => message.id !== optimisticId));
        setError(sendError instanceof Error ? sendError.message : formatSupabaseError(sendError));
      } finally {
        setSending(false);
      }
    },
    [messages, sending, userId]
  );

  const startNewConversation = useCallback(async (): Promise<void> => {
    if (!userId) {
      return;
    }

    if (!window.confirm("Clear today's coach conversation and start fresh?")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const today = todayIST();
      const { error: deleteError } = await supabase
        .from('coach_messages')
        .delete()
        .eq('user_id', userId)
        .eq('date', today);

      if (deleteError) {
        throw deleteError;
      }

      const opening = await generateOpeningBrief(userId);
      setMessages(opening);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : formatSupabaseError(resetError));
    } finally {
      setLoading(false);
    }
  }, [generateOpeningBrief, userId]);

  const dismissError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    startNewConversation,
    dismissError,
  };
}
