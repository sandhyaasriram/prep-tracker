/**
 * Google OAuth 2.0 — authorization URL, code exchange, status, disconnect.
 * Reads GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI from Supabase secrets.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

interface OAuthStatePayload {
  userId: string;
  ts: number;
  nonce: string;
}

interface GoogleEnvConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function getGoogleEnv(): GoogleEnvConfig {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI');

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.');
  }

  return { clientId, clientSecret, redirectUri };
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createState(userId: string, secret: string): Promise<string> {
  const payload: OAuthStatePayload = {
    userId,
    ts: Date.now(),
    nonce: crypto.randomUUID(),
  };
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const signature = await hmacSign(body, secret);
  return `${body}.${signature}`;
}

async function verifyState(state: string, secret: string): Promise<OAuthStatePayload | null> {
  const [body, signature] = state.split('.');
  if (!body || !signature) {
    return null;
  }

  const expected = await hmacSign(body, secret);
  if (expected !== signature) {
    return null;
  }

  try {
    const padded = body.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(padded)) as OAuthStatePayload;
    if (Date.now() - payload.ts > 15 * 60 * 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

async function exchangeCodeForTokens(
  code: string,
  config: GoogleEnvConfig
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google token exchange failed: ${errorText}`);
  }

  return response.json();
}

async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return '';
  }

  const data = await response.json();
  return typeof data.email === 'string' ? data.email : '';
}

async function saveCredentials(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  tokens: { access_token: string; refresh_token?: string; expires_in: number },
  existingRefreshToken?: string
): Promise<string> {
  const refreshToken = tokens.refresh_token ?? existingRefreshToken;
  if (!refreshToken) {
    throw new Error('Google did not return a refresh token. Revoke app access and try again.');
  }

  const googleEmail = await fetchGoogleEmail(tokens.access_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error } = await adminClient.from('google_oauth_credentials').upsert(
    {
      user_id: userId,
      refresh_token: refreshToken,
      access_token: tokens.access_token,
      expires_at: expiresAt,
      google_email: googleEmail,
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw error;
  }

  return googleEmail;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing Supabase environment variables.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const googleEnv = getGoogleEnv();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (body.action === 'get_auth_url') {
      const state = await createState(userData.user.id, googleEnv.clientSecret);
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', googleEnv.clientId);
      authUrl.searchParams.set('redirect_uri', googleEnv.redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'exchange_code') {
      const code = typeof body.code === 'string' ? body.code : '';
      const state = typeof body.state === 'string' ? body.state : '';

      if (!code || !state) {
        return new Response(JSON.stringify({ error: 'code and state are required.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const payload = await verifyState(state, googleEnv.clientSecret);
      if (!payload) {
        return new Response(JSON.stringify({ error: 'Invalid or expired OAuth state.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (payload.userId !== userData.user.id) {
        return new Response(JSON.stringify({ error: 'OAuth state does not match the signed-in user.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokens = await exchangeCodeForTokens(code, googleEnv);

      const { data: existing } = await adminClient
        .from('google_oauth_credentials')
        .select('refresh_token')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      const googleEmail = await saveCredentials(
        adminClient,
        userData.user.id,
        tokens,
        existing?.refresh_token
      );

      return new Response(JSON.stringify({ ok: true, googleEmail }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'status') {
      const { data, error } = await adminClient
        .from('google_oauth_credentials')
        .select('google_email')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          connected: Boolean(data),
          googleEmail: data?.google_email ?? null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (body.action === 'disconnect') {
      const { error } = await adminClient.from('google_oauth_credentials').delete().eq('user_id', userData.user.id);

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unsupported action.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
