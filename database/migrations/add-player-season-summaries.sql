create table if not exists public.player_season_summaries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  updated_by uuid references public.profiles(id) on delete set null,
  season_summary text,
  strengths text,
  development_areas text,
  next_season_goals text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, player_id, season_id)
);

create index if not exists player_season_summaries_team_idx
  on public.player_season_summaries(team_id);

create index if not exists player_season_summaries_player_idx
  on public.player_season_summaries(player_id, season_id);

alter table public.player_season_summaries enable row level security;

drop policy if exists "Team staff can read player season summaries"
  on public.player_season_summaries;

create policy "Team staff can read player season summaries"
on public.player_season_summaries
for select
to authenticated
using (public.is_team_staff(team_id));

drop policy if exists "Team staff can manage player season summaries"
  on public.player_season_summaries;

create policy "Team staff can manage player season summaries"
on public.player_season_summaries
for all
to authenticated
using (public.is_team_staff(team_id))
with check (public.is_team_staff(team_id));
