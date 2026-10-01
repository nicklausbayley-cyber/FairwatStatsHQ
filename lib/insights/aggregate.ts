import { COMPARISON_OUTINGS, METRIC_RULES } from "./rules";
import type {
  InsightHoleRow, InsightRoundRow, MetricComparison, NormalizedRound,
  Outing, RoundFormat, TrendMetric
} from "./types";

function isCount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function ratio(hit: number | null, possible: number | null, holes: number) {
  return isCount(hit) && isCount(possible) && possible > 0 &&
    possible <= holes && hit <= possible ? { hit, possible } : null;
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value;
}

function completeHoleSet(holes: InsightHoleRow[], format: RoundFormat) {
  if (holes.length !== format) return false;
  const numbers = holes.map((hole) => hole.hole_number).sort((a, b) => a - b);
  const first = numbers[0];
  if (format === 18 ? first !== 1 : first !== 1 && first !== 10) return false;
  return numbers.every((number, index) => number === first + index) &&
    holes.every((hole) => isCount(hole.score) && hole.score > 0 &&
      Number.isInteger(hole.par) && hole.par >= 3 && hole.par <= 6);
}

/** Submitted summary rounds have no draft status in the current schema.
 * If hole rows exist, all scheduled holes must be valid and agree with the total.
 * Optional stats are usable only when recorded for every relevant hole.
 */
export function normalizeRounds(rows: InsightRoundRow[], holes: InsightHoleRow[]) {
  const holesByRound = new Map<string, InsightHoleRow[]>();
  for (const hole of holes) {
    const list = holesByRound.get(hole.round_id) ?? [];
    list.push(hole);
    holesByRound.set(hole.round_id, list);
  }

  const rounds: NormalizedRound[] = [];
  const excludedIds = new Set<string>();
  const seenIds = new Set<string>();
  for (const row of rows) {
    if (seenIds.has(row.id)) continue;
    seenIds.add(row.id);
    if ((row.holes !== 9 && row.holes !== 18) || !isCount(row.score) ||
      row.score < row.holes || !validDate(row.played_on)) {
      excludedIds.add(row.id);
      continue;
    }

    const entries = holesByRound.get(row.id) ?? [];
    if (entries.length > 0 && (!completeHoleSet(entries, row.holes) ||
      entries.reduce((sum, hole) => sum + hole.score, 0) !== row.score)) {
      excludedIds.add(row.id);
      continue;
    }

    let putts = isCount(row.putts) ? row.putts : null;
    let gir = row.gir_possible === row.holes
      ? ratio(row.greens_in_regulation, row.gir_possible, row.holes) : null;
    let fir = ratio(row.fairways_hit, row.fairways_possible, row.holes);
    let threePutts = isCount(row.three_putts) && row.three_putts <= row.holes
      ? row.three_putts : null;
    let penalties = isCount(row.penalties) ? row.penalties : null;

    if (entries.length > 0) {
      const allPutts = entries.every((hole) => isCount(hole.putts));
      putts = allPutts ? entries.reduce((sum, hole) => sum + (hole.putts ?? 0), 0) : null;
      threePutts = allPutts ? entries.filter((hole) => (hole.putts ?? 0) >= 3).length : null;
      gir = entries.every((hole) => typeof hole.gir === "boolean")
        ? { hit: entries.filter((hole) => hole.gir).length, possible: entries.length } : null;
      const teeHoles = entries.filter((hole) => hole.par !== 3);
      fir = teeHoles.length > 0 && teeHoles.every((hole) => typeof hole.fir === "boolean")
        ? { hit: teeHoles.filter((hole) => hole.fir).length, possible: teeHoles.length } : null;
      penalties = entries.every((hole) => isCount(hole.penalty))
        ? entries.reduce((sum, hole) => sum + (hole.penalty ?? 0), 0) : null;
    }

    rounds.push({
      id: row.id, playerId: row.player_id, eventId: row.event_id,
      playedOn: row.played_on, createdAt: row.created_at, holes: row.holes,
      score: row.score, putts, gir, fir,
      threePuttsPer18: threePutts === null ? null : threePutts * 18 / row.holes,
      penaltiesPer18: penalties === null ? null : penalties * 18 / row.holes
    });
  }

  return { rounds, excludedIds };
}

export function outingKey(round: { eventId: string | null; playedOn: string }) {
  return `${round.playedOn}:${round.eventId ?? "unattached"}`;
}

