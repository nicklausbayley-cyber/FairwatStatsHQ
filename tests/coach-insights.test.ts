import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CoachInsightsView } from "../components/insights/coach-insights-view";
import type { CurrentTeamContext } from "../lib/auth/get-current-team";
import { aggregateMetric, groupOutings, normalizeRounds } from "../lib/insights/aggregate";
import { buildCoachInsights, type CoachInsightsInput } from "../lib/insights/engine";
import { loadCoachInsights, readAllPages } from "../lib/insights/load";
import { METRIC_RULES } from "../lib/insights/rules";
import type { InsightHoleRow, InsightPlayer, InsightRoundRow } from "../lib/insights/types";

const players: InsightPlayer[] = Array.from({ length: 6 }, (_, i) => ({
  id: `p${i + 1}`, first_name: `Player${i + 1}`, last_name: "Test"
}));

function round(day: number, player = "p1", patch: Partial<InsightRoundRow> = {}): InsightRoundRow {
  const date = `2026-04-${String(day).padStart(2, "0")}`;
  return {
    id: `${player}-day${day}`, team_id: "team-a", season_id: "season-a",
    player_id: player, event_id: `event${day}`, played_on: date,
    created_at: `${date}T18:00:00Z`, holes: 9, score: 45, putts: 18,
    fairways_hit: 4, fairways_possible: 7, greens_in_regulation: 4,
    gir_possible: 9, penalties: 1, three_putts: 1, ...patch
  };
}

function input(rounds: InsightRoundRow[], patch: Partial<CoachInsightsInput> = {}): CoachInsightsInput {
  return {
    rounds, holeRows: [], players,
    events: Array.from({ length: 10 }, (_, i) => ({ id: `event${i + 1}`, event_type: "match" as const })),
    holes: 9, ...patch
  };
}

function sixRounds(patch: (day: number) => Partial<InsightRoundRow> = () => ({})) {
  return Array.from({ length: 6 }, (_, i) => round(i + 1, "p1", patch(i + 1)));
}

function holeRows(id: string, count = 9): InsightHoleRow[] {
  return Array.from({ length: count }, (_, i) => ({
    round_id: id, hole_number: i + 1, par: 4, score: 4,
    putts: 2, fir: true, gir: true, penalty: 0
  }));
}

test("a roster of six players in one event is one outing, not a six-round trend", () => {
  const report = buildCoachInsights(input(players.map((p, i) => round(1, p.id, { score: 40 + i }))));
  assert.equal(report.teamOutings, 1);
  assert.equal(report.snapshot.scoring.ready, false);
  assert.equal(report.allInsights.length, 0);
});

test("separate 3 + 3 windows trigger the agreed scoring change at the exact threshold", () => {
  const report = buildCoachInsights(input(sixRounds((day) => ({ score: day <= 3 ? 45 : 44 }))));
  assert.equal(report.snapshot.scoring.baselineValue, 45);
  assert.equal(report.snapshot.scoring.recentValue, 44);
  assert.equal(report.snapshot.scoring.delta, -1);
  assert.equal(report.trendingUp[0].category, "scoring");
  assert.equal(report.trendingUp[0].severity, 1);
  assert.deepEqual(report.trendingUp[0].evidence.recentRoundIds, ["p1-day6", "p1-day5", "p1-day4"]);
  assert.equal(report.trendingUp[0].sampleSize, 6);
});

test("changes below the threshold stay quiet, even with complete samples", () => {
  const report = buildCoachInsights(input(sixRounds((day) => ({ score: day === 6 ? 44 : 45 }))));
  assert.equal(report.snapshot.scoring.ready, true);
  assert.equal(report.trendingUp.length, 0);
  assert.equal(report.needsAttention.length, 0);
  assert.match(report.summary, /No team changes/);
});

