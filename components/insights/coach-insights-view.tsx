import Link from "next/link";
import { PrintReportButton } from "../events/print-report-button";
import {
  Badge, EmptyState, PageHeader, appPanelClassName, cn, secondaryButtonClassName
} from "../ui/primitives";
import { METRICS, METRIC_RULES, formatMetricValue } from "../../lib/insights/rules";
import type { CoachInsight, CoachInsightsReport, MetricComparison } from "../../lib/insights/types";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`));
}

function dateRange(dates: string[]) {
  const sorted = [...dates].sort();
  if (sorted.length === 0) return "No outings";
  return sorted[0] === sorted[sorted.length - 1] ? formatDate(sorted[0])
    : `${formatDate(sorted[0])} – ${formatDate(sorted[sorted.length - 1])}`;
}

function SnapshotCard({ metric, holes }: { metric: MetricComparison; holes: 9 | 18 }) {
  const rule = METRIC_RULES[metric.category];
  const notable = metric.ready && metric.delta !== null && Math.abs(metric.delta) + 1e-9 >= metric.threshold;
  const positive = notable && (rule.lowerIsBetter ? metric.delta! < 0 : metric.delta! > 0);
  const unit = metric.unit === "percentage_points" ? "pp"
    : metric.unit === "per_18" ? "per 18" : metric.unit;
  return (
    <div className={cn(appPanelClassName, "p-5 print:break-inside-avoid print:p-3 print:shadow-none")}>
      <p className="text-sm font-semibold text-slate-500">{rule.label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        {metric.recentValue === null ? "—" : formatMetricValue(metric.category, metric.recentValue)}
      </p>
      {metric.ready && metric.delta !== null ? (
        <p className={cn("mt-2 text-sm font-semibold", notable ? positive ? "text-green-800" : "text-amber-800" : "text-slate-600")}>
          {notable ? positive ? "Improving · " : "Attention · " : "Within threshold · "}
          {metric.delta > 0 ? "+" : ""}{metric.delta.toFixed(1)} {unit}
        </p>
      ) : <p className="mt-2 text-sm text-slate-500">{metric.recentValue === null ? "Stat not recorded" : "Building the baseline"}</p>}
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {metric.evidence.recentRoundIds.length} recent {holes}-hole rounds
        {metric.ready ? ` · ${metric.evidence.playerCount} matched player${metric.evidence.playerCount === 1 ? "" : "s"}` : ""}
      </p>
    </div>
  );
}

function InsightCard({ insight }: { insight: CoachInsight }) {
  const tone = insight.direction === "positive" ? "green" : insight.direction === "negative" ? "amber" : "slate";
  const label = insight.direction === "positive" ? "Improving" : insight.direction === "negative" ? "Attention" : "Contribution";
  return (
    <article className={cn(appPanelClassName, "p-5 print:break-inside-avoid print:p-3 print:shadow-none")}>
      <Badge tone={tone}>{label}</Badge>
      <h3 className="mt-3 text-lg font-bold text-slate-950">{insight.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{insight.body}</p>
      {insight.recommendation ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          <span className="font-semibold">Coaching focus: </span>{insight.recommendation}
        </p>
      ) : null}
      {insight.playerId ? (
        <Link href={`/players/${insight.playerId}`} className="mt-3 inline-block text-sm font-semibold text-green-800 hover:underline print:hidden">
          View player profile
        </Link>
      ) : null}
      <details className="mt-4 text-xs text-slate-500 print:hidden">
        <summary className="cursor-pointer font-semibold text-slate-600">Comparison details</summary>
        <p className="mt-2 leading-5">
          Recent: {dateRange(insight.evidence.recentDates)} · {insight.evidence.recentRoundIds.length} rounds.
          {insight.evidence.baselineRoundIds.length > 0 ? ` Baseline: ${dateRange(insight.evidence.baselineDates)} · ${insight.evidence.baselineRoundIds.length} rounds.` : " No baseline comparison: this observation describes low-four contribution."}
        </p>
      </details>
    </article>
  );
}

function InsightSection({ title, description, insights, empty }: {
  title: string; description: string; insights: CoachInsight[]; empty: string;
}) {
  return (
    <section aria-label={title} className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {insights.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">{insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)}</div>
      ) : <EmptyState message={empty} />}
    </section>
  );
}

export function CoachInsightsView({ report, teamName, seasonName }: {
  report: CoachInsightsReport; teamName: string; seasonName: string;
}) {
  const readyMetrics = METRICS.filter((category) => report.snapshot[category].ready);
  const recent = report.snapshot.scoring.evidence.recentDates;
  const baseline = report.snapshot.scoring.evidence.baselineDates;
  return (
    <section className="coach-insights-report space-y-6 print:space-y-4">
      <PageHeader eyebrow={teamName} title="Coach Insights"
        description="See meaningful changes in recent performance and use them to plan your next coaching conversation or practice."
        meta={<><Badge>{seasonName}</Badge><Badge tone="slate">{report.holes}-hole rounds</Badge></>}
        action={<PrintReportButton />} />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1" aria-label="Round format">
          {([9, 18] as const).map((holes) => (
            <Link key={holes} href={`/coach-insights?holes=${holes}`} aria-current={report.holes === holes ? "page" : undefined}
              className={cn("rounded-md px-4 py-2 text-sm font-semibold transition", report.holes === holes ? "bg-green-800 text-white" : "text-slate-600 hover:bg-white")}>
              {holes}-Hole
            </Link>
          ))}
        </div>
        <Link href={`/statistics?lineupHoles=${report.holes}`} className={secondaryButtonClassName}>View statistics</Link>
      </div>

      <div className="rounded-lg border border-green-200 bg-green-50 p-6 print:break-inside-avoid print:p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-green-800">Your team&apos;s recent form</p>
        <p className="mt-3 text-lg font-semibold leading-8 text-slate-950">{report.summary}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Recent: {dateRange(recent)} · Baseline: {dateRange(baseline)}
          {report.latestPlayedOn ? ` · Latest round: ${formatDate(report.latestPlayedOn)}` : ""}
        </p>
      </div>

      {report.teamOutings < 6 ? (
        <EmptyState title={`${Math.min(report.teamOutings, 6)} of 6 outings recorded`}
          message={`Record completed ${report.holes}-hole rounds from six separate outings to unlock team comparisons. A single event with several players counts as one outing.`}
          action={<Link href="/enter-score" className={secondaryButtonClassName}>Enter a score</Link>} />
      ) : readyMetrics.length < METRICS.length ? (
        <EmptyState title="Some comparisons need more complete stats"
          message="Each team stat needs the same player represented with that stat recorded in all six outings. Missing stats stay blank. Individual player insights may still be available below." />
      ) : null}

      <section aria-label="Team Snapshot" className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Team Snapshot</h2>
          <p className="mt-1 text-sm text-slate-600">Recent values use the matched players when a comparison is available; otherwise they show recorded stats from the recent outings.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
          {METRICS.map((category) => <SnapshotCard key={category} metric={report.snapshot[category]} holes={report.holes} />)}
        </div>
      </section>

      <section aria-label="Practice Priorities" className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Recommended Practice Focus</h2>
          <p className="mt-1 text-sm text-slate-600">Up to three priorities, ranked by how far each change exceeds its coaching threshold.</p>
        </div>
        {report.practicePriorities.length > 0 ? (
          <ol className="grid gap-4 lg:grid-cols-3">
            {report.practicePriorities.map((priority, index) => (
              <li key={priority.category} className={cn(appPanelClassName, "p-5 print:break-inside-avoid print:p-3 print:shadow-none")}>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Priority {index + 1} · {priority.scope === "team" ? "Team" : "Player focus"}</p>
                <h3 className="mt-3 text-lg font-bold text-slate-950">{priority.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{priority.reason}</p>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-800">{priority.recommendation}</p>
              </li>
            ))}
          </ol>
        ) : <EmptyState message="No supported practice priorities yet. Continue recording stats; priorities appear when a meaningful decline is detected." />}
      </section>

      <InsightSection title="Trending Up" description="The two strongest positive team changes."
        insights={report.trendingUp} empty="No positive team changes have crossed the threshold yet. Comparisons need complete recent and baseline samples." />
      <InsightSection title="Needs Attention" description="The two strongest negative team changes."
        insights={report.needsAttention} empty="No negative team changes have crossed the threshold yet. Comparisons need complete recent and baseline samples." />
      <InsightSection title="Players to Watch" description="Up to four players, each shown with their strongest supported observation."
        insights={report.playerWatchlist} empty="No player observations meet the rules yet. Trend observations need six completed rounds per player in the selected format." />

      <details className={cn(appPanelClassName, "p-5 print:hidden")}>
        <summary className="cursor-pointer font-semibold text-slate-800">How these insights are calculated</summary>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
          <p>Team trends compare the latest three outings with the previous three in the active season. An outing is an event on a played date, or a played date for rounds without an event. Each metric includes only players with that stat recorded in all six outings. Player trends use the player&apos;s own six outings.</p>
          <p>Only the latest submission per player per outing is used. Scoring and putts compare the selected format. GIR and FIR use total hits divided by recorded opportunities, rather than averaging percentages. Penalties and three-putts are shown per 18-hole equivalent.</p>
          <p>Low-four contributions use competition outings with at least four unique players. Practice, qualifiers, mixed formats, incomplete scorecards, and ties at the fourth-score boundary are excluded. These are estimates from entered scores: the app does not yet store official varsity lineups or tie-breaks.</p>
          <ul className="list-disc space-y-1 pl-5">
            {METRICS.map((category) => <li key={category}>{METRIC_RULES[category].label}: {METRIC_RULES[category].threshold(report.holes)} {METRIC_RULES[category].unit === "percentage_points" ? "percentage points" : METRIC_RULES[category].unit === "per_18" ? "per 18 holes" : METRIC_RULES[category].unit}.</li>)}
          </ul>
          <p>Submitted summary rounds are treated as complete. When hole scores exist, all {report.holes} holes must be recorded and match the total; a partially recorded stat is excluded from that metric. {report.excludedRounds} invalid or incomplete round{report.excludedRounds === 1 ? " was" : "s were"} excluded.</p>
          <p>Course difficulty and playing conditions are not adjusted. These observations describe changes; they do not prove causes. Practice advice stays within the recorded stats.</p>
        </div>
      </details>
    </section>
  );
}
