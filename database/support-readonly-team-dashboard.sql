-- Read-only, team-scoped support view of coach dashboard source records.
-- Preview uses the authenticated Supabase session, never the service-role key.
-- Existing private.support_readers grants are reused; no new roles are granted.

create or replace function private.support_team_dashboard_internal(target_team_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  team_name text;
  active_season_id uuid;
  active_season_name text;
  player_records jsonb;
  event_records jsonb;
  round_records jsonb;
begin
  -- Authorize BEFORE looking up the target team. A forged team ID never grants access.
  if (select auth.uid()) is null or not exists (
    select 1 from private.support_readers reader
    where reader.user_id = (select auth.uid())
  ) then
    raise exception 'Support dashboard access denied' using errcode = '42501';
  end if;

  select t.name into team_name from public.teams t
  where t.id = target_team_id;
  if not found then
    return null;
  end if;

  select s.id, s.name into active_season_id, active_season_name
  from public.seasons s
  where s.team_id = target_team_id and s.is_active = true
  order by s.created_at desc
  limit 1;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'status', p.status
    ) order by p.last_name, p.first_name),
    '[]'::jsonb
  ) into player_records
  from public.players p
  where p.team_id = target_team_id;

  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', e.id,
      'name', e.name
    ) order by e.event_date, e.name),
    '[]'::jsonb
  ) into event_records
  from public.events e
  where e.team_id = target_team_id
    and (active_season_id is null or e.season_id = active_season_id);

  -- The same fields and active-season scoping used by /dashboard.
  -- All matching rounds are included to keep statistics and lineup trends exact.
  select coalesce(
    jsonb_agg(jsonb_build_object(
      'id', r.id,
      'player_id', r.player_id,
      'event_id', r.event_id,
      'played_on', r.played_on,
      'created_at', r.created_at,
      'holes', r.holes,
      'counts_toward_lineup', r.counts_toward_lineup,
      'score', r.score,
      'putts', r.putts,
      'fairways_hit', r.fairways_hit,
      'fairways_possible', r.fairways_possible,
      'greens_in_regulation', r.greens_in_regulation,
      'gir_possible', r.gir_possible,
      'penalties', r.penalties,
      'three_putts', r.three_putts
    ) order by r.played_on desc, r.created_at desc, r.id desc),
    '[]'::jsonb
  ) into round_records
  from public.rounds r
  where r.team_id = target_team_id
    and (active_season_id is null or r.season_id = active_season_id);

  return jsonb_build_object(
    'teamId', target_team_id,
    'teamName', team_name,
    'activeSeasonName', active_season_name,
    'players', player_records,
    'events', event_records,
    'rounds', round_records
  );
end;
$function$;

revoke all on function private.support_team_dashboard_internal(uuid) from public, anon, authenticated;
grant execute on function private.support_team_dashboard_internal(uuid) to authenticated;

-- Public API entrypoint stays security invoker; no direct table grants are added.
create or replace function public.support_team_dashboard(target_team_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.support_team_dashboard_internal(target_team_id);
$function$;

revoke all on function public.support_team_dashboard(uuid) from public, anon;
grant execute on function public.support_team_dashboard(uuid) to authenticated;

comment on function public.support_team_dashboard(uuid) is
  'Team-scoped, read-only source data for support dashboard preview; requires a privately approved support reader.';