test("18-hole thresholds and format separation prevent 9-hole scores from creating a false trend", () => {
  const nine = sixRounds();
  const eighteen = sixRounds((day) => ({ id: `18-${day}`, holes: 18, score: day <= 3 ? 90 : 88, gir_possible: 18 }));
  const report = buildCoachInsights(input([...nine, ...eighteen], { holes: 18 }));
  assert.equal(report.snapshot.scoring.threshold, 2);
  assert.equal(report.snapshot.putting.threshold, 1.5);
  assert.equal(report.snapshot.scoring.delta, -2);
  assert.equal(report.completedRounds, 6);
  assert.ok(report.snapshot.scoring.evidence.recentRoundIds.every((id) => id.startsWith("18-")));
});

test("a change of roster cannot masquerade as a team scoring improvement", () => {
  const rounds = sixRounds().map((r, i) => i < 3 ? r : { ...r, player_id: "p2", score: 35 });
  const report = buildCoachInsights(input(rounds));
  assert.equal(report.snapshot.scoring.ready, false);
  assert.equal(report.snapshot.scoring.baselineValue, null);
  assert.equal(report.trendingUp.length, 0);
});

test("team comparisons hold the matched cohort constant while players use their own round windows", () => {
  const stable = sixRounds();
  const newPlayer = [4, 5, 6].map((day) => round(day, "p2", { score: 30 }));
  const report = buildCoachInsights(input([...stable, ...newPlayer]));
  assert.equal(report.snapshot.scoring.recentValue, 45);
  assert.equal(report.snapshot.scoring.delta, 0);
  assert.equal(report.snapshot.scoring.evidence.playerCount, 1);
  const individual = sixRounds((day) => ({ event_id: null, player_id: "p3", id: `individual-${day}`, played_on: `2026-05-0${day}`, score: day <= 3 ? 48 : 43 }));
  const extended = buildCoachInsights(input([...stable, ...newPlayer, ...individual]));
  assert.ok(extended.playerWatchlist.some((item) => item.playerId === "p3" && item.category === "scoring"));
});

test("FIR uses pooled opportunities instead of averaging player percentages", () => {
  const a = sixRounds((day) => ({ fairways_hit: day <= 3 ? 3 : 4 }));
  const b = sixRounds((day) => ({ id: `p2-${day}`, player_id: "p2", fairways_possible: 4, fairways_hit: day <= 3 ? 4 : 1 }));
  const report = buildCoachInsights(input([...a, ...b]));
  assert.ok(Math.abs(report.snapshot.fir.baselineValue! - 7 / 11 * 100) < 1e-9);
  assert.ok(Math.abs(report.snapshot.fir.recentValue! - 5 / 11 * 100) < 1e-9);
  assert.equal(report.snapshot.fir.evidence.playerCount, 2);
});

test("missing metrics neither become zero nor backfill the fixed windows with older rounds", () => {
  const rounds = [...sixRounds(), round(7, "p1", { putts: null, penalties: null, three_putts: null })];
  const report = buildCoachInsights(input(rounds));
  assert.equal(report.snapshot.putting.ready, false);
  assert.equal(report.snapshot.penalties.ready, false);
  assert.equal(report.snapshot.three_putts.ready, false);
  assert.equal(report.snapshot.putting.recentValue, 18);
  assert.equal(report.snapshot.scoring.ready, true);
  assert.equal(report.allInsights.length, 0);
});

test("real recorded zeroes are preserved and 9-hole penalties/three-putts normalize to 18", () => {
  const report = buildCoachInsights(input(sixRounds((day) => ({ penalties: day <= 3 ? 0 : 1, three_putts: day <= 3 ? 1 : 0 }))));
  assert.equal(report.snapshot.penalties.baselineValue, 0);
  assert.equal(report.snapshot.penalties.recentValue, 2);
  assert.equal(report.snapshot.three_putts.recentValue, 0);
  assert.equal(report.snapshot.penalties.threshold, 0.75);
  assert.equal(report.snapshot.three_putts.delta, -2);
});

