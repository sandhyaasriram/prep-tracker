/**
 * Google Sheets export + OAuth client helpers.
 * All secrets stay server-side in Supabase Edge Functions.
 */

import { supabase } from '@/lib/supabase';

const PENDING_EXPORT_KEY = 'placementos_pending_sheets_export';
const OAUTH_JUST_COMPLETED_KEY = 'placementos_oauth_just_completed';

export interface GoogleOAuthStatus {
  connected: boolean;
  googleEmail: string | null;
}

export interface PendingSheetsExport {
  sectionName: string;
  csvSection: string;
  rows: Record<string, unknown>[];
  returnHash: string;
}

interface EdgeErrorResponse {
  error?: string;
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }

  const token = data.session?.access_token;
  if (token) {
    return token;
  }

  throw new Error('Not signed in to Placement OS. Sign in, then try export again.');
}

/**
 * Wait for a Supabase session after returning from an external OAuth redirect.
 */
export async function waitForSupabaseSession(timeoutMs = 8000): Promise<string> {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    try {
      return await getAccessToken();
    } catch {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }
  }

  throw new Error('Not signed in to Placement OS. Sign in, then try export again.');
}

function getFunctionHeaders(accessToken: string): Record<string, string> {
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    ...(supabaseAnonKey ? { apikey: supabaseAnonKey } : {}),
  };
}

/**
 * Fetch whether the user has connected Google for Sheets export.
 */
export async function fetchGoogleOAuthStatus(): Promise<GoogleOAuthStatus> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth`, {
    method: 'POST',
    headers: getFunctionHeaders(accessToken),
    body: JSON.stringify({ action: 'status' }),
  });

  const data = (await response.json()) as GoogleOAuthStatus & EdgeErrorResponse;

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to check Google connection.');
  }

  return {
    connected: Boolean(data.connected),
    googleEmail: data.googleEmail ?? null,
  };
}

/**
 * Start Google OAuth — redirects the browser to Google's consent screen.
 */
export async function startGoogleOAuth(): Promise<void> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth`, {
    method: 'POST',
    headers: getFunctionHeaders(accessToken),
    body: JSON.stringify({ action: 'get_auth_url' }),
  });

  const data = (await response.json()) as { url?: string; error?: string };

  if (!response.ok || !data.url) {
    throw new Error(data.error ?? 'Failed to start Google authorization.');
  }

  window.location.href = data.url;
}

/**
 * Complete Google OAuth after redirect to /auth/google/callback.
 */
export async function completeGoogleOAuth(code: string, state: string): Promise<{ googleEmail: string }> {
  const accessToken = await waitForSupabaseSession();
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth`, {
    method: 'POST',
    headers: getFunctionHeaders(accessToken),
    body: JSON.stringify({ action: 'exchange_code', code, state }),
  });

  const data = (await response.json()) as { googleEmail?: string; error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to complete Google authorization.');
  }

  return { googleEmail: data.googleEmail ?? '' };
}

/**
 * Redirect back to the app after OAuth callback handling.
 */
export function redirectAfterGoogleOAuth(success: boolean, errorMessage?: string): void {
  const pending = peekPendingSheetsExport();
  const returnHash = pending?.returnHash ?? '';
  const url = new URL(window.location.origin);

  url.searchParams.set('google_oauth', success ? 'success' : 'error');
  if (!success && errorMessage) {
    url.searchParams.set('google_oauth_message', errorMessage);
  }

  if (success) {
    sessionStorage.setItem(OAUTH_JUST_COMPLETED_KEY, '1');
  }

  window.location.replace(`${url.toString()}${returnHash}`);
}

export function consumeOAuthJustCompleted(): boolean {
  const value = sessionStorage.getItem(OAUTH_JUST_COMPLETED_KEY) === '1';
  if (value) {
    sessionStorage.removeItem(OAUTH_JUST_COMPLETED_KEY);
  }
  return value;
}

/**
 * Disconnect stored Google credentials so a different account can be used.
 */
export async function disconnectGoogleOAuth(): Promise<void> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-oauth`, {
    method: 'POST',
    headers: getFunctionHeaders(accessToken),
    body: JSON.stringify({ action: 'disconnect' }),
  });

  const data = (await response.json()) as EdgeErrorResponse;

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to disconnect Google account.');
  }
}

/**
 * Create a Google Sheet via the edge function and return its URL.
 */
export async function exportSectionToGoogleSheets(
  sectionName: string,
  rows: Record<string, unknown>[]
): Promise<{ url: string; title: string }> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-sheets-export`, {
    method: 'POST',
    headers: getFunctionHeaders(accessToken),
    body: JSON.stringify({ sectionName, rows }),
  });

  const data = (await response.json()) as { url?: string; title?: string; error?: string };

  if (!response.ok || !data.url) {
    throw new Error(data.error ?? 'Failed to export to Google Sheets.');
  }

  return { url: data.url, title: data.title ?? sectionName };
}

export function storePendingSheetsExport(exportData: Omit<PendingSheetsExport, 'returnHash'>): void {
  const payload: PendingSheetsExport = {
    ...exportData,
    returnHash: window.location.hash,
  };
  sessionStorage.setItem(PENDING_EXPORT_KEY, JSON.stringify(payload));
}

export function peekPendingSheetsExport(): PendingSheetsExport | null {
  const raw = sessionStorage.getItem(PENDING_EXPORT_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingSheetsExport;
  } catch {
    return null;
  }
}

export function consumePendingSheetsExport(): PendingSheetsExport | null {
  const raw = sessionStorage.getItem(PENDING_EXPORT_KEY);
  if (!raw) {
    return null;
  }

  sessionStorage.removeItem(PENDING_EXPORT_KEY);

  try {
    return JSON.parse(raw) as PendingSheetsExport;
  } catch {
    return null;
  }
}

export function clearOAuthReturnParams(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('google_oauth')) {
    return;
  }

  url.searchParams.delete('google_oauth');
  url.searchParams.delete('google_oauth_message');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function readOAuthReturnError(): string | null {
  const url = new URL(window.location.href);
  if (url.searchParams.get('google_oauth') !== 'error') {
    return null;
  }

  return url.searchParams.get('google_oauth_message');
}

export function wasOAuthReturnSuccess(): boolean {
  const url = new URL(window.location.href);
  return url.searchParams.get('google_oauth') === 'success';
}
