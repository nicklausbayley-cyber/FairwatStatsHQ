import { getActiveSeasonForTeam } from "../../lib/seasons/active-season";
import { createServiceRoleClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
};

type RoundRow = {
  player_id: string;
  score: number;
  putts: number | null;
  fairways_hit: number | null;
  fairways_possible: number | null;
  greens_in_regulation: number | null;
  gir_possible: number | null;
  penalties: number | null;
  three_putts: number | null;
};

type PlayerStats = {
  id: string;
  playerName: string;
  roundsPlayed: number;
  averageScore: number | null;
  bestScore: number | null;
  averagePutts: number | null;
  fairwayPercentage: number | null;
  girPercentage: number | null;
  averagePenalties: number | null;
  averageThreePutts: number | null;
};

type StatisticsState =
  | {
      status: "ready";
      teamName: string;
      activeSeasonName: string | null;
      playerStats: PlayerStats[];
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

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function bestScore(values: Array<number | null | undefined>) {
  const validValues = values.filter(isNumber);

  if (validValues.length === 0) {
    return null;
  }

  return Math.min(...validValues);
}

function percentageFromTotals(
  rounds: RoundRow[],
  hitKey: "fairways_hit" | "greens_in_regulation",
  possibleKey: "fairways_possible" | "gir_possible"
) {
  const totals = rounds.reduce(
    (accumulator, round) => {
      const hit = round[hitKey];
      const possible = round[possibleKey];

      if (!isNumber(hit) || !isNumber(possible) || possible <= 0) {
        return accumulator;
      }

      return {
        hit: accumulator.hit + hit,
        possible: accumulator.possible + possible
      };
    },
    { hit: 0, possible: 0 }
  );

  if (totals.possible === 0) {
    return null;
  }

  return totals.hit / totals.possible;
}

function formatAverage(value: number | null) {
  return value === null ? "No data" : value.toFixed(1);
}

function formatPercentage(value: number | null) {
  return value === null ? "No data" : `${Math.round(value * 100)}%`;
}

function formatWholeNumber(value: number | null) {
  return value === null ? "No data" : value.toString();
}

async function getStatistics(): Promise<StatisticsState> {
  try {
    const supabase = createServiceRoleClient();

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (teamError) {
      return {
        status: "error",
        message: teamError.message
      };
    }

    if (!team) {
      return {
        status: "empty",
        message: "No team found. Run the demo seed file to add statistics data."
      };
    }

    const activeSeason = await getActiveSeasonForTeam(supabase, team.id);
    const roundsQuery = supabase
      .from("rounds")
      .select(
        "player_id, score, putts, fairways_hit, fairways_possible, greens_in_regulation, gir_possible, penalties, three_putts"
      )
      .eq("team_id", team.id);

    const [playersResult, roundsResult] = await Promise.all([
      supabase
        .from("players")
        .select("id, first_name, last_name")
        .eq("team_id", team.id)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),
      activeSeason ? roundsQuery.eq("season_id", activeSeason.id) : roundsQuery
    ]);

    if (playersResult.error) {
      return {
        status: "error",
        message: playersResult.error.message
      };
    }

    if (roundsResult.error) {
      return {
        status: "error",
        message: roundsResult.error.message
      };
    }

    const players = (playersResult.data ?? []) as PlayerRow[];
    const rounds = (roundsResult.data ?? []) as RoundRow[];

    const roundsByPlayer = new Map<string, RoundRow[]>();

    rounds.forEach((round) => {
      const playerRounds = roundsByPlayer.get(round.player_id) ?? [];
      playerRounds.push(round);
      roundsByPlayer.set(round.player_id, playerRounds);
    });

    const playerStats = players
      .map((player) => {
        const playerRounds = roundsByPlayer.get(player.id) ?? [];

        return {
          id: player.id,
          playerName: `${player.first_name} ${player.last_name}`,
          roundsPlayed: playerRounds.length,
          averageScore: average(playerRounds.map((round) => round.score)),
          bestScore: bestScore(playerRounds.map((round) => round.score)),
          averagePutts: average(playerRounds.map((round) => round.putts)),
          fairwayPercentage: percentageFromTotals(
            playerRounds,
            "fairways_hit",
            "fairways_possible"
          ),
          girPercentage: percentageFromTotals(
            playerRounds,
            "greens_in_regulation",
            "gir_possible"
          ),
          averagePenalties: average(playerRounds.map((round) => round.penalties)),
          averageThreePutts: average(
            playerRounds.map((round) => round.three_putts)
          )
        };
      })
      .sort((a, b) => {
        const aAverage = a.averageScore ?? Number.POSITIVE_INFINITY;
        const bAverage = b.averageScore ?? Number.POSITIVE_INFINITY;

        if (aAverage !== bAverage) {
          return aAverage - bAverage;
        }

        return a.playerName.localeCompare(b.playerName);
      });

    return {
      status: "ready",
      teamName: team.name,
      activeSeasonName: activeSeason?.name ?? null,
      playerStats
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to load statistics data."
    };
  }
}

