create extension if not exists "pgcrypto";

do $$
begin
  create type public.app_role as enum ('admin', 'coach', 'player');
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

do $$
begin
  create type public.event_status as enum (
    'draft',
    'open',
    'lineup_set',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.note_visibility as enum ('coach_only', 'player_visible');
exception
  when duplicate_object then null;
end $$;

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_name text,
  mascot text,
  primary_color text default '#176b35',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  role public.app_role not null default 'player',
  full_name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, email)
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  year integer not null,
  starts_on date,
  ends_on date,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, year, name)
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  graduation_year integer,
  jersey_number text,
  status text not null default 'active',
  handedness text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete set null,
  name text not null,
  event_type public.event_type not null,
  status public.event_status not null default 'draft',
  course_name text,
  location text,
  starts_on date not null,
  ends_on date,
  holes integer not null default 18 check (holes in (9, 18)),
  par integer,
  yardage integer,
  scoring_format text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  player_id uuid not null references public.players(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  played_on date not null,
  holes integer not null default 18 check (holes in (9, 18)),
  score integer not null check (score between 18 and 200),
  par integer,
  fairways_hit integer check (fairways_hit >= 0),
  fairways_possible integer check (fairways_possible >= 0),
  greens_in_regulation integer check (greens_in_regulation >= 0),
  putts integer check (putts >= 0),
  penalty_strokes integer not null default 0 check (penalty_strokes >= 0),
  sand_saves integer check (sand_saves >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    fairways_possible is null
    or fairways_hit is null
    or fairways_hit <= fairways_possible
  ),
  check (
    holes = 18
    or greens_in_regulation is null
    or greens_in_regulation <= 9
  ),
  check (
    holes = 9
    or greens_in_regulation is null
    or greens_in_regulation <= 18
  )
);

create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  visibility public.note_visibility not null default 'coach_only',
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_team_id_idx on public.profiles(team_id);
create index players_team_id_idx on public.players(team_id);
create index players_profile_id_idx on public.players(profile_id);
create index seasons_team_id_idx on public.seasons(team_id);
create index events_team_id_idx on public.events(team_id);
create index events_season_id_idx on public.events(season_id);
create index rounds_team_id_idx on public.rounds(team_id);
create index rounds_player_id_idx on public.rounds(player_id);
create index rounds_event_id_idx on public.rounds(event_id);
create index coach_notes_team_id_idx on public.coach_notes(team_id);
create index coach_notes_player_id_idx on public.coach_notes(player_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_teams_updated_at
before update on public.teams
for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_seasons_updated_at
before update on public.seasons
for each row execute function public.set_updated_at();

create trigger set_players_updated_at
before update on public.players
for each row execute function public.set_updated_at();

create trigger set_events_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger set_rounds_updated_at
before update on public.rounds
for each row execute function public.set_updated_at();

create trigger set_coach_notes_updated_at
before update on public.coach_notes
for each row execute function public.set_updated_at();

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

create or replace function public.current_app_role()
returns public.app_role
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

create or replace function public.is_team_member(check_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select check_team_id = public.current_team_id()
$$;

create or replace function public.is_team_staff(check_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    check_team_id = public.current_team_id()
    and public.current_app_role() in ('admin', 'coach')
$$;

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.seasons enable row level security;
alter table public.events enable row level security;
alter table public.rounds enable row level security;
alter table public.coach_notes enable row level security;

create policy "Team members can read their team"
on public.teams
for select
using (id = public.current_team_id());

create policy "Staff can update their team"
on public.teams
for update
using (public.is_team_staff(id))
with check (public.is_team_staff(id));

create policy "Team members can read profiles"
on public.profiles
for select
using (public.is_team_member(team_id));

create policy "Members can update their own profile"
on public.profiles
for update
using (id = auth.uid() and public.is_team_member(team_id))
with check (id = auth.uid() and public.is_team_member(team_id));

create policy "Staff can insert team profiles"
on public.profiles
for insert
with check (public.is_team_staff(team_id));

create policy "Staff can update team profiles"
on public.profiles
for update
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));

create policy "Team members can read seasons"
on public.seasons
for select
using (public.is_team_member(team_id));

create policy "Staff can insert seasons"
on public.seasons
for insert
with check (public.is_team_staff(team_id));

create policy "Staff can update seasons"
on public.seasons
for update
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));

create policy "Staff can delete seasons"
on public.seasons
for delete
using (public.is_team_staff(team_id));

create policy "Team members can read players"
on public.players
for select
using (public.is_team_member(team_id));

create policy "Staff can insert players"
on public.players
for insert
with check (public.is_team_staff(team_id));

create policy "Staff can update players"
on public.players
for update
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));

create policy "Staff can delete players"
on public.players
for delete
using (public.is_team_staff(team_id));

create policy "Team members can read events"
on public.events
for select
using (public.is_team_member(team_id));

create policy "Staff can insert events"
on public.events
for insert
with check (public.is_team_staff(team_id));

create policy "Staff can update events"
on public.events
for update
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));

create policy "Staff can delete events"
on public.events
for delete
using (public.is_team_staff(team_id));

create policy "Team members can read rounds"
on public.rounds
for select
using (public.is_team_member(team_id));

create policy "Team members can insert rounds"
on public.rounds
for insert
with check (public.is_team_member(team_id));

create policy "Staff can update rounds"
on public.rounds
for update
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));

create policy "Staff can delete rounds"
on public.rounds
for delete
using (public.is_team_staff(team_id));

create policy "Team members can read coach notes"
on public.coach_notes
for select
using (
  public.is_team_staff(team_id)
  or (
    public.is_team_member(team_id)
    and visibility = 'player_visible'
    and exists (
      select 1
      from public.players
      where players.id = coach_notes.player_id
      and players.profile_id = auth.uid()
    )
  )
);

create policy "Staff can insert coach notes"
on public.coach_notes
for insert
with check (public.is_team_staff(team_id));

create policy "Staff can update coach notes"
on public.coach_notes
for update
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));

create policy "Staff can delete coach notes"
on public.coach_notes
for delete
using (public.is_team_staff(team_id));
