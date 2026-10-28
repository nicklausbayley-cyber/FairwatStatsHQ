-- Riverside-only demo presentation polish, Oct 2026.
-- Fictional golf results, not real school/student records.
-- Scope: two existing summary-only demo practice events; no new events, players,
-- credentials, or production/customer team records. Idempotent on rerun.
-- Back up current demo data before changing it if you need exact restoration.
BEGIN;

CREATE TEMP TABLE riverside_demo_2026_values (
  first_name text NOT NULL,
  last_name text NOT NULL,
  holes integer NOT NULL,
  score integer NOT NULL,
  putts integer NOT NULL,
  fairways_hit integer NOT NULL,
  greens_in_regulation integer NOT NULL,
  penalties integer NOT NULL,
  three_putts integer NOT NULL
) ON COMMIT DROP;

INSERT INTO riverside_demo_2026_values VALUES
  ('Avery','Ellis',  9,39,15,5,4,2,0),
  ('Mason','Cole',   9,38,16,6,4,1,0),
  ('Ryan','Decker',  9,40,16,5,3,2,0),
  ('Nate','Jones',   9,41,18,4,3,2,1),
  ('Caleb','Price',  9,40,17,4,3,3,1),
  ('Eli','Turner',   9,44,18,3,2,3,1),
  ('Lucas','Bennett',9,44,19,3,2,3,1),
  ('Jordan','Kim',   9,48,20,2,1,3,2),
  ('Avery','Ellis', 18,78,28,11,11,0,0),
  ('Mason','Cole',  18,79,29,11,10,0,0),
  ('Ryan','Decker', 18,81,29,10, 9,1,1),
  ('Nate','Jones',  18,85,30, 9, 8,1,1),
  ('Caleb','Price', 18,84,30, 9, 8,2,1),
  ('Eli','Turner',  18,88,32, 8, 7,2,2),
  ('Lucas','Bennett',18,94,35,7,6,3,2),
  ('Jordan','Kim',  18,97,38, 6, 5,3,3);

DO $riverside$
DECLARE
  demo_team constant uuid := '533b879d-804a-490b-97a4-d13d23fdfa96';
  demo_season constant uuid := 'f2291080-3660-45d9-aa59-22b8dbe2fa7e';
  nine_event constant uuid := 'd0bd9baa-5119-4f27-bef1-1c8b9aa59209';
  eighteen_event constant uuid := 'ea583b0a-2f17-40c5-9645-664f181d4935';
  changed integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id=demo_team AND name='Riverside Eagles Golf'
      AND school_name='Riverside High School'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.seasons
    WHERE id=demo_season AND team_id=demo_team AND is_active
  ) THEN
    RAISE EXCEPTION 'Expected Riverside demo team and active season not found';
  END IF;

  IF (SELECT count(*) FROM riverside_demo_2026_values) <> 16
     OR (SELECT count(*) FROM public.events WHERE id IN (nine_event,eighteen_event)
          AND team_id=demo_team AND season_id=demo_season AND event_type='practice') <> 2
     OR (SELECT count(*) FROM public.rounds WHERE team_id=demo_team
          AND season_id=demo_season AND event_id IN (nine_event,eighteen_event)) <> 16
  THEN
    RAISE EXCEPTION 'Unexpected Riverside fixture counts; refusing changes';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.round_holes h
    JOIN public.rounds r ON r.id=h.round_id
    WHERE r.team_id=demo_team AND r.event_id IN (nine_event,eighteen_event)
  ) THEN
    RAISE EXCEPTION 'Validation rounds contain hole details; summary-only update refused';
  END IF;

  IF (SELECT count(*) FROM public.rounds r
      JOIN public.players p ON p.id=r.player_id AND p.team_id=demo_team
      JOIN riverside_demo_2026_values v ON v.first_name=p.first_name
           AND v.last_name=p.last_name AND v.holes=r.holes
      WHERE r.team_id=demo_team AND r.season_id=demo_season
        AND r.event_id=CASE WHEN v.holes=9 THEN nine_event ELSE eighteen_event END
        AND r.counts_toward_lineup=false) <> 16
  THEN
    RAISE EXCEPTION 'Demo player/round match failed; refusing changes';
  END IF;

  UPDATE public.rounds r
  SET score=v.score, putts=v.putts,
      fairways_hit=v.fairways_hit,
      fairways_possible=CASE WHEN v.holes=9 THEN 7 ELSE 14 END,
      greens_in_regulation=v.greens_in_regulation,
      gir_possible=v.holes,
      penalties=v.penalties, three_putts=v.three_putts,
      notes='Fictional player and score data for the Fairway Stats HQ product demo. Not an actual golf result.'
  FROM public.players p
  JOIN riverside_demo_2026_values v ON v.first_name=p.first_name AND v.last_name=p.last_name
  WHERE r.player_id=p.id AND p.team_id=demo_team AND r.team_id=demo_team
    AND r.season_id=demo_season AND r.holes=v.holes
    AND r.event_id=CASE WHEN v.holes=9 THEN nine_event ELSE eighteen_event END
    AND r.counts_toward_lineup=false;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed <> 16 THEN
    RAISE EXCEPTION 'Expected 16 updates, saw %',changed;
  END IF;

  UPDATE public.events e
  SET name=CASE WHEN id=nine_event THEN 'Sectional Prep Practice - 9 Holes (Demo)'
                ELSE 'Postseason Practice Review - 18 Holes (Demo)' END,
      location='Fictional Riverside demo outing'
  WHERE e.team_id=demo_team AND e.season_id=demo_season
    AND id IN (nine_event,eighteen_event) AND event_type='practice';
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed <> 2 THEN
    RAISE EXCEPTION 'Expected two demo event updates, saw %',changed;
  END IF;
END
$riverside$;

SELECT e.name,e.event_date,r.holes,count(*) AS players,
       round(avg(r.score)::numeric,1) AS avg_score,
       round(avg(r.putts)::numeric,1) AS avg_putts,
       round(avg(r.greens_in_regulation)::numeric,1) AS avg_gir,
       round(avg(r.fairways_hit)::numeric,1) AS avg_fir,
       round(avg(r.penalties)::numeric,1) AS avg_penalties
FROM public.rounds r JOIN public.events e ON e.id=r.event_id
WHERE r.team_id='533b879d-804a-490b-97a4-d13d23fdfa96'
AND r.event_id IN ('d0bd9baa-5119-4f27-bef1-1c8b9aa59209',
                   'ea583b0a-2f17-40c5-9645-664f181d4935')
GROUP BY e.name,e.event_date,r.holes ORDER BY r.holes;
COMMIT;
