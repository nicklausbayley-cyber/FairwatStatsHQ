# Coach Insights v1

Staff can open **Coach Insights** at `/coach-insights`. It uses the current
team's active season and defaults to nine-hole rounds. The format links select
nine or eighteen holes. **Print Report** uses the browser's print/PDF workflow.
No database migration, external AI service, or new production dependency is
required. Automated emails and self-service onboarding are later work.

## Calculation contract

- A team outing is an event plus its played date, or the played date for
  unattached rounds. Multi-day events therefore provide separate outings.
- A player has one round per outing: the latest submission by `created_at`,
  with round ID as a stable tie-break. Multiple same-day rounds at the same
  event cannot be distinguished by the current schema.
- The recent window is the latest three completed outings; the baseline is
  the previous three. Windows are chosen before checking metric coverage.
  Missing metrics do not backfill the window with older rounds.
- Each team metric includes only players with valid values in all six outings.
  This holds participation constant. The snapshot uses the matched cohort when
  a comparison exists; otherwise it shows recorded recent values without a delta.
  Different metrics may have different cohorts, displayed on each card.
- Player trends use that player's own last six completed outings, in the
  selected format. A single outing with several players cannot satisfy a
  team's six-outing requirement.
- Scoring and putt totals compare the same round format. FIR/GIR use pooled
  hit/opportunity totals. Percentages are displayed as percentages; their
  changes and thresholds are **percentage points**, not relative percentages.
- Three-putts and penalties are normalized to eighteen-hole equivalents before
  averaging. A nine-hole total of one becomes two per eighteen holes.
- `null`, nonfinite values, and invalid totals are excluded from that metric.
  Actual recorded zeroes are retained. Manual GIR must cover the scheduled
  number of holes; FIR opportunities must be positive and at most that number.
- Summary-only submissions have no draft/completion status in the existing
  schema and are treated as completed scored rounds. When hole rows exist,
  all scheduled holes must be present, unique, contiguous, and sum to the round
  score. Optional hole-level stats must be present on every relevant hole to
  qualify. Par threes do not count as FIR opportunities. Partial metric totals
  cannot override that coverage check.

| Metric | Nine holes | Eighteen holes | Favorable direction |
| --- | ---: | ---: | --- |
| Score | 1.0 stroke | 2.0 strokes | Lower |
| GIR | 8 percentage points | 8 percentage points | Higher |
| FIR | 10 percentage points | 10 percentage points | Higher |
| Putts | 0.75 putts | 1.5 putts | Lower |
| Three-putts | 0.75 per 18 equivalent | 0.75 per 18 | Lower |
| Penalties | 0.75 per 18 equivalent | 0.75 per 18 | Lower |

Each generated insight exposes recent and baseline values, its delta, threshold
severity (`abs(delta) / threshold`), sample size, player count, dates, and the
exact contributing round IDs. Two positive and two negative team cards are
displayed. The watchlist contains up to four unique players, choosing each
player's strongest supported observation.

## Practice priorities and summary

Negative GIR, FIR, putting, and penalty signals map to approach play, tee-shot
accuracy, putting, and course management. Three-putts and putts share one
practice category; the stronger signal determines its severity. A supported
team signal takes precedence within a category. If none exists, a player's
signal may appear explicitly labeled **Player focus**. The three highest
category severities are shown.

The summary states supported changes without claiming causation. Advice does
not infer approach distances, miss direction, or strokes lost from stats that
do not measure them. Course difficulty, conditions, and opponent strength are
not adjusted. Coaches should review those contexts before acting.

## Low-four contribution estimates

Match, invitational, and tournament outings are eligible when at least four
unique players have complete scores in one format. Practice and qualifier
outings, mixed formats, invalid participants, and ties at the fourth-score
boundary are skipped. The last six eligible team competition outings provide
the denominator, including outings a player missed. A player needs at least
three appearances and a low-four score in at least 80% of those team outings
to receive an observation.

These are estimates from the entered scores, not official counted-score
records: there is no varsity/JV lineup or tie-break metadata in the database.
`counts_toward_lineup` controls the existing last-five qualification ranking;
it does not establish whether a competition score counted and is not used for
this estimate. Existing event reports are unchanged.

## Authorization and data loading

Both the page guard and loader require a coach/admin role. Queries use the
authenticated Supabase client with existing RLS, explicit team filters, and
active-season filters on rounds and events. There is no service-role access
and no fallback to combining seasons when an active season is missing.

The loader pages each collection in batches of 500 and fetches hole rows in
round-ID batches of 100. A failure on any page fails the report, rather than
producing a partial baseline. Score create/edit/delete, roster/event updates,
and season changes revalidate the Coach Insights page.

## Validation

```bash
pnpm install --frozen-lockfile
pnpm test:insights
pnpm lint
pnpm build
```

The tests use Node's built-in test runner after compiling TypeScript into the
ignored `.test-build` directory. They cover fixed windows, roster changes,
format separation, missing/zero/partial stats, weighted percentages, duplicates,
counting eligibility, severity ranking, pagination, staff access, team/season
boundaries, and rendered-page content. A real production build requires the
app's existing Supabase environment variables.

## Completing the Riverside demo baseline

The existing Riverside coach demo contains five outings per format. Run
`database/demo/add-coach-insights-validation-outings.sql` in the Supabase SQL
Editor to append one clearly labeled synthetic practice outing per format,
then refresh the preview. It checks the exact demo team ID, name, school,
contact address, coach profile, and active season before changing any data.
The operation is transactional and reruns skip the two existing validation
events. It never replaces existing events, players, rounds, or hole scores.

The new summary rounds include complete stats with deliberate changes for
testing positive cards and practice priorities. They are labeled synthetic in
event names and round notes, marked ineligible for lineup qualification, and
excluded from low-four competition estimates because the events are practice.
This script is optional demo data, not a database migration or customer data.
