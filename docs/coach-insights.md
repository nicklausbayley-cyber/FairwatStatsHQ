# Coach Insights — Progressive Early-Season Analytics

Coaches open **Coach Insights** at `/coach-insights`. It is limited to the signed-in
coach/admin's currently selected team and **active season**, using existing Supabase
RLS and no service-role reads. The default view is **All 9/18** and **All rounds**;
there are also separate 9-hole/18-hole and Competition/Practice filters.

This release does not change the underlying stored scores, reports, or schema.

## Coach-facing data progression

| Team outings in selected view | What appears | Comparison |
| ---: | --- | --- |
| 0 | Empty-state prompt | No metrics |
| 1 | Recorded averages and supported early practice observations | No trend claim |
| 2–3 | Early indications, clearly labeled as a small sample | Latest 1 outing vs preceding 1 |
| 4–5 | Preliminary trends | Latest 2 vs previous 2 |
| 6+ | Established comparisons | Latest 3 vs previous 3 |

An **outing** means an event on one played date, or the played date of unattached
rounds. Six players entering one match creates **one team outing**, not six.
Individual player comparisons use the player's own outings in the selected view,
so a developing player can have a trend even before six separate team matches.

These labels describe **data volume**, not a statistical confidence interval.
Threshold sizes remain explicit, and performance changes are described rather
than presented as proven effects of a practice plan.

## Calculation contract and data quality

- Each score must be a validated, completed 9- or 18-hole round. Summary-only
  submissions lack a draft flag and are considered complete.
- When hole records exist, all scheduled holes must be present, contiguous and
  sum to the submitted round score. Hole-derived optional stats require complete
  relevant-hole coverage. Invalid totals and partial metrics do not become zero.
- One submission per player/outing: use the latest `created_at`, with round ID
  as a stable tie-break. Multiple rounds in one event on the same date cannot
  be distinguished by the current schema.
- Comparison windows are selected **first**, and missing data cannot backfill
  them with older records. Each metric needs a valid value from comparable
  players in every selected outing to produce a supported trend.
- A player is **comparable** for a metric when they have a valid observation
  in both the recent and earlier windows. They do **not** need to appear in
  every outing. Team metric values are calculated from that overlapping group
  when a supported comparison exists; otherwise they display available recent
  values only (no false improvement claim). Lineup changes are shown explicitly.
- GIR/FIR pool hits and valid opportunities across recorded rounds; a recorded
  zero is retained. Three-putts and penalties are normalized to 18-hole
  equivalents. Par-three holes do not count as FIR opportunities.
- Practice priorities after a single outing are conservative, **evidence-first
  review prompts** triggered by actually recorded three-putts or penalties,
  not claims of worsening performance. Once comparative trends are available,
  supported unfavorable changes take precedence in the priority ranking.
- Team snapshots, player trends, and watchlists are never generated for a
  metric with no usable evidence.

## Nine holes, eighteen holes, and combined development

- **9-hole** and **18-hole** views retain separate original-format scoring
  and putting averages and format-specific thresholds.
- **All 9/18** does **not** average raw 9-hole scores directly with 18-hole
  scores. Gross score and putts are normalized per nine holes, e.g., 84 over
  18 becomes a gross nine-hole equivalent of 42. FIR/GIR remain percentages
  from pooled opportunities. Penalties and three-putts are per 18 equivalent.
- If the submitted round `par` or complete hole-level par is present, an
  independent **relative-to-par per nine** descriptive number is displayed.
  Missing par is excluded rather than assumed; par-relative and gross scores
  are never averaged together.
- These are **not** course-rating, slope, weather, or handicap adjustments.
  Coaches should consider conditions when interpreting an observed change.

## Practice and competition sources

- **All rounds** includes all valid scored rounds in the selected season/format.
- **Competition** is match, invitational, and tournament events only.
- **Practice** is explicit practice events plus rounds with no event attached.
  These unattached rounds are labeled **practice/unattached**, since a
  finer-grained source flag is not present in the schema.
- Qualifiers and other unrecognized events remain in All but are not silently
  called official competitions or practices.
- Recorded competitions and practices are separately countable and filterable.

## Low-four contribution

The existing low-four estimate remains single-format. It requires competition
outings (match, invitational, tournament) with at least four eligible golfers
and a valid fourth-score boundary. Practices, qualifiers, mixed-format
competition outings, incomplete cards, and unresolved fourth-place ties are
excluded. The latest six eligible competition outings are used. A player needs
at least three appearances and a low-four result in at least 80% of those team
outings to receive the estimate. It is not an official scorecard counting flag
or varsity/JV lineup decision, and it does not appear in the mixed format view.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm test:insights
pnpm build
```

The progressive suite exercises day-one metrics, 2/4/6 outing windows,
changing players, unmatched-roster suppression, 9/18 score normalization,
known par, practice/competition separation, missing stats, and rendered UI.
Existing tests continue covering complete hole cards, duplicate submissions,
low-four eligibility, auth boundaries, pagination, and team/season isolation.

No production data migration is needed. Feature implementation should be
validated on a preview before release. `Coach Insights` cannot infer
causality or assign a practice priority without a recorded supporting metric.
