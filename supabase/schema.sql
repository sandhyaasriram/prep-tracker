create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.dsa_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  order_index integer not null,
  target_problem_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.dsa_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references public.dsa_topics (id) on delete cascade,
  name text not null,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  leetcode_url text,
  solved boolean not null default false,
  solved_date date,
  flagged_for_revision boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id, name)
);

create table if not exists public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_number integer not null,
  start_date date not null,
  end_date date not null,
  category text not null,
  goal_text text not null,
  completed boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_number, category, goal_text)
);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_number integer not null,
  biggest_win text not null default '',
  bottleneck text not null default '',
  lessons text not null default '',
  focus_next text not null default '',
  hours_worked numeric(5,2) not null default 0,
  mood_rating integer check (mood_rating between 1 and 5),
  free_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_number)
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  role text not null,
  source text not null,
  stage text not null,
  date_applied date,
  next_deadline date,
  oa_score numeric(5,2),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, company, role)
);

create table if not exists public.interview_rounds (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  round_number integer not null,
  type text not null,
  date date,
  outcome text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (application_id, round_number)
);

create table if not exists public.mock_interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  type text not null,
  platform text not null,
  topics text[] not null default '{}'::text[],
  rating integer check (rating between 1 and 5),
  went_well text not null default '',
  improve text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oa_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  company text not null,
  platform text not null,
  total_questions integer not null default 0,
  solved integer not null default 0,
  score numeric(5,2),
  topics text[] not null default '{}'::text[],
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cs_fundamentals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic text not null,
  subtopic text not null,
  status text not null check (status in ('Not Started', 'Reading', 'Revised', 'Strong')),
  last_revised date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, topic, subtopic)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  tech_stack text[] not null default '{}'::text[],
  status text not null check (status in ('Planning', 'In Progress', 'Complete', 'Deployed', 'Archived')),
  github_url text not null default '',
  demo_url text not null default '',
  type text not null check (type in ('existing', 'suggested')),
  placement_relevance text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.project_checklist (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  item text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, item)
);

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  provider text not null,
  status text not null check (status in ('In Progress', 'Completed')),
  target_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  cert_url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  content_markdown text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.timeline_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  label text not null,
  category text not null check (category in ('DSA', 'Cert', 'Application', 'Personal')),
  color text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date, label)
);

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_companies text[] not null default '{}'::text[],
  graduation_year integer not null,
  college text not null default '',
  gemini_api_key_encrypted text not null default '',
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  sidebar_collapsed boolean not null default false,
  last_opened_page text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists dsa_topics_user_id_idx on public.dsa_topics (user_id, order_index);
create index if not exists dsa_problems_topic_id_idx on public.dsa_problems (topic_id, solved, flagged_for_revision);
create index if not exists weekly_goals_user_week_idx on public.weekly_goals (user_id, week_number);
create index if not exists weekly_reviews_user_week_idx on public.weekly_reviews (user_id, week_number);
create index if not exists applications_user_stage_idx on public.applications (user_id, stage);
create index if not exists applications_user_deadline_idx on public.applications (user_id, next_deadline);
create index if not exists interview_rounds_application_idx on public.interview_rounds (application_id, round_number);
create index if not exists mock_interviews_user_date_idx on public.mock_interviews (user_id, date);
create index if not exists oa_log_user_date_idx on public.oa_log (user_id, date);
create index if not exists cs_fundamentals_user_topic_idx on public.cs_fundamentals (user_id, topic);
create index if not exists projects_user_type_idx on public.projects (user_id, type);
create index if not exists project_checklist_project_idx on public.project_checklist (project_id);
create index if not exists certifications_user_status_idx on public.certifications (user_id, status);
create index if not exists journal_entries_user_date_idx on public.journal_entries (user_id, date desc);
create index if not exists timeline_milestones_user_date_idx on public.timeline_milestones (user_id, date);
create index if not exists user_settings_user_idx on public.user_settings (user_id);

create trigger set_dsa_topics_updated_at
before update on public.dsa_topics
for each row execute function public.set_updated_at();

create trigger set_dsa_problems_updated_at
before update on public.dsa_problems
for each row execute function public.set_updated_at();

