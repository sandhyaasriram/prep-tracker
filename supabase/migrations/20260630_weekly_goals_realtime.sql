-- Enable realtime for weekly_goals so progress bars update instantly.
do $$
begin
  alter publication supabase_realtime add table public.weekly_goals;
exception
  when duplicate_object then null;
end $$;
