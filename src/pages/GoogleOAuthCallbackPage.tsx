/**
 * Google OAuth callback page — /auth/google/callback
 * Exchanges the authorization code via the google-oauth edge function, then returns to the app.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  completeGoogleOAuth,
  resolveOAuthReturnPath,
  waitForSupabaseSession,
} from '@/lib/googleExport';

/**
 * Handles the Google OAuth redirect and resumes any pending Sheets export.
 */
export function GoogleOAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Connecting your Google account...');
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }

    handledRef.current = true;

    const error = searchParams.get('error');
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    const redirectWithError = (errorMessage: string): void => {
      sessionStorage.setItem('placementos_oauth_toast_error', errorMessage);
      navigate('/settings', { replace: true });
    };

    if (error) {
      redirectWithError(`Google authorization was denied (${error}).`);
      return;
    }

    if (!code || !state) {
      redirectWithError('Missing Google authorization response.');
      return;
    }

    void (async () => {
      try {
        await waitForSupabaseSession();
        await completeGoogleOAuth(code, state);
        setMessage('Google connected. Returning to Placement OS...');
        sessionStorage.setItem('placementos_oauth_just_completed', '1');

        const returnPath = resolveOAuthReturnPath();
        navigate(`${returnPath}?google_oauth=success`, { replace: true });
      } catch (callbackError) {
        redirectWithError(
          callbackError instanceof Error ? callbackError.message : 'Google authorization failed.'
        );
      }
    })();
  }, [navigate, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4] px-6 dark:bg-[#101216]">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="font-display text-3xl text-[#1A1614] dark:text-[#E8EDF2]">Placement OS</h1>
        <p className="text-sm text-[#7A736B] dark:text-[#6B7280]">{message}</p>
      </div>
    </div>
  );
}
