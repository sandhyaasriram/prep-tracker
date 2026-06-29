/**
 * Account confirmation before exporting to Google Sheets.
 */

import { Button, Modal } from '@/components';

interface GoogleAccountPromptProps {
  isOpen: boolean;
  placementEmail: string;
  googleEmail: string | null;
  loading?: boolean;
  error?: string | null;
  onContinue: () => void;
  onUseDifferentAccount: () => void;
  onClose: () => void;
}

/**
 * Lets the user confirm which Google account to use for export.
 */
export function GoogleAccountPrompt({
  isOpen,
  placementEmail,
  googleEmail,
  loading = false,
  error = null,
  onContinue,
  onUseDifferentAccount,
  onClose,
}: GoogleAccountPromptProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export to Google Sheets"
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="secondary" size="sm" onClick={onUseDifferentAccount} disabled={loading}>
            Use a different Google account
          </Button>
          <Button size="sm" onClick={onContinue} disabled={loading}>
            {loading ? 'Creating sheet...' : `Continue to Google Sheets`}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">
          Signed in to Placement OS as{' '}
          <span className="font-medium text-[#1A1614] dark:text-[#E8EDF2]">{placementEmail}</span>. Sheets will be
          created in your connected Google account
          {googleEmail ? (
            <>
              {' '}
              (<span className="font-medium text-[#1A1614] dark:text-[#E8EDF2]">{googleEmail}</span>)
            </>
          ) : null}
          . These emails do not need to match.
        </p>
        <div className="rounded-xl border border-[#E8E3DC] bg-[#F3F0EB] px-3 py-3 dark:border-[#232830] dark:bg-[#1C2028]">
          <p className="text-xs uppercase tracking-[0.16em] text-[#7A736B] dark:text-[#6B7280]">Ready to export</p>
          <p className="mt-1 text-sm text-[#7A736B] dark:text-[#6B7280]">
            Click continue to create the spreadsheet in Google Sheets.
          </p>
        </div>
        {error && <p className="text-sm text-[#E8622A]">{error}</p>}
      </div>
    </Modal>
  );
}
