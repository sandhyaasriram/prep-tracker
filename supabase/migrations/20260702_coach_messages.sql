-- Persistent AI Coach chat messages (one thread per user per IST day)

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  role text not null check (role in ('assistant', 'user')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_messages_user_date_idx
  on public.coach_messages (user_id, date, created_at);

alter table public.coach_messages enable row level security;

create policy "coach_messages_select_own" on public.coach_messages
  for select using (auth.uid() = user_id);

create policy "coach_messages_insert_own" on public.coach_messages
  for insert with check (auth.uid() = user_id);

create policy "coach_messages_delete_own" on public.coach_messages
  for delete using (auth.uid() = user_id);
