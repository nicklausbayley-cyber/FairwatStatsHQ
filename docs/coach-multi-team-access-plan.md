# Fairway Stats HQ — Multi-Team Coach Access (Boys and Girls)

Status: **Design / implementation plan; NOT DEPLOYED**
Last reviewed: November 2026
Motivation: a coach who leads both boys and girls high-school golf teams needs **one login** and a simple team switcher, with strictly separated rosters, scores, seasons, and reporting.

## Findings in current code and live schema

- `public.profiles` has a single non-null `team_id` per Auth user; `id` is the Auth user ID.
- `lib/auth/get-current-team.ts` resolves exactly that `profiles.team_id`, and returns a single `team` and a single global `role`.
- The live RLS functions `public.current_team_id()`, `public.is_team_member(uuid)`, and `public.is_team_staff(uuid)` presently derive access from one profile's team ID.
- `app/api/onboarding/route.ts` uses `upsertProfile(... onConflict: "id")` to assign a coach/admin login to a team. Reusing an email for a second team **replaces the profile's original team assignment**.
- The header (`components/layout/site-header.tsx`) has no selected-team control.
- The dashboard (`lib/dashboard/dashboard.ts`) and coach insights loader (`lib/insights/load.ts`) already filter queries by `team.id`. Other routes must be audited individually for explicit filtering.
- There is no `team_memberships` or equivalent mapping table in the live `public` schema as of this review.

**Warning:** Do not add an existing coach to a second team using the current onboarding workflow; doing so may move that coach's default team assignment.

## Recommended MVP behavior

- One Supabase Auth account and password per person.
- A coach/admin may be linked to **many teams** (e.g. "Brookfield Central — Boys Golf" and "Brookfield Central — Girls Golf").
- The top header shows a **Team: [Boys Golf ▼]** selector **only** when the staff user has more than one active team assignment.
- Switching preserves the login but reloads team branding, dashboard, active season, roster, events, courses, rounds, statistics, Coach Insights, and player reports for the **newly selected team**.
- The selector must not be visible to players; each player stays in their assigned team. All cross-team lookup attempts must fail.
- Roles can be team-specific: one person may be `admin` for boys, `coach` for girls.
- Coaches do **not** get access to all teams in the school just because the school name matches; explicit assignment is required.
- Existing single-team accounts behave exactly as today.
- Team names already distinguish boys/girls; no change to athlete records and no immediate need for a gender enum.
- Sharing/copying golf courses between a school’s two teams is a separate later enhancement; MVP keeps course records team-scoped.

## Database design

Create `public.staff_team_access` (staff only; do not put players here):
- `user_id uuid not null references public.profiles(id) on delete cascade`
- `team_id uuid not null references public.teams(id) on delete cascade`
- `role public.user_role not null check (role in ('coach','admin'))`
- `created_at timestamptz not null default now()`
- `primary key (user_id, team_id)`
- an additional index on `team_id` for administration queries.

Backfill one membership from each existing `profiles` row with `role in ('admin','coach')`. This is additive and preserves existing primary/default `profiles.team_id` during rollout.

Security requirements:
1. Enable RLS on `staff_team_access`. Authenticated users may **SELECT only their own rows**. Do **not** grant unprivileged users direct INSERT, UPDATE, or DELETE. Only a privileged, server-side, platform-admin-controlled onboarding action grants/removes memberships.
2. Update the existing team-access RLS helpers so assigned staff can access their authorized team IDs. Preserve the legacy single-team path for players, and do not use user-editable JWT metadata.
3. Update the `teams` SELECT RLS policy from `id=current_team_id()` to a membership-aware predicate.
4. Audit `profiles` RLS: coach profiles anchored to a different home team may need limited visibility for a team where they also have a staff assignment, especially author/display fields. Never expand access to unrelated teams.
5. Audit any existing `SECURITY DEFINER` functions, owner, schema, and `search_path`. Do not expose a generic arbitrary-user membership checker; every access predicate must use authenticated `auth.uid()`.
6. Require both server checks and RLS. A user-supplied team ID, header, or cookie is **never** sufficient authorization.
7. Verify there is no service-role/secret-key path in browser code.

## Application changes