test("incomplete, duplicate, noncontiguous, and inconsistent hole scorecards are excluded", () => {
  const rows = [1, 2, 3, 4].map((day) => round(day, "p1", { score: 36 }));
  const holes = [
    ...holeRows(rows[0].id, 8),
    ...holeRows(rows[1].id).map((h, i) => i === 8 ? { ...h, hole_number: 1 } : h),
    ...holeRows(rows[2].id).map((h, i) => i === 8 ? { ...h, hole_number: 18 } : h),
    ...holeRows(rows[3].id).map((h, i) => i === 8 ? { ...h, score: 5 } : h)
  ];
  const result = normalizeRounds(rows, holes);
  assert.equal(result.rounds.length, 0);
  assert.equal(result.excludedIds.size, 4);
});

test("back-nine scorecards are complete, while partially recorded stats are unavailable", () => {
  const row = round(1, "p1", { score: 36, putts: 16, penalties: 0 });
  const holes = holeRows(row.id).map((h, i) => ({ ...h, hole_number: i + 10, putts: i === 0 ? null : h.putts, gir: i === 1 ? null : h.gir, penalty: i === 2 ? null : h.penalty }));
  const result = normalizeRounds([row], holes);
  assert.equal(result.rounds.length, 1);
  assert.equal(result.rounds[0].putts, null);
  assert.equal(result.rounds[0].threePuttsPer18, null);
  assert.equal(result.rounds[0].gir, null);
  assert.equal(result.rounds[0].penaltiesPer18, null);
  assert.deepEqual(result.rounds[0].fir, { hit: 9, possible: 9 });
});

test("par-3s are excluded from FIR and hole-level stats override a stale summary metric", () => {
  const row = round(1, "p1", { score: 36, fairways_hit: 0 });
  const holes = holeRows(row.id).map((h, i) => i < 2 ? { ...h, par: 3, fir: null } : h);
  const result = normalizeRounds([row], holes);
  assert.deepEqual(result.rounds[0].fir, { hit: 7, possible: 7 });
  assert.equal(aggregateMetric(result.rounds, "fir"), 100);
  assert.equal(result.rounds[0].penaltiesPer18, 0);
});

test("latest duplicate submission wins rather than the artificially lowest score", () => {
  const original = round(1, "p1", { score: 40 });
  const corrected = { ...original, id: "corrected", score: 50, created_at: "2026-04-01T19:00:00Z" };
  const result = groupOutings(normalizeRounds([original, corrected], []).rounds);
  assert.equal(result.length, 1);
  assert.equal(result[0].rounds.length, 1);
  assert.equal(result[0].rounds[0].id, "corrected");
  assert.equal(result[0].rounds[0].score, 50);
});

test("invalid manual metric bounds are excluded without turning a valid score into a missing round", () => {
  const rows = sixRounds(() => ({ greens_in_regulation: 10, gir_possible: 9, fairways_hit: 1, fairways_possible: 0, putts: Number.NaN, three_putts: 10 }));
  const report = buildCoachInsights(input(rows));
  assert.equal(report.completedRounds, 6);
  assert.equal(report.snapshot.gir.recentValue, null);
  assert.equal(report.snapshot.fir.recentValue, null);
  assert.equal(report.snapshot.putting.recentValue, null);
  assert.equal(report.snapshot.three_putts.recentValue, null);
  assert.equal(report.snapshot.scoring.ready, true);
});

test("practice severity ranks supported weaknesses and does not double-count putting", () => {
  const report = buildCoachInsights(input(sixRounds((day) => day <= 3 ? {} : {
    greens_in_regulation: 2, putts: 21, three_putts: 2, penalties: 3, fairways_hit: 2
  })));
  assert.equal(report.practicePriorities.length, 3);
  assert.equal(report.practicePriorities[0].category, "course_management");
  assert.equal(report.practicePriorities.filter((p) => p.category === "putting").length, 1);
  assert.equal(report.practicePriorities.find((p) => p.category === "putting")?.severity, 4);
  assert.ok(report.practicePriorities.every((p, i, list) => i === 0 || list[i - 1].severity >= p.severity));
  assert.doesNotMatch(report.summary, /driven by|because|yards|125|175/i);
});

