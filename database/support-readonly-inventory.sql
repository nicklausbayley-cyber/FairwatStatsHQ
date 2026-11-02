-- Restricted read-only support inventory for preview and local troubleshooting.
-- Unlike a service-role credential, this RPC grants only a few team summary fields.
-- Run this reviewed migration on the Fairway Stats HQ Supabase project.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists private.support_readers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);
alter table private.support_readers enable row level security;
revoke all on private.support_readers from public, anon, authenticated;

-- The initial grant follows the owner's existing confirmed Auth account.
insert into private.support_readers (user_id)
select id from auth.users
where lower(email) = 'nicklaus.bayley@gmail.com'
  and email_confirmed_at is not null
on conflict (user_id) do nothing;

create or replace function private.support_team_inventory_internal()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  team_records jsonb;
  course_records jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from private.support_readers as support_user
    where support_user.user_id = auth.uid()
  ) then
    raise exception 'Support inventory access denied' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', team.id,
        'name', team.name,
        'school_name', team.school_name,
        'contact_email', team.contact_email,
        'created_at', team.created_at,
        'coaches', (select count(*) from public.profiles p
                    where p.team_id = team.id and p.role in ('admin', 'coach')),
        'players', (select count(*) from public.players p where p.team_id = team.id),
        'courses', (select count(*) from public.courses c where c.team_id = team.id),
        'events', (select count(*) from public.events e where e.team_id = team.id),
        'rounds', (select count(*) from public.rounds r where r.team_id = team.id),
        'activeSeason', (
          select season.name from public.seasons season
          where season.team_id = team.id and season.is_active = true
          order by season.created_at desc
          limit 1
        )
      ) order by team.name
    ),
    '[]'::jsonb
  ) into team_records
  from public.teams team;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', course.id,
        'team_id', course.team_id,
        'name', course.name,
        'location', course.location
      ) order by course.name
    ),
    '[]'::jsonb
  ) into course_records
  from public.courses course;

  return jsonb_build_object('teams', team_records, 'courses', course_records);
end;
$function$;

revoke all on function private.support_team_inventory_internal() from public, anon, authenticated;
grant execute on function private.support_team_inventory_internal() to authenticated;

-- Expose a security-invoker wrapper, not a SECURITY DEFINER function in public.
create or replace function public.support_team_inventory()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
  select private.support_team_inventory_internal();
$function$;

revoke all on function public.support_team_inventory() from public, anon;
grant execute on function public.support_team_inventory() to authenticated;

comment on function public.support_team_inventory() is
  'Read-only team and course summary for verified internal support accounts; access is enforced by private.support_readers.';
