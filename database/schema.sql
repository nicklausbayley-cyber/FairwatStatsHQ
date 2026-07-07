create extension if not exists "pgcrypto";

do $$
begin
  create type public.user_role as enum ('admin', 'coach', 'player');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_type as enum (
    'practice',
    'match',
    'invitational',
    'qualifier',
    'tournament'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  role public.user_role not null default 'player',
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique (team_id, email)
);

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  starts_on date,
  ends_on date,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  graduation_year integer,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete set null,
  name text not null,
  event_type public.event_type not null,
  event_date date not null,
  course_name text,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  player_id uuid not null references public.players(id) on delete cascade,
  submitted_by uuid references public.profiles(id) on delete set null,
  played_on date not null,
  holes integer not null check (holes in (9, 18)),
  score integer not null check (score > 0),
  par integer,
  fairways_hit integer check (fairways_hit >= 0),
  fairways_possible integer check (fairways_possible >= 0),
  greens_in_regulation integer check (greens_in_regulation >= 0),
  gir_possible integer check (gir_possible >= 0),
  putts integer check (putts >= 0),
  penalties integer check (penalties >= 0),
  three_putts integer check (three_putts >= 0),
  notes text,
  created_at timestamptz not null default now(),
  check (
    fairways_hit is null
    or fairways_possible is null
    or fairways_hit <= fairways_possible
  ),
  check (
    greens_in_regulation is null
    or gir_possible is null
    or greens_in_regulation <= gir_possible
  )
);

create table if not exists public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_team_id_idx on public.profiles(team_id);
create index if not exists seasons_team_id_idx on public.seasons(team_id);
create index if not exists players_team_id_idx on public.players(team_id);
create index if not exists events_team_id_idx on public.events(team_id);
create index if not exists rounds_team_id_idx on public.rounds(team_id);
create index if not exists coach_notes_team_id_idx on public.coach_notes(team_id);

create or replace function public.current_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.is_team_member(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_team_id = public.current_team_id()
$$;

create or replace function public.is_team_staff(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_team_id = public.current_team_id()
    and public.current_user_role() in ('admin', 'coach')
$$;

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.seasons enable row level security;
alter table public.players enable row level security;
alter table public.events enable row level security;
alter table public.rounds enable row level security;
alter table public.coach_notes enable row level security;

drop policy if exists "Team members can read their team" on public.teams;
create policy "Team members can read their team"
on public.teams
for select
to authenticated
using (id = public.current_team_id());

drop policy if exists "Team staff can update their team" on public.teams;
create policy "Team staff can update their team"
on public.teams
for update
to authenticated
using (public.is_team_staff(id))
with check (public.is_team_staff(id));

drop policy if exists "Team members can read profiles" on public.profiles;
create policy "Team members can read profiles"
on public.profiles
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "Team staff can manage profiles" on public.profiles;
create policy "Team staff can manage profiles"
on public.profiles
for all
to authenticated
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));

drop policy if exists "Team members can read seasons" on public.seasons;
create policy "Team members can read seasons"
on public.seasons
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "Team staff can manage seasons" on public.seasons;
create policy "Team staff can manage seasons"
on public.seasons
for all
to authenticated
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));

drop policy if exists "Team members can read players" on public.players;
create policy "Team members can read players"
on public.players
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "Team staff can manage players" on public.players;
create policy "Team staff can manage players"
on public.players
for all
to authenticated
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));

drop policy if exists "Team members can read events" on public.events;
create policy "Team members can read events"
on public.events
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "Team staff can manage events" on public.events;
create policy "Team staff can manage events"
on public.events
for all
to authenticated
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));

drop policy if exists "Team members can read rounds" on public.rounds;
create policy "Team members can read rounds"
on public.rounds
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "Team staff can manage rounds" on public.rounds;
create policy "Team staff can manage rounds"
on public.rounds
for all
to authenticated
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));

drop policy if exists "Players can submit their own rounds" on public.rounds;
create policy "Players can submit their own rounds"
on public.rounds
for insert
to authenticated
with check (
  public.is_team_member(team_id)
  and exists (
    select 1
    from public.players
    where players.id = rounds.player_id
      and players.team_id = rounds.team_id
      and players.profile_id = auth.uid()
  )
);

drop policy if exists "Players can update their own rounds" on public.rounds;
create policy "Players can update their own rounds"
on public.rounds
for update
to authenticated
using (
  public.is_team_member(team_id)
  and exists (
    select 1
    from public.players
    where players.id = rounds.player_id
      and players.team_id = rounds.team_id
      and players.profile_id = auth.uid()
  )
)
with check (
  public.is_team_member(team_id)
  and exists (
    select 1
    from public.players
    where players.id = rounds.player_id
      and players.team_id = rounds.team_id
      and players.profile_id = auth.uid()
  )
);

drop policy if exists "Team staff can read coach notes" on public.coach_notes;
create policy "Team staff can read coach notes"
on public.coach_notes
for select
to authenticated
using (public.is_team_staff(team_id));

drop policy if exists "Team staff can manage coach notes" on public.coach_notes;
create policy "Team staff can manage coach notes"
on public.coach_notes
for all
to authenticated
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));