test("watchlist limits to four distinct players and preserves full insight evidence", () => {
  const rows = players.flatMap((p, i) => sixRounds((day) => ({ id: `${p.id}-${day}`, player_id: p.id, score: day <= 3 ? 45 : 43, penalties: day <= 3 ? 1 : i + 3 })));
  const report = buildCoachInsights(input(rows));
  assert.equal(report.playerWatchlist.length, 4);
  assert.equal(new Set(report.playerWatchlist.map((i) => i.playerId)).size, 4);
  assert.ok(report.playerWatchlist.every((i) => i.evidence.recentRoundIds.length === 3 && i.evidence.baselineRoundIds.length === 3));
});

function competitionRounds() {
  return players.slice(0, 5).flatMap((p, i) => sixRounds((day) => ({ id: `${p.id}-${day}`, player_id: p.id, score: p.id === "p4" && day === 1 ? 50 : 40 + i })));
}

test("low-four reliability uses unique players and the team's recent competition denominator", () => {
  const report = buildCoachInsights(input(competitionRounds()));
  const contribution = report.allInsights.find((i) => i.playerId === "p4" && i.category === "counting_score");
  assert.ok(contribution);
  assert.match(contribution.body, /5 of the team's last 6/);
  assert.equal(contribution.baselineValue, null);
  assert.equal(contribution.delta, null);
  assert.ok(Math.abs(contribution.recentValue - 5 / 6 * 100) < 1e-9);
});

test("practice and qualifying outings cannot be counted as team competition", () => {
  const report = buildCoachInsights(input(competitionRounds(), {
    events: Array.from({ length: 6 }, (_, i) => ({ id: `event${i + 1}`, event_type: i < 2 ? "match" as const : i < 4 ? "practice" as const : "qualifier" as const }))
  }));
  assert.equal(report.allInsights.filter((i) => i.category === "counting_score").length, 0);
});

test("ties at the counting boundary and mixed-format outings are skipped", () => {
  const tied = competitionRounds().map((r) => r.player_id === "p5" ? { ...r, score: 43 } : r);
  // Avoid the one deliberately weak p4 round as well.
  const noTieBreaks = buildCoachInsights(input(tied.map((r) => r.player_id === "p4" ? { ...r, score: 43 } : r)));
  assert.equal(noTieBreaks.allInsights.filter((i) => i.category === "counting_score").length, 0);
  const mixed = [...competitionRounds(), ...sixRounds((day) => ({ id: `mixed-${day}`, player_id: "p6", holes: 18, score: 80, gir_possible: 18 }))];
  assert.equal(buildCoachInsights(input(mixed)).allInsights.filter((i) => i.category === "counting_score").length, 0);
});

test("an invalid participant makes the competition outing ineligible for low-four estimates", () => {
  const rows = competitionRounds();
  const partial = rows.filter((r) => r.player_id === "p1").flatMap((r) => holeRows(r.id, 8));
  assert.equal(buildCoachInsights(input(rows, { holeRows: partial })).allInsights.filter((i) => i.category === "counting_score").length, 0);
});

test("empty data produces no fabricated values, recommendations, or player observations", () => {
  const report = buildCoachInsights(input([]));
  assert.equal(report.completedRounds, 0);
  assert.equal(report.allInsights.length, 0);
  assert.equal(report.practicePriorities.length, 0);
  assert.ok(Object.values(report.snapshot).every((m) => m.recentValue === null && m.baselineValue === null));
});

test("all threshold rules remain explicit and format-aware", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(METRIC_RULES).map(([metric, rule]) => [metric, rule.threshold(9)])), {
    scoring: 1, gir: 8, fir: 10, putting: 0.75, three_putts: 0.75, penalties: 0.75
  });
});

test("pagination reads more than 1000 rows, including an exact full final page", async () => {
  const values = Array.from({ length: 1500 }, (_, i) => ({ id: i }));
  const calls: number[] = [];
  const result = await readAllPages((start, end) => {
    calls.push(start);
    return Promise.resolve({ data: values.slice(start, end + 1), error: null });
  });
  assert.equal(result.length, 1500);
  assert.deepEqual(calls, [0, 500, 1000, 1500]);
});

