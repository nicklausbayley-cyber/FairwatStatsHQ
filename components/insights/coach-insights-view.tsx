import Link from "next/link";
import { PrintReportButton } from "../events/print-report-button";
import {
  Badge, EmptyState, PageHeader, appPanelClassName, cn, secondaryButtonClassName
} from "../ui/primitives";
import { METRICS, METRIC_RULES, formatMetricValue } from "../../lib/insights/rules";
import type { CoachInsight, CoachInsightsReport, InsightFormat, MetricComparison } from "../../lib/insights/types";

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

function metricTitle(metric: MetricComparison, holes: InsightFormat) {
  if (holes === "all" && metric.category === "scoring") return "Scoring average / 9 holes";
  if (holes === "all" && metric.category === "putting") return "Putts / 9 holes";
  return METRIC_RULES[metric.category].label;
}

function SnapshotCard({ metric, holes }: { metric: MetricComparison; holes: InsightFormat }) {
  const rule = METRIC_RULES[metric.category];
  const notable = metric.ready && metric.delta !== null && Math.abs(metric.delta) + 1e-9 >= metric.threshold;
  const positive = notable && (rule.lowerIsBetter ? metric.delta! < 0 : metric.delta! > 0);
  const unit = metric.unit === "percentage_points" ? "pp"
    : metric.unit === "per_18" ? "per 18" : holes === "all" && (metric.category === "scoring" || metric.category === "putting")
      ? "per 9" : metric.unit;
  const confidence = metric.confidence === "early" ? "Early signal"
    : metric.confidence === "preliminary" ? "Preliminary" : "Established";
  return (
    <div className={cn(appPanelClassName, "p-5 print:break-inside-avoid print:p-3 print:shadow-none")}>
      <p className="text-sm font-semibold text-slate-500">{metricTitle(metric, holes)}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
        {metric.recentValue === null ? "—" : formatMetricValue(metric.category, metric.recentValue)}
      </p>
      {metric.ready && metric.delta !== null ? (
        <p className={cn("mt-2 text-sm font-semibold", notable ? positive ? "text-green-800" : "text-amber-800" : "text-slate-600")}>
          {confidence} · {notable ? positive ? "favorable change" : "needs review" : "within threshold"} ·
          {" "}{metric.delta > 0 ? "+" : ""}{metric.delta.toFixed(1)} {unit}
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          {metric.recentValue === null ? "Stat not recorded" : "Recorded baseline · no comparable trend yet"}
        </p>
      )}
      <p className="mt-2 text-xs leading-5 text-slate-500">
        {metric.evidence.recentRoundIds.length} recent {holes === "all" ? "mixed-format" : `${holes}-hole`} rounds
        {metric.ready ? ` · ${metric.evidence.playerCount} comparable player${metric.evidence.playerCount === 1 ? "" : "s"}` : ""}
      </p>
      {metric.lineupChanged && metric.ready ? (
        <p className="mt-2 text-xs text-amber-800">Lineup changed · only players represented in both periods are compared.</p>
      ) : null}
      {!metric.ready && metric.reason && metric.recentValue !== null ? (
        <p className="mt-2 text-xs leading-5 text-slate-500">{metric.reason}</p>
      ) : null}
    </div>
  );
}

