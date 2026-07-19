import type {
  DashboardData,
  DashboardRound,
  DashboardSummary
} from "../../lib/dashboard/dashboard";
import {
  Badge,
  EmptyState,
  PageHeader,
  StatCard,
  cn,
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

function RecentRoundRow({ round }: { round: DashboardRound }) {
  return (
    <div className={cn(tableRowClassName, "lg:grid-cols-[1.2fr_1.2fr_1fr_0.6fr_0.6fr_0.9fr_0.8fr_0.7fr_0.7fr] lg:items-center")}>
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
          <div className={cn(tableHeaderClassName, "lg:grid lg:grid-cols-[1.2fr_1.2fr_1fr_0.6fr_0.6fr_0.9fr_0.8fr_0.7fr_0.7fr]")}>
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
