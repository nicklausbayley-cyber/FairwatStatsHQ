-- Multi-team coach access. Run in a staging database before production.
-- Backwards compatible with profiles.team_id while application selection is rolled out.
-- CAUTION: This changes existing RLS helpers, so regression-test player and coach access.
begin;

create table if not exists public.staff_team_access (
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  role public.user_role not null check (role in ('coach', 'admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, team_id)
);

create index if not exists staff_team_access_team_id_idx
  on public.staff_team_access(team_id);

-- Preserve every existing coach's home team before switching authorization helpers.
insert into public.staff_team_access(user_id, team_id, role)
select id, team_id, role
from public.profiles
where role in ('coach', 'admin')
on conflict (user_id, team_id) do nothing;

alter table public.staff_team_access enable row level security;

drop policy if exists "Staff can view their own team assignments" on public.staff_team_access;
create policy "Staff can view their own team assignments"
on public.staff_team_access for select to authenticated
using ((select auth.uid()) = user_id);

-- Only privileged platform-onboarding/server routes can grant or remove membership.
revoke all on public.staff_team_access from anon, authenticated;
grant select on public.staff_team_access to authenticated;

-- Existing RLS policies call these helpers. Keep the function signatures stable,
-- and derive all rights from the authenticated caller (never a user-supplied UID).
-- SECURITY DEFINER avoids recursive lookups through profiles RLS. These helpers
-- return only the caller's own membership, not any other user's access.
create or replace function public.is_team_member(target_team_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and (
    exists (
      select 1 from public.staff_team_access sta
      where sta.user_id = (select auth.uid()) and sta.team_id = target_team_id
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'player'
        and p.team_id = target_team_id
    )
  );
$$;

create or replace function public.is_team_staff(target_team_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.staff_team_access sta
    where sta.user_id = (select auth.uid())
      and sta.team_id = target_team_id
      and sta.role in ('coach', 'admin')
  );
$$;

revoke all on function public.is_team_member(uuid) from public, anon;
revoke all on function public.is_team_staff(uuid) from public, anon;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_staff(uuid) to authenticated;

-- A coach may legitimately be assigned to more than one team.
drop policy if exists "Team members can read their team" on public.teams;
create policy "Team members can read their team"
on public.teams for select to authenticated
using (public.is_team_member(id));

-- Users must be able to read their own home profile even if they selected their
-- other team. Other profile reads remain limited to permitted home teams.
drop policy if exists "Team members can read profiles" on public.profiles;
create policy "Team members can read profiles"
on public.profiles for select to authenticated
using ((select auth.uid()) = id or public.is_team_member(team_id));

-- Profiles contain account roles and home-team assignments. The old
-- team-staff ALL policy permits privilege escalation and would extend that
-- ability across every linked team. Profile mutations are platform-admin only
-- through the service-role onboarding route.
drop policy if exists "Team staff can manage profiles" on public.profiles;

commit;

-- Staging verification:
-- select user_id,team_id,role from public.staff_team_access order by team_id;
-- Exercise SELECT/INSERT/UPDATE RLS using distinct authenticated test accounts.
