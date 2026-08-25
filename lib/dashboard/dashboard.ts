import { getActiveSeasonForTeam } from "../seasons/active-season";
import type { CurrentTeamContext } from "../auth/get-current-team";

type PlayerLookupRow = {
  id: string;
  first_name: string;
  last_name: string;
};

type EventLookupRow = {
  id: string;
  name: string;
};

type RoundRow = {
  id: string;
  player_id: string;
  event_id: string | null;
  played_on: string;
  holes: number;
  counts_toward_lineup: boolean;
  score: number;
  putts: number | null;
  fairways_hit: number | null;
  fairways_possible: number | null;
  greens_in_regulation: number | null;
  gir_possible: number | null;
  penalties: number | null;
  three_putts: number | null;
};

const roundsSelect =
  "id, player_id, event_id, played_on, holes, counts_toward_lineup, score, putts, fairways_hit, fairways_possible, greens_in_regulation, gir_possible, penalties, three_putts";

export type DashboardRound = {
  id: string;
  playerName: string;
  eventName: string | null;
  playedOn: string;
  score: number;
  putts: number | null;
  fairwaysHit: number | null;
  fairwaysPossible: number | null;
  greensInRegulation: number | null;
  girPossible: number | null;
  penalties: number | null;
  threePutts: number | null;
};

export type DashboardSummary = {
  totalPlayers: number;
  totalEvents: number;
  totalRounds: number;
  averageScore: number | null;
  averagePutts: number | null;
  fairwayPercentage: number | null;
  girPercentage: number | null;
  averagePenalties: number | null;
};

export type DashboardLineupPerformance = {
  playerId: string;
  playerName: string;
  averageScore: number | null;
  averageDifferential: number | null;
  countingPercentage: number | null;
  recentDifferential: number | null;
  trend: "up" | "down" | "steady" | "new";
  qualifyingRounds: number;
};

