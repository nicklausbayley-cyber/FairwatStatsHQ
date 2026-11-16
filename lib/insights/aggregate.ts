import { comparisonWindowSize, confidenceForOutings, METRIC_RULES } from "./rules";
import type {
  InsightHoleRow, InsightRoundRow, MetricComparison, NormalizedRound,
  InsightFormat, Outing, RoundFormat, TrendMetric
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

    const par = entries.length > 0
      ? entries.reduce((sum, hole) => sum + hole.par, 0)
      : typeof row.par === "number" && Number.isFinite(row.par) && row.par > 0
        ? row.par
        : null;

    rounds.push({
      id: row.id, playerId: row.player_id, eventId: row.event_id,
      playedOn: row.played_on, createdAt: row.created_at, holes: row.holes,
      score: row.score, scorePerNine: row.score * 9 / row.holes,
      scoreToParPerNine: par === null ? null : (row.score - par) * 9 / row.holes,
      putts, gir, fir,
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

export function valueFor(round: NormalizedRound, category: TrendMetric, format: InsightFormat = 9): number | null {
  switch (category) {
    case "scoring": return format === "all" ? round.scorePerNine : round.score;
    case "putting": return round.putts === null ? null
      : format === "all" ? round.putts * 9 / round.holes : round.putts;
    case "three_putts": return round.threePuttsPer18;
    case "penalties": return round.penaltiesPer18;
    case "gir": return round.gir ? round.gir.hit / round.gir.possible * 100 : null;
    case "fir": return round.fir ? round.fir.hit / round.fir.possible * 100 : null;
  }
}

export function aggregateMetric(rounds: NormalizedRound[], category: TrendMetric, format: InsightFormat = 9) {
  const valid = rounds.filter((round) => valueFor(round, category, format) !== null);
  if (valid.length === 0) return null;
  if (category === "gir" || category === "fir") {
    const totals = valid.reduce((sum, round) => ({
      hit: sum.hit + (round[category]?.hit ?? 0),
      possible: sum.possible + (round[category]?.possible ?? 0)
    }), { hit: 0, possible: 0 });
    return totals.possible > 0 ? totals.hit / totals.possible * 100 : null;
  }
  return valid.reduce((sum, round) => sum + (valueFor(round, category, format) ?? 0), 0) / valid.length;
}

/** Progressive comparisons:
 * - 1 outing: descriptive snapshot
 * - 2–3 outings: last outing vs prior outing (early)
 * - 4–5 outings: latest two vs previous two (preliminary)
 * - 6+ outings: latest three vs previous three (established)
 *
 * Team comparisons use a shared cohort with valid observations in both windows,
 * without requiring each golfer to play in every outing. Require at least one
 * supported golfer in each selected outing; a missing entire outing cannot be
 * silently replaced by an older score or interpreted as zero. Any lineup
 * changes are disclosed, even when matched players support a comparison.
 */
export function compareMetric(outings: Outing[], category: TrendMetric, format: InsightFormat): MetricComparison {
  const size = comparisonWindowSize(outings.length);
  const recent = outings.slice(0, size);
  const baseline = outings.slice(size, size * 2);
  const completeWindows = recent.length === size && baseline.length === size;

  const recentAll = recent.flatMap((outing) => outing.rounds).filter((round) =>
    valueFor(round, category, format) !== null
  );
  const baselineAll = baseline.flatMap((outing) => outing.rounds).filter((round) =>
    valueFor(round, category, format) !== null
  );
  const recentIds = new Set(recentAll.map((round) => round.playerId));
  const baselineIds = new Set(baselineAll.map((round) => round.playerId));
  const matched = new Set([...recentIds].filter((id) => baselineIds.has(id)));
  const lineupChanged = recentIds.size !== baselineIds.size ||
    [...recentIds].some((id) => !baselineIds.has(id)) ||
    [...recent, ...baseline].some((outing) => {
      const activeIds = new Set(outing.rounds.filter((round) =>
        valueFor(round, category, format) !== null
      ).map((round) => round.playerId));
      return activeIds.size !== recentIds.size ||
        [...activeIds].some((id) => !recentIds.has(id));
    });
  const everyOutingCovered = [...recent, ...baseline].every((outing) =>
    outing.rounds.some((round) =>
      matched.has(round.playerId) && valueFor(round, category, format) !== null
    )
  );
  const ready = completeWindows && matched.size > 0 && everyOutingCovered;
  const recentRounds = ready ? recentAll.filter((round) => matched.has(round.playerId)) : recentAll;
  const baselineRounds = ready ? baselineAll.filter((round) => matched.has(round.playerId)) : [];
  const recentValue = aggregateMetric(recentRounds, category, format);
  const baselineValue = ready ? aggregateMetric(baselineRounds, category, format) : null;

  return {
    category, recentValue, baselineValue,
    delta: recentValue !== null && baselineValue !== null ? recentValue - baselineValue : null,
    threshold: METRIC_RULES[category].threshold(format), unit: METRIC_RULES[category].unit,
    ready, confidence: ready ? confidenceForOutings(outings.length) : "baseline",
    lineupChanged,
    reason: ready ? null
      : !completeWindows ? "More completed outings are needed for a comparison; available values are shown."
      : matched.size === 0
        ? "No player recorded this metric in both windows. Recent values are shown without a trend."
        : "Some selected outings do not contain a comparable player/stat. Recorded values are shown without a trend.",
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
