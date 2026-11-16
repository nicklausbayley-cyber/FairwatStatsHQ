import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CoachInsightsView } from "../components/insights/coach-insights-view";
import { buildCoachInsights, type CoachInsightsInput } from "../lib/insights/engine";
import { aggregateMetric, normalizeRounds } from "../lib/insights/aggregate";
import { METRIC_RULES } from "../lib/insights/rules";
import type { InsightRoundRow, InsightFormat, InsightSource } from "../lib/insights/types";

const players = [
  { id: "p1", first_name: "Avery", last_name: "Junior" },
  { id: "p2", first_name: "Jordan", last_name: "Senior" }
];

function round(day: number, patch: Partial<InsightRoundRow> = {}): InsightRoundRow {
  const date = `2026-05-${String(day).padStart(2, "0")}`;
  return {
    id: `r${day}`, team_id: "ci-team", season_id: "ci-season",
    event_id: `e${day}`, player_id: "p1",
    played_on: date, created_at: `${date}T18:00:00Z`,
    holes: 9, score: 45, par: 36, putts: 18,
    greens_in_regulation: 4, gir_possible: 9,
    fairways_hit: 4, fairways_possible: 7,
    three_putts: 1, penalties: 1,
    ...patch
  };
}

function report(rows: InsightRoundRow[], holes: InsightFormat = 9,
  source: InsightSource = "all", eventTypes: Record<string, "practice" | "match" | "qualifier"> = {}) {
  const events = rows.filter((r) => r.event_id !== null).map((r) => ({
    id: r.event_id!, event_type: eventTypes[r.event_id!] ?? ("match" as const)
  }));
  const uniqueEvents = [...new Map(events.map((event) => [event.id, event])).values()];
  return buildCoachInsights({
    rounds: rows, holeRows: [], players, events: uniqueEvents, holes, source
  } satisfies CoachInsightsInput);
}

test("one round immediately supplies averages, par context and evidence-based practice opportunities", () => {
  const r = report([round(1, { score: 48, putts: 22, three_putts: 2, penalties: 1 })]);
  assert.equal(r.teamOutings, 1);
  assert.equal(r.confidence, "baseline");
  assert.equal(r.snapshot.scoring.recentValue, 48);
  assert.equal(r.snapshot.scoring.ready, false);
  assert.equal(r.parRelative?.average, 12);
  assert.equal(r.allInsights.length, 0);
  assert.ok(r.practicePriorities.some((p) => p.category === "putting" && /Early observation/.test(p.reason)));
  assert.ok(r.practicePriorities.every((p) => /not an established trend/.test(p.reason)));
});

test("two or three outings provide a labeled one-versus-one early indication", () => {
  const two = report([round(1, {score: 47}), round(2, {score: 45})]);
  assert.equal(two.confidence, "early");
  assert.equal(two.snapshot.scoring.confidence, "early");
  assert.equal(two.snapshot.scoring.delta, -2);
  assert.match(two.trendingUp[0].body, /Early indication only/);
  assert.deepEqual(two.snapshot.scoring.evidence.recentRoundIds, ["r2"]);
  assert.deepEqual(two.snapshot.scoring.evidence.baselineRoundIds, ["r1"]);

  const three = report([round(1, {score: 55}), round(2, {score: 47}), round(3, {score: 45})]);
  assert.deepEqual(three.snapshot.scoring.evidence.recentRoundIds, ["r3"]);
  assert.deepEqual(three.snapshot.scoring.evidence.baselineRoundIds, ["r2"]);
  assert.equal(three.snapshot.scoring.delta, -2);
});

test("four and five outings use a preliminary two-versus-two comparison", () => {
  const four = report([1,2,3,4].map((day)=>round(day,{score: day<3?46:42})));
  assert.equal(four.confidence, "preliminary");
  assert.equal(four.snapshot.scoring.confidence, "preliminary");
  assert.deepEqual(four.snapshot.scoring.evidence.recentRoundIds, ["r4","r3"]);
  assert.deepEqual(four.snapshot.scoring.evidence.baselineRoundIds, ["r2","r1"]);
  assert.equal(four.snapshot.scoring.delta,-4);

  const five = report([1,2,3,4,5].map((day)=>round(day,{score: day===1?70:day<=3?46:42})));
  assert.deepEqual(five.snapshot.scoring.evidence.recentRoundIds, ["r5","r4"]);
  assert.deepEqual(five.snapshot.scoring.evidence.baselineRoundIds, ["r3","r2"]);
  assert.equal(five.snapshot.scoring.delta,-4);
});

test("six outings preserve the established three-versus-three comparison", () => {
  const six = report([1,2,3,4,5,6].map((day)=>round(day,{score:day<=3?45:43})));
  assert.equal(six.confidence,"established");
  assert.equal(six.snapshot.scoring.confidence,"established");
  assert.equal(six.snapshot.scoring.delta,-2);
  assert.equal(six.snapshot.scoring.evidence.recentRoundIds.length,3);
  assert.equal(six.snapshot.scoring.evidence.baselineRoundIds.length,3);
});

test("a rotated team can compare a supported overlapping cohort without requiring any player in all six outings", () => {
  const rows = [round(1), round(2,{player_id:"p2"}),round(3),
    round(4,{player_id:"p2",score:40}),round(5),round(6,{player_id:"p2",score:40})];
  const r = report(rows);
  assert.equal(r.snapshot.scoring.ready,true);
  assert.equal(r.snapshot.scoring.evidence.playerCount,2);
  assert.equal(r.snapshot.scoring.lineupChanged,true);
  assert.ok(r.trendingUp.some((insight)=>insight.lineupChanged));
});