export type DashboardData =
  | {
      status: "ready";
      teamName: string;
      activeSeasonName: string | null;
      summary: DashboardSummary;
      lineupPerformance: DashboardLineupPerformance[];
      recentRounds: DashboardRound[];
    }
  | {
      status: "empty";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function average(values: Array<number | null | undefined>) {
  const validValues = values.filter(isNumber);

  if (validValues.length === 0) {
    return null;
  }

  const total = validValues.reduce((sum, value) => sum + value, 0);
  return total / validValues.length;
}

function percentageFromTotals(
  rows: RoundRow[],
  hitKey: "fairways_hit" | "greens_in_regulation",
  possibleKey: "fairways_possible" | "gir_possible"
) {
  const totals = rows.reduce(
    (accumulator, row) => {
      const hit = row[hitKey];
      const possible = row[possibleKey];

      if (isNumber(hit) && isNumber(possible) && possible > 0) {
        return {
          hit: accumulator.hit + hit,
          possible: accumulator.possible + possible
        };
      }

      return accumulator;
    },
    { hit: 0, possible: 0 }
  );

  if (totals.possible === 0) {
    return null;
  }

  return totals.hit / totals.possible;
}

type DifferentialRound = {
  round: RoundRow;
  differential: number;
};

function buildLineupPerformance(
  players: PlayerLookupRow[],
  rounds: RoundRow[]
): DashboardLineupPerformance[] {
  const eligibleRounds = rounds.filter(
    (round) =>
      round.event_id !== null &&
      round.counts_toward_lineup &&
      (round.holes === 9 || round.holes === 18)
  );
  const roundsByEventAndFormat = new Map<string, RoundRow[]>();

  eligibleRounds.forEach((round) => {
    const key = `${round.event_id}:${round.holes}`;
    const eventRounds = roundsByEventAndFormat.get(key) ?? [];
    eventRounds.push(round);
    roundsByEventAndFormat.set(key, eventRounds);
  });

  const differentialsByPlayer = new Map<string, DifferentialRound[]>();

  roundsByEventAndFormat.forEach((eventRounds) => {
    const bestRoundByPlayer = new Map<string, RoundRow>();

    eventRounds.forEach((round) => {
      const current = bestRoundByPlayer.get(round.player_id);

      if (!current || round.score < current.score) {
        bestRoundByPlayer.set(round.player_id, round);
      }
    });

    const uniquePlayerRounds = Array.from(bestRoundByPlayer.values()).sort(
      (a, b) => a.score - b.score
    );

    if (uniquePlayerRounds.length < 4) {
      return;
    }

    const countingScore = uniquePlayerRounds[3].score;

    uniquePlayerRounds.forEach((round) => {
      const playerRounds = differentialsByPlayer.get(round.player_id) ?? [];
      playerRounds.push({
        round,
        differential: round.score - countingScore
      });
      differentialsByPlayer.set(round.player_id, playerRounds);
    });
  });

  return players
    .map((player) => {
      const playerDifferentials = [
        ...(differentialsByPlayer.get(player.id) ?? [])
      ].sort((a, b) => {
        const dateComparison = b.round.played_on.localeCompare(a.round.played_on);

        if (dateComparison !== 0) {
          return dateComparison;
        }

        return b.round.id.localeCompare(a.round.id);
      });
      const recentRounds = playerDifferentials.slice(0, 5);
      const priorRounds = playerDifferentials.slice(5, 10);
      const recentDifferential = average(
        recentRounds.map((entry) => entry.differential)
      );
      const priorDifferential = average(
        priorRounds.map((entry) => entry.differential)
      );
      let trend: DashboardLineupPerformance["trend"] = "new";

      if (recentDifferential !== null && priorDifferential !== null) {
        const change = recentDifferential - priorDifferential;

        if (change <= -0.5) {
          trend = "up";
        } else if (change >= 0.5) {
          trend = "down";
        } else {
          trend = "steady";
        }
      } else if (playerDifferentials.length >= 2) {
        trend = "steady";
      }

      return {
        playerId: player.id,
        playerName: `${player.first_name} ${player.last_name}`,
        averageScore: average(
          playerDifferentials.map((entry) => entry.round.score)
        ),
        averageDifferential: average(
          playerDifferentials.map((entry) => entry.differential)
        ),
        countingPercentage:
          playerDifferentials.length > 0
            ? playerDifferentials.filter((entry) => entry.differential <= 0).length /
              playerDifferentials.length
            : null,
        recentDifferential,
        trend,
        qualifyingRounds: playerDifferentials.length
      };
    })
    .filter((player) => player.qualifyingRounds > 0)
    .sort((a, b) => {
      const aRecent = a.recentDifferential ?? Number.POSITIVE_INFINITY;
      const bRecent = b.recentDifferential ?? Number.POSITIVE_INFINITY;

      if (aRecent !== bRecent) {
        return aRecent - bRecent;
      }

      const aSeason = a.averageDifferential ?? Number.POSITIVE_INFINITY;
      const bSeason = b.averageDifferential ?? Number.POSITIVE_INFINITY;

      if (aSeason !== bSeason) {
        return aSeason - bSeason;
      }

      return a.playerName.localeCompare(b.playerName);
    })
    .slice(0, 6);
}

export async function getDashboardData(
  currentTeam: CurrentTeamContext
): Promise<DashboardData> {
  try {
    const { supabase, team } = currentTeam;

    const activeSeason = await getActiveSeasonForTeam(supabase, team.id);

    const eventsQuery = supabase
      .from("events")
      .select("id, name")
      .eq("team_id", team.id);
    const roundsQuery = supabase
      .from("rounds")
      .select(roundsSelect)
      .eq("team_id", team.id);

    const [playersResult, eventsResult, roundsResult] = await Promise.all([
      supabase
        .from("players")
        .select("id, first_name, last_name")
        .eq("team_id", team.id)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),
      (activeSeason
        ? eventsQuery.eq("season_id", activeSeason.id)
        : eventsQuery
      )
        .order("event_date", { ascending: true })
        .order("name", { ascending: true }),
      (activeSeason
        ? roundsQuery.eq("season_id", activeSeason.id)
        : roundsQuery
      )
        .order("played_on", { ascending: false })
        .order("created_at", { ascending: false })
    ]);

    if (playersResult.error) {
      return {
        status: "error",
        message: playersResult.error.message
      };
    }

    if (eventsResult.error) {
      return {
        status: "error",
        message: eventsResult.error.message
      };
    }

    if (roundsResult.error) {
      return {
        status: "error",
        message: roundsResult.error.message
      };
    }

    const players = (playersResult.data ?? []) as PlayerLookupRow[];
    const events = (eventsResult.data ?? []) as EventLookupRow[];
    const rounds = (roundsResult.data ?? []) as RoundRow[];

    const playerNames = new Map(
      players.map((player) => [
        player.id,
        `${player.first_name} ${player.last_name}`
      ])
    );
    const eventNames = new Map(events.map((event) => [event.id, event.name]));

    const recentRounds = rounds.slice(0, 10).map((round) => ({
      id: round.id,
      playerName: playerNames.get(round.player_id) ?? "Unknown player",
      eventName: round.event_id
        ? eventNames.get(round.event_id) ?? "Unknown event"
        : null,
      playedOn: round.played_on,
      score: round.score,
      putts: round.putts,
      fairwaysHit: round.fairways_hit,
      fairwaysPossible: round.fairways_possible,
      greensInRegulation: round.greens_in_regulation,
      girPossible: round.gir_possible,
      penalties: round.penalties,
      threePutts: round.three_putts
    }));

    return {
      status: "ready",
      teamName: team.name,
      activeSeasonName: activeSeason?.name ?? null,
      summary: {
        totalPlayers: players.length,
        totalEvents: events.length,
        totalRounds: rounds.length,
        averageScore: average(rounds.map((round) => round.score)),
        averagePutts: average(rounds.map((round) => round.putts)),
        fairwayPercentage: percentageFromTotals(
          rounds,
          "fairways_hit",
          "fairways_possible"
        ),
        girPercentage: percentageFromTotals(
          rounds,
          "greens_in_regulation",
          "gir_possible"
        ),
        averagePenalties: average(rounds.map((round) => round.penalties))
      },
      lineupPerformance: buildLineupPerformance(players, rounds),
      recentRounds
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to load dashboard data."
    };
  }
}
