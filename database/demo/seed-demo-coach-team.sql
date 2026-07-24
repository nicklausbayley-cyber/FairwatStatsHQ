begin;

-- =========================================================
-- Fairway Stats HQ coach demo-team seed
--
-- Restricted to:
-- Team ID: 533b879d-804a-490b-97a4-d13d23fdfa96
-- Team: Riverside Eagles Golf
--
-- Preserves:
-- - Team and branding
-- - Nick Bayley admin profile
--
-- Replaces:
-- - Unlinked demo players
-- - Coach notes
-- - Rounds and round holes
-- - Events
-- - Courses and course holes
-- =========================================================

do $$
declare
  target_team_id constant uuid :=
    '533b879d-804a-490b-97a4-d13d23fdfa96';
  target_season_id constant uuid :=
    'f2291080-3660-45d9-aa59-22b8dbe2fa7e';
  target_author_id constant uuid :=
    '720167fb-6488-412e-be2d-3ec72edb7185';
  begin

  if exists (
    select 1
    from public.players
    where team_id = target_team_id
      and profile_id is not null
  ) then
    raise exception
      'Safety check failed: a login-linked player exists on the demo coach team.';
  end if;
end
$$;

create temporary table demo_context (
  team_id uuid not null,
  season_id uuid not null,
  author_id uuid not null
) on commit drop;

insert into demo_context (
  team_id,
  season_id,
  author_id
)
values (
  '533b879d-804a-490b-97a4-d13d23fdfa96',
  'f2291080-3660-45d9-aa59-22b8dbe2fa7e',
  '720167fb-6488-412e-be2d-3ec72edb7185'
);

-- Apply polished branding to the coach-facing demo team.
update public.teams
set
  name = 'Riverside Eagles Golf',
  school_name = 'Riverside High School',
  mascot = 'Eagles',
  contact_email = 'coach@demo.com'
where id = (
  select team_id from demo_context
);

update public.seasons
set
  name = '2026 Spring Season',
  starts_on = '2026-03-01',
  ends_on = '2026-06-15',
  is_active = true
where id = (
  select season_id from demo_context
)
and team_id = (
  select team_id from demo_context
);

-- Remove existing golf data from only the demo team.
delete from public.coach_notes
where team_id = (
  select team_id from demo_context
);

delete from public.rounds
where team_id = (
  select team_id from demo_context
);

delete from public.events
where team_id = (
  select team_id from demo_context
);

delete from public.courses
where team_id = (
  select team_id from demo_context
);

-- Preserve any player connected to an authentication profile.
delete from public.players
where team_id = (
  select team_id from demo_context
)
and profile_id is null;

create temporary table demo_players (
  player_id uuid primary key,
  first_name text not null,
  last_name text not null,
  graduation_year integer not null,
  player_rank integer not null,
  base_over_par_18 integer not null,
  base_putts_18 integer not null,
  fir_rate numeric not null,
  gir_rate numeric not null
) on commit drop;

insert into demo_players (
  player_id,
  first_name,
  last_name,
  graduation_year,
  player_rank,
  base_over_par_18,
  base_putts_18,
  fir_rate,
  gir_rate
)
values
  (
    gen_random_uuid(),
    'Avery',
    'Ellis',
    2027,
    1,
    5,
    30,
    0.71,
    0.61
  ),
  (
    gen_random_uuid(),
    'Mason',
    'Cole',
    2027,
    2,
    8,
    31,
    0.66,
    0.56
  ),
  (
    gen_random_uuid(),
    'Ryan',
    'Decker',
    2028,
    3,
    10,
    32,
    0.62,
    0.50
  ),
  (
    gen_random_uuid(),
    'Nate',
    'Jones',
    2027,
    4,
    12,
    33,
    0.58,
    0.45
  ),
  (
    gen_random_uuid(),
    'Caleb',
    'Price',
    2028,
    5,
    14,
    34,
    0.54,
    0.40
  ),
  (
    gen_random_uuid(),
    'Eli',
    'Turner',
    2029,
    6,
    16,
    35,
    0.50,
    0.35
  ),
  (
    gen_random_uuid(),
    'Lucas',
    'Bennett',
    2029,
    7,
    19,
    36,
    0.45,
    0.29
  ),
  (
    gen_random_uuid(),
    'Jordan',
    'Kim',
    2028,
    8,
    22,
    37,
    0.40,
    0.24
  );

