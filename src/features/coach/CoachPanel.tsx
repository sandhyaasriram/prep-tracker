/**
 * AI Coach side panel — daily brief, regenerate, and API key setup.
 */

import { useState } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { Button, Input } from '@/components';
import type { CoachBriefSource } from '@/types/coach';

interface CoachPanelProps {
  isOpen: boolean;
  onClose: () => void;
  brief: string;
  source: CoachBriefSource;
  loading: boolean;
  error: string | null;
  regenerationsRemaining: number;
  hasGeminiKey: boolean;
  onRegenerate: () => Promise<void>;
  onSaveApiKey: (apiKey: string) => Promise<void>;
}

/**
 * Collapsible right-side panel for the daily AI coach brief.
 */
export function CoachPanel({
  isOpen,
  onClose,
  brief,
  source,
  loading,
  error,
  regenerationsRemaining,
  hasGeminiKey,
  onRegenerate,
  onSaveApiKey,
}: CoachPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keyMessage, setKeyMessage] = useState<string | null>(null);
  const [showKeyForm, setShowKeyForm] = useState(!hasGeminiKey);

  if (!isOpen) {
    return null;
  }

  const handleSaveKey = async (): Promise<void> => {
    setSavingKey(true);
    setKeyMessage(null);

    try {
      await onSaveApiKey(apiKey);
      setApiKey('');
      setShowKeyForm(false);
      setKeyMessage('API key saved. Regenerating brief…');
    } catch (saveError) {
      setKeyMessage(saveError instanceof Error ? saveError.message : 'Failed to save API key.');
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/20 md:bg-transparent"
        aria-label="Close AI coach"
        onClick={onClose}
      />

      <aside className="fixed right-0 top-[var(--app-chrome-height)] z-50 flex h-[calc(100vh-var(--app-chrome-height))] w-full max-w-md flex-col border-l border-[#E8E3DC] bg-white shadow-xl dark:border-[#232830] dark:bg-[#13161A]">
        <div className="flex items-center justify-between border-b border-[#E8E3DC] px-4 py-3 dark:border-[#232830]">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#5B5FEF]" />
            <div>
              <p className="text-sm font-semibold text-[#1A1614] dark:text-[#E8EDF2]">AI Coach</p>
              <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">
                {source === 'gemini' ? 'Gemini brief' : 'Rules-based brief'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7A736B] hover:bg-[#F3F0EB] dark:text-[#6B7280] dark:hover:bg-[#1C2028]"
            aria-label="Close coach panel"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-4 rounded-xl border border-[#E8E3DC] bg-[#F3F0EB] p-4 dark:border-[#232830] dark:bg-[#1C2028]">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[#1A1614] dark:text-[#E8EDF2]">Gemini API key</p>
                <p className="mt-1 text-xs text-[#7A736B] dark:text-[#6B7280]">
                  {hasGeminiKey
                    ? 'Key saved in Supabase. Used only by the edge function — never exposed in the browser.'
                    : 'Paste your key from Google AI Studio. Stored in Supabase and used only by the edge function.'}
                </p>
              </div>
              {hasGeminiKey && !showKeyForm && (
                <Button variant="ghost" size="sm" onClick={() => setShowKeyForm(true)}>
                  Update
                </Button>
              )}
            </div>

            {(showKeyForm || !hasGeminiKey) && (
              <div className="mt-3 space-y-2">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder={hasGeminiKey ? 'Paste new Gemini API key' : 'Paste Gemini API key'}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={savingKey || !apiKey.trim()} onClick={() => void handleSaveKey()}>
                    {hasGeminiKey ? 'Replace key' : 'Save key'}
                  </Button>
                  {hasGeminiKey && (
                    <Button variant="ghost" size="sm" onClick={() => setShowKeyForm(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}

            {keyMessage && <p className="mt-2 text-xs text-[#7A736B] dark:text-[#6B7280]">{keyMessage}</p>}
          </div>

          {loading && (
            <div className="mb-3 flex items-center gap-2 text-xs text-[#7A736B] dark:text-[#6B7280]">
              <RefreshCw size={12} className="animate-spin" />
              Generating brief…
            </div>
          )}

          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#1A1614] dark:text-[#E8EDF2]">
            {brief || (loading ? '' : 'Your daily brief will appear here. Click Regenerate if nothing loads.')}
          </pre>

          {error && <p className="mt-3 text-sm text-[#E8622A]">{error}</p>}
        </div>

        <div className="border-t border-[#E8E3DC] px-4 py-3 dark:border-[#232830]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#7A736B] dark:text-[#6B7280]">{regenerationsRemaining} regenerations left today</p>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={14} />}
              disabled={loading || regenerationsRemaining === 0}
              onClick={() => void onRegenerate()}
            >
              Regenerate
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
