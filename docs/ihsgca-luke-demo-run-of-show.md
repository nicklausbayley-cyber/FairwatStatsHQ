# Fairway Stats HQ — IHSGCA / Luke Demo Run of Show

**Target:** Wednesday, November 4, 2026 (meeting time and invite still to confirm)
**Length:** 20 minutes
**Demo environment:** Riverside Eagles Golf, 2026 Spring Season
**Audience:** Luke Richison (IHSGCA Past-President, per his October 26 email signature) / Indiana high school golf coaching conversation
**Status:** Draft presenter guide. Riverside data cleaned and reviewed October 28; fictional demonstration data only.

## The one sentence to remember

Fairway Stats HQ complements existing scoring tools: it helps coaches understand *which golfers contribute relative to their teammates, how that changes over time, and where to focus practice*.

**Primary objective:** Elicit Luke's feedback and seek introductions to a small group of Indiana boys-golf coaches. Do not make an endorsement, sponsorship, or association partnership sound preapproved.

## Tabs to open before the call

1. Signed-in Riverside: https://app.fairwaystatshq.com/dashboard
2. Nate Jones player profile: https://app.fairwaystatshq.com/players/fdf15dda-6cee-4874-9181-5db59c447bea
3. Caleb Price player profile: https://app.fairwaystatshq.com/players/aee20c3c-b792-4a31-917d-71760c0773f4
4. Coach Insights, nine holes: https://app.fairwaystatshq.com/coach-insights?holes=9
5. Coach Insights, 18 holes (optional backup): https://app.fairwaystatshq.com/coach-insights?holes=18

Riverside is an intentionally fictional demo team. The May 27 and June 12 demo practices were refined October 28; historical/competitive rounds and lineup eligibility flags were retained.

## 20-minute agenda and presenter notes

### 0:00–2:00 | Why it exists (no screen-sharing required yet)

> My dad coaches high school golf in Indiana, and this started with a question that probably sounds familiar: how do we move beyond a scorebook or spreadsheet and actually see which players are improving, which ones contribute to the team score, and what to practice? That's why I built Fairway Stats HQ. It isn't meant to replace iWanamaker or tournament reporting; it's a coaching and player-development layer on top of recorded scores.

Transition: "Let me show you one coaching decision you could make with it."

### 2:00–6:00 | Dashboard → Lineup Performance

**Open:** /dashboard and scroll past the KPI cards to **Lineup Performance** (“Who is contributing to the team score?”).

Show the **Counting Differential**, **Counting %**, **Last 5 Diff.**, and **Trend** columns.

> A lower score is useful, but a coach needs to know how that score compares with the other golfers who were playing in the same event. We compare each golfer with the team's fourth-lowest score for that outing. That helps show lineup contributions rather than raw scoring averages alone.

Then point specifically to **Nate Jones** and **Caleb Price**:

| Metric from current Riverside lineup engine | Nate Jones | Caleb Price |
| --- | ---: | ---: |
| Counting percentage (relative low-four indicator) | 60% | 40% |
| Average counting differential (9-hole equivalent) | -0.1 | +0.9 |
| Last-five differential (9-hole equivalent) | 0.0 | +0.9 |
| Relative trend | Improving | Cooling |
| Nine-hole scoring average | 41.2 | 42.2 |
| Eighteen-hole scoring average | 85.4 | 87.4 |

These are fictional demo values, derived from 66 lineup-eligible Riverside rounds across 10 outings on October 28. Dashboard trend compares the latest three relative performances with the previous three; it is *not* a raw-score trend.

Important nuance: **Counting % is a relative fourth-scorer proxy, not a certified official “counted in tournament team total” record.** The lineup screen uses rounds flagged eligible for lineup analysis, which can include qualifiers and practices.

### 6:00–9:00 | The coach's decision: Nate vs. Caleb

**Open:** Nate and Caleb player profiles if useful, or stay on the lineup grid for speed.

Use two concrete outings to show why the analysis is valuable, not to declare a permanent winner:

- **Senior Night Match, May 20 (9 holes):** The team's fourth-lowest score was **40**. Nate shot **38**, two strokes better than the threshold; Caleb shot **41**, one stroke above it.
- **Sectional Championship, June 5 (18 holes):** The fourth-lowest score was **85**. Caleb shot **85** (at the threshold), while Nate shot **86** (one above it).

> This is what I want the coach to see: players move in and out of the low-four picture. Nate has the stronger relative contribution and improving trend overall, but Caleb contributed in the sectional example. The next lineup decision should consider the latest evidence, course conditions, and the coach's judgment — not one average or an algorithm automatically selecting the lineup.

Ask Luke: "Would this be useful for the conversations your coaches have about their fourth, fifth, and sixth golfers?"

### 9:00–14:00 | Coach Insights → what to practice next

**Open:** /coach-insights?holes=9.

