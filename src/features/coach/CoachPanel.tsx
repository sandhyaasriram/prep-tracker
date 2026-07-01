/**
 * AI Coach side panel — persistent conversational chat.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Send, Sparkles, Trash2, X } from 'lucide-react';
import { Button } from '@/components';
import { IST_OFFSET_MS } from '@/constants';
import type { CoachMessage } from '@/types/coach';

interface CoachPanelProps {
  isOpen: boolean;
  onClose: () => void;
  messages: CoachMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;
  onSend: (content: string) => Promise<void>;
  onNewConversation: () => Promise<void>;
  onDismissError: () => void;
}

function formatMessageTimeIST(createdAt: string): string {
  const utc = new Date(createdAt);
  if (Number.isNaN(utc.getTime())) {
    return '';
  }

  const ist = new Date(utc.getTime() + IST_OFFSET_MS);
  const hours = String(ist.getUTCHours()).padStart(2, '0');
  const minutes = String(ist.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes} IST`;
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md bg-[#F3F0EB] px-4 py-3 dark:bg-[#1C2028]">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7A736B] [animation-delay:0ms] dark:bg-[#6B7280]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7A736B] [animation-delay:150ms] dark:bg-[#6B7280]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#7A736B] [animation-delay:300ms] dark:bg-[#6B7280]" />
        </div>
      </div>
    </div>
  );
}

/**
 * Collapsible right-side panel for the AI coach chat.
 */
export function CoachPanel({
  isOpen,
  onClose,
  messages,
  loading,
  sending,
  error,
  onSend,
  onNewConversation,
  onDismissError,
}: CoachPanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const threadRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const node = threadRef.current;
    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [isOpen, messages, sending]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (): void => {
    const trimmed = draft.trim();
    if (!trimmed || sending || loading) {
      return;
    }

    setDraft('');
    void onSend(trimmed);
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/20 md:bg-transparent"
        aria-label="Close AI coach"
        onClick={onClose}
      />

      <aside className="fixed right-0 top-[var(--app-chrome-height)] z-50 flex h-[calc(100vh-var(--app-chrome-height))] w-full max-w-md flex-col border-l border-[#E8E3DC] bg-white shadow-xl dark:border-transparent dark:bg-[#13161A]">
        <div className="flex items-center justify-between border-b border-[#E8E3DC] px-4 py-3 dark:border-transparent">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#5B5FEF]" />
            <p className="text-sm font-semibold text-[#1A1614] dark:text-[#E8EDF2]">AI Coach</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void onNewConversation()}
              disabled={loading || sending}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7A736B] hover:bg-[#F3F0EB] disabled:opacity-50 dark:text-[#6B7280] dark:hover:bg-[#1C2028]"
              aria-label="New conversation"
              title="New conversation"
            >
              <Trash2 size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7A736B] hover:bg-[#F3F0EB] dark:text-[#6B7280] dark:hover:bg-[#1C2028]"
              aria-label="Close coach panel"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {loading && messages.length === 0 && (
            <p className="text-center text-sm text-[#7A736B] dark:text-[#6B7280]">Loading conversation…</p>
          )}

          {messages.map((message) => {
            const isUser = message.role === 'user';
            const bubble = (
              <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? 'rounded-br-md bg-[#5B5FEF] text-white'
                      : 'rounded-bl-md bg-[#F3F0EB] text-[#1A1614] dark:bg-[#1C2028] dark:text-[#E8EDF2]'
                  }`}
                >
                  {message.content}
                </div>
                <span className="px-1 text-[10px] text-[#7A736B] dark:text-[#6B7280]">
                  {formatMessageTimeIST(message.created_at)}
                </span>
              </div>
            );

            if (prefersReducedMotion) {
              return <div key={message.id}>{bubble}</div>;
            }

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
              >
                {bubble}
              </motion.div>
            );
          })}

          {sending && <TypingIndicator />}
        </div>

        <div className="border-t border-[#E8E3DC] px-4 py-3 dark:border-transparent">
          {error && (
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-xs text-[#E8622A]">{error}</p>
              <button
                type="button"
                onClick={onDismissError}
                className="shrink-0 text-xs text-[#7A736B] hover:text-[#1A1614] dark:text-[#6B7280] dark:hover:text-[#E8EDF2]"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSubmit();
                }
              }}
              rows={2}
              disabled={loading || sending}
              placeholder="Ask your coach…"
              className="min-h-[44px] flex-1 resize-none rounded-xl border border-[#E8E3DC] bg-white px-3 py-2 text-sm text-[#1A1614] outline-none transition-shadow focus:border-[#5B5FEF]/40 focus:ring-2 focus:ring-[#5B5FEF]/20 disabled:opacity-60 dark:border-[#232830] dark:bg-[#161A20] dark:text-[#E8EDF2]"
            />
            <Button
              size="sm"
              icon={<Send size={14} />}
              disabled={loading || sending || !draft.trim()}
              onClick={handleSubmit}
              aria-label="Send message"
            >
              Send
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
