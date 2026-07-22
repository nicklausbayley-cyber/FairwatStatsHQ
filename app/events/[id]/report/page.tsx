import Link from "next/link";
import { requireTeamStaff } from "../../../../lib/auth/get-current-team";
import {
  getEventReport,
  type EventReportRound
} from "../../../../lib/events/event-report";
import { PrintReportButton } from "../../../../components/events/print-report-button";
import {
  Badge,
  EmptyState,
  PageHeader,
  StatCard,
  appPanelClassName,
  cn,
  secondaryButtonClassName,
  tableHeaderClassName,
  tableRowClassName,
  tableShellClassName
} from "../../../../components/ui/primitives";

export const dynamic = "force-dynamic";

type EventReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(date: string) {
  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatEventType(value: string) {
  return value
    .split("_")
    .map(
      (word) =>
        `${word.charAt(0).toUpperCase()}${word.slice(
          1
        )}`
    )
    .join(" ");
}

function formatToPar(
  score: number,
  par: number | null
) {
  if (par === null) {
    return "No data";
  }

  const difference = score - par;

  if (difference === 0) {
    return "E";
  }

  return difference > 0
    ? `+${difference}`
    : difference.toString();
}

function formatTeamToPar(value: number | null) {
  if (value === null) {
    return "Pending";
  }

  if (value === 0) {
    return "E";
  }

  return value > 0
    ? `+${value}`
    : value.toString();
}

function formatAverage(value: number | null) {
  return value === null
    ? "No data"
    : value.toFixed(1);
}

function formatPercentage(
  value: number | null
) {
  return value === null
    ? "No data"
    : `${Math.round(value * 100)}%`;
}

function formatPair(
  hit: number | null,
  possible: number | null
) {
  if (hit === null || possible === null) {
    return "No data";
  }

  return `${hit} / ${possible}`;
}

export default async function EventReportPage({
  params
}: EventReportPageProps) {
  const { id } = await params;
  const currentTeam = await requireTeamStaff();
  const report = await getEventReport(
    id,
    currentTeam
  );

  if (report.status === "error") {
    return (
      <section className="space-y-6">
        <PageHeader
          eyebrow="Event Report"
          title="Report unavailable"
          description="The event report could not be loaded."
          action={
            <Link
              href="/events"
              className={
                secondaryButtonClassName
              }
            >
              Back to Events
            </Link>
          }
        />

        <EmptyState
          title="Unable to load report"
          message={report.message}
        />
      </section>
    );
  }

  if (report.status === "not-found") {
    return (
      <section className="space-y-6">
        <PageHeader
          eyebrow="Event Report"
          title="Event not found"
          description="The selected event is unavailable."
          action={
            <Link
              href="/events"
              className={
                secondaryButtonClassName
              }
            >
              Back to Events
            </Link>
          }
        />

        <EmptyState message={report.message} />
      </section>
    );
  }

  return (
    <section className="space-y-6 print:space-y-3 print:text-black">
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0.35in;
          }
        }
      `}</style>
      <div className="print:hidden">
        <PageHeader
          eyebrow="Event Report"
          title={report.event.name}
          description={`${report.teamName} team performance report for ${formatDate(
            report.event.eventDate
          )}.`}
          meta={
            <>
              <Badge>
                {formatEventType(
                  report.event.eventType
                )}
              </Badge>
              <Badge tone="slate">
                {report.summary.totalRounds} rounds
              </Badge>
            </>
          }
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/events"
                className={
                  secondaryButtonClassName
                }
              >
                Back to Events
              </Link>
              <PrintReportButton />
            </div>
          }
        />
      </div>

      <div className="hidden border-b border-slate-300 pb-3 print:block">
        <h1 className="text-2xl font-bold text-slate-950">
          {report.teamName}
        </h1>
        <p className="mt-1 text-lg font-semibold">
          {report.event.name}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {formatDate(report.event.eventDate)}
        </p>
      </div>

      <div
        className={cn(
          appPanelClassName,
          "p-6 sm:p-8 print:border-0 print:p-0 print:shadow-none"
        )}
      >
        <dl className="grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem
            label="Team"
            value={
              report.schoolName ??
              report.teamName
            }
          />
          <InfoItem
            label="Event Type"
            value={formatEventType(
              report.event.eventType
            )}
          />
          <InfoItem
            label="Course"
            value={
              report.event.courseName ??
              "Not set"
            }
          />
          <InfoItem
            label="Location"
            value={
              report.event.location ??
              "Not set"
            }
          />
        </dl>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2 print:[&>div]:break-inside-avoid print:[&>div]:p-3">
        <StatCard
          label="Team Score"
          value={
            report.summary.teamScore?.toString() ??
            "Pending"
          }
          helper="Lowest four unique-player scores"
        />
        <StatCard
          label="Team To Par"
          value={formatTeamToPar(
            report.summary.teamToPar
          )}
          helper="Counting scores only"
        />
        <StatCard
          label="Low Score"
          value={
            report.summary.lowScore?.toString() ??
            "No data"
          }
          helper="Best individual round"
        />
        <StatCard
          label="Players"
          value={report.summary.uniquePlayers.toString()}
          helper={`${report.summary.countingScores} counting candidates`}
        />
        <StatCard
          label="Average Putts"
          value={formatAverage(
            report.summary.averagePutts
          )}
        />
        <StatCard
          label="Fairway Percentage"
          value={formatPercentage(
            report.summary.fairwayPercentage
          )}
        />
        <StatCard
          label="GIR Percentage"
          value={formatPercentage(
            report.summary.girPercentage
          )}
        />
        <StatCard
          label="Submitted Rounds"
          value={report.summary.totalRounds.toString()}
        />
      </div>

      <div
        className={cn(
          appPanelClassName,
          "p-6 text-sm leading-6 text-slate-600 print:border-0 print:p-0 print:shadow-none"
        )}
      >
        <p className="font-semibold text-slate-950">
          Team scoring method
        </p>
        <p className="mt-1">
          The lowest four scores from four unique
          players are marked as counting scores. If a
          player has multiple submissions, only that
          player&apos;s lowest round can count toward
          the team total.
        </p>
      </div>

      {report.rounds.length === 0 ? (
        <EmptyState message="No rounds have been submitted for this event yet." />
      ) : (
        <div
          className={cn(
            tableShellClassName,
            "print:overflow-visible print:border-slate-400 print:shadow-none"
          )}
        >
          <div
            className={cn(
              tableHeaderClassName,
              "xl:grid xl:grid-cols-[1.3fr_0.8fr_0.65fr_0.65fr_0.7fr_0.9fr_0.8fr_0.65fr_0.7fr_0.9fr] print:grid print:grid-cols-[1.3fr_0.7fr_0.6fr_0.6fr_0.7fr_0.9fr_0.8fr_0.6fr_0.7fr] print:px-2 print:text-[9px]"
            )}
          >
            <span>Player</span>
            <span>Status</span>
            <span>Holes</span>
            <span>Score</span>
            <span>To Par</span>
            <span>Putts</span>
            <span>Fairways</span>
            <span>GIR</span>
            <span>Pen.</span>
            <span className="print:hidden">
              Details
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {report.rounds.map((round) => (
              <ReportRoundRow
                key={round.id}
                round={round}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ReportRoundRow({
  round
}: {
  round: EventReportRound;
}) {
  return (
    <div
      className={cn(
        tableRowClassName,
        "xl:grid-cols-[1.3fr_0.8fr_0.65fr_0.65fr_0.7fr_0.9fr_0.8fr_0.65fr_0.7fr_0.9fr] xl:items-center print:grid print:break-inside-avoid print:grid-cols-[1.3fr_0.7fr_0.6fr_0.6fr_0.7fr_0.9fr_0.8fr_0.6fr_0.7fr] print:gap-2 print:px-2 print:py-1.5 print:text-[9px]"
      )}
    >
      <Cell
        label="Player"
        value={round.playerName}
        strong
      />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 xl:hidden print:hidden">
          Status
        </p>
        <Badge
          tone={
            round.counting
              ? "green"
              : "slate"
          }
          className="print:border-0 print:bg-transparent print:px-0 print:py-0 print:text-[10px]"
        >
          {round.counting
            ? "Counting"
            : "Non-counting"}
        </Badge>
      </div>

      <Cell
        label="Holes"
        value={round.holes.toString()}
      />
      <Cell
        label="Score"
        value={round.score.toString()}
        strong
      />
      <Cell
        label="To Par"
        value={formatToPar(
          round.score,
          round.par
        )}
      />
      <Cell
        label="Putts"
        value={
          round.putts?.toString() ??
          "No data"
        }
      />
      <Cell
        label="Fairways"
        value={formatPair(
          round.fairwaysHit,
          round.fairwaysPossible
        )}
      />
      <Cell
        label="GIR"
        value={formatPair(
          round.greensInRegulation,
          round.girPossible
        )}
      />
      <Cell
        label="Penalties"
        value={
          round.penalties?.toString() ??
          "No data"
        }
      />

      <div className="print:hidden">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 xl:hidden">
          Details
        </p>
        <Link
          href={`/rounds/${round.id}`}
          className={`${secondaryButtonClassName} px-3 py-1.5 text-xs`}
        >
          View Round
        </Link>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-medium text-slate-950">
        {value}
      </dd>
    </div>
  );
}

function Cell({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 xl:hidden print:hidden">
        {label}
      </p>
      <p
        className={
          strong
            ? "font-semibold text-slate-950"
            : "text-slate-700"
        }
      >
        {value}
      </p>
    </div>
  );
}