function InsightCard({ insight }: { insight: CoachInsight }) {
  const tone = insight.direction === "positive" ? "green" : insight.direction === "negative" ? "amber" : "slate";
  const label = insight.category === "counting_score" ? "Low-four estimate" :
    insight.confidence === "early" ? "Early indication" :
    insight.confidence === "preliminary" ? "Preliminary trend" :
    insight.direction === "positive" ? "Improving" : insight.direction === "negative" ? "Attention" : "Contribution";
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

function formatName(holes: InsightFormat) {
  return holes === "all" ? "All formats" : `${holes}-hole`;
}

function confidenceLabel(level: CoachInsightsReport["confidence"]) {
  switch (level) {
    case "baseline": return "Building a baseline";
    case "early": return "Early indications";
    case "preliminary": return "Preliminary trends";
    case "established": return "Established comparisons";
  }
}

export function CoachInsightsView({ report, teamName, seasonName }: {
  report: CoachInsightsReport; teamName: string; seasonName: string;
}) {
  const readyMetrics = METRICS.filter((category) => report.snapshot[category].ready);
  const recent = report.snapshot.scoring.evidence.recentDates;
  const baseline = report.snapshot.scoring.evidence.baselineDates;
  const linkTo = (holes: InsightFormat, source: CoachInsightsReport["source"]) =>
    `/coach-insights?holes=${holes}&source=${source}`;
  const stageText = report.teamOutings === 0
    ? "Enter your first round to start seeing recorded averages and practice opportunities."
    : report.teamOutings === 1
      ? "Your first outing is already contributing data. This is a descriptive baseline, not a trend."
      : report.teamOutings < 4
        ? "Early indicators compare the latest outing with the preceding outing. Treat changes as tentative."
        : report.teamOutings < 6
          ? "Preliminary trends compare the latest two outings with the previous two."
          : "Established comparisons use the latest three outings against the previous three.";
  return (
    <section className="coach-insights-report space-y-6 print:space-y-4">
      <PageHeader eyebrow={teamName} title="Coach Insights"
        description="Useful recorded stats from the first outing, followed by increasingly supported trends as the season progresses."
        meta={<><Badge>{seasonName}</Badge><Badge tone="slate">{formatName(report.holes)}{report.holes === "all" ? " · per-nine scoring" : " rounds"}</Badge></>}
        action={<PrintReportButton />} />

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1" aria-label="Round format">
            {(["all", 9, 18] as const).map((holes) => (
              <Link key={holes} href={linkTo(holes, report.source)}
                aria-current={report.holes === holes ? "page" : undefined}
                className={cn("rounded-md px-3 py-2 text-sm font-semibold transition",
                  report.holes === holes ? "bg-green-800 text-white" : "text-slate-600 hover:bg-white")}>
                {holes === "all" ? "All 9/18" : `${holes}-Hole`}
              </Link>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1" aria-label="Round source">
            {(["all", "competition", "practice"] as const).map((source) => (
              <Link key={source} href={linkTo(report.holes, source)}
                aria-current={report.source === source ? "page" : undefined}
                className={cn("rounded-md px-3 py-2 text-sm font-semibold transition",
                  report.source === source ? "bg-green-800 text-white" : "text-slate-600 hover:bg-white")}>
                {source === "all" ? "All rounds" : source === "competition" ? "Matches" : "Practice"}
              </Link>
            ))}
          </div>
        </div>
        <Link href={`/statistics?lineupHoles=${report.holes === 18 ? 18 : 9}`}
          className={secondaryButtonClassName}>View statistics</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Team outings</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{report.teamOutings}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scored rounds</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{report.completedRounds}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Match rounds recorded</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{report.sourceCounts.competition}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Practice / unattached</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{report.sourceCounts.practice}</p>
        </div>
      </div>
      {report.sourceCounts.other > 0 ? (
        <p className="text-xs text-slate-500">{report.sourceCounts.other} additional qualifying/uncategorized round(s) are included in All rounds but not the Match or Practice filters.</p>
      ) : null}
      {report.source === "practice" ? (
        <p className="text-sm text-slate-600">Practice includes recorded practice events and rounds entered without an event. Competition and practice are not mixed in this view.</p>
      ) : null}

      <div className="rounded-lg border border-green-200 bg-green-50 p-6 print:break-inside-avoid print:p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-green-800">Your team&apos;s recent form</p>
          <Badge tone="slate">{confidenceLabel(report.confidence)}</Badge>
        </div>
        <p className="mt-3 text-lg font-semibold leading-8 text-slate-950">{report.summary}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Recent: {dateRange(recent)}
          {baseline.length > 0 ? ` · Earlier comparison: ${dateRange(baseline)}` : " · No prior comparison yet"}
          {report.latestPlayedOn ? ` · Latest round: ${formatDate(report.latestPlayedOn)}` : ""}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">{confidenceLabel(report.confidence)} · {Math.min(report.teamOutings, 6)} of 6 comparison outings</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{stageText}</p>
        {report.teamOutings < 6 ? (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" aria-label="Outings toward established comparison">
            <div className="h-full rounded-full bg-green-700" style={{ width: `${Math.min(100, report.teamOutings / 6 * 100)}%` }} />
          </div>
        ) : null}
        {report.teamOutings === 0 ? (
          <Link href="/enter-score" className="mt-3 inline-flex text-sm font-semibold text-green-800 hover:underline print:hidden">Enter a score</Link>
        ) : null}
        {report.teamOutings >= 2 && readyMetrics.length < METRICS.length ? (
          <p className="mt-2 text-xs text-slate-600">
            {readyMetrics.length} of {METRICS.length} metrics have comparable data. Only a recorded stat with players represented in both windows is compared; lineup changes and missing stats are never treated as zero.
          </p>
        ) : null}
      </div>

      <section aria-label="Team Snapshot" className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Team Snapshot</h2>
          <p className="mt-1 text-sm text-slate-600">
            Values appear as soon as recorded. Comparisons use players with observations in both periods and flag lineup changes.
            {report.holes === "all" ? " Mixed 9/18-hole scores and putts are normalized per nine holes; FIR and GIR remain percentages." : ""}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
          {METRICS.map((category) => <SnapshotCard key={category} metric={report.snapshot[category]} holes={report.holes} />)}
        </div>
        {report.parRelative ? (
          <p className="rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-600">
            Relative to par: {report.parRelative.average > 0 ? "+" : ""}{report.parRelative.average.toFixed(1)} per nine holes across {report.parRelative.rounds} round{report.parRelative.rounds === 1 ? "" : "s"} with recorded par. This is a separate descriptive measure, not combined with gross scoring averages.
          </p>
        ) : null}
      </section>

      <section aria-label="Practice Priorities" className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Recommended Practice Focus</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Early suggestions use recorded three-putts or penalties; later priorities use supported performance changes. Neither proves a cause.</p>
        </div>
        {report.practicePriorities.length > 0 ? (
          <ol className="grid gap-4 lg:grid-cols-3">
            {report.practicePriorities.map((priority, index) => (
              <li key={priority.category} className={cn(appPanelClassName, "p-5 print:break-inside-avoid print:p-3 print:shadow-none")}>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                  {priority.insightId.startsWith("early:") ? "Early observation" : `Priority ${index + 1} · ${priority.scope === "team" ? "Team" : "Player focus"}`}
                </p>
                <h3 className="mt-3 text-lg font-bold text-slate-950">{priority.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{priority.reason}</p>
                <p className="mt-3 text-sm font-medium text-slate-800">{priority.recommendation}</p>
              </li>
            ))}
          </ol>
        ) : <EmptyState message="No practice concern is supported by the recorded statistics yet. Keep recording putts, FIR/GIR, and penalties; current averages are available above." />}
      </section>

      <InsightSection title="Trending Up" description="Favorable changes supported by the current comparison window; early signals are labeled."
        insights={report.trendingUp} empty="No supported favorable changes above the thresholds yet. The current averages remain available above." />
      <InsightSection title="Needs Attention" description="Unfavorable changes supported by recorded comparisons; not proof of a cause."
        insights={report.needsAttention} empty="No supported worsening trends above the thresholds yet." />
      <InsightSection title="Players to Watch" description="Up to four golfers with supported individual observations."
        insights={report.playerWatchlist} empty="Player observations appear after two comparable outings; competition low-four estimates require eligible team matches." />

      <details className={cn(appPanelClassName, "p-5 print:hidden")}>
        <summary className="cursor-pointer font-semibold text-slate-800">How these insights are calculated</summary>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
          <p>Recorded averages appear after one outing. Two or three outings compare one recent with one earlier; four or five compare two with two; six or more compare three with three. These labels describe sample size, not statistical guarantees.</p>
          <p>An outing is an event on a played date, or a played date for unattached rounds. The latest player submission per outing is used. Team comparisons use available players represented in both periods, not necessarily in every outing. If the lineup changes or metrics are missing, that limitation is displayed and unsupported comparisons stay blank.</p>
          <p>The All 9/18 view normalizes gross scores and putts to nine holes; GIR and FIR pool recorded successes/opportunities. Penalties and three-putts are expressed per 18 holes. Nine-hole and 18-hole views retain their original raw score averages. When par is known, relative-to-par per nine is displayed separately. Course difficulty and weather are not adjusted.</p>
          <p>Practice is identified by practice events or an unattached round. Match analysis includes matches, invitationals, and tournaments. Qualifiers or unknown events remain in All rounds. Match and practice performance can be examined separately using the filters above.</p>
          {report.holes !== "all" ? <p>Low-four estimates only use eligible team competitions in a single format with at least four players. Varsity/JV lineups and tie-breaks are not yet represented in this data.</p> : <p>Low-four estimates are available in the 9-hole or 18-hole view, not combined across formats.</p>}
          <ul className="list-disc space-y-1 pl-5">
            {METRICS.map((category) => <li key={category}>{metricTitle(report.snapshot[category], report.holes)}: {METRIC_RULES[category].threshold(report.holes)} {METRIC_RULES[category].unit === "percentage_points" ? "percentage points" : METRIC_RULES[category].unit === "per_18" ? "per 18 holes" : METRIC_RULES[category].unit}.</li>)}
          </ul>
          <p>Summary submissions are treated as complete. Hole-by-hole scorecards must include all scheduled holes and reconcile to the posted score; partially recorded metrics are excluded for that metric. {report.excludedRounds} invalid or incomplete round{report.excludedRounds === 1 ? " was" : "s were"} excluded.</p>
          <p>All observations are evidence-based. They do not prove that a practice area caused a score change, and they should be considered alongside course conditions and coach judgment.</p>
        </div>
      </details>
    </section>
  );
}
