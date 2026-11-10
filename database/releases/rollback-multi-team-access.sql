-- Emergency RLS rollback for Fairway Stats HQ multi-team coach access.
-- Restores the exact legacy single-team access behavior inspected on 2026-11-09.
-- Run ONLY after rolling the application back to a version which uses profiles.team_id.
-- This preserves staff_team_access and all of its rows for diagnosis / later retry.
-- Do not use while the new team selector application is serving requests.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_team_member(target_team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT target_team_id = public.current_team_id()
$function$;

CREATE OR REPLACE FUNCTION public.is_team_staff(target_team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    target_team_id = public.current_team_id()
    AND public.current_user_role() IN ('admin', 'coach')
$function$;

DROP POLICY IF EXISTS "Team members can read their team" ON public.teams;
CREATE POLICY "Team members can read their team"
ON public.teams FOR SELECT TO authenticated
USING (id = public.current_team_id());

DROP POLICY IF EXISTS "Team members can read profiles" ON public.profiles;
CREATE POLICY "Team members can read profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_team_member(team_id));

DROP POLICY IF EXISTS "Team staff can manage profiles" ON public.profiles;
CREATE POLICY "Team staff can manage profiles"
ON public.profiles FOR ALL TO authenticated
USING (public.is_team_staff(team_id))
WITH CHECK (public.is_team_staff(team_id));

-- Legacy function execution grants are intentionally restored to their previous
-- state. The legacy policy was already callable by unauthenticated roles.
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_team_staff(uuid) TO PUBLIC;
COMMIT;

-- After verifying the application rollback, decide separately whether to revoke
-- access to or remove the unused membership table. Do not DROP it automatically.
