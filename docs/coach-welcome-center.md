# Coach Welcome Center (phase 1)

Route: /setup. Accessible to authenticated coach/admin roles using the same requireTeamStaff guard as the dashboard. Player accounts go to score entry. /onboarding remains platform-admin-only.

## Five automatic milestones

1. Account active - signed-in Supabase session.
2. Team branding - school name, logo URL and two six-digit colors saved in the team's record. A logo is required for this milestone, not to use the rest of the app.
3. Active season - a team-owned season marked active.
4. Roster - at least one active player for the current team.
5. First event - at least one event assigned to the team's active season. Events from previous seasons do not count.

The Setup Center calculates milestones automatically on each page visit. No manual checkboxes or new database schema. Coaches can use the normal pages while setup is incomplete. Links lead to the existing Settings, Roster and Events pages.

After completion, a ready banner and three Getting Started links appear prominently. The completed checklist remains available inside an expandable section.

## Sign-in and navigation

Incomplete staff accounts are sent to /setup after sign-in; complete staff accounts go to /dashboard. An existing session visiting /login follows the same decision. The Setup link stays in the staff navigation. Player and platform admin routing is unchanged.

## Security

- requireTeamStaff protects /setup.
- Counts use the authenticated team's RLS-enabled Supabase session, not service-role credentials.
- Both player and event queries filter team_id; event queries also filter active season_id.
- /api/setup/status requires authenticated staff access and returns readiness, not roster information.
- Read errors are shown as unavailable and never falsely counted as done.

## Manual acceptance checks

- Fresh coach team: 1/5 (account only).
- Save branding, active season and player; progress rises as corresponding records appear.
- First active-season event completes 5/5; an event in another season must not.
- Switch to a new active season with no events: fifth milestone reopens.
- Completed coach login goes to Dashboard. Incomplete coach login goes to Setup.
- Player role cannot open Setup or its status API.
- Platform admin's existing onboarding flow is unaffected.
- Verify mobile and desktop cards and the completed checklist expansion.

## Validation

pnpm install --frozen-lockfile
pnpm test:setup
pnpm test:insights
pnpm lint
pnpm build

The setup tests cover completion thresholds, branding, season scoping, invalid counts and signed-in status. Production should be updated only after the coach preview is reviewed.