/** One latest submission per player per event/day, not the best score. */
export function groupOutings(rounds: NormalizedRound[]): Outing[] {
  const groups = new Map<string, Map<string, NormalizedRound>>();
  for (const round of rounds) {
    const key = outingKey(round);
    const players = groups.get(key) ?? new Map<string, NormalizedRound>();
    const previous = players.get(round.playerId);
    if (!previous || round.createdAt > previous.createdAt ||
      (round.createdAt === previous.createdAt && round.id > previous.id)) {
      players.set(round.playerId, round);
    }
    groups.set(key, players);
  }

  return Array.from(groups, ([key, players]) => {
    const values = Array.from(players.values()).sort((a, b) => a.playerId.localeCompare(b.playerId));
    return { key, playedOn: values[0].playedOn, eventId: values[0].eventId, rounds: values };
  }).sort((a, b) => b.key.localeCompare(a.key));
}

function valueFor(round: NormalizedRound, category: TrendMetric): number | null {
  switch (category) {
    case "scoring": return round.score;
    case "putting": return round.putts;
    case "three_putts": return round.threePuttsPer18;
    case "penalties": return round.penaltiesPer18;
    case "gir": return round.gir ? round.gir.hit / round.gir.possible * 100 : null;
    case "fir": return round.fir ? round.fir.hit / round.fir.possible * 100 : null;
  }
}

export function aggregateMetric(rounds: NormalizedRound[], category: TrendMetric) {
  const valid = rounds.filter((round) => valueFor(round, category) !== null);
  if (valid.length === 0) return null;
  if (category === "gir" || category === "fir") {
    const totals = valid.reduce((sum, round) => ({
      hit: sum.hit + (round[category]?.hit ?? 0),
      possible: sum.possible + (round[category]?.possible ?? 0)
    }), { hit: 0, possible: 0 });
    return totals.hit / totals.possible * 100;
  }
  return valid.reduce((sum, round) => sum + (valueFor(round, category) ?? 0), 0) / valid.length;
}

/** Team comparisons hold player participation and metric coverage constant.
 * Each included player must have valid values in all six selected outings.
 * Windows are selected before filtering metrics; missing values never backfill
 * a window with older rounds or become zeroes.
 */
export function compareMetric(outings: Outing[], category: TrendMetric, holes: RoundFormat): MetricComparison {
  const recent = outings.slice(0, COMPARISON_OUTINGS);
  const baseline = outings.slice(COMPARISON_OUTINGS, COMPARISON_OUTINGS * 2);
  const windows = [...recent, ...baseline];
  const completeWindows = recent.length === COMPARISON_OUTINGS && baseline.length === COMPARISON_OUTINGS;
  const candidates = new Set(recent.flatMap((outing) => outing.rounds.map((round) => round.playerId)));
  const matchedPlayers = completeWindows ? Array.from(candidates).filter((id) =>
    windows.every((outing) => outing.rounds.some((round) =>
      round.playerId === id && valueFor(round, category) !== null
    ))
  ) : [];
  const matched = new Set(matchedPlayers);
  const ready = completeWindows && matched.size > 0;
  const recentRounds = recent.flatMap((outing) => outing.rounds).filter((round) =>
    valueFor(round, category) !== null && (!ready || matched.has(round.playerId))
  );
  const baselineRounds = ready ? baseline.flatMap((outing) => outing.rounds)
    .filter((round) => matched.has(round.playerId)) : [];
  const recentValue = aggregateMetric(recentRounds, category);
  const baselineValue = ready ? aggregateMetric(baselineRounds, category) : null;
  return {
    category, recentValue, baselineValue,
    delta: recentValue !== null && baselineValue !== null ? recentValue - baselineValue : null,
    threshold: METRIC_RULES[category].threshold(holes), unit: METRIC_RULES[category].unit,
    ready,
    reason: ready ? null : !completeWindows
      ? `Need six completed ${holes}-hole outings (three recent and three baseline).`
      : "Need the same player with this stat recorded in all six outings.",
    evidence: {
      recentRoundIds: recentRounds.map((round) => round.id),
      baselineRoundIds: baselineRounds.map((round) => round.id),
      recentOutings: recent.length, baselineOutings: baseline.length,
      recentDates: recent.map((outing) => outing.playedOn),
      baselineDates: baseline.map((outing) => outing.playedOn),
      playerCount: ready ? matched.size : new Set(recentRounds.map((round) => round.playerId)).size
    }
  };
}