create trigger set_weekly_goals_updated_at
before update on public.weekly_goals
for each row execute function public.set_updated_at();

create trigger set_weekly_reviews_updated_at
before update on public.weekly_reviews
for each row execute function public.set_updated_at();

create trigger set_applications_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create trigger set_interview_rounds_updated_at
before update on public.interview_rounds
for each row execute function public.set_updated_at();

create trigger set_mock_interviews_updated_at
before update on public.mock_interviews
for each row execute function public.set_updated_at();

create trigger set_oa_log_updated_at
before update on public.oa_log
for each row execute function public.set_updated_at();

create trigger set_cs_fundamentals_updated_at
before update on public.cs_fundamentals
for each row execute function public.set_updated_at();

create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_project_checklist_updated_at
before update on public.project_checklist
for each row execute function public.set_updated_at();

create trigger set_certifications_updated_at
before update on public.certifications
for each row execute function public.set_updated_at();

create trigger set_journal_entries_updated_at
before update on public.journal_entries
for each row execute function public.set_updated_at();

create trigger set_timeline_milestones_updated_at
before update on public.timeline_milestones
for each row execute function public.set_updated_at();

create trigger set_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

alter table public.dsa_topics enable row level security;
alter table public.dsa_problems enable row level security;
alter table public.weekly_goals enable row level security;
alter table public.weekly_reviews enable row level security;
alter table public.applications enable row level security;
alter table public.interview_rounds enable row level security;
alter table public.mock_interviews enable row level security;
alter table public.oa_log enable row level security;
alter table public.cs_fundamentals enable row level security;
alter table public.projects enable row level security;
alter table public.project_checklist enable row level security;
alter table public.certifications enable row level security;
alter table public.journal_entries enable row level security;
alter table public.timeline_milestones enable row level security;
alter table public.user_settings enable row level security;

create policy "dsa_topics_select_own" on public.dsa_topics for select using (auth.uid() = user_id);
create policy "dsa_topics_insert_own" on public.dsa_topics for insert with check (auth.uid() = user_id);
create policy "dsa_topics_update_own" on public.dsa_topics for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dsa_topics_delete_own" on public.dsa_topics for delete using (auth.uid() = user_id);

create policy "dsa_problems_select_own" on public.dsa_problems for select using (auth.uid() = user_id);
create policy "dsa_problems_insert_own" on public.dsa_problems for insert with check (auth.uid() = user_id);
create policy "dsa_problems_update_own" on public.dsa_problems for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "dsa_problems_delete_own" on public.dsa_problems for delete using (auth.uid() = user_id);

create policy "weekly_goals_select_own" on public.weekly_goals for select using (auth.uid() = user_id);
create policy "weekly_goals_insert_own" on public.weekly_goals for insert with check (auth.uid() = user_id);
create policy "weekly_goals_update_own" on public.weekly_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weekly_goals_delete_own" on public.weekly_goals for delete using (auth.uid() = user_id);

create policy "weekly_reviews_select_own" on public.weekly_reviews for select using (auth.uid() = user_id);
create policy "weekly_reviews_insert_own" on public.weekly_reviews for insert with check (auth.uid() = user_id);
create policy "weekly_reviews_update_own" on public.weekly_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weekly_reviews_delete_own" on public.weekly_reviews for delete using (auth.uid() = user_id);

create policy "applications_select_own" on public.applications for select using (auth.uid() = user_id);
create policy "applications_insert_own" on public.applications for insert with check (auth.uid() = user_id);
create policy "applications_update_own" on public.applications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "applications_delete_own" on public.applications for delete using (auth.uid() = user_id);

create policy "interview_rounds_select_own" on public.interview_rounds for select using (
  exists (
    select 1
    from public.applications applications
    where applications.id = interview_rounds.application_id
      and applications.user_id = auth.uid()
  )
);
create policy "interview_rounds_insert_own" on public.interview_rounds for insert with check (
  exists (
    select 1
    from public.applications applications
    where applications.id = interview_rounds.application_id
      and applications.user_id = auth.uid()
  )
);
create policy "interview_rounds_update_own" on public.interview_rounds for update using (
  exists (
    select 1
    from public.applications applications
    where applications.id = interview_rounds.application_id
      and applications.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.applications applications
    where applications.id = interview_rounds.application_id
      and applications.user_id = auth.uid()
  )
);
create policy "interview_rounds_delete_own" on public.interview_rounds for delete using (
  exists (
    select 1
    from public.applications applications
    where applications.id = interview_rounds.application_id
      and applications.user_id = auth.uid()
  )
);

