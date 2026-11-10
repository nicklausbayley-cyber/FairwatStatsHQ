import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync("database/migrations/add-staff-team-access.sql", "utf8").toLowerCase();

test("membership table uses RLS and grants only read access to ordinary users", () => {
  assert.match(sql, /create table if not exists public\.staff_team_access/);
  assert.match(sql, /alter table public\.staff_team_access enable row level security/);
  assert.match(sql, /using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /revoke all on public\.staff_team_access from public, anon, authenticated/);
  assert.match(sql, /grant select on public\.staff_team_access to authenticated/);
  assert.doesNotMatch(sql, /grant (insert|update|delete|all).*public\.staff_team_access to authenticated/);
});

test("privileged onboarding has explicit write grants for modern Supabase API defaults", () => {
  assert.match(sql, /grant select, insert, update, delete on public\.staff_team_access to service_role/);
});

test("migration safely backfills existing staff without moving profiles", () => {
  assert.match(sql, /insert into public\.staff_team_access\(user_id, team_id, role\)/);
  assert.match(sql, /from public\.profiles\s+where role in \('coach', 'admin'\)/);
  assert.match(sql, /on conflict \(user_id, team_id\) do nothing/);
  assert.doesNotMatch(sql, /update public\.profiles\s+set/);
});

test("team membership helpers validate the authenticated account and current staff role", () => {
  for (const func of ["is_team_member", "is_team_staff"]) {
    const marker = `create or replace function public.${func}(target_team_id uuid)`;
    assert.ok(sql.includes(marker), `Missing ${func}`);
    const section = sql.split(marker)[1]?.split("$$;")[0] ?? "";
    assert.match(section, /security definer set search_path = ''/);
    assert.match(section, /auth\.uid\(\)/);
    assert.match(section, /join public\.profiles p on p\.id = sta\.user_id/);
    assert.match(section, /p\.role in \('admin', 'coach'\)/);
    assert.match(section, /sta\.team_id = target_team_id/);
  }
});

test("team and profile read policies derive access from membership helpers", () => {
  assert.match(sql, /create policy "team members can read their team"\s+on public\.teams/);
  assert.match(sql, /using \(public\.is_team_member\(id\)\)/);
  assert.match(sql, /using \(\(select auth\.uid\(\)\) = id or public\.is_team_member\(team_id\)\)/);
  assert.match(sql, /drop policy if exists "team staff can manage profiles"/);
});
