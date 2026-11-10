-- Revoke one coach's team access without deleting the coach's account or any team data.
-- Uses one transaction to re-home a coach when their profile's original team is removed.
-- Only the service_role may execute this privilege-changing RPC.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.staff_team_access_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid NOT NULL,
  staff_user_id uuid NOT NULL,
  removed_team_id uuid NOT NULL,
  old_home_team_id uuid NOT NULL,
  new_home_team_id uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE private.staff_team_access_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.staff_team_access_audit FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.revoke_staff_team_access(
  target_user_id uuid,
  target_team_id uuid,
  actor_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  old_home_team_id uuid;
  next_home_team_id uuid;
  next_home_role public.user_role;
  remaining_count integer;
BEGIN
  -- Serialize concurrent revocations for this person and ensure it is staff.
  SELECT p.team_id
    INTO old_home_team_id
  FROM public.profiles p
  WHERE p.id = target_user_id
    AND p.role IN ('admin', 'coach')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STAFF_PROFILE_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF actor_user_id IS NULL THEN
    RAISE EXCEPTION 'ACTOR_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.staff_team_access a
    WHERE a.user_id = target_user_id AND a.team_id = target_team_id
  ) THEN
    RAISE EXCEPTION 'TEAM_ASSIGNMENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*) INTO remaining_count
  FROM public.staff_team_access a
  WHERE a.user_id = target_user_id;

  IF remaining_count <= 1 THEN
    RAISE EXCEPTION 'LAST_TEAM_ASSIGNMENT' USING ERRCODE = 'P0001';
  END IF;

  next_home_team_id := old_home_team_id;

  -- If the removed team was the original/default team, preserve account
  -- continuity by assigning one of the surviving memberships as home.
  IF old_home_team_id = target_team_id THEN
    SELECT a.team_id, a.role
      INTO next_home_team_id, next_home_role
    FROM public.staff_team_access a
    WHERE a.user_id = target_user_id
      AND a.team_id <> target_team_id
    ORDER BY a.created_at, a.team_id
    LIMIT 1;

    IF next_home_team_id IS NULL THEN
      RAISE EXCEPTION 'REMAINING_TEAM_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.profiles p
    SET team_id = next_home_team_id,
        role = next_home_role
    WHERE p.id = target_user_id;
  END IF;

  DELETE FROM public.staff_team_access a
  WHERE a.user_id = target_user_id AND a.team_id = target_team_id;

  INSERT INTO private.staff_team_access_audit (
    actor_user_id, staff_user_id, removed_team_id,
    old_home_team_id, new_home_team_id
  ) VALUES (
    actor_user_id, target_user_id, target_team_id,
    old_home_team_id, next_home_team_id
  );

  RETURN jsonb_build_object(
    'removedTeamId', target_team_id,
    'homeTeamId', next_home_team_id,
    'remainingCount', remaining_count - 1
  );
END;
$$;

-- SECURITY DEFINER must never be executable by ordinary authenticated accounts.
REVOKE ALL ON FUNCTION public.revoke_staff_team_access(uuid,uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_staff_team_access(uuid,uuid,uuid)
  TO service_role;

COMMIT;
