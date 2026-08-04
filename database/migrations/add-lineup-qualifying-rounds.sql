alter table public.rounds
add column if not exists counts_toward_lineup boolean not null default true;

comment on column public.rounds.counts_toward_lineup is
  'Coach-controlled flag indicating whether this round counts toward last-five lineup analytics.';

create index if not exists rounds_lineup_qualifying_idx
  on public.rounds(team_id, player_id, played_on desc)
  where counts_toward_lineup = true;