insert into public.players (
  id,
  team_id,
  profile_id,
  first_name,
  last_name,
  graduation_year,
  status
)
select
  dp.player_id,
  dc.team_id,
  null,
  dp.first_name,
  dp.last_name,
  dp.graduation_year,
  'active'
from demo_players dp
cross join demo_context dc;

-- =========================================================
-- Courses
-- =========================================================

create temporary table demo_courses (
  course_id uuid primary key,
  name text not null,
  location text not null,
  pars integer[] not null,
  handicaps integer[] not null,
  yardages integer[] not null
) on commit drop;

insert into demo_courses (
  course_id,
  name,
  location,
  pars,
  handicaps,
  yardages
)
values
  (
    gen_random_uuid(),
    'Maple Ridge Golf Club',
    'Indianapolis, IN',
    array[
      4,5,3,4,4,3,5,4,4,
      4,3,5,4,4,3,4,5,4
    ],
    array[
      7,1,15,9,5,17,3,11,13,
      8,16,2,10,6,18,12,4,14
    ],
    array[
      402,525,168,388,421,154,548,374,410,
      395,176,536,408,432,149,381,557,417
    ]
  ),
  (
    gen_random_uuid(),
    'Stone Creek Golf Course',
    'Noblesville, IN',
    array[
      4,4,3,5,4,4,3,5,4,
      4,5,3,4,4,3,5,4,4
    ],
    array[
      5,9,17,1,11,7,15,3,13,
      6,2,18,10,8,16,4,12,14
    ],
    array[
      415,386,172,562,397,426,151,544,405,
      419,551,145,390,431,164,538,401,412
    ]
  ),
  (
    gen_random_uuid(),
    'Highland Links',
    'Zionsville, IN',
    array[
      5,4,3,4,4,5,3,4,4,
      4,3,4,5,4,3,4,5,4
    ],
    array[
      3,7,17,11,5,1,15,9,13,
      8,18,12,2,10,16,14,4,6
    ],
    array[
      541,403,163,392,427,566,148,379,416,
      409,142,387,552,425,171,398,545,422
    ]
  );

insert into public.courses (
  id,
  team_id,
  name,
  location
)
select
  dc.course_id,
  ctx.team_id,
  dc.name,
  dc.location
from demo_courses dc
cross join demo_context ctx;

insert into public.course_holes (
  course_id,
  hole_number,
  par,
  handicap,
  yardage
)
select
  dc.course_id,
  hole_data.ordinality::integer,
  hole_data.par,
  hole_data.handicap,
  hole_data.yardage
from demo_courses dc
cross join lateral unnest(
  dc.pars,
  dc.handicaps,
  dc.yardages
) with ordinality as hole_data(
  par,
  handicap,
  yardage,
  ordinality
);

-- =========================================================
-- Events
-- =========================================================

create temporary table demo_events (
  event_order integer primary key,
  event_id uuid not null,
  name text not null,
  event_type public.event_type not null,
  event_date date not null,
  course_id uuid not null,
  course_name text not null,
  location text not null,
  holes integer not null,
  difficulty_adjustment integer not null
) on commit drop;