test("a completely changed lineup never masquerades as a scoring improvement",()=>{
  const rows=[1,2,3].map((day)=>round(day))
    .concat([4,5,6].map((day)=>round(day,{player_id:"p2",score:35})));
  const r=report(rows);
  assert.equal(r.snapshot.scoring.ready,false);
  assert.equal(r.snapshot.scoring.baselineValue,null);
  assert.equal(r.trendingUp.length,0);
  assert.match(r.snapshot.scoring.reason??"",/No player/);
});

test("mixed nine/eighteen scoring is normalized per nine, not averaged as raw scores",()=>{
  const rows=[
    round(1,{score:42,par:36,holes:9,putts:18}),
    round(2,{score:84,par:72,holes:18,putts:36,gir_possible:18}),
    round(3,{score:40,par:36,holes:9,putts:16}),
    round(4,{score:80,par:72,holes:18,putts:32,gir_possible:18})
  ];
  const mixed=report(rows,"all");
  assert.equal(mixed.snapshot.scoring.baselineValue,42);
  assert.equal(mixed.snapshot.scoring.recentValue,40);
  assert.equal(mixed.snapshot.putting.baselineValue,18);
  assert.equal(mixed.snapshot.putting.recentValue,16);
  assert.equal(mixed.parRelative?.average,5);
  assert.equal(mixed.parRelative?.rounds,4);
  assert.equal(mixed.completedRounds,4);
  const eighteen=report(rows,18);
  assert.equal(eighteen.snapshot.scoring.recentValue,80);
  assert.equal(eighteen.parRelative?.average,5);
});

test("practice and competition remain separate, including rounds without an event",()=>{
  const rows=[
    round(1,{event_id:"e1"}),
    round(2,{event_id:"e2",score:44}),
    round(3,{event_id:"e3",score:43}),
    round(4,{event_id:null,score:42})
  ];
  const types={e1:"match",e2:"practice",e3:"match"} as const;
  const all=report(rows,9,"all",types);
  assert.deepEqual(all.sourceCounts,{competition:2,practice:2,other:0});
  const practice=report(rows,9,"practice",types);
  assert.equal(practice.completedRounds,2);
  assert.equal(practice.teamOutings,2);
  assert.deepEqual(practice.snapshot.scoring.evidence.recentRoundIds,["r4"]);
  assert.equal(practice.snapshot.scoring.baselineValue,44);
  const competition=report(rows,9,"competition",types);
  assert.equal(competition.completedRounds,2);
  assert.equal(competition.snapshot.scoring.recentValue,43);
  assert.equal(competition.snapshot.scoring.baselineValue,45);
});

test("empty and missing-stat inputs never invent metrics or practice advice",()=>{
  const empty=report([],"all");
  assert.equal(empty.completedRounds,0);
  assert.equal(empty.parRelative,null);
  assert.equal(empty.practicePriorities.length,0);
  assert.ok(Object.values(empty.snapshot).every((v)=>v.recentValue===null));
  const missing=report([round(1,{putts:null,three_putts:null,penalties:null})]);
  assert.equal(missing.snapshot.putting.recentValue,null);
  assert.equal(missing.practicePriorities.length,0);
});

test("Coach Insights renders the progressive stage, filters, and evidence labels",()=>{
  const r=report([
    round(1,{holes:9,score:47,par:36}),
    round(2,{holes:18,score:90,par:72,putts:36,gir_possible:18})
  ],"all");
  const html=renderToStaticMarkup(createElement(CoachInsightsView,
    {report:r,teamName:"CI Sample",seasonName:"Spring 2026"}));
  assert.match(html,/All 9\/18/);
  assert.match(html,/Early indications/);
  assert.match(html,/Practice/);
  assert.match(html,/nine-hole/);
  assert.match(html,/Relative to par/);
  assert.match(html,/coach-insights\?holes=9/);
  assert.match(html,/coach-insights\?holes=18/);
});

test("mixed-format per-nine/per-18 means weight the observed holes, not the number of rounds",()=>{
  const rows=[
    round(1,{holes:9,score:45,par:36,putts:18,three_putts:1,penalties:1}),
    round(2,{holes:18,score:80,par:72,putts:30,three_putts:1,penalties:0,gir_possible:18})
  ];
  const normalized=normalizeRounds(rows,[]).rounds;
  assert.ok(Math.abs(aggregateMetric(normalized,"scoring","all")! - 125/3) < 1e-9);
  assert.ok(Math.abs(aggregateMetric(normalized,"putting","all")! - 48/3) < 1e-9);
  assert.ok(Math.abs(aggregateMetric(normalized,"penalties","all")! - 2/3) < 1e-9);
  assert.ok(Math.abs(report(rows,"all").parRelative!.average - 17/3) < 1e-9);
  assert.equal(METRIC_RULES.scoring.threshold("all"),1);
  assert.equal(METRIC_RULES.putting.threshold("all"),0.75);
});

test("duplicate corrections do not inflate practice/competition round counts",()=>{
  const old=round(1,{score:55,created_at:"2026-05-01T17:00:00Z"});
  const corrected=round(1,{id:"corrected",score:44,created_at:"2026-05-01T19:00:00Z"});
  const r=report([old,corrected]);
  assert.equal(r.completedRounds,1);
  assert.deepEqual(r.sourceCounts,{competition:1,practice:0,other:0});
  assert.equal(r.snapshot.scoring.recentValue,44);
});
