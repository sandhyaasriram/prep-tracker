-- Realign weekly_goals to IST calendar weeks (Sun–Sat) anchored at Pre-College start.
-- Week N: anchor + (N-1)*7 days through anchor + (N-1)*7 + 6 days.

update public.weekly_goals
set
  start_date = '2026-06-28'::date + ((week_number - 1) * 7),
  end_date = '2026-06-28'::date + ((week_number - 1) * 7) + 6;
