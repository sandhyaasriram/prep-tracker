alter table public.journal_entries
  add column if not exists title text;

do $$
declare
  constraint_name text;
begin
  select c.conname
    into constraint_name
  from pg_constraint c
  join pg_class t on c.conrelid = t.oid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'journal_entries'
    and c.contype = 'u'
    and pg_get_constraintdef(c.oid) like '%(user_id, date)%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.journal_entries drop constraint %I', constraint_name);
  end if;
end $$;
