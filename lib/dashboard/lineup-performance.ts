/**
 * Lineup performance compares each player's score to the fourth-lowest
 * score recorded by teammates in the SAME event, date, and hole format.
 * This is a score differential, not the statistical standard deviation.
 */
export type LineupPlayer = {
  id: string;
  first_name: string;
  last_name: string;
};

export type LineupRound = {
  id: string;
  player_id: string;
  event_id: string | null;
  played_on: string;
  created_at: string;
  holes: number;
  counts_toward_lineup: boolean;
  score: number;
};

export type DashboardLineupPerformance = {
  playerId: string;
  playerName: string;
  rank: number | null;
  averageScore9: number | null;
  averageScore18: number | null;
  averageDifferential: number | null;
  countingPercentage: number | null;
  recentDifferential: number | null;
  trend: "up" | "down" | "steady" | "new";
  qualifyingRounds: number;
};

type DifferentialRound = {
  round: LineupRound;
  rawDifferential: number;
  normalizedDifferential: number;
  unambiguousLowFour: boolean;
};

function average(values: number[]): number | null {
  return values.length
    ? values.reduce((sum, score) => sum + score, 0) / values.length
    : null;
}

function isEligible(round: LineupRound): boolean {
  return (
    round.event_id !== null &&
    round.counts_toward_lineup &&
    (round.holes === 9 || round.holes === 18) &&
    Number.isInteger(round.score) &&
    round.score > 0
  );
}

/** A corrected submission supersedes a previous one, rather than taking the best score. */
function isLaterSubmission(candidate: LineupRound, previous: LineupRound): boolean {
  if (candidate.created_at !== previous.created_at) {
    return candidate.created_at > previous.created_at;
  }
  return candidate.id > previous.id;
}

/**
 * A one-day team comparison requires four DISTINCT players. Mixed round
 * lengths and separate days of a multi-day event are never pooled together.
 * Ties at fourth/fifth position still yield a valid score differential,
 * but are excluded from the low-four percentage: official counting status
 * cannot be determined without a tie-break.
 */
export function buildLineupPerformance(
  players: LineupPlayer[],
  rounds: LineupRound[]
): DashboardLineupPerformance[] {
  const byOuting = new Map<string, Map<string, LineupRound>>();

  for (const round of rounds) {
    if (!isEligible(round)) continue;
    const key = [round.event_id, round.played_on, round.holes].join("|");
    const outing = byOuting.get(key) ?? new Map<string, LineupRound>();
    const previous = outing.get(round.player_id);
    if (!previous || isLaterSubmission(round, previous)) {
      outing.set(round.player_id, round);
    }
    byOuting.set(key, outing);
  }

  const eligibleByPlayer = new Map<string, LineupRound[]>();
  const differentialByPlayer = new Map<string, DifferentialRound[]>();

  for (const outing of byOuting.values()) {
    const chosen = Array.from(outing.values());
    for (const round of chosen) {
      const history = eligibleByPlayer.get(round.player_id) ?? [];
      history.push(round);
      eligibleByPlayer.set(round.player_id, history);
    }

    if (chosen.length < 4) continue;
    chosen.sort((a, b) => a.score - b.score || a.player_id.localeCompare(b.player_id));
    const fourthScore = chosen[3].score;
    const unambiguousLowFour = chosen.length === 4 || fourthScore !== chosen[4].score;

    for (const round of chosen) {
      const history = differentialByPlayer.get(round.player_id) ?? [];
      const rawDifferential = round.score - fourthScore;
      history.push({
        round,
        rawDifferential,
        normalizedDifferential: rawDifferential * (9 / round.holes),
        unambiguousLowFour
      });
      differentialByPlayer.set(round.player_id, history);
    }
  }

  const ranked = players.map((player) => {
    const ownRounds = eligibleByPlayer.get(player.id) ?? [];
    const differentials = [...(differentialByPlayer.get(player.id) ?? [])].sort(
      (a, b) =>
        b.round.played_on.localeCompare(a.round.played_on) ||
        b.round.created_at.localeCompare(a.round.created_at) ||
        b.round.id.localeCompare(a.round.id)
    );
    const unambiguous = differentials.filter((entry) => entry.unambiguousLowFour);
    const recent = differentials.slice(0, 5);
    const recentThree = differentials.slice(0, 3);
    const priorThree = differentials.slice(3, 6);

    let trend: DashboardLineupPerformance["trend"] = "new";
    if (recentThree.length === 3 && priorThree.length === 3) {
      const recentValue = average(recentThree.map((entry) => entry.normalizedDifferential))!;
      const priorValue = average(priorThree.map((entry) => entry.normalizedDifferential))!;
      const change = recentValue - priorValue;
      trend = change <= -0.5 ? "up" : change >= 0.5 ? "down" : "steady";
    }

    return {
      playerId: player.id,
      playerName: [player.first_name, player.last_name].join(" ").trim(),
      rank: null as number | null,
      averageScore9: average(ownRounds.filter((r) => r.holes === 9).map((r) => r.score)),
      averageScore18: average(ownRounds.filter((r) => r.holes === 18).map((r) => r.score)),
      averageDifferential: average(differentials.map((entry) => entry.normalizedDifferential)),
      countingPercentage: unambiguous.length
        ? unambiguous.filter((entry) => entry.rawDifferential <= 0).length / unambiguous.length
        : null,
      recentDifferential: average(recent.map((entry) => entry.normalizedDifferential)),
      trend,
      qualifyingRounds: differentials.length
    };
  });

  ranked.sort((a, b) => {
    const recent = (a.recentDifferential ?? Infinity) - (b.recentDifferential ?? Infinity);
    if (Number.isFinite(recent) && recent !== 0) return recent;
    const season = (a.averageDifferential ?? Infinity) - (b.averageDifferential ?? Infinity);
    if (Number.isFinite(season) && season !== 0) return season;
    const aScore = a.averageScore9 ?? a.averageScore18 ?? Infinity;
    const bScore = b.averageScore9 ?? b.averageScore18 ?? Infinity;
    if (aScore !== bScore) return aScore - bScore;
    return a.playerName.localeCompare(b.playerName);
  });

  let rank = 0;
  return ranked.map((player) => ({
    ...player,
    rank: player.qualifyingRounds > 0 ? ++rank : null
  }));
}
