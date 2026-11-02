-- Run as a reviewed migration before enabling the support console.
-- This table is deliberately not accessible to normal application users.
create table if not exists public.support_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  actor_email text not null,
  team_id uuid not null references public.teams(id),
  action text not null,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists support_audit_logs_team_created_idx
  on public.support_audit_logs(team_id, created_at desc);
alter table public.support_audit_logs enable row level security;
revoke all on public.support_audit_logs from anon, authenticated;
-- The server-only service role can write/read audit records.
