create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists public.course_holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  hole_number integer not null check (hole_number between 1 and 18),
  par integer not null check (par between 3 and 6),
  handicap integer check (handicap between 1 and 18),
  yardage integer check (yardage is null or yardage > 0),
  created_at timestamptz not null default now(),
  unique (course_id, hole_number)
);

create table if not exists public.round_holes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  round_id uuid not null references public.rounds(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  course_id uuid references public.courses(id) on delete set null,
  hole_number integer not null check (hole_number between 1 and 18),
  par integer not null check (par between 3 and 6),
  handicap integer check (handicap between 1 and 18),
  score integer not null check (score > 0),
  putts integer check (putts is null or putts >= 0),
  fir boolean,
  gir boolean,
  penalty integer check (penalty is null or penalty >= 0),
  created_at timestamptz not null default now(),
  unique (round_id, hole_number)
);

create index if not exists courses_team_id_idx on public.courses(team_id);
create index if not exists course_holes_course_id_idx on public.course_holes(course_id);
create index if not exists round_holes_team_id_idx on public.round_holes(team_id);
create index if not exists round_holes_round_id_idx on public.round_holes(round_id);
create index if not exists round_holes_player_id_idx on public.round_holes(player_id);
create index if not exists round_holes_course_id_idx on public.round_holes(course_id);

alter table public.courses enable row level security;
alter table public.course_holes enable row level security;
alter table public.round_holes enable row level security;

drop policy if exists "Team members can read courses" on public.courses;
create policy "Team members can read courses"
on public.courses
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "Team staff can manage courses" on public.courses;
create policy "Team staff can manage courses"
on public.courses
for all
to authenticated
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));

drop policy if exists "Team members can read course holes" on public.course_holes;
create policy "Team members can read course holes"
on public.course_holes
for select
to authenticated
using (
  exists (
    select 1
    from public.courses
    where courses.id = course_holes.course_id
      and public.is_team_member(courses.team_id)
  )
);

drop policy if exists "Team staff can manage course holes" on public.course_holes;
create policy "Team staff can manage course holes"
on public.course_holes
for all
to authenticated
using (
  exists (
    select 1
    from public.courses
    where courses.id = course_holes.course_id
      and public.is_team_staff(courses.team_id)
  )
)
with check (
  exists (
    select 1
    from public.courses
    where courses.id = course_holes.course_id
      and public.is_team_staff(courses.team_id)
  )
);

drop policy if exists "Team members can read round holes" on public.round_holes;
create policy "Team members can read round holes"
on public.round_holes
for select
to authenticated
using (public.is_team_member(team_id));

drop policy if exists "Team staff can manage round holes" on public.round_holes;
create policy "Team staff can manage round holes"
on public.round_holes
for all
to authenticated
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));

drop policy if exists "Players can submit their own round holes" on public.round_holes;
create policy "Players can submit their own round holes"
on public.round_holes
for insert
to authenticated
with check (
  public.is_team_member(team_id)
  and exists (
    select 1
    from public.players
    where players.id = round_holes.player_id
      and players.team_id = round_holes.team_id
      and players.profile_id = auth.uid()
  )
  and exists (
    select 1
    from public.rounds
    where rounds.id = round_holes.round_id
      and rounds.team_id = round_holes.team_id
      and rounds.player_id = round_holes.player_id
  )
);
