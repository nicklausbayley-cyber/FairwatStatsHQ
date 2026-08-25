import Link from "next/link";
import type {
  DashboardData,
  DashboardLineupPerformance,
  DashboardRound,
  DashboardSummary
} from "../../lib/dashboard/dashboard";
import {
  Badge,
  EmptyState,
  PageHeader,
  StatCard,
  cn,
  secondaryButtonClassName,
  tableHeaderClassName,
  tableRowClassName,
  tableShellClassName
} from "../ui/primitives";

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

function formatDifferential(value: number | null) {
  if (value === null) {
    return "No data";
  }

  if (Math.abs(value) < 0.05) {
    return "0.0";
  }

  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
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
      helper: "Season schedule records"
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

function trendLabel(trend: DashboardLineupPerformance["trend"]) {
  switch (trend) {
    case "up":
      return "↑ Improving";
    case "down":
      return "↓ Cooling";
    case "steady":
      return "→ Steady";
    default:
      return "New";
  }
}

function trendTone(
  trend: DashboardLineupPerformance["trend"]
): "green" | "slate" | "amber" {
  if (trend === "up") {
    return "green";
  }

  if (trend === "down") {
    return "amber";
  }

  return "slate";
}

function LineupPerformanceRow({
  player
}: {
  player: DashboardLineupPerformance;
}) {
  return (
    <div
      className={cn(
        tableRowClassName,
        "sm:grid-cols-2 lg:grid-cols-[1.5fr_0.85fr_0.95fr_0.85fr_0.95fr_0.95fr] lg:items-center"
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Player
        </p>
        <Link
          href={`/players/${player.playerId}`}
          className="font-semibold text-gray-950 hover:text-green-800"
        >
          {player.playerName}
        </Link>
        <p className="mt-1 text-xs text-slate-500 lg:hidden">
          {player.qualifyingRounds} qualifying event
          {player.qualifyingRounds === 1 ? "" : "s"}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Avg Score
        </p>
        <p className="font-medium text-slate-800">
          {formatAverage(player.averageScore)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Counting Diff.
        </p>
        <p
          className={cn(
            "text-lg font-bold",
            player.averageDifferential !== null &&
              player.averageDifferential <= 0
              ? "text-green-800"
              : "text-slate-950"
          )}
        >
          {formatDifferential(player.averageDifferential)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Counting %
        </p>
        <p className="font-medium text-slate-800">
          {formatPercentage(player.countingPercentage)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Last 5 Diff.
        </p>
        <p
          className={cn(
            "font-semibold",
            player.recentDifferential !== null &&
              player.recentDifferential <= 0
              ? "text-green-800"
              : "text-slate-800"
          )}
        >
          {formatDifferential(player.recentDifferential)}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Trend
        </p>
        <Badge tone={trendTone(player.trend)}>{trendLabel(player.trend)}</Badge>
      </div>
    </div>
  );
}

function RecentRoundRow({ round }: { round: DashboardRound }) {
  return (
    <div className={cn(tableRowClassName, "lg:grid-cols-[1.2fr_1.2fr_1fr_0.6fr_0.6fr_0.9fr_0.8fr_0.7fr_0.7fr_0.9fr] lg:items-center")}>
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
        <p className="font-bold text-slate-950">{round.score}</p>
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

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 lg:hidden">
          Actions
        </p>
        <Link
          href={`/rounds/${round.id}`}
          className={`${secondaryButtonClassName} px-3 py-1.5 text-xs`}
        >
          View Details
        </Link>
      </div>
    </div>
  );
}

export function DashboardOverview({ dashboardData }: DashboardOverviewProps) {
  if (dashboardData.status === "error") {
    return (
      <section className="space-y-6">
        <DashboardHeader />
        <EmptyState title="Dashboard unavailable" message={dashboardData.message} />
      </section>
    );
  }

  if (dashboardData.status === "empty") {
    return (
      <section className="space-y-6">
        <DashboardHeader />
        <EmptyState message={dashboardData.message} />
      </section>
    );
  }

  const metricCards = buildMetricCards(dashboardData.summary);

  return (
    <section className="space-y-6">
      <DashboardHeader
        teamName={dashboardData.teamName}
        activeSeasonName={dashboardData.activeSeasonName}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            helper={metric.helper}
          />
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Lineup Performance
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
              Who is contributing to the team score?
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Counting Differential compares each eligible player score with the
              team&apos;s fourth-lowest score in the same event and round length.
              Negative numbers indicate performance better than the counting-score cutoff.
            </p>
          </div>
          <Link href="/statistics" className={secondaryButtonClassName}>
            View Full Statistics
          </Link>
        </div>
      </div>

      {dashboardData.lineupPerformance.length === 0 ? (
        <EmptyState message="Lineup Performance will appear after at least four eligible players post scores in the same event and round length." />
      ) : (
        <div className={tableShellClassName}>
          <div
            className={cn(
              tableHeaderClassName,
              "lg:grid lg:grid-cols-[1.5fr_0.85fr_0.95fr_0.85fr_0.95fr_0.95fr]"
            )}
          >
            <span>Player</span>
            <span>Avg Score</span>
            <span>Counting Diff.</span>
            <span>Counting %</span>
            <span>Last 5 Diff.</span>
            <span>Trend</span>
          </div>

          <div className="divide-y divide-gray-100">
            {dashboardData.lineupPerformance.map((player) => (
              <LineupPerformanceRow key={player.playerId} player={player} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 sm:p-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Scorecards
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
              Recent Rounds
            </h2>
          </div>
          <Badge>{dashboardData.recentRounds.length} shown</Badge>
        </div>
      </div>

      {dashboardData.recentRounds.length === 0 ? (
        <EmptyState
          message={
            dashboardData.activeSeasonName
              ? `No rounds found for ${dashboardData.activeSeasonName} yet.`
              : "No rounds found for this team yet."
          }
        />
      ) : (
        <div className={tableShellClassName}>
          <div className={cn(tableHeaderClassName, "lg:grid lg:grid-cols-[1.2fr_1.2fr_1fr_0.6fr_0.6fr_0.9fr_0.8fr_0.7fr_0.7fr_0.9fr]")}>
            <span>Player</span>
            <span>Event</span>
            <span>Played</span>
            <span>Score</span>
            <span>Putts</span>
            <span>Fairways</span>
            <span>GIR</span>
            <span>Pen.</span>
            <span>3-putts</span>
            <span>Actions</span>
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

function DashboardHeader({
  teamName,
  activeSeasonName
}: {
  teamName?: string;
  activeSeasonName?: string | null;
}) {
  return (
    <PageHeader
      eyebrow="Team Overview"
      title="Dashboard"
      description={
        teamName
          ? `${teamName} scoring summary, roster totals, and recent scorecards.`
          : "Team scoring summaries will appear once Supabase data is available."
      }
      meta={
        teamName ? (
          <Badge tone={activeSeasonName ? "green" : "slate"}>
            {activeSeasonName ? `Active: ${activeSeasonName}` : "All seasons"}
          </Badge>
        ) : null
      }
    />
  );
}
