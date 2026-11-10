-- Post-migration integration checks. Runs ONLY against isolated CI PostgreSQL.
-- Preloaded fixture IDs are fictional. Throwing any exception fails GitHub Actions.

DO $$
BEGIN
  IF (SELECT count(*) FROM public.staff_team_access) <> 3 THEN
    RAISE EXCEPTION 'Expected backfill for all three legacy staff accounts';
  END IF;
  IF (SELECT count(*) FROM public.staff_team_access
        WHERE user_id='11111111-1111-4111-8111-111111111111') <> 1 THEN
    RAISE EXCEPTION 'Original boys team access was not preserved';
  END IF;
  IF (SELECT count(*) FROM pg_policies
        WHERE schemaname='public' AND tablename='profiles' AND cmd IN ('ALL','UPDATE')) <> 0 THEN
    RAISE EXCEPTION 'Profile mutation policy unexpectedly retained';
  END IF;
  IF has_table_privilege('authenticated', 'public.staff_team_access', 'INSERT')
     OR has_table_privilege('authenticated', 'public.staff_team_access', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.staff_team_access', 'DELETE') THEN
    RAISE EXCEPTION 'Ordinary authenticated users have membership write permission';
  END IF;
  IF NOT has_table_privilege('service_role', 'public.staff_team_access', 'INSERT') THEN
    RAISE EXCEPTION 'Service-role onboarding cannot assign teams';
  END IF;
  IF has_function_privilege('anon', 'public.is_team_staff(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous RPC can execute staff access function';
  END IF;
END $$;

-- Simulate platform-admin onboarding linking an existing coach to girls golf.
INSERT INTO public.staff_team_access(user_id,team_id,role) VALUES
('11111111-1111-4111-8111-111111111111',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','coach');

-- A single coach can read and write exactly the two assigned programs.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
DO $$
DECLARE updated_count integer;
BEGIN
  IF (SELECT count(*) FROM public.teams) <> 2 THEN
    RAISE EXCEPTION 'Dual-team coach should see exactly boys and girls teams';
  END IF;
  IF (SELECT count(*) FROM public.players) <> 2
      OR (SELECT count(*) FROM public.rounds) <> 2 THEN
    RAISE EXCEPTION 'Rosters or round data leaked or failed to load for dual-team coach';
  END IF;
  IF (SELECT count(*) FROM public.staff_team_access) <> 2 THEN
    RAISE EXCEPTION 'Coach should see only their own two memberships';
  END IF;
  IF (SELECT count(*) FROM public.profiles) <> 3 THEN
    RAISE EXCEPTION 'Coach should only see accounts from their two teams';
  END IF;
  IF NOT public.is_team_staff('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    OR NOT public.is_team_staff('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    OR public.is_team_staff('cccccccc-cccc-4ccc-8ccc-cccccccccccc') THEN
    RAISE EXCEPTION 'Team staff permissions were not scoped to assignments';
  END IF;
  IF (SELECT role FROM public.staff_team_access
    WHERE team_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 'coach' THEN
    RAISE EXCEPTION 'Girls team should retain the coach-specific role';
  END IF;

  UPDATE public.players SET first_name='Edited'
  WHERE id='66666666-6666-4666-8666-666666666666';
  GET DIAGNOSTICS updated_count=ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'Coach could not update an authorized girls roster';
  END IF;

  UPDATE public.profiles SET role='admin'
  WHERE id='22222222-2222-4222-8222-222222222222';
  GET DIAGNOSTICS updated_count=ROW_COUNT;
  IF updated_count <> 0 THEN
    RAISE EXCEPTION 'Coach escalated another user via profiles update';
  END IF;

  BEGIN
    INSERT INTO public.players(id,team_id,first_name,last_name) VALUES
      ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Unauthorized','Roster');
    RAISE EXCEPTION 'Unauthorized roster write unexpectedly permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO public.staff_team_access(user_id,team_id,role) VALUES
      ('11111111-1111-4111-8111-111111111111','cccccccc-cccc-4ccc-8ccc-cccccccccccc','admin');
    RAISE EXCEPTION 'Coach could grant their own third-team access';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
ROLLBACK;

-- A second coach can access only their own girls team (not boys or rival).
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.teams) <> 1
      OR (SELECT count(*) FROM public.players) <> 1
      OR (SELECT count(*) FROM public.rounds) <> 1 THEN
    RAISE EXCEPTION 'Girls-only coach can access data from another team';
  END IF;
  IF public.is_team_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    OR NOT public.is_team_staff('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') THEN
    RAISE EXCEPTION 'Girls-only coach rights did not match membership';
  END IF;
END $$;
ROLLBACK;

-- A player remains restricted to their own original team and has no staff access.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.teams) <> 1
      OR (SELECT count(*) FROM public.players) <> 1
      OR (SELECT count(*) FROM public.rounds) <> 1
      OR (SELECT count(*) FROM public.staff_team_access) <> 0 THEN
    RAISE EXCEPTION 'Player access or visibility exceeds their home team';
  END IF;
  IF NOT public.is_team_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    OR public.is_team_member('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    OR public.is_team_staff('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN
    RAISE EXCEPTION 'Player received other-team or staff permissions';
  END IF;
END $$;
ROLLBACK;

-- Revoking a girls membership immediately removes the coach's girls access.
DELETE FROM public.staff_team_access
WHERE user_id='11111111-1111-4111-8111-111111111111'
  AND team_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.teams) <> 1
      OR (SELECT count(*) FROM public.rounds) <> 1
      OR public.is_team_staff('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') THEN
    RAISE EXCEPTION 'Revoked coach retained girls data or staff rights';
  END IF;
END $$;
ROLLBACK;

-- Restoring a membership does not make a later player role upgrade to staff.
INSERT INTO public.staff_team_access(user_id,team_id,role) VALUES
('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','coach');
UPDATE public.profiles SET role='player'
WHERE id='11111111-1111-4111-8111-111111111111';

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
DO $$
BEGIN
  IF public.is_team_staff('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
    OR public.is_team_staff('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    OR public.is_team_member('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') THEN
    RAISE EXCEPTION 'Stale membership allowed privileges after role downgrade';
  END IF;
  IF NOT public.is_team_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN
    RAISE EXCEPTION 'Player cannot access their one current home team';
  END IF;
END $$;
ROLLBACK;

UPDATE public.profiles SET role='admin'
WHERE id='11111111-1111-4111-8111-111111111111';

-- A rival-school coach can view their school only.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
DO $$
BEGIN
  IF (SELECT count(*) FROM public.teams) <> 1
      OR (SELECT count(*) FROM public.players) <> 1
      OR (SELECT count(*) FROM public.rounds) <> 1
      OR public.is_team_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
      OR public.is_team_member('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') THEN
    RAISE EXCEPTION 'Rival coach saw another school roster or score';
  END IF;
END $$;
ROLLBACK;

SELECT 'PASS: all isolated multi-team membership, read, write, revocation, and player RLS checks' AS result;