Show in this order:
1. **Your team's recent form / Team Snapshot**.
2. **Recommended Practice Focus** (course management / penalty-stroke signals if displayed).
3. **Trending Up / Needs Attention**.
4. **Players to Watch**.
5. Point out **Print Report**; do not linger on the implementation.

For the nine-hole matched group, the average score decreased from **41.0 to approximately 39.5**, an improvement of **1.5 strokes per golfer per nine-hole round** across the three most recent outings versus the preceding three. Course management appears as a *player-focused* practice area in the underlying data because individual penalty rates increased; the team penalty change by itself does not cross the rule's threshold.

> Rather than hunting through spreadsheets, a coach can see what changed, what may need attention, and which specific conversations or practice themes to consider. These are evidence-based flags, not a guarantee that the software knows the cause.

Caveats to answer accurately:
- Team comparisons require **six distinct outings** and a matched cohort with complete data.
- Differences in course difficulty, weather, and opponent strength **are not adjusted automatically**.
- The insights engine uses deterministic rules on recorded statistics, not an external AI model.
- Nine- and eighteen-hole views are kept separate for Coach Insights.
- If a particular section is empty, do **not** promise a recommendation; explain that it is evidence-dependent.

### 14:00–20:00 | IHSGCA feedback and concrete next step

Stop screen-sharing so Luke can speak. Ask, in this order as time permits:

1. "How are most Indiana boys-golf coaches tracking individual performance today? Is the issue collecting data, interpreting it, or both?"
2. "Which part would be most useful for a smaller program with one coach: lineup decisions, player trends, or practice planning?"
3. "What would make coaches hesitant to adopt another tool, even if it complements tournament scoring?"
4. "Would you feel comfortable introducing me to five or ten Indiana coaches who might be willing to review it before their spring season?"
5. "If the response is positive, is a short demo during an association touchpoint or a resource/newsletter mention something worth discussing?"

**The specific ask:** a small, permission-based feedback cohort and the appropriate next introduction. Luke signs as **IHSGCA Past-President**; do **not** assume he can directly approve an association partnership, and do **not** push for an IHSGCA endorsement on this first conversation.

Possible close:

> This has been helpful. I'm trying to validate it with real Indiana coaches before spring, not just put another product in front of them. If there are five to ten coaches you think would give candid feedback, I'd appreciate the introduction. I can follow up with a short overview and a sample Coach Insights report that you could review first.

## Answers to likely questions

**"How is this different from iWanamaker?"**
We aren't replacing tournament scoring, leaderboards, or required reporting. Fairway Stats HQ focuses on coach-facing longitudinal trends, fourth-scorer-relative lineup contribution, and practice priorities.

**"Does this handle tough courses better?"**
It compares golfers within the **same outing** using the fourth score, which reduces the distortion of comparing raw scores from different outings. However, it is **not a true course-rating or weather-adjusted difficulty model**, and the displayed differential is **not a statistical standard deviation**. Explain these limits plainly.

**"Will this choose my varsity lineup?"**
No. It is decision support. Coaches still choose the lineup using performance, context, attendance, team dynamics, and their judgment.

**"How much data is needed for Coach Insights?"**
Six outings in the selected 9- or 18-hole format, with the compared stat recorded for matching players; the system is transparent when the baseline is incomplete.

**"Does a score marked 'counting' reflect an official posted team total?"**
Not necessarily. Dashboard counting percentage is an estimate from the fourth-lowest same-outing score and the flagged lineup-eligible rounds. Official team tie-break or lineup records aren't stored in that metric.

**"What about setup?"**
Walk coaches through the five Coach Welcome Center milestones: account, school branding, active season, roster, and first event. Avoid promising automated imports/integrations not yet delivered.

## Meeting-day checklist

- [ ] Confirm exact November 4 time and send/verify the Google Meet invitation. Gmail shows Luke offered Wednesday (all day) or Thursday morning and you promised the invitation; no final time is established in that thread as of October 28.
- [ ] Sign in as Riverside coach and verify the 2026 Spring Season loads.
- [ ] Check Nate and Caleb appear in Lineup Performance and numbers match the table, allowing for UI rounding.
- [ ] Open 9-hole Coach Insights and confirm summary, practice priority, and watchlist display.
- [ ] Actually print/save one Coach Insights report to PDF and inspect page layout, dates, school branding, and any blank sections.
- [ ] Prepare a copy of overview/pricing sheets **off-screen**; show only if asked.
- [ ] Keep a backup static report/screenshot available if the live app fails.
- [ ] Test meeting audio/screen share; limit app demo to 12 minutes so discussion still fits.
- [ ] Record Luke's objections, pilot interest, and agreed next action immediately after the call.

## Technical references (internal only)

- Dashboard lineup code: `components/dashboard/dashboard-overview.tsx` and `lib/dashboard/lineup-performance.ts`
- Coach Insights: `docs/coach-insights.md` and `lib/insights/engine.ts`
- Riverside-only presentation update: `database/demo/polish-riverside-ihsgca-demo.sql`

Last revised: October 28, 2026. No production code changes are required for this walkthrough.