insert into demo_events (
  event_order,
  event_id,
  name,
  event_type,
  event_date,
  course_id,
  course_name,
  location,
  holes,
  difficulty_adjustment
)
values
  (
    1,
    gen_random_uuid(),
    'Preseason Qualifier',
    'qualifier',
    '2026-03-10',
    (
      select course_id
      from demo_courses
      where name = 'Maple Ridge Golf Club'
    ),
    'Maple Ridge Golf Club',
    'Indianapolis, IN',
    18,
    2
  ),
  (
    2,
    gen_random_uuid(),
    'Spring Qualifier',
    'qualifier',
    '2026-03-18',
    (
      select course_id
      from demo_courses
      where name = 'Maple Ridge Golf Club'
    ),
    'Maple Ridge Golf Club',
    'Indianapolis, IN',
    18,
    1
  ),
  (
    3,
    gen_random_uuid(),
    'Westfield Dual Match',
    'match',
    '2026-03-26',
    (
      select course_id
      from demo_courses
      where name = 'Stone Creek Golf Course'
    ),
    'Stone Creek Golf Course',
    'Noblesville, IN',
    9,
    1
  ),
  (
    4,
    gen_random_uuid(),
    'North County Match',
    'match',
    '2026-04-02',
    (
      select course_id
      from demo_courses
      where name = 'Stone Creek Golf Course'
    ),
    'Stone Creek Golf Course',
    'Noblesville, IN',
    9,
    0
  ),
  (
    5,
    gen_random_uuid(),
    'Short Game Practice',
    'practice',
    '2026-04-09',
    (
      select course_id
      from demo_courses
      where name = 'Highland Links'
    ),
    'Highland Links',
    'Zionsville, IN',
    9,
    -1
  ),
  (
    6,
    gen_random_uuid(),
    'Hoosier Invitational',
    'invitational',
    '2026-04-16',
    (
      select course_id
      from demo_courses
      where name = 'Highland Links'
    ),
    'Highland Links',
    'Zionsville, IN',
    18,
    2
  ),
  (
    7,
    gen_random_uuid(),
    'Tri-County Match',
    'match',
    '2026-04-28',
    (
      select course_id
      from demo_courses
      where name = 'Maple Ridge Golf Club'
    ),
    'Maple Ridge Golf Club',
    'Indianapolis, IN',
    9,
    -1
  ),
  (
    8,
    gen_random_uuid(),
    'Conference Preview',
    'tournament',
    '2026-05-07',
    (
      select course_id
      from demo_courses
      where name = 'Stone Creek Golf Course'
    ),
    'Stone Creek Golf Course',
    'Noblesville, IN',
    18,
    0
  ),
  (
    9,
    gen_random_uuid(),
    'Senior Night Match',
    'match',
    '2026-05-20',
    (
      select course_id
      from demo_courses
      where name = 'Maple Ridge Golf Club'
    ),
    'Maple Ridge Golf Club',
    'Indianapolis, IN',
    9,
    -2
  ),
  (
    10,
    gen_random_uuid(),
    'Sectional Championship',
    'tournament',
    '2026-06-05',
    (
      select course_id
      from demo_courses
      where name = 'Highland Links'
    ),
    'Highland Links',
    'Zionsville, IN',
    18,
    1
  );

insert into public.events (
  id,
  team_id,
  season_id,
  name,
  event_type,
  event_date,
  course_name,
  location
)
select
  de.event_id,
  ctx.team_id,
  ctx.season_id,
  de.name,
  de.event_type,
  de.event_date,
  de.course_name,
  de.location
from demo_events de
cross join demo_context ctx;

-- =========================================================
-- Round planning
-- =========================================================

