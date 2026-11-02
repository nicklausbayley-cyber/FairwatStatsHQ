-- Internal support course administration.
-- Read: authenticated accounts explicitly granted in private.support_readers.
-- Write: server-only service role, with an explicit support actor and atomic audit log.
-- Preview does NOT have the service-role key and MUST remain read-only.

create or replace function private.support_team_courses_internal(target_team_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $function$
declare
  team_name text;
  course_records jsonb;
begin
  if (select auth.uid()) is null or not exists (
    select 1 from private.support_readers reader where reader.user_id = (select auth.uid())
  ) then
    raise exception 'Support course access denied' using errcode = '42501';
  end if;

  select team.name into team_name
  from public.teams team
  where team.id = target_team_id;
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', course.id,
    'name', course.name,
    'location', course.location,
    'holes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'holeNumber', hole.hole_number,
        'par', hole.par,
        'handicap', hole.handicap,
        'yardage', hole.yardage
      ) order by hole.hole_number)
      from public.course_holes hole
      where hole.course_id = course.id
    ), '[]'::jsonb)
  ) order by course.name, course.id), '[]'::jsonb)
  into course_records
  from public.courses course
  where course.team_id = target_team_id;

  return jsonb_build_object(
    'team', jsonb_build_object('id', target_team_id, 'name', team_name),
    'courses', course_records
  );
end;
$function$;

revoke all on function private.support_team_courses_internal(uuid) from public, anon, authenticated;
grant execute on function private.support_team_courses_internal(uuid) to authenticated;

create or replace function public.support_team_courses(target_team_id uuid)
returns jsonb
language sql stable security invoker
set search_path = ''
as $function$
  select private.support_team_courses_internal(target_team_id);
$function$;

revoke all on function public.support_team_courses(uuid) from public, anon;
grant execute on function public.support_team_courses(uuid) to authenticated;

-- A single RPC statement saves metadata, all holes, and its audit record.
-- Any failure rolls back the full transaction; previous hole rows retain their IDs.
create or replace function public.support_save_course(
  p_actor_id uuid,
  p_team_id uuid,
  p_course_id uuid,
  p_name text,
  p_location text,
  p_holes jsonb
)
returns uuid
language plpgsql volatile security invoker
set search_path = ''
as $function$
declare
  v_actor_email text;
  v_course_id uuid;
  v_name text := trim(coalesce(p_name, ''));
  v_location text := nullif(trim(coalesce(p_location, '')), '');
  v_count integer;
  v_distinct integer;
  v_first integer;
  v_last integer;
  v_invalid integer;
  v_before jsonb;
  v_action text;
begin
  select lower(u.email) into v_actor_email
  from auth.users u
  where u.id = p_actor_id and u.email_confirmed_at is not null;

  if v_actor_email is null or not exists (
    select 1 from private.support_readers reader where reader.user_id = p_actor_id
  ) then
    raise exception 'Support actor is not authorized' using errcode = '42501';
  end if;

  if p_team_id is null or not exists (
    select 1 from public.teams t where t.id = p_team_id
  ) then
    raise exception 'Team not found' using errcode = '22023';
  end if;

  if length(v_name) < 1 or length(v_name) > 150
     or length(coalesce(v_location, '')) > 200 then
    raise exception 'Course name or location is invalid' using errcode = '22023';
  end if;

  if p_holes is null or jsonb_typeof(p_holes) <> 'array'
     or jsonb_array_length(p_holes) not in (9, 18) then
    raise exception 'Course must have exactly 9 or 18 holes' using errcode = '22023';
  end if;

  select count(*), count(distinct h.hole_number), min(h.hole_number), max(h.hole_number),
    count(*) filter (where h.hole_number is null
      or h.par is null or h.par not between 3 and 6
      or (h.handicap is not null and h.handicap not between 1 and 18)
      or (h.yardage is not null and h.yardage <= 0))
  into v_count, v_distinct, v_first, v_last, v_invalid
  from jsonb_to_recordset(p_holes) as h(
    hole_number integer, par integer, handicap integer, yardage integer
  );

  if v_count not in (9, 18) or v_distinct <> v_count
     or v_first <> 1 or v_last <> v_count or v_invalid <> 0 then
    raise exception 'Invalid course hole setup' using errcode = '22023';
  end if;

  if p_course_id is null then
    insert into public.courses (team_id, name, location)
    values (p_team_id, v_name, v_location)
    returning id into v_course_id;
    v_action := 'course.create';
  else
    select c.id, jsonb_build_object(
      'name', c.name,
      'location', c.location,
      'holes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'hole_number', hole.hole_number,
          'par', hole.par,
          'handicap', hole.handicap,
          'yardage', hole.yardage
        ) order by hole.hole_number)
        from public.course_holes hole where hole.course_id = c.id
      ), '[]'::jsonb)
    ) into v_course_id, v_before
    from public.courses c
    where c.id = p_course_id and c.team_id = p_team_id
    for update of c;

    if v_course_id is null then
      raise exception 'Course not found for selected team' using errcode = '22023';
    end if;

    update public.courses
    set name = v_name, location = v_location
    where id = v_course_id and team_id = p_team_id;
    v_action := 'course.update';
  end if;

  insert into public.course_holes (course_id, hole_number, par, handicap, yardage)
  select v_course_id, h.hole_number, h.par, h.handicap, h.yardage
  from jsonb_to_recordset(p_holes) as h(
    hole_number integer, par integer, handicap integer, yardage integer
  )
  on conflict (course_id, hole_number)
  do update set
    par = excluded.par,
    handicap = excluded.handicap,
    yardage = excluded.yardage;

  -- Only needed when changing an existing 18-hole course to 9 holes.
  delete from public.course_holes
  where course_id = v_course_id and hole_number > v_count;

  insert into public.support_audit_logs (
    actor_id, actor_email, team_id, action, target_id, details
  ) values (
    p_actor_id, v_actor_email, p_team_id, v_action, v_course_id,
    jsonb_build_object(
      'before', v_before,
      'after', jsonb_build_object(
        'name', v_name, 'location', v_location,
        'hole_count', v_count, 'holes', p_holes
      )
    )
  );

  return v_course_id;
end;
$function$;

-- No signed-in or anonymous client can call the privileged writer directly.
revoke all on function public.support_save_course(uuid,uuid,uuid,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.support_save_course(uuid,uuid,uuid,text,text,jsonb)
  to service_role;

comment on function public.support_save_course(uuid,uuid,uuid,text,text,jsonb)
  is 'Transactional internal course and hole setup with support actor validation and audit; service_role only.';
