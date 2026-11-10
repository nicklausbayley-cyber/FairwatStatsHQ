-- Isolated PostgreSQL 17 harness for the Supabase membership migration.
-- There are NO external credentials, API calls, or live Supabase connections.
-- The harness intentionally models only the tables/policies this feature requires.
CREATE SCHEMA auth;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE TYPE public.user_role AS ENUM ('admin', 'coach', 'player');
CREATE TABLE public.teams (
  id uuid PRIMARY KEY,
  name text NOT NULL
);
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id),
  role public.user_role NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL
);
CREATE TABLE public.players (
  id uuid PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id),
  first_name text NOT NULL,
  last_name text NOT NULL
);
CREATE TABLE public.rounds (
  id uuid PRIMARY KEY,
  team_id uuid NOT NULL REFERENCES public.teams(id),
  player_id uuid NOT NULL REFERENCES public.players(id),
  score integer NOT NULL
);

-- Existing single-team helpers/policies, before the migration is applied.
CREATE FUNCTION public.current_team_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT p.team_id FROM public.profiles p WHERE p.id = (SELECT auth.uid()) LIMIT 1 $$;
CREATE FUNCTION public.current_user_role() RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT p.role FROM public.profiles p WHERE p.id = (SELECT auth.uid()) LIMIT 1 $$;
CREATE FUNCTION public.is_team_member(target_team_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT target_team_id = public.current_team_id() $$;
CREATE FUNCTION public.is_team_staff(target_team_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT target_team_id = public.current_team_id()
  AND public.current_user_role() IN ('admin', 'coach') $$;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can read their team" ON public.teams FOR SELECT
TO authenticated USING (id = public.current_team_id());
CREATE POLICY "Team members can read profiles" ON public.profiles FOR SELECT
TO authenticated USING (public.is_team_member(team_id));
CREATE POLICY "Team staff can manage profiles" ON public.profiles FOR ALL
TO authenticated USING (public.is_team_staff(team_id))
WITH CHECK (public.is_team_staff(team_id));
CREATE POLICY "Team members can read players" ON public.players FOR SELECT
TO authenticated USING (public.is_team_member(team_id));
CREATE POLICY "Team staff can manage players" ON public.players FOR ALL
TO authenticated USING (public.is_team_staff(team_id))
WITH CHECK (public.is_team_staff(team_id));
CREATE POLICY "Team members can read rounds" ON public.rounds FOR SELECT
TO authenticated USING (public.is_team_member(team_id));
CREATE POLICY "Team staff can manage rounds" ON public.rounds FOR ALL
TO authenticated USING (public.is_team_staff(team_id))
WITH CHECK (public.is_team_staff(team_id));

GRANT USAGE ON SCHEMA public, auth TO authenticated;
GRANT SELECT ON public.teams, public.profiles, public.players, public.rounds TO authenticated;
GRANT INSERT, UPDATE ON public.players, public.rounds TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- Three fictional programs and four fictional accounts.
INSERT INTO public.teams(id,name) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Demo Boys'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Demo Girls'),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Unrelated School');

INSERT INTO public.profiles(id,team_id,role,full_name,email) VALUES
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','admin','Dual-Team Coach','coach@example.invalid'),
('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','coach','Girls Assistant','assistant@example.invalid'),
('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','player','Boys Player','player@example.invalid'),
('44444444-4444-4444-8444-444444444444','cccccccc-cccc-4ccc-8ccc-cccccccccccc','coach','Rival Coach','rival@example.invalid');

INSERT INTO public.players(id,team_id,first_name,last_name) VALUES
('55555555-5555-4555-8555-555555555555','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Boys','Player'),
('66666666-6666-4666-8666-666666666666','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Girls','Player'),
('77777777-7777-4777-8777-777777777777','cccccccc-cccc-4ccc-8ccc-cccccccccccc','Rival','Player');

INSERT INTO public.rounds(id,team_id,player_id,score) VALUES
('88888888-8888-4888-8888-888888888888','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','55555555-5555-4555-8555-555555555555',39),
('99999999-9999-4999-8999-999999999999','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','66666666-6666-4666-8666-666666666666',42),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','cccccccc-cccc-4ccc-8ccc-cccccccccccc','77777777-7777-4777-8777-777777777777',44);
