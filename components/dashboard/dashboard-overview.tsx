import type {
  DashboardData,
  DashboardRound,
  DashboardSummary
} from "../../lib/dashboard/dashboard";

type DashboardOverviewProps = {
  dashboardData: DashboardData;
};

type MetricCard = {
  label: string;
  value: string;
  helper: string;
};

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

function formatDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${monthNames[month - 1]} ${day}, ${year}`;
}

function formatAverage(value: number | null) {
  return value === null ? "No data" : value.toFixed(1);
}

function formatPercentage(value: number | null) {
  return value === null ? "No data" : `${Math.round(value * 100)}%`;
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
        <p className="text-gray-700">{round.eventName ?? "No event"}</p>
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

export function DashboardOverview({ dashboardData }: DashboardOverviewProps) {
  if (dashboardData.status === "error") {
    return (
      <section className="space-y-6">
        <DashboardHeader />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Dashboard unavailable</p>
          <p className="mt-1">{dashboardData.message}</p>
        </div>
      </section>
    );
  }

  if (dashboardData.status === "empty") {
    return (
      <section className="space-y-6">
        <DashboardHeader />
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          {dashboardData.message}
        </div>
      </section>
    );
  }

  const metricCards = buildMetricCards(dashboardData.summary);

  return (
    <section className="space-y-6">
      <DashboardHeader teamName={dashboardData.teamName} />

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
            {dashboardData.recentRounds.length} shown
          </div>
        </div>
      </div>

      {dashboardData.recentRounds.length === 0 ? (
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
            {dashboardData.recentRounds.map((round) => (
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
