import { createServiceRoleClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
};

type EventRow = {
  id: string;
  name: string;
};

type RoundRow = {
  id: string;
  player_id: string;
  event_id: string | null;
  played_on: string;
  score: number;
  putts: number | null;
  fairways_hit: number | null;
  fairways_possible: number | null;
  greens_in_regulation: number | null;
  gir_possible: number | null;
  penalties: number | null;
  three_putts: number | null;
};

type DashboardRound = {
  id: string;
  playerName: string;
  eventName: string;
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

type DashboardSummary = {
  totalPlayers: number;
  totalEvents: number;
  totalRounds: number;
  averageScore: number | null;
  averagePutts: number | null;
  fairwayPercentage: number | null;
  girPercentage: number | null;
  averagePenalties: number | null;
};

type DashboardState =
  | {
      status: "ready";
      teamName: string;
      summary: DashboardSummary;
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

type MetricCard = {
  label: string;
  value: string;
  helper: string;
};

const roundSelect =
  "id, player_id, event_id, played_on, score, putts, fairways_hit, fairways_possible, greens_in_regulation, gir_possible, penalties, three_putts";

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

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

function formatDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${monthNames[month - 1]} ${day}, ${year}`;
}

function formatStatPair(value: number | null, possible: number | null) {
  if (value === null || possible === null) {
    return "Not set";
  }

  return `${value} / ${possible}`;
}

function buildMetricCards(summary: DashboardSummary): MetricCard[] {
  return [
    {
      label: "Total players",
      value: summary.totalPlayers.toString(),
      helper: "Active roster records"
    },
    {
      label: "Total events",
      value: summary.totalEvents.toString(),
      helper: "Team schedule records"
    },
    {
      label: "Total rounds",
      value: summary.totalRounds.toString(),
      helper: "Submitted scorecards"
    },
    {
      label: "Team average score",
      value: formatAverage(summary.averageScore),
      helper: "Rounds with scores"
    },
    {
      label: "Team average putts",
      value: formatAverage(summary.averagePutts),
      helper: "Rounds with putts"
    },
    {
      label: "Team fairway percentage",
      value: formatPercentage(summary.fairwayPercentage),
      helper: "Fairways hit / possible"
    },
    {
      label: "Team GIR percentage",
      value: formatPercentage(summary.girPercentage),
      helper: "Greens in regulation"
    },
    {
      label: "Average penalties per round",
      value: formatAverage(summary.averagePenalties),
      helper: "Rounds with penalties"
    }
  ];
}

async function getDashboardData(): Promise<DashboardState> {
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
        message: "No team found. Run the demo seed file to add dashboard data."
      };
    }

    const [playersResult, eventsResult, roundsResult] = await Promise.all([
      supabase
        .from("players")
        .select("id, first_name, last_name")
        .eq("team_id", team.id)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),
      supabase
        .from("events")
        .select("id, name")
        .eq("team_id", team.id)
        .order("event_date", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("rounds")
        .select(roundSelect)
        .eq("team_id", team.id)
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

    const players = (playersResult.data ?? []) as PlayerRow[];
    const events = (eventsResult.data ?? []) as EventRow[];
    const rounds = (roundsResult.data ?? []) as RoundRow[];

    const playerNames = new Map(
      players.map((player) => [
        player.id,
        `${player.first_name} ${player.last_name}`
      ])
    );
    const eventNames = new Map(events.map((event) => [event.id, event.name]));

    return {
      status: "ready",
      teamName: team.name,
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
      recentRounds: rounds.slice(0, 10).map((round) => ({
        id: round.id,
        playerName: playerNames.get(round.player_id) ?? "Unknown player",
        eventName:
          (round.event_id ? eventNames.get(round.event_id) : null) ??
          "No event",
        playedOn: round.played_on,
        score: round.score,
        putts: round.putts,
        fairwaysHit: round.fairways_hit,
        fairwaysPossible: round.fairways_possible,
        greensInRegulation: round.greens_in_regulation,
        girPossible: round.gir_possible,
        penalties: round.penalties,
        threePutts: round.three_putts
      }))
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

export default async function DashboardPage() {
  const dashboard = await getDashboardData();

  if (dashboard.status === "error") {
    return (
      <section className="space-y-6">
        <DashboardHeader />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Dashboard unavailable</p>
          <p className="mt-1">{dashboard.message}</p>
        </div>
      </section>
    );
  }

  if (dashboard.status === "empty") {
    return (
      <section className="space-y-6">
        <DashboardHeader />
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          {dashboard.message}
        </div>
      </section>
    );
  }

  const metricCards = buildMetricCards(dashboard.summary);

  return (
    <section className="space-y-6">
      <DashboardHeader teamName={dashboard.teamName} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-green-900/10 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-gray-600">
              {metric.label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-gray-950">
              {metric.value}
            </p>
            <p className="mt-2 text-sm text-gray-500">{metric.helper}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Scorecards
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
              Recent Rounds
            </h2>
          </div>
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
            {dashboard.recentRounds.length} shown
          </div>
        </div>
      </div>

      {dashboard.recentRounds.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          No rounds found for this team yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-green-900/10 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.2fr_1.2fr_1fr_0.6fr_0.6fr_0.9fr_0.8fr_0.7fr_0.7fr] gap-4 border-b border-gray-100 bg-green-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-green-900 lg:grid">
            <span>Player</span>
            <span>Event</span>
            <span>Played</span>
            <span>Score</span>
            <span>Putts</span>
            <span>Fairways</span>
            <span>GIR</span>
            <span>Pen.</span>
            <span>3-putts</span>
          </div>

          <div className="divide-y divide-gray-100">
            {dashboard.recentRounds.map((round) => (
              <RecentRoundRow key={round.id} round={round} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function DashboardHeader({ teamName }: { teamName?: string }) {
  return (
    <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
        Team Overview
      </p>
      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
            {teamName
              ? `${teamName} scoring summary loaded from Supabase.`
              : "Team scoring summaries will appear once Supabase data is available."}
          </p>
        </div>
      </div>
    </div>
  );
}

function RecentRoundRow({ round }: { round: DashboardRound }) {
  return (
    <div className="grid gap-3 px-5 py-4 text-sm lg:grid-cols-[1.2fr_1.2fr_1fr_0.6fr_0.6fr_0.9fr_0.8fr_0.7fr_0.7fr] lg:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Player
        </p>
        <p className="font-medium text-gray-950">{round.playerName}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Event
        </p>
        <p className="text-gray-700">{round.eventName}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Played
        </p>
        <p className="text-gray-700">{formatDate(round.playedOn)}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Score
        </p>
        <p className="font-semibold text-gray-950">{round.score}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Putts
        </p>
        <p className="text-gray-700">{round.putts ?? "Not set"}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Fairways
        </p>
        <p className="text-gray-700">
          {formatStatPair(round.fairwaysHit, round.fairwaysPossible)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          GIR
        </p>
        <p className="text-gray-700">
          {formatStatPair(round.greensInRegulation, round.girPossible)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Penalties
        </p>
        <p className="text-gray-700">{round.penalties ?? "Not set"}</p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Three-putts
        </p>
        <p className="text-gray-700">{round.threePutts ?? "Not set"}</p>
      </div>
    </div>
  );
}
