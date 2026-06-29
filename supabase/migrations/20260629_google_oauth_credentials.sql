-- Google OAuth tokens (service-role only — no RLS policies for authenticated users)

create table if not exists public.google_oauth_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  access_token text not null default '',
  expires_at timestamptz,
  google_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_oauth_credentials enable row level security;

drop trigger if exists set_google_oauth_credentials_updated_at on public.google_oauth_credentials;

create trigger set_google_oauth_credentials_updated_at
before update on public.google_oauth_credentials
for each row execute function public.set_updated_at();
