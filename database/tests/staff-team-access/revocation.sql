-- Integration tests of the atomic, service-role-only team revocation function.
-- The existing fixture/membership assertions run before this script.
DO $$
BEGIN
  IF has_function_privilege('authenticated',
    'public.revoke_staff_team_access(uuid,uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Ordinary authenticated users may execute privileged team revocation';
  END IF;
  IF has_function_privilege('anon',
    'public.revoke_staff_team_access(uuid,uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous users may execute privileged team revocation';
  END IF;
  IF NOT has_function_privilege('service_role',
    'public.revoke_staff_team_access(uuid,uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Service-role onboarding may not execute team revocation';
  END IF;
END $$;

-- Boys is home; remove extra girls assignment.
BEGIN;
SET LOCAL ROLE service_role;
SELECT public.revoke_staff_team_access(
  '11111111-1111-4111-8111-111111111111',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '44444444-4444-4444-8444-444444444444'
);
COMMIT;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.staff_team_access
    WHERE user_id='11111111-1111-4111-8111-111111111111') <> 1 THEN
    RAISE EXCEPTION 'Removing girls did not preserve exactly the boys membership';
  END IF;
  IF (SELECT team_id FROM public.profiles
    WHERE id='11111111-1111-4111-8111-111111111111')
    <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' THEN
    RAISE EXCEPTION 'Removing secondary girls team unexpectedly changed home boys team';
  END IF;
  IF (SELECT count(*) FROM private.staff_team_access_audit) <> 1 THEN
    RAISE EXCEPTION 'Missing revocation audit record';
  END IF;
END $$;

-- Cannot revoke the last remaining team, even through the privileged RPC.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
BEGIN
  BEGIN
    PERFORM public.revoke_staff_team_access(
      '11111111-1111-4111-8111-111111111111',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '44444444-4444-4444-8444-444444444444'
    );
    RAISE EXCEPTION 'LAST_TEAM_ASSIGNMENT must be rejected';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN
    IF SQLERRM <> 'LAST_TEAM_ASSIGNMENT' THEN
      RAISE;
    END IF;
  END;
END $$;
ROLLBACK;

-- Restore girls, then remove the ORIGINAL home boys team.
INSERT INTO public.staff_team_access(user_id,team_id,role) VALUES
('11111111-1111-4111-8111-111111111111',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','coach');
BEGIN;
SET LOCAL ROLE service_role;
SELECT public.revoke_staff_team_access(
  '11111111-1111-4111-8111-111111111111',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '44444444-4444-4444-8444-444444444444'
);
COMMIT;

DO $$
BEGIN
  IF (SELECT team_id FROM public.profiles
      WHERE id='11111111-1111-4111-8111-111111111111')
      <> 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' THEN
    RAISE EXCEPTION 'Home team failed to switch to remaining girls team';
  END IF;
  IF (SELECT role FROM public.profiles
      WHERE id='11111111-1111-4111-8111-111111111111') <> 'coach' THEN
    RAISE EXCEPTION 'Home team role failed to switch to girls coaching role';
  END IF;
  IF (SELECT count(*) FROM public.staff_team_access
      WHERE user_id='11111111-1111-4111-8111-111111111111') <> 1 THEN
    RAISE EXCEPTION 'Revoked boys membership still present';
  END IF;
  IF (SELECT count(*) FROM private.staff_team_access_audit) <> 2 THEN
    RAISE EXCEPTION 'Audit log did not capture both removals';
  END IF;
END $$;

-- A stale cookie/revoked team ID never confers rights.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
DO $$
BEGIN
  IF public.is_team_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
     OR public.is_team_staff('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
     OR NOT public.is_team_staff('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') THEN
    RAISE EXCEPTION 'Revoked home team access is still available';
  END IF;
END $$;
ROLLBACK;

SELECT 'PASS: atomic revocation, home transfer, last-team guard, audit, and RLS' AS result;