test("pagination errors fail the report instead of returning a silent partial baseline", async () => {
  await assert.rejects(() => readAllPages((start) => Promise.resolve(start === 0
    ? { data: Array.from({ length: 500 }, (_, id) => ({ id })), error: null }
    : { data: null, error: { message: "Temporary database failure" } })), /Temporary database failure/);
});

function fakeContext(data: Record<string, Record<string, unknown>[]>, role: "coach" | "player" = "coach") {
  const calls: { table: string; filters: [string, unknown][] }[] = [];
  const supabase = {
    from(table: string) {
      const filters: [string, unknown][] = [];
      const lists: [string, unknown[]][] = [];
      const getRows = () => (data[table] ?? []).filter((r) => filters.every(([k, v]) => r[k] === v) && lists.every(([k, v]) => v.includes(r[k])));
      const query = {
        select() { return query; },
        eq(key: string, value: unknown) { filters.push([key, value]); return query; },
        in(key: string, values: unknown[]) { lists.push([key, values]); return query; },
        order() { return query; },
        limit() { return query; },
        async maybeSingle() { calls.push({ table, filters: [...filters] }); return { data: getRows()[0] ?? null, error: null }; },
        async range(start: number, end: number) { calls.push({ table, filters: [...filters] }); return { data: getRows().slice(start, end + 1), error: null }; }
      };
      return query;
    }
  };
  return { calls, context: { supabase, team: { id: "team-a" }, role } as unknown as CurrentTeamContext };
}

test("the loader enforces staff access before any database read", async () => {
  const { calls, context } = fakeContext({}, "player");
  const result = await loadCoachInsights(context, 9);
  assert.equal(result.status, "error");
  assert.equal(calls.length, 0);
});

test("no active season never falls back to blending seasons", async () => {
  const { context, calls } = fakeContext({ seasons: [] });
  assert.equal((await loadCoachInsights(context, 9)).status, "no-season");
  assert.deepEqual(calls.map((c) => c.table), ["seasons"]);
});

test("the loader isolates team and season on round/event reads and team on every hole read", async () => {
  const foreignRound = round(7, "p2", { team_id: "team-b", score: 25 });
  const previousSeason = round(8, "p2", { season_id: "old-season", score: 26 });
  const { context, calls } = fakeContext({
    seasons: [{ id: "season-a", team_id: "team-a", is_active: true, name: "Spring 2026", starts_on: null, ends_on: null }],
    rounds: [...sixRounds(), foreignRound, previousSeason],
    players: players.map((p) => ({ ...p, team_id: "team-a" })),
    events: input([]).events.map((e) => ({ ...e, team_id: "team-a", season_id: "season-a" })),
    round_holes: []
  });
  const result = await loadCoachInsights(context, 9);
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.report.completedRounds, 6);
  assert.equal(result.report.snapshot.scoring.recentValue, 45);
  assert.ok(calls.every((c) => c.filters.some(([k, v]) => k === "team_id" && v === "team-a")));
  assert.ok(calls.filter((c) => c.table === "rounds" || c.table === "events").every((c) => c.filters.some(([k, v]) => k === "season_id" && v === "season-a")));
});

test("the Coach Insights screen renders the chosen format, practice priorities, and player links", () => {
  const report = buildCoachInsights(input(sixRounds((day) => ({ penalties: day <= 3 ? 0 : 2 }))));
  const html = renderToStaticMarkup(createElement(CoachInsightsView, { report, teamName: "Test Team", seasonName: "Spring 2026" }));
  assert.match(html, /Coach Insights/);
  assert.match(html, /Spring 2026/);
  assert.match(html, /coach-insights\?holes=18/);
  assert.match(html, /Recommended Practice Focus/);
  assert.match(html, /Course management/);
  assert.match(html, /players\/p1/);
  assert.match(html, /Comparison details/);
});
