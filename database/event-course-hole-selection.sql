-- Allow events to reference a configured team course and select which holes to play.
-- Nullable columns preserve existing events with free-text courses.
alter table public.events
  add column if not exists course_id uuid references public.courses(id) on delete set null;

alter table public.events
  add column if not exists hole_selection text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_hole_selection_valid'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_hole_selection_valid
      check (hole_selection is null or hole_selection in ('front_9', 'back_9', 'full_18'));
  end if;
end
$$;

create index if not exists events_course_id_idx on public.events(course_id);

comment on column public.events.course_id is
  'Configured team course for structured event scoring; null for legacy or custom venues.';
comment on column public.events.hole_selection is
  'front_9 = holes 1-9, back_9 = holes 10-18, full_18 = holes 1-18; null for legacy or custom events.';
