/**
 * Google OAuth callback page — /auth/google/callback
 * Exchanges the authorization code via the edge function, then returns to the app.
 */

import { useEffect, useState } from 'react';
import { completeGoogleOAuth, redirectAfterGoogleOAuth, waitForSupabaseSession } from '@/lib/googleExport';

/**
 * Handles the Google OAuth redirect and resumes any pending Sheets export.
 */
export function GoogleOAuthCallbackPage() {
  const [message, setMessage] = useState('Connecting Google account...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const code = params.get('code');
    const state = params.get('state');

    if (error) {
      redirectAfterGoogleOAuth(false, `Google authorization was denied (${error}).`);
      return;
    }

    if (!code || !state) {
      redirectAfterGoogleOAuth(false, 'Missing Google authorization response.');
      return;
    }

    void waitForSupabaseSession()
      .then(() => completeGoogleOAuth(code, state))
      .then(() => {
        setMessage('Google connected. Returning to Placement OS...');
        redirectAfterGoogleOAuth(true);
      })
      .catch((callbackError) => {
        redirectAfterGoogleOAuth(
          false,
          callbackError instanceof Error ? callbackError.message : 'Google authorization failed.'
        );
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4] px-6 dark:bg-[#0D0F12]">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="font-display text-3xl text-[#1A1614] dark:text-[#E8EDF2]">Placement OS</h1>
        <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">{message}</p>
      </div>
    </div>
  );
}