### Team context and selection

- Read `user` from Supabase Auth as today.
- Query authorized `staff_team_access` rows for `user.id` (players retain the legacy home-team context).
- Read preferred team ID from an HTTP-only, same-site, secure cookie. Validate it against the user's current memberships on **every request**; if invalid or revoked, fall back to an authorized default team. Do not trust it directly.
- Return `CurrentTeamContext` with the selected `team`, **membership-specific role**, `availableTeams`, and the same authenticated Supabase client.
- Server POST `/api/team-selection` accepts `teamId`, checks the logged-in user's actual membership, sets the selected-team cookie, returns the selected ID (not arbitrary redirects). Reject non-members with 403.
- In the header, render the dropdown only for staff with two or more authorized teams; switch using the server route, then navigate to `/dashboard` and `router.refresh()`.
- Use selected-team branding in the header; do not cache old-team pages across selection.

### Onboarding

- New staff: invite once, create `profiles` row once, create staff-team membership.
- Existing staff invited to another team: **insert a second staff-team membership**; do not upsert `profiles.team_id`, role, or account name over their current identity.
- Existing player email: do not silently convert the player to a coach or grant multi-team access. Block and surface a review-required message.
- Expose staff-team assignments in the platform onboarding console, with explicit add/remove controls. A coach does not self-assign.
- Revoked memberships should stop working immediately (server and RLS); previously selected cookie is invalidated/falls back.

### Data loaders and writes

- All team-scoped pages and APIs must pass `CurrentTeamContext.team.id` and explicitly apply `.eq("team_id", team.id)` where applicable; for `course_holes`, scope through verified course ownership.
- Confirm player score entry, roster editing, events, seasons, team branding, report generation, and statistics cannot use a posted ID to reference a different team.
- Do not duplicate any student/round data when attaching the same coach to another team.

## Safe rollout sequence

1. **Feature branch / preview only:** create SQL migration, update types, guard, selector, onboarding, and tests; do not touch live data.
2. Backfill and verify existing staff memberships in a nonproduction database.
3. Test a fictional coach assigned to boys and girls; test another coach and two players who each belong to only one team.
4. Check every major route and mutations on both teams. Verify selected team is reflected in UI and all database writes.
5. Run build, test suites, and explicit denied-access/RLS tests.
6. Review the migration and test evidence before promoting to production.
7. Deploy app and migration in compatible order; monitor a single-team account and a dual-team account.
8. Only then assign a real coach (including Luke, if desired) to a second team.

## Acceptance tests

- [ ] Existing single-team coaches log in and see their original team without a selector.
- [ ] Same coach has one login and can switch boys ↔ girls.
- [ ] Branding and active season update on switch.
- [ ] Boys roster, events, rounds, courses, statistics, reports, and Coach Insights never display on girls screens, and vice versa.
- [ ] A coach can create/edit a round on the selected authorized team without touching the other team.
- [ ] An authenticated coach cannot switch to an unassigned team by forging the request/cookie.
- [ ] A revoked team assignment cannot be used even with a stale selected-team cookie.
- [ ] A player cannot see the selector or any cross-team roster/round/notes data.
- [ ] Admin on one team and coach on another gets correct controls for each.
- [ ] Existing invitations, password setup, support-admin, and onboarding functions still work.
- [ ] Existing account cannot be moved accidentally by adding a second staff-team assignment.
- [ ] No production changes or customer data copies before preview and security testing.

## Files to change (anticipated)

- `database/migrations/` — new migration for memberships, RLS helpers, and backfill.
- `lib/supabase/types.ts` — membership table typings.
- `lib/auth/get-current-team.ts` — authorized selected team context.
- `app/api/team-selection/route.ts` — authenticated, validated team switch.
- `components/layout/site-shell.tsx`, `components/layout/site-shell-frame.tsx`, `components/layout/site-header.tsx` — selector and selected team labeling.
- `app/api/onboarding/route.ts` — add existing staff to a second team, not overwrite profile.
- `app/onboarding/onboarding-panel.tsx` — manage staff assignments.
- Data-access and permission tests, including real RLS checks.

**Not implemented yet.** This document records the evaluated architecture; no database or app behavior was changed by its creation.
