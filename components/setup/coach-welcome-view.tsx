import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  FlagTriangleRight,
  GraduationCap,
  Lightbulb,
  Palette,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import {
  Badge,
  cn,
  primaryButtonClassName,
  secondaryButtonClassName
} from "../ui/primitives";
import type {
  CoachSetupProgress,
  CoachSetupStep,
  CoachSetupStepId
} from "../../lib/setup/coach-progress";

type CoachWelcomeViewProps = {
  teamName: string;
  activeSeasonName: string | null;
  activePlayerCount: number;
  progress: CoachSetupProgress;
};

function MilestoneIcon({ id }: { id: CoachSetupStepId }) {
  const className = "h-5 w-5";
  switch (id) {
    case "account":
      return <ShieldCheck className={className} aria-hidden="true" />;
    case "branding":
      return <Palette className={className} aria-hidden="true" />;
    case "season":
      return <CalendarDays className={className} aria-hidden="true" />;
    case "roster":
      return <GraduationCap className={className} aria-hidden="true" />;
    case "event":
      return <FlagTriangleRight className={className} aria-hidden="true" />;
  }
}

function SetupMilestone({
  step,
  index
}: {
  step: CoachSetupStep;
  index: number;
}) {
  return (
    <li className="flex flex-col gap-4 border-t border-slate-100 py-5 first:border-0 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
            step.complete
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-slate-200 bg-slate-50 text-slate-600"
          )}
        >
          {step.complete ? (
            <Check className="h-5 w-5" aria-hidden="true" />
          ) : (
            <MilestoneIcon id={step.id} />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-slate-950">
              {index + 1}. {step.title}
            </h3>
            {step.complete ? <Badge tone="green">Complete</Badge> : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{step.description}</p>
          <p className={cn(
            "mt-1 text-xs leading-5",
            step.complete ? "text-green-800" : "text-slate-500"
          )}>
            {step.detail}
          </p>
        </div>
      </div>
      {step.complete ? (
        step.id === "account" ? (
          <span className="self-start text-sm font-semibold text-green-800 sm:self-center">
            Account ready
          </span>
        ) : (
          <Link
            href={step.href}
            className="inline-flex shrink-0 items-center gap-1 self-start text-sm font-semibold text-green-800 hover:text-green-900 sm:self-center"
          >
            Review
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )
      ) : (
        <Link
          href={step.href}
          className={cn(secondaryButtonClassName, "w-full justify-center sm:w-auto")}
        >
          {step.actionLabel}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </li>
  );
}

function ProgressBar({ progress }: { progress: CoachSetupProgress }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-900">
          Your setup progress
        </p>
        <span className="text-sm font-bold tabular-nums text-green-800">
          {progress.completedCount} of {progress.totalCount} complete
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Coach setup completion"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-green-700 transition-all"
          style={{ width: progress.percent + "%" }}
        />
      </div>
    </div>
  );
}

function LearningCard({
  icon,
  eyebrow,
  title,
  detail,
  href,
  action
}: {
  icon: "score" | "stats" | "insights";
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
  action: string;
}) {
  const Icon = icon === "score" ? ClipboardList : icon === "stats" ? BarChart3 : TrendingUp;
  return (
    <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 transition hover:border-green-200 hover:shadow-md sm:p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-800">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-green-800">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{detail}</p>
      <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-green-800 hover:text-green-900">
        {action}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

export function CoachWelcomeView({
  teamName,
  activeSeasonName,
  activePlayerCount,
  progress
}: CoachWelcomeViewProps) {
  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-emerald-950 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-6 text-white shadow-lg sm:p-9">
        <div className="pointer-events-none absolute -right-12 -top-20 h-60 w-60 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute bottom-0 right-20 h-32 w-32 rounded-full bg-lime-300/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">
              Fairway Stats HQ / Coach Welcome Center
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
              {progress.complete ? "You're ready for the season." : "Your season starts here."}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
              {progress.complete
                ? teamName + " is set up. Keep this page handy whenever you need a refresher."
                : "Let's get " + teamName + " ready for its first round, one quick step at a time."}
            </p>
            {activeSeasonName ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                Active season: {activeSeasonName}
              </p>
            ) : null}
          </div>
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-green-900 shadow-sm transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            Open dashboard
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {progress.complete ? (
        <section className="flex flex-col gap-5 rounded-xl border border-green-200 bg-green-50/50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-800">
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950">Setup complete</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                All five setup milestones are complete. You're ready to begin collecting scores.
              </p>
            </div>
          </div>
          <Link href="/enter-score" className={cn(primaryButtonClassName, "inline-flex items-center justify-center gap-2")}>
            Enter first score
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section aria-labelledby="setup-steps-heading" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-green-800">Preseason checklist</p>
                <h2 id="setup-steps-heading" className="mt-1 text-xl font-bold text-slate-950">
                  Get your team ready
                </h2>
              </div>
              <Badge tone="slate">About 10–15 minutes</Badge>
            </div>
            <div className="mt-6">
              <ProgressBar progress={progress} />
            </div>
            <ol className="mt-6">
              {progress.steps.map((step, index) => (
                <SetupMilestone key={step.id} step={step} index={index} />
              ))}
            </ol>
          </section>

          <aside className="space-y-4">
            {progress.nextStep ? (
              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-green-800">Up next</p>
                <h3 className="mt-2 text-lg font-bold text-slate-950">
                  {progress.nextStep.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {progress.nextStep.detail}
                </p>
                <Link
                  href={progress.nextStep.href}
                  className={cn(primaryButtonClassName, "mt-5 inline-flex w-full items-center justify-center gap-2")}
                >
                  {progress.nextStep.actionLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ) : null}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <Lightbulb className="h-5 w-5 text-green-800" aria-hidden="true" />
              <h3 className="mt-3 font-bold text-slate-950">Pick up where you left off</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Progress updates automatically when you save team details, players, seasons, or events.
                You can leave and come back at any time.
              </p>
            </div>
          </aside>
        </div>
      )}

      <section aria-labelledby="getting-started-heading" className="space-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-green-800">
            Quick walkthroughs
          </p>
          <h2 id="getting-started-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Start using Fairway Stats HQ
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            You can explore these tools before every setup milestone is complete.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <LearningCard
            icon="score"
            eyebrow="1 / Record"
            title="Enter a round"
            detail="Select an event and player, record a 9- or 18-hole scorecard, then save. Your dashboard updates from submitted scores."
            href="/enter-score"
            action="Open score entry"
          />
          <LearningCard
            icon="stats"
            eyebrow="2 / Understand"
            title="Review statistics"
            detail="Open team and player averages, lineup form, and course-by-course hole breakdowns to find patterns."
            href="/statistics"
            action="View statistics"
          />
          <LearningCard
            icon="insights"
            eyebrow="3 / Improve"
            title="Explore Coach Insights"
            detail="See scoring trends and practice priorities as more complete rounds are recorded. Trend comparisons need several outings."
            href="/coach-insights"
            action="Explore insights"
          />
        </div>
      </section>

      {progress.complete ? (
        <details className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <summary className="cursor-pointer font-bold text-slate-900">
            View completed setup checklist ({progress.completedCount}/{progress.totalCount})
          </summary>
          <ol className="mt-5">
            {progress.steps.map((step, index) => (
              <SetupMilestone key={step.id} step={step} index={index} />
            ))}
          </ol>
        </details>
      ) : null}

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-green-800" aria-hidden="true" />
        <p>
          <strong className="text-slate-900">Coaching tip:</strong>{" "}
          {activePlayerCount < 4
            ? "Add at least four players and their scores in the same event to unlock fourth-scorer comparisons."
            : "Once at least four players have eligible scores from the same event, the dashboard can compare golfers against the team's fourth-lowest score."}
          {" "}Coach Insights trend comparisons need additional complete outings.
          Player invitations can wait until your team is comfortable with score entry.
        </p>
      </div>
    </main>
  );
}