create temporary table demo_rounds
on commit drop
as
select
  gen_random_uuid() as round_id,
  ctx.team_id,
  ctx.season_id,
  ctx.author_id,
  de.event_id,
  de.course_id,
  de.event_order,
  de.event_type,
  de.event_date as played_on,
  de.holes,
  dp.player_id,
  dp.player_rank,
  par_data.par_total,
  par_data.fairways_possible,

  greatest(
    0,
    round(
      dp.base_over_par_18 *
      de.holes /
      18.0
    )::integer
    + de.difficulty_adjustment
    + mod(
        dp.player_rank * 7 +
        de.event_order * 3,
        5
      )
    - 2
  )::integer as target_delta,

  greatest(
    de.holes,
    round(
      dp.base_putts_18 *
      de.holes /
      18.0
    )::integer
    + mod(
        dp.player_rank +
        de.event_order,
        3
      )
    - 1
  )::integer as target_putts,

  case
    when dp.player_rank = 1 and de.holes = 18
      then 2
    when dp.player_rank <= 2
      then 1
    when dp.player_rank <= 4 and de.holes = 18
      then 1
    when mod(
      dp.player_rank + de.event_order,
      4
    ) = 0
      then 1
    else 0
  end::integer as birdie_count,

  least(
    par_data.fairways_possible,
    greatest(
      0,
      round(
        (
          dp.fir_rate +
          least(
            0.08,
            (de.event_order - 1) * 0.008
          )
        ) *
        par_data.fairways_possible
      )::integer
    )
  )::integer as fir_target,

  least(
    de.holes,
    greatest(
      0,
      round(
        (
          dp.gir_rate +
          least(
            0.10,
            (de.event_order - 1) * 0.01
          )
        ) *
        de.holes
      )::integer
    )
  )::integer as gir_target,

  case
    when dp.player_rank <= 2 then
      case
        when mod(
          dp.player_rank + de.event_order,
          5
        ) = 0
          then 1
        else 0
      end
    when dp.player_rank <= 4 then
      case
        when mod(
          dp.player_rank + de.event_order,
          4
        ) = 0
          then 2
        else 1
      end
    when dp.player_rank <= 6 then
      1 +
      case
        when mod(
          dp.player_rank + de.event_order,
          3
        ) = 0
          then 1
        else 0
      end
    else
      2 +
      case
        when mod(
          dp.player_rank + de.event_order,
          2
        ) = 0
          then 1
        else 0
      end
  end::integer as penalty_total,

  case
    when de.event_type = 'qualifier'
      then 'Qualifying round used to evaluate the varsity lineup.'
    when de.event_type = 'practice'
      then 'Focused on wedges, putting, and scoring from 100 yards and in.'
    when de.event_order = 10
         and dp.player_rank <= 4
      then 'Strong finish under postseason pressure.'
    when de.holes = 9
      then 'Nine-hole match round.'
    else null
  end as notes,

  (
    de.event_date::timestamp
    + interval '18 hours'
    + dp.player_rank * interval '3 minutes'
  ) at time zone
    'America/Indiana/Indianapolis'
    as created_at

from demo_events de
cross join demo_context ctx
join demo_players dp
  on (
    case
      when de.event_type in (
        'qualifier',
        'practice'
      )
        then true
      when de.event_order = 7
        then dp.player_rank in (
          1,2,3,4,5,7
        )
      else dp.player_rank <= 6
    end
  )
cross join lateral (
  select
    sum(ch.par)::integer as par_total,
    count(*) filter (
      where ch.par <> 3
    )::integer as fairways_possible
  from public.course_holes ch
  where ch.course_id = de.course_id
    and ch.hole_number <= de.holes
) par_data;

-- Identify guaranteed birdie holes first.
create temporary table demo_hole_seed
on commit drop
as
select
  dr.*,
  ch.hole_number,
  ch.par,
  ch.handicap,

  case
    when dr.birdie_count >= 1
      and ch.hole_number =
        1 + mod(
          dr.player_rank * 2 +
          dr.event_order * 3,
          dr.holes
        )
      then 1

    when dr.birdie_count >= 2
      and ch.hole_number =
        1 + mod(
          dr.player_rank * 2 +
          dr.event_order * 3 +
          7,
          dr.holes
        )
      then 1

    else 0
  end::integer as birdie_flag

from demo_rounds dr
join public.course_holes ch
  on ch.course_id = dr.course_id
 and ch.hole_number <= dr.holes;

-- Rank holes independently for score distribution and statistics.
create temporary table demo_hole_base
on commit drop
as
select
  dhs.*,

  case
    when dhs.birdie_flag = 0 then
      row_number() over (
        partition by dhs.round_id
        order by
          dhs.birdie_flag,
          md5(
            dhs.round_id::text ||
            ':score:' ||
            dhs.hole_number::text
          )
      )
  end::integer as extra_rank,

  row_number() over (
    partition by dhs.round_id
    order by md5(
      dhs.round_id::text ||
      ':putts:' ||
      dhs.hole_number::text
    )
  )::integer as putt_rank,

  case
    when dhs.par <> 3 then
      row_number() over (
        partition by dhs.round_id
        order by
          case
            when dhs.par <> 3 then
              md5(
                dhs.round_id::text ||
                ':fir:' ||
                dhs.hole_number::text
              )
          end nulls last
      )
  end::integer as fir_rank,

  row_number() over (
    partition by dhs.round_id
    order by md5(
      dhs.round_id::text ||
      ':gir:' ||
      dhs.hole_number::text
    )
  )::integer as gir_rank,

  row_number() over (
    partition by dhs.round_id
    order by md5(
      dhs.round_id::text ||
      ':penalty:' ||
      dhs.hole_number::text
    )
  )::integer as penalty_rank

