-- GameTribe Supabase schema.
-- Run this once in Supabase SQL Editor.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.users (
  id bigint generated always as identity primary key,
  display_name text not null,
  normalized_name text not null unique,
  email text,
  role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tournaments (
  id bigint primary key,
  name text not null,
  organizer_id bigint references public.users(id),
  location text,
  start_date date,
  end_date date,
  status text not null default 'upcoming' check (status in ('upcoming', 'ongoing', 'completed', 'archived')),
  format text not null default 'league',
  num_groups integer not null default 2,
  group_format text not null default 'league',
  courts integer not null default 2,
  archived boolean not null default false,
  winner_photo text,
  runner_up_photo text,
  selected_match_id bigint,
  parent_format text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  tournament_id bigint not null references public.tournaments(id) on delete cascade,
  team_id bigint not null,
  team_name text not null,
  created_by bigint references public.users(id),
  players jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (tournament_id, team_id)
);

create table if not exists public.matches (
  tournament_id bigint not null references public.tournaments(id) on delete cascade,
  match_id bigint not null,
  team1_id bigint,
  team2_id bigint,
  winner_team_id bigint,
  serving_team_id bigint,
  scheduled_at timestamptz,
  status text not null default 'scheduled',
  round integer not null default 1,
  court integer not null default 1,
  phase text,
  group_no integer,
  team1_from bigint,
  team2_from bigint,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (tournament_id, match_id)
);

create table if not exists public.scores (
  tournament_id bigint not null references public.tournaments(id) on delete cascade,
  match_id bigint not null,
  team_id bigint not null,
  points integer not null default 0,
  constraint fk_scores_match foreign key (tournament_id, match_id)
    references public.matches (tournament_id, match_id) on delete cascade,
  constraint fk_scores_team foreign key (tournament_id, team_id)
    references public.teams (tournament_id, team_id) on delete cascade,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (tournament_id, match_id, team_id)
);

create table if not exists public.team_users (
  tournament_id bigint not null references public.tournaments(id) on delete cascade,
  team_id bigint not null,
  user_id bigint not null references public.users(id) on delete cascade,
  slot_no integer not null,
  constraint fk_team_users_team foreign key (tournament_id, team_id)
    references public.teams (tournament_id, team_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (tournament_id, team_id, user_id)
);

create table if not exists public.team_requests (
  tournament_id bigint not null references public.tournaments(id) on delete cascade,
  request_id bigint not null,
  player1 text not null,
  player2 text not null,
  team_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (tournament_id, request_id)
);

create table if not exists public.group_assignments (
  tournament_id bigint not null references public.tournaments(id) on delete cascade,
  team_id bigint not null,
  group_no integer not null,
  constraint fk_group_assignments_team foreign key (tournament_id, team_id)
    references public.teams (tournament_id, team_id) on delete cascade,
  primary key (tournament_id, team_id)
);

create index if not exists idx_matches_tournament on public.matches(tournament_id);
create index if not exists idx_teams_tournament on public.teams(tournament_id);
create index if not exists idx_scores_match on public.scores(tournament_id, match_id);
create index if not exists idx_team_requests_tournament on public.team_requests(tournament_id);
create index if not exists idx_group_assignments_tournament on public.group_assignments(tournament_id);
create index if not exists idx_team_users_tournament on public.team_users(tournament_id, team_id);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_tournaments_updated_at on public.tournaments;
create trigger trg_tournaments_updated_at
before update on public.tournaments
for each row execute function public.set_updated_at();

drop trigger if exists trg_teams_updated_at on public.teams;
create trigger trg_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

drop trigger if exists trg_matches_updated_at on public.matches;
create trigger trg_matches_updated_at
before update on public.matches
for each row execute function public.set_updated_at();

drop trigger if exists trg_scores_updated_at on public.scores;
create trigger trg_scores_updated_at
before update on public.scores
for each row execute function public.set_updated_at();

drop trigger if exists trg_team_requests_updated_at on public.team_requests;
create trigger trg_team_requests_updated_at
before update on public.team_requests
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.tournaments enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.scores enable row level security;
alter table public.team_users enable row level security;
alter table public.team_requests enable row level security;
alter table public.group_assignments enable row level security;

-- Public read/write policies for anon/publishable key clients.
-- Keep these only if this app is intentionally public.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'anon_all_users'
  ) then
    create policy anon_all_users
      on public.users
      for all
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tournaments'
      and policyname = 'anon_select_tournaments'
  ) then
    create policy anon_select_tournaments
      on public.tournaments
      for select
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tournaments'
      and policyname = 'anon_insert_tournaments'
  ) then
    create policy anon_insert_tournaments
      on public.tournaments
      for insert
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tournaments'
      and policyname = 'anon_update_tournaments'
  ) then
    create policy anon_update_tournaments
      on public.tournaments
      for update
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tournaments'
      and policyname = 'anon_delete_tournaments'
  ) then
    create policy anon_delete_tournaments
      on public.tournaments
      for delete
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'teams'
      and policyname = 'anon_all_teams'
  ) then
    create policy anon_all_teams
      on public.teams
      for all
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'matches'
      and policyname = 'anon_all_matches'
  ) then
    create policy anon_all_matches
      on public.matches
      for all
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'scores'
      and policyname = 'anon_all_scores'
  ) then
    create policy anon_all_scores
      on public.scores
      for all
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'team_users'
      and policyname = 'anon_all_team_users'
  ) then
    create policy anon_all_team_users
      on public.team_users
      for all
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'team_requests'
      and policyname = 'anon_all_team_requests'
  ) then
    create policy anon_all_team_requests
      on public.team_requests
      for all
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'group_assignments'
      and policyname = 'anon_all_group_assignments'
  ) then
    create policy anon_all_group_assignments
      on public.group_assignments
      for all
      using (true)
      with check (true);
  end if;
end
$$;

-- Optional: force PostgREST schema cache refresh if needed.
-- select pg_notify('pgrst', 'reload schema');
