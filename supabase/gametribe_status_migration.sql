-- GameTribe status migration (non-destructive)
-- Run this if your tournaments table was created before status support.

alter table public.tournaments
  add column if not exists status text not null default 'upcoming';

alter table public.tournaments
  drop constraint if exists tournaments_status_check;

alter table public.tournaments
  add constraint tournaments_status_check
  check (status in ('upcoming', 'ongoing', 'completed', 'archived'));

-- Optional one-time backfill based on archived flag.
update public.tournaments
set status = case when archived then 'archived' else 'upcoming' end
where status is null or status not in ('upcoming', 'ongoing', 'completed', 'archived');
