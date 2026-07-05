-- GameTribe schema reset (DESTRUCTIVE)
-- Use this only if you are okay deleting old tournament data.
-- After running this file, run supabase/gametribe_tournaments.sql.

begin;

drop table if exists public.group_assignments cascade;
drop table if exists public.team_requests cascade;
drop table if exists public.team_users cascade;
drop table if exists public.scores cascade;
drop table if exists public.matches cascade;
drop table if exists public.teams cascade;
drop table if exists public.tournaments cascade;
drop table if exists public.users cascade;

drop function if exists public.set_updated_at cascade;

commit;
