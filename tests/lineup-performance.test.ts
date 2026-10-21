import assert from "node:assert/strict";
import test from "node:test";
import { buildLineupPerformance, type LineupRound } from "../lib/dashboard/lineup-performance";

const players = [1,2,3,4,5].map((n) => ({ id: `p${n}`, first_name: "Player", last_name: String(n) }));
function round(player: number, score: number, patch: Partial<LineupRound> = {}): LineupRound {
  return { id: `r-${player}-${score}`, player_id: `p${player}`, event_id: "event-1",
    played_on: "2026-04-01", created_at: "2026-04-01T20:00:00Z", holes: 9,
    counts_toward_lineup: true, score, ...patch };
}
function get(rows: LineupRound[], id: number) {
  return buildLineupPerformance(players, rows).find((p) => p.playerId === `p${id}`)!;
}

test("fourth scorer is benchmark; negative differential is better", () => {
  const rows = [round(1, 39), round(2, 42), round(3, 43), round(4, 44), round(5, 47)];
  assert.equal(get(rows, 1).averageDifferential, -5);
  assert.equal(get(rows, 4).averageDifferential, 0);
  assert.equal(get(rows, 5).averageDifferential, 3);
  assert.equal(get(rows, 5).countingPercentage, 0);
  assert.equal(get(rows, 1).countingPercentage, 1);
});

test("not enough players means no benchmark, but players are visible", () => {
  const rows = [round(1, 40), round(2, 41), round(3, 42)];
  assert.equal(get(rows, 1).averageDifferential, null);
  assert.equal(get(rows, 1).qualifyingRounds, 0);
  assert.equal(get(rows, 1).rank, null);
  assert.equal(buildLineupPerformance(players, rows).length, 5);
});

test("nine and eighteen holes are separated and 18-hole differential is normalized", () => {
  const rows = [
    round(1, 39), round(2, 42), round(3, 43), round(4, 44),
    round(1, 78, { holes: 18 }), round(2, 84, { holes: 18 }),
    round(3, 86, { holes: 18 }), round(4, 88, { holes: 18 })
  ];
  assert.equal(get(rows, 1).averageScore9, 39);
  assert.equal(get(rows, 1).averageScore18, 78);
  assert.equal(get(rows, 1).averageDifferential, -5);
});

test("multi-day events do not share fourth score", () => {
  const rows = [round(1, 37), round(2, 39), round(3, 40), round(4, 42),
    round(1, 40, { played_on: "2026-04-02" }),
    round(2, 41, { played_on: "2026-04-02" }),
    round(3, 43, { played_on: "2026-04-02" }),
    round(4, 45, { played_on: "2026-04-02" })];
  assert.equal(get(rows, 1).averageDifferential, -5);
  assert.equal(get(rows, 1).qualifyingRounds, 2);
});

test("ties at fourth/fifth make counting percentage unknown", () => {
  const rows = [round(1, 38), round(2, 40), round(3, 41), round(4, 44), round(5, 44)];
  assert.equal(get(rows, 4).averageDifferential, 0);
  assert.equal(get(rows, 4).countingPercentage, null);
});

test("later corrected submission replaces earlier submitted score", () => {
  const rows = [round(1, 55, { id: "old", created_at: "2026-04-01T18:00:00Z" }),
    round(1, 39, { id: "new", created_at: "2026-04-01T22:00:00Z" }),
    round(2, 42), round(3, 43), round(4, 44)];
  assert.equal(get(rows, 1).averageScore9, 39);
  assert.equal(get(rows, 1).qualifyingRounds, 1);
});

test("unlinked and nonqualifying rounds do not enter comparison", () => {
  const rows = [round(1, 39, { event_id: null }), round(2, 42),
    round(3, 43), round(4, 44), round(5, 47, { counts_toward_lineup: false })];
  assert.equal(get(rows, 2).qualifyingRounds, 0);
});

test("player trend improves when recent three differentials fall", () => {
  const rows: LineupRound[] = [];
  [50,49,48,45,44,43].forEach((score, day) => {
    const date = `2026-04-${String(day+1).padStart(2,"0")}`;
    rows.push(round(1, score, { id: `p1-${day}`, played_on: date }));
    rows.push(round(2, 40, { id: `p2-${day}`, played_on: date }));
    rows.push(round(3, 41, { id: `p3-${day}`, played_on: date }));
    rows.push(round(4, 42, { id: `p4-${day}`, played_on: date }));
    rows.push(round(5, 43, { id: `p5-${day}`, played_on: date }));
  });
  assert.equal(get(rows, 1).trend, "up");
});