export default async function StatisticsPage() {
  const statistics = await getStatistics();

  if (statistics.status === "error") {
    return (
      <section className="space-y-6">
        <StatisticsHeader />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Statistics unavailable</p>
          <p className="mt-1">{statistics.message}</p>
        </div>
      </section>
    );
  }

  if (statistics.status === "empty") {
    return (
      <section className="space-y-6">
        <StatisticsHeader />
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          {statistics.message}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <StatisticsHeader
        teamName={statistics.teamName}
        activeSeasonName={statistics.activeSeasonName}
        playerCount={statistics.playerStats.length}
      />

      {statistics.playerStats.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          No players found for this team yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-green-900/10 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.3fr_0.7fr_0.9fr_0.8fr_0.9fr_1fr_0.8fr_0.9fr_0.9fr] gap-4 border-b border-gray-100 bg-green-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-green-900 xl:grid">
            <span>Player</span>
            <span>Rounds</span>
            <span>Avg Score</span>
            <span>Best</span>
            <span>Avg Putts</span>
            <span>Fairways</span>
            <span>GIR</span>
            <span>Avg Pen.</span>
            <span>Avg 3-putts</span>
          </div>

          <div className="divide-y divide-gray-100">
            {statistics.playerStats.map((player) => (
              <PlayerStatRow key={player.id} player={player} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StatisticsHeader({
  teamName,
  activeSeasonName,
  playerCount
}: {
  teamName?: string;
  activeSeasonName?: string | null;
  playerCount?: number;
}) {
  return (
    <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
        Analytics
      </p>
      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            Statistics
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
            {teamName
              ? `${teamName} player analytics loaded from Supabase.`
              : "Player analytics will appear once Supabase data is available."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {typeof playerCount === "number" ? (
            <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
              {playerCount} players
            </div>
          ) : null}
          {teamName ? (
            <div className="rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
              {activeSeasonName ? `Active: ${activeSeasonName}` : "All seasons"}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PlayerStatRow({ player }: { player: PlayerStats }) {
  return (
    <div className="grid gap-3 px-5 py-4 text-sm xl:grid-cols-[1.3fr_0.7fr_0.9fr_0.8fr_0.9fr_1fr_0.8fr_0.9fr_0.9fr] xl:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
          Player
        </p>
        <p className="font-medium text-gray-950">{player.playerName}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
          Rounds
        </p>
        <p className="text-gray-700">{player.roundsPlayed}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
          Avg Score
        </p>
        <p className="font-semibold text-gray-950">
          {formatAverage(player.averageScore)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
          Best
        </p>
        <p className="text-gray-700">{formatWholeNumber(player.bestScore)}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
          Avg Putts
        </p>
        <p className="text-gray-700">{formatAverage(player.averagePutts)}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
          Fairways
        </p>
        <p className="text-gray-700">
          {formatPercentage(player.fairwayPercentage)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
          GIR
        </p>
        <p className="text-gray-700">{formatPercentage(player.girPercentage)}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
          Avg Penalties
        </p>
        <p className="text-gray-700">
          {formatAverage(player.averagePenalties)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
          Avg Three-putts
        </p>
        <p className="text-gray-700">
          {formatAverage(player.averageThreePutts)}
        </p>
      </div>
    </div>
  );
}
