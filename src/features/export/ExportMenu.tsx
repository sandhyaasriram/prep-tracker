/**
 * Section export menu — CSV download or Google Sheets export.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { Button } from '@/components';
import { GoogleAccountPrompt } from '@/features/export/GoogleAccountPrompt';
import { GoogleSheetsIcon } from '@/features/export/GoogleSheetsIcon';
import {
  clearOAuthReturnParams,
  consumeOAuthJustCompleted,
  consumePendingSheetsExport,
  disconnectGoogleOAuth,
  exportSectionToGoogleSheets,
  fetchGoogleOAuthStatus,
  peekPendingSheetsExport,
  readOAuthReturnError,
  startGoogleOAuth,
  storePendingSheetsExport,
} from '@/lib/googleExport';
import { exportToCSV, generateCSVFilename } from '@/utils';

export interface ExportMenuProps {
  csvSection: string;
  sheetSectionName: string;
  rows: Record<string, unknown>[];
  userEmail: string;
  disabled?: boolean;
  onMessage?: (message: string) => void;
}

/**
 * Linear-style export dropdown with CSV and Google Sheets options.
 */
export function ExportMenu({
  csvSection,
  sheetSectionName,
  rows,
  userEmail,
  disabled = false,
  onMessage,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [accountPromptOpen, setAccountPromptOpen] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const notify = useCallback(
    (message: string): void => {
      onMessage?.(message);
    },
    [onMessage]
  );

  const runSheetsExport = useCallback(
    async (rowsOverride?: Record<string, unknown>[]): Promise<void> => {
      setExporting(true);
      setError(null);

      const exportRows = rowsOverride ?? rows;

      try {
        const result = await exportSectionToGoogleSheets(sheetSectionName, exportRows);
        window.open(result.url, '_blank', 'noopener,noreferrer');
        consumePendingSheetsExport();
        setAccountPromptOpen(false);
        notify(`Opened ${result.title} in Google Sheets.`);
      } catch (exportError) {
        setError(exportError instanceof Error ? exportError.message : 'Google Sheets export failed.');
      } finally {
        setExporting(false);
      }
    },
    [notify, rows, sheetSectionName]
  );

  const resumePendingExport = useCallback(async (): Promise<void> => {
    const pending = peekPendingSheetsExport();
    if (!pending || pending.sectionName !== sheetSectionName) {
      return;
    }

    try {
      const status = await fetchGoogleOAuthStatus();
      setGoogleEmail(status.googleEmail);

      if (consumeOAuthJustCompleted()) {
        await runSheetsExport(pending.rows);
        return;
      }

      setAccountPromptOpen(true);
    } catch (resumeError) {
      notify(resumeError instanceof Error ? resumeError.message : 'Failed to resume Google export.');
    }
  }, [notify, runSheetsExport, sheetSectionName]);

  useEffect(() => {
    const oauthError = readOAuthReturnError();
    if (oauthError) {
      notify(oauthError);
      clearOAuthReturnParams();
      return;
    }

    const pending = peekPendingSheetsExport();
    if (pending?.sectionName === sheetSectionName) {
      void resumePendingExport();
    }
  }, [notify, resumePendingExport, sheetSectionName]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleDownloadCsv = (): void => {
    exportToCSV(rows, generateCSVFilename(csvSection));
    setOpen(false);
    notify('CSV downloaded.');
  };

  const handleOpenInSheets = async (): Promise<void> => {
    setOpen(false);
    setError(null);

    try {
      const status = await fetchGoogleOAuthStatus();

      if (!status.connected) {
        storePendingSheetsExport({ sectionName: sheetSectionName, csvSection, rows });
        await startGoogleOAuth();
        return;
      }

      setGoogleEmail(status.googleEmail);
      setAccountPromptOpen(true);
    } catch (sheetsError) {
      notify(sheetsError instanceof Error ? sheetsError.message : 'Could not start Google Sheets export.');
    }
  };

  const handleUseDifferentAccount = async (): Promise<void> => {
    setExporting(true);
    setError(null);

    try {
      await disconnectGoogleOAuth();
      storePendingSheetsExport({ sectionName: sheetSectionName, csvSection, rows });
      await startGoogleOAuth();
    } catch (disconnectError) {
      setError(disconnectError instanceof Error ? disconnectError.message : 'Failed to switch Google account.');
      setExporting(false);
    }
  };

  return (
    <>
      <div ref={containerRef} className="relative inline-flex">
        <Button
          variant="secondary"
          size="sm"
          icon={<Download size={14} />}
          disabled={disabled}
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          Export
          <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </Button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-1 min-w-[240px] overflow-hidden rounded-lg border border-[#E8E3DC] bg-white py-1 shadow-lg dark:border-[#232830] dark:bg-[#13161A]"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleOpenInSheets()}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#1A1614] transition-colors hover:bg-[#F3F0EB] dark:text-[#E8EDF2] dark:hover:bg-[#1C2028]"
            >
              <GoogleSheetsIcon />
              Open in Google Sheets
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleDownloadCsv}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#1A1614] transition-colors hover:bg-[#F3F0EB] dark:text-[#E8EDF2] dark:hover:bg-[#1C2028]"
            >
              <Download size={16} className="text-[#7A736B] dark:text-[#6B7280]" />
              Download as CSV
            </button>
          </div>
        )}
      </div>

      <GoogleAccountPrompt
        isOpen={accountPromptOpen}
        placementEmail={userEmail}
        googleEmail={googleEmail}
        loading={exporting}
        error={error}
        onContinue={() => void runSheetsExport()}
        onUseDifferentAccount={() => void handleUseDifferentAccount()}
        onClose={() => {
          if (!exporting) {
            setAccountPromptOpen(false);
            setError(null);
          }
        }}
      />
    </>
  );
}
