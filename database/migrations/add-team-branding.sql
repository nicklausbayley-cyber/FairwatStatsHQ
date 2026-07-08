alter table public.teams
  add column if not exists mascot text;

alter table public.teams
  add column if not exists primary_color text default '#166534';

alter table public.teams
  add column if not exists secondary_color text default '#111827';

alter table public.teams
  add column if not exists logo_url text;

alter table public.teams
  add column if not exists contact_email text;