create policy "mock_interviews_select_own" on public.mock_interviews for select using (auth.uid() = user_id);
create policy "mock_interviews_insert_own" on public.mock_interviews for insert with check (auth.uid() = user_id);
create policy "mock_interviews_update_own" on public.mock_interviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "mock_interviews_delete_own" on public.mock_interviews for delete using (auth.uid() = user_id);

create policy "oa_log_select_own" on public.oa_log for select using (auth.uid() = user_id);
create policy "oa_log_insert_own" on public.oa_log for insert with check (auth.uid() = user_id);
create policy "oa_log_update_own" on public.oa_log for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "oa_log_delete_own" on public.oa_log for delete using (auth.uid() = user_id);

create policy "cs_fundamentals_select_own" on public.cs_fundamentals for select using (auth.uid() = user_id);
create policy "cs_fundamentals_insert_own" on public.cs_fundamentals for insert with check (auth.uid() = user_id);
create policy "cs_fundamentals_update_own" on public.cs_fundamentals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "cs_fundamentals_delete_own" on public.cs_fundamentals for delete using (auth.uid() = user_id);

create policy "projects_select_own" on public.projects for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects for delete using (auth.uid() = user_id);

create policy "project_checklist_select_own" on public.project_checklist for select using (
  exists (
    select 1
    from public.projects projects
    where projects.id = project_checklist.project_id
      and projects.user_id = auth.uid()
  )
);
create policy "project_checklist_insert_own" on public.project_checklist for insert with check (
  exists (
    select 1
    from public.projects projects
    where projects.id = project_checklist.project_id
      and projects.user_id = auth.uid()
  )
);
create policy "project_checklist_update_own" on public.project_checklist for update using (
  exists (
    select 1
    from public.projects projects
    where projects.id = project_checklist.project_id
      and projects.user_id = auth.uid()
  )
) with check (
  exists (
    select 1
    from public.projects projects
    where projects.id = project_checklist.project_id
      and projects.user_id = auth.uid()
  )
);
create policy "project_checklist_delete_own" on public.project_checklist for delete using (
  exists (
    select 1
    from public.projects projects
    where projects.id = project_checklist.project_id
      and projects.user_id = auth.uid()
  )
);

create policy "certifications_select_own" on public.certifications for select using (auth.uid() = user_id);
create policy "certifications_insert_own" on public.certifications for insert with check (auth.uid() = user_id);
create policy "certifications_update_own" on public.certifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "certifications_delete_own" on public.certifications for delete using (auth.uid() = user_id);

create policy "journal_entries_select_own" on public.journal_entries for select using (auth.uid() = user_id);
create policy "journal_entries_insert_own" on public.journal_entries for insert with check (auth.uid() = user_id);
create policy "journal_entries_update_own" on public.journal_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "journal_entries_delete_own" on public.journal_entries for delete using (auth.uid() = user_id);

create policy "timeline_milestones_select_own" on public.timeline_milestones for select using (auth.uid() = user_id);
create policy "timeline_milestones_insert_own" on public.timeline_milestones for insert with check (auth.uid() = user_id);
create policy "timeline_milestones_update_own" on public.timeline_milestones for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "timeline_milestones_delete_own" on public.timeline_milestones for delete using (auth.uid() = user_id);

create policy "user_settings_select_own" on public.user_settings for select using (auth.uid() = user_id);
create policy "user_settings_insert_own" on public.user_settings for insert with check (auth.uid() = user_id);
create policy "user_settings_update_own" on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_settings_delete_own" on public.user_settings for delete using (auth.uid() = user_id);

-- Google OAuth credentials (no authenticated policies — service role only)

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

create trigger set_google_oauth_credentials_updated_at
before update on public.google_oauth_credentials
for each row execute function public.set_updated_at();
