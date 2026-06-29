/**
 * Keyboard shortcuts help modal.
 */

import { Modal } from '@/components';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: 'Ctrl/Cmd + K', action: 'Open global search' },
  { keys: 'Ctrl/Cmd + Shift + C', action: 'Toggle AI Coach' },
  { keys: '?', action: 'Show keyboard shortcuts' },
  { keys: 'Esc', action: 'Close open modal or panel' },
] as const;

/**
 * Documents app-wide keyboard shortcuts.
 */
export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard shortcuts" size="md">
      <ul className="space-y-3">
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.keys} className="flex items-center justify-between gap-4">
            <span className="text-sm text-[#7A736B] dark:text-[#6B7280]">{shortcut.action}</span>
            <kbd className="rounded-md border border-[#E8E3DC] bg-[#F3F0EB] px-2 py-1 font-mono text-xs text-[#1A1614] dark:border-[#232830] dark:bg-[#1C2028] dark:text-[#E8EDF2]">
              {shortcut.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