from demo_hole_seed dhs;

create temporary table demo_holes
on commit drop
as
select
  dhb.round_id,
  dhb.team_id,
  dhb.event_id,
  dhb.course_id,
  dhb.player_id,
  dhb.hole_number,
  dhb.par,
  dhb.handicap,

  (
    dhb.par
    - dhb.birdie_flag
    + case
        when dhb.extra_rank is not null
          and dhb.extra_rank <=
            dhb.target_delta +
            dhb.birdie_count
        then
          1 +
          (
            (
              dhb.target_delta +
              dhb.birdie_count -
              dhb.extra_rank
            ) /
            greatest(
              1,
              dhb.holes -
              dhb.birdie_count
            )
          )
        else 0
      end
  )::integer as score,

  case
    when dhb.target_putts < dhb.holes * 2
      and dhb.putt_rank <=
        dhb.holes * 2 -
        dhb.target_putts
      then 1

    when dhb.target_putts > dhb.holes * 2
      and dhb.putt_rank <=
        dhb.target_putts -
        dhb.holes * 2
      then 3

    else 2
  end::integer as putts,

  case
    when dhb.par = 3
      then null
    else dhb.fir_rank <= dhb.fir_target
  end as fir,

  dhb.gir_rank <= dhb.gir_target as gir,

  case
    when dhb.penalty_rank <=
      dhb.penalty_total
      then 1
    else 0
  end::integer as penalty

from demo_hole_base dhb;

-- Insert the parent rounds using totals calculated from hole data.
insert into public.rounds (
  id,
  team_id,
  season_id,
  event_id,
  player_id,
  submitted_by,
  played_on,
  holes,
  score,
  par,
  fairways_hit,
  fairways_possible,
  greens_in_regulation,
  gir_possible,
  putts,
  penalties,
  three_putts,
  notes,
  created_at
)
select
  dr.round_id,
  dr.team_id,
  dr.season_id,
  dr.event_id,
  dr.player_id,
  dr.author_id,
  dr.played_on,
  dr.holes,
  sum(dh.score)::integer,
  sum(dh.par)::integer,
  count(*) filter (
    where dh.fir is true
  )::integer,
  count(*) filter (
    where dh.par <> 3
  )::integer,
  count(*) filter (
    where dh.gir is true
  )::integer,
  count(*)::integer,
  sum(dh.putts)::integer,
  sum(dh.penalty)::integer,
  count(*) filter (
    where dh.putts >= 3
  )::integer,
  dr.notes,
  dr.created_at
from demo_rounds dr
join demo_holes dh
  on dh.round_id = dr.round_id
group by
  dr.round_id,
  dr.team_id,
  dr.season_id,
  dr.event_id,
  dr.player_id,
  dr.author_id,
  dr.played_on,
  dr.holes,
  dr.notes,
  dr.created_at;

insert into public.round_holes (
  team_id,
  round_id,
  player_id,
  event_id,
  course_id,
  hole_number,
  par,
  handicap,
  score,
  putts,
  fir,
  gir,
  penalty
)
select
  dh.team_id,
  dh.round_id,
  dh.player_id,
  dh.event_id,
  dh.course_id,
  dh.hole_number,
  dh.par,
  dh.handicap,
  dh.score,
  dh.putts,
  dh.fir,
  dh.gir,
  dh.penalty
from demo_holes dh;

-- =========================================================
-- Coach notes
-- =========================================================

