/**
 * Google Sheets export — creates a spreadsheet populated with section data.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRow {
  [key: string]: unknown;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh Google token: ${errorText}`);
  }

  return response.json();
}

async function getValidAccessToken(
  adminClient: ReturnType<typeof createClient>,
  userId: string
): Promise<string> {
  const { data, error } = await adminClient
    .from('google_oauth_credentials')
    .select('refresh_token, access_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.refresh_token) {
    throw new Error('Google account not connected. Authorize Google Sheets access first.');
  }

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  const stillValid = data.access_token && expiresAt > Date.now() + 60_000;

  if (stillValid) {
    return data.access_token;
  }

  const refreshed = await refreshAccessToken(data.refresh_token);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  const { error: updateError } = await adminClient
    .from('google_oauth_credentials')
    .update({
      access_token: refreshed.access_token,
      expires_at: newExpiresAt,
    })
    .eq('user_id', userId);

  if (updateError) {
    throw updateError;
  }

  return refreshed.access_token;
}

function buildSheetTitle(sectionName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safeSection = sectionName.replace(/[^\w-]/g, '');
  return `PlacementOS_${safeSection}_${date}`;
}

function rowsToValues(rows: ExportRow[]): string[][] {
  if (rows.length === 0) {
    return [['No data']];
  }

  const headers = Object.keys(rows[0] ?? {});
  const values = [headers];

  for (const row of rows) {
    values.push(headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    }));
  }

  return values;
}

async function createSpreadsheet(accessToken: string, title: string, values: string[][]): Promise<string> {
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: 'Export' } }],
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create spreadsheet: ${errorText}`);
  }

  const created = await createResponse.json();
  const spreadsheetId = created.spreadsheetId as string;

  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Export!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: 'Export!A1',
        majorDimension: 'ROWS',
        values,
      }),
    }
  );

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    throw new Error(`Failed to populate spreadsheet: ${errorText}`);
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error('Missing Supabase environment variables.');
    }

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
    const sectionName = typeof body.sectionName === 'string' ? body.sectionName.trim() : '';
    const rows = Array.isArray(body.rows) ? (body.rows as ExportRow[]) : [];

    if (!sectionName) {
      return new Response(JSON.stringify({ error: 'sectionName is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const accessToken = await getValidAccessToken(adminClient, userData.user.id);
    const title = buildSheetTitle(sectionName);
    const values = rowsToValues(rows);
    const url = await createSpreadsheet(accessToken, title, values);

    return new Response(JSON.stringify({ url, title }), {
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
