begin;

-- Append-only, synthetic validation data for the Riverside coach demo.
-- Run in the Supabase SQL Editor, then refresh the Coach Insights preview.
-- Existing events, players, rounds, and hole scores are preserved.
-- The two fixed event IDs make reruns a no-op. No credentials are created.

do $$
declare
  target_team_id constant uuid := '533b879d-804a-490b-97a4-d13d23fdfa96';
  target_season_id constant uuid := 'f2291080-3660-45d9-aa59-22b8dbe2fa7e';
  nine_event_id constant uuid := 'd0bd9baa-5119-4f27-bef1-1c8b9aa59209';
  eighteen_event_id constant uuid := 'ea583b0a-2f17-40c5-9645-664f181d4935';
  author_id uuid;
  season_start date;
  season_end date;
  format integer;
  validation_event_id uuid;
  validation_name text;
  validation_date date;
  source_round record;
  source_count integer;
  player_number integer;
  par_total integer;
  opportunities integer;
  inserted_round_id uuid;
begin
  if not exists (
    select 1 from public.teams
    where id = target_team_id
      and name = 'Riverside Eagles Golf'
      and school_name = 'Riverside High School'
      and contact_email = 'coach@demo.com'
  ) then
    raise exception 'Expected Riverside demo team was not found. Nothing was changed.';
  end if;

  select id into author_id from public.profiles
  where team_id = target_team_id
    and email = 'coach@demo.com'
    and role in ('coach', 'admin');
  if author_id is null then
    raise exception 'Expected demo coach profile was not found. Nothing was changed.';
  end if;

  select starts_on, ends_on into season_start, season_end
  from public.seasons
  where id = target_season_id and team_id = target_team_id
    and name = '2026 Spring Season' and is_active = true;
  if not found then
    raise exception 'Expected active demo season was not found. Nothing was changed.';
  end if;

  foreach format in array array[9, 18] loop
    validation_event_id := case when format = 9 then nine_event_id else eighteen_event_id end;
    validation_name := 'Coach Insights Validation - ' || format || ' holes (synthetic)';
    if exists (select 1 from public.events where id = validation_event_id) then
      if not exists (
        select 1 from public.events
        where id = validation_event_id and team_id = target_team_id
          and season_id = target_season_id and name = validation_name
      ) then
        raise exception 'A validation event ID is already used elsewhere. Nothing was changed.';
      end if;
      raise notice '% already exists; skipped.', validation_name;
      continue;
    end if;

    select max(played_on) + 7, count(distinct player_id)
    into validation_date, source_count
    from public.rounds
    where team_id = target_team_id and season_id = target_season_id
      and holes = format and score >= format
      and (event_id is null or event_id not in (nine_event_id, eighteen_event_id));
    if validation_date is null or source_count = 0 then
      raise exception 'No existing % hole demo rounds were found. Nothing was changed.', format;
    end if;
    if (season_start is not null and validation_date < season_start)
      or (season_end is not null and validation_date > season_end) then
      raise exception 'Validation date % is outside the demo season. Nothing was changed.', validation_date;
    end if;

    insert into public.events (id, team_id, season_id, name, event_type, event_date, location)
    values (validation_event_id, target_team_id, target_season_id,
      validation_name, 'practice', validation_date, 'Synthetic Coach Insights validation');

    player_number := 0;
    for source_round in
      select latest.* from (
        select distinct on (r.player_id)
          r.player_id, r.par, r.fairways_possible, r.score
        from public.rounds r
        join public.players p on p.id = r.player_id and p.team_id = target_team_id
        where r.team_id = target_team_id and r.season_id = target_season_id
          and r.holes = format and r.score >= format and p.status = 'active'
          and (r.event_id is null or r.event_id not in (nine_event_id, eighteen_event_id))
        order by r.player_id, r.played_on desc, r.created_at desc, r.id desc
      ) latest
      order by latest.score, latest.player_id
    loop
      player_number := player_number + 1;
      par_total := case when source_round.par > 0 then source_round.par else format * 4 end;
      opportunities := greatest(1, least(format,
        coalesce(source_round.fairways_possible, case when format = 9 then 7 else 14 end)));
      inserted_round_id := gen_random_uuid();

      -- Summary submissions are supported by score entry and the insight engine.
      -- Intentionally show fewer putts / more fairways alongside missed greens
      -- and more penalties, so both improvement and attention cards can be tested.
      insert into public.rounds (
        id, team_id, season_id, event_id, player_id, submitted_by,
        counts_toward_lineup, played_on, holes, score, par, putts,
        fairways_hit, fairways_possible, greens_in_regulation, gir_possible,
        penalties, three_putts, notes
      ) values (
        inserted_round_id, target_team_id, target_season_id, validation_event_id,
        source_round.player_id, author_id, false, validation_date, format,
        par_total + 7 + player_number, par_total, format * 4 / 3,
        opportunities, opportunities, 0, format, 4, 0,
        'Synthetic Coach Insights validation data. These are not real golf results. '
          || 'Excluded from lineup qualification; practice event excluded from low-four competition estimates.'
      );
    end loop;
    if player_number = 0 then
      raise exception 'No active demo players have % hole rounds. Nothing was changed.', format;
    end if;
    raise notice 'Added % with % player rounds on %.', validation_name, player_number, validation_date;
  end loop;
end
$$;

-- Review the added records before leaving the SQL Editor.
select e.name, e.event_date, r.holes, count(*) as player_rounds
from public.events e
join public.rounds r on r.event_id = e.id and r.team_id = e.team_id
where e.team_id = '533b879d-804a-490b-97a4-d13d23fdfa96'
  and e.id in ('d0bd9baa-5119-4f27-bef1-1c8b9aa59209', 'ea583b0a-2f17-40c5-9645-664f181d4935')
group by e.name, e.event_date, r.holes
order by r.holes;

commit;