insert into public.coach_notes (
  id,
  team_id,
  player_id,
  author_id,
  note,
  created_at
)
select
  gen_random_uuid(),
  ctx.team_id,
  dp.player_id,
  ctx.author_id,
  case dp.player_rank
    when 1 then
      'Avery consistently manages the course well and has become the player the team can rely on in pressure situations.'
    when 2 then
      'Mason has improved his approach-shot consistency and is beginning to convert more birdie opportunities.'
    when 3 then
      'Sofia is trending in the right direction, particularly with fairways hit and avoiding penalty strokes.'
    when 4 then
      'Nora competes well and has shown steady improvement throughout the spring schedule.'
    when 5 then
      'Caleb has the distance to score well and is improving his decision-making off the tee.'
    when 6 then
      'Eli brings good energy to the lineup and has made measurable progress with putting pace.'
    when 7 then
      'Lucas handled his varsity opportunity well and should continue competing for a regular lineup spot.'
    when 8 then
      'Jordan is developing quickly and has shown strong practice habits throughout the season.'
  end,
  '2026-04-20 16:00:00-04'::timestamptz
  + dp.player_rank * interval '5 minutes'
from demo_players dp
cross join demo_context ctx;

insert into public.coach_notes (
  id,
  team_id,
  player_id,
  author_id,
  note,
  created_at
)
select
  gen_random_uuid(),
  ctx.team_id,
  dp.player_id,
  ctx.author_id,
  case dp.player_rank
    when 1 then
      'Next focus: improve scoring on reachable par fives and continue reducing three-putts.'
    when 2 then
      'Next focus: sharpen wedges from 70 to 110 yards and improve proximity to the hole.'
    when 3 then
      'Next focus: continue improving greens in regulation and trust the pre-shot routine.'
    when 4 then
      'Next focus: eliminate one big number per round and improve recovery decisions.'
    when 5 then
      'Next focus: prioritize fairway position instead of maximum distance on tight holes.'
    when 6 then
      'Next focus: improve first-putt distance control and reduce penalty strokes.'
    when 7 then
      'Next focus: strengthen short-game consistency and become more comfortable under match pressure.'
    when 8 then
      'Next focus: continue building fundamentals and track progress through summer practice rounds.'
  end,
  '2026-05-22 16:00:00-04'::timestamptz
  + dp.player_rank * interval '5 minutes'
from demo_players dp
cross join demo_context ctx;

commit;

-- =========================================================
-- Verification results
-- =========================================================

select
  t.id,
  t.name,
  (
    select count(*)
    from public.players p
    where p.team_id = t.id
  ) as players,
  (
    select count(*)
    from public.events e
    where e.team_id = t.id
  ) as events,
  (
    select count(*)
    from public.rounds r
    where r.team_id = t.id
  ) as rounds,
  (
    select count(*)
    from public.courses c
    where c.team_id = t.id
  ) as courses,
  (
    select count(*)
    from public.round_holes rh
    where rh.team_id = t.id
  ) as hole_records,
  (
    select count(*)
    from public.coach_notes cn
    where cn.team_id = t.id
  ) as coach_notes
from public.teams t
where t.id =
  '533b879d-804a-490b-97a4-d13d23fdfa96';

with ranked_scores as (
  select
    e.id,
    e.name,
    e.event_date,
    r.score,
    row_number() over (
      partition by e.id
      order by r.score
    ) as score_rank
  from public.events e
  join public.rounds r
    on r.event_id = e.id
  where e.team_id =
    '533b879d-804a-490b-97a4-d13d23fdfa96'
)
select
  name,
  event_date,
  count(*) as submitted_rounds,
  min(score) as low_score,
  sum(score) filter (
    where score_rank <= 4
  ) as four_player_team_score
from ranked_scores
group by
  id,
  name,
  event_date
order by event_date;

select
  concat(
    p.first_name,
    ' ',
    p.last_name
  ) as player,
  count(r.id) as rounds,
  round(avg(
    r.score - r.par
  ), 1) as average_to_par,
  min(r.score - r.par) as best_to_par,
  round(avg(r.putts), 1) as average_putts
from public.players p
left join public.rounds r
  on r.player_id = p.id
where p.team_id =
  '533b879d-804a-490b-97a4-d13d23fdfa96'
group by
  p.id,
  p.first_name,
  p.last_name
order by
  average_to_par nulls last,
  player;
