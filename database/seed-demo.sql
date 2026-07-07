with demo_team as (
  insert into public.teams (name, school_name)
  values ('Fairway Stats Demo Team', 'Fairway Stats High School')
  returning id
),
demo_season as (
  insert into public.seasons (team_id, name, starts_on, ends_on, is_active)
  select
    demo_team.id,
    '2026 Spring Season',
    '2026-03-01'::date,
    '2026-06-15'::date,
    true
  from demo_team
  returning id, team_id
),
demo_players as (
  insert into public.players (
    team_id,
    first_name,
    last_name,
    graduation_year,
    status
  )
  select
    demo_season.team_id,
    player_data.first_name,
    player_data.last_name,
    player_data.graduation_year,
    'active'
  from demo_season
  cross join (
    values
      ('Avery', 'Ellis', 2026),
      ('Mason', 'Cole', 2027),
      ('Nora', 'Brooks', 2028),
      ('Eli', 'Turner', 2029),
      ('Sofia', 'Ramirez', 2027),
      ('Caleb', 'Price', 2028)
  ) as player_data(first_name, last_name, graduation_year)
  returning id, team_id, first_name, last_name
),
demo_events as (
  insert into public.events (
    team_id,
    season_id,
    name,
    event_type,
    event_date,
    course_name,
    location
  )
  select
    demo_season.team_id,
    demo_season.id,
    event_data.name,
    event_data.event_type::public.event_type,
    event_data.event_date::date,
    event_data.course_name,
    event_data.location
  from demo_season
  cross join (
    values
      (
        'Spring Qualifier',
        'qualifier',
        '2026-03-18',
        'Maple Ridge Golf Club',
        'Indianapolis, IN'
      ),
      (
        'North County Match',
        'match',
        '2026-04-02',
        'Stone Creek Golf Course',
        'Noblesville, IN'
      ),
      (
        'Hoosier Invitational',
        'invitational',
        '2026-04-16',
        'Highland Links',
        'Carmel, IN'
      )
  ) as event_data(
    name,
    event_type,
    event_date,
    course_name,
    location
  )
  returning id, team_id, season_id, name, event_date
),
demo_rounds as (
  insert into public.rounds (
    team_id,
    season_id,
    event_id,
    player_id,
    played_on,
    holes,
    score,
    par,
    putts,
    fairways_hit,
    fairways_possible,
    greens_in_regulation,
    gir_possible,
    penalties,
    three_putts,
    notes
  )
  select
    demo_events.team_id,
    demo_events.season_id,
    demo_events.id,
    demo_players.id,
    demo_events.event_date,
    round_data.holes,
    round_data.score,
    round_data.par,
    round_data.putts,
    round_data.fairways_hit,
    round_data.fairways_possible,
    round_data.greens_in_regulation,
    round_data.gir_possible,
    round_data.penalties,
    round_data.three_putts,
    round_data.notes
  from demo_events
  join demo_players
    on demo_players.team_id = demo_events.team_id
  join (
    values
      ('Spring Qualifier', 'Avery', 'Ellis', 18, 76, 72, 31, 10, 14, 11, 18, 1, 1, 'Controlled tee shots and closed with two pars.'),
      ('Spring Qualifier', 'Mason', 'Cole', 18, 81, 72, 33, 8, 14, 8, 18, 2, 2, 'Good recovery round after a double on the front nine.'),
      ('Spring Qualifier', 'Nora', 'Brooks', 18, 84, 72, 34, 7, 14, 7, 18, 1, 2, 'Iron contact improved on the back nine.'),
      ('Spring Qualifier', 'Eli', 'Turner', 18, 89, 72, 36, 6, 14, 5, 18, 3, 3, 'First varsity qualifier, needs cleaner wedge decisions.'),
      ('Spring Qualifier', 'Sofia', 'Ramirez', 18, 82, 72, 32, 9, 14, 8, 18, 1, 1, 'Steady putting kept the round under control.'),
      ('Spring Qualifier', 'Caleb', 'Price', 18, 87, 72, 35, 7, 14, 6, 18, 2, 2, 'Strong finish with pars on 16 and 18.'),

      ('North County Match', 'Avery', 'Ellis', 9, 37, 36, 15, 5, 7, 6, 9, 0, 0, 'Low team score with clean approach play.'),
      ('North County Match', 'Mason', 'Cole', 9, 40, 36, 16, 4, 7, 4, 9, 1, 1, 'Missed two greens short but saved bogey well.'),
      ('North County Match', 'Nora', 'Brooks', 9, 41, 36, 17, 4, 7, 4, 9, 0, 1, 'Solid tempo, one three-putt from long range.'),
      ('North County Match', 'Eli', 'Turner', 9, 44, 36, 18, 3, 7, 3, 9, 1, 2, 'Driver was better, putting pace needs work.'),
      ('North County Match', 'Sofia', 'Ramirez', 9, 39, 36, 16, 5, 7, 5, 9, 0, 0, 'Balanced nine with no doubles.'),
      ('North County Match', 'Caleb', 'Price', 9, 43, 36, 17, 4, 7, 3, 9, 2, 1, 'Two penalty strokes inflated a playable round.'),

      ('Hoosier Invitational', 'Avery', 'Ellis', 18, 78, 72, 32, 9, 14, 10, 18, 1, 1, 'Managed windy conditions and avoided big numbers.'),
      ('Hoosier Invitational', 'Mason', 'Cole', 18, 80, 72, 31, 8, 14, 9, 18, 1, 0, 'Best putting day of the season so far.'),
      ('Hoosier Invitational', 'Nora', 'Brooks', 18, 83, 72, 33, 8, 14, 7, 18, 2, 1, 'Good fairway rate, missed several greens long.'),
      ('Hoosier Invitational', 'Eli', 'Turner', 18, 88, 72, 35, 6, 14, 5, 18, 2, 2, 'Better course management after early trouble.'),
      ('Hoosier Invitational', 'Sofia', 'Ramirez', 18, 79, 72, 31, 10, 14, 9, 18, 0, 1, 'Cleanest ball-striking round in the group.'),
      ('Hoosier Invitational', 'Caleb', 'Price', 18, 85, 72, 34, 7, 14, 6, 18, 1, 2, 'Short game saved several bogeys.')
  ) as round_data(
    event_name,
    first_name,
    last_name,
    holes,
    score,
    par,
    putts,
    fairways_hit,
    fairways_possible,
    greens_in_regulation,
    gir_possible,
    penalties,
    three_putts,
    notes
  )
    on round_data.event_name = demo_events.name
    and round_data.first_name = demo_players.first_name
    and round_data.last_name = demo_players.last_name
  returning id
)
select
  (select count(*) from demo_team) as teams_created,
  (select count(*) from demo_season) as seasons_created,
  (select count(*) from demo_players) as players_created,
  (select count(*) from demo_events) as events_created,
  (select count(*) from demo_rounds) as rounds_created;
