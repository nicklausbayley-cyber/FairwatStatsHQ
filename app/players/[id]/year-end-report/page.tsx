import Image from "next/image";
import Link from "next/link";
import { requireTeamStaff } from "../../../../lib/auth/get-current-team";
import { YearEndSummaryEditor } from "../../../../components/reports/year-end-summary-editor";
import {
  Badge,
  EmptyState,
  PageHeader,
  inputClassName,
  secondaryButtonClassName
} from "../../../../components/ui/primitives";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    seasonId?: string | string[];
  }>;
};

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  status: string;
};

type SeasonRow = {
  id: string;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
  created_at: string;
};

type RoundRow = {
  id: string;
  event_id: string | null;
  played_on: string;
  holes: number;
  score: number;
  putts: number | null;
  fairways_hit: number | null;
  fairways_possible: number | null;
  greens_in_regulation: number | null;
  gir_possible: number | null;
  penalties: number | null;
  three_putts: number | null;
  notes: string | null;
  counts_toward_lineup: boolean;
};

type EventRow = {
  id: string;
  name: string;
  course_name: string | null;
};

type SummaryRow = {
  season_summary: string | null;
  strengths: string | null;
  development_areas: string | null;
  next_season_goals: string | null;
  updated_at: string;
};

type RoundWithEvent = RoundRow & {
  eventName: string | null;
  courseName: string | null;
};

type FormatStats = {
  holes: 9 | 18;
  roundsPlayed: number;
  averageScore: number | null;
  bestScore: number | null;
  lastFiveAverage: number | null;
  eligibleRounds: number;
  averagePutts: number | null;
  fairwayPercentage: number | null;
  girPercentage: number | null;
  averagePenalties: number | null;
  averageThreePutts: number | null;
  openingAverage: number | null;
  closingAverage: number | null;
  improvement: number | null;
};

function getSearchValue(
  value: string | string[] | undefined
) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isNumber(
  value: number | null | undefined
): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isString(value: string | null): value is string {
  return typeof value === "string" && value.length > 0;
}

function average(
  values: Array<number | null | undefined>
) {
  const validValues = values.filter(isNumber);

  if (validValues.length === 0) {
    return null;
  }

  return (
    validValues.reduce((sum, value) => sum + value, 0) /
    validValues.length
  );
}

function percentageFromTotals(
  rounds: RoundRow[],
  hitKey: "fairways_hit" | "greens_in_regulation",
  possibleKey: "fairways_possible" | "gir_possible"
) {
  const totals = rounds.reduce(
    (result, round) => {
      const hit = round[hitKey];
      const possible = round[possibleKey];

      if (!isNumber(hit) || !isNumber(possible) || possible <= 0) {
        return result;
      }

      return {
        hit: result.hit + hit,
        possible: result.possible + possible
      };
    },
    { hit: 0, possible: 0 }
  );

  return totals.possible > 0
    ? totals.hit / totals.possible
    : null;
}

function buildFormatStats(
  rounds: RoundRow[],
  holes: 9 | 18
): FormatStats {
  const formatRounds = rounds
    .filter((round) => round.holes === holes)
    .sort((a, b) => {
      const dateComparison =
        a.played_on.localeCompare(b.played_on);

      return dateComparison !== 0
        ? dateComparison
        : a.id.localeCompare(b.id);
    });

  const eligibleRounds = [...formatRounds]
    .filter((round) => round.counts_toward_lineup)
    .sort((a, b) => {
      const dateComparison =
        b.played_on.localeCompare(a.played_on);

      return dateComparison !== 0
        ? dateComparison
        : b.id.localeCompare(a.id);
    });

  const lastFive = eligibleRounds.slice(0, 5);
  const hasTrend = formatRounds.length >= 6;
  const openingAverage = hasTrend
    ? average(formatRounds.slice(0, 3).map((round) => round.score))
    : null;
  const closingAverage = hasTrend
    ? average(formatRounds.slice(-3).map((round) => round.score))
    : null;

  return {
    holes,
    roundsPlayed: formatRounds.length,
    averageScore: average(
      formatRounds.map((round) => round.score)
    ),
    bestScore:
      formatRounds.length > 0
        ? Math.min(...formatRounds.map((round) => round.score))
        : null,
    lastFiveAverage: average(
      lastFive.map((round) => round.score)
    ),
    eligibleRounds: eligibleRounds.length,
    averagePutts: average(
      formatRounds.map((round) => round.putts)
    ),
    fairwayPercentage: percentageFromTotals(
      formatRounds,
      "fairways_hit",
      "fairways_possible"
    ),
    girPercentage: percentageFromTotals(
      formatRounds,
      "greens_in_regulation",
      "gir_possible"
    ),
    averagePenalties: average(
      formatRounds.map((round) => round.penalties)
    ),
    averageThreePutts: average(
      formatRounds.map((round) => round.three_putts)
    ),
    openingAverage,
    closingAverage,
    improvement:
      openingAverage !== null && closingAverage !== null
        ? openingAverage - closingAverage
        : null
  };
}

function formatAverage(value: number | null) {
  return value === null ? "No data" : value.toFixed(1);
}

function formatWholeNumber(value: number | null) {
  return value === null ? "No data" : value.toString();
}

function formatPercentage(value: number | null) {
  return value === null
    ? "No data"
    : `${Math.round(value * 100)}%`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric"
    }
  );
}

function formatTimestamp(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function formatSeasonDates(season: SeasonRow) {
  if (!season.starts_on && !season.ends_on) {
    return "Season dates not set";
  }

  if (season.starts_on && season.ends_on) {
    return `${formatDate(season.starts_on)} – ${formatDate(
      season.ends_on
    )}`;
  }

  return season.starts_on
    ? `Started ${formatDate(season.starts_on)}`
    : `Ended ${formatDate(season.ends_on as string)}`;
}

function formatImprovement(stats: FormatStats) {
  if (stats.improvement === null) {
    return "Six recorded rounds are needed for a first-three versus final-three trend.";
  }

  if (Math.abs(stats.improvement) < 0.05) {
    return "Opening and closing three-round averages were even.";
  }

  return stats.improvement > 0
    ? `Improved by ${stats.improvement.toFixed(
        1
      )} strokes from the opening three rounds to the final three.`
    : `Closing three-round average was ${Math.abs(
        stats.improvement
      ).toFixed(1)} strokes higher than the opening three.`;
}

function getBestRounds(
  rounds: RoundWithEvent[],
  holes: 9 | 18
) {
  return [...rounds]
    .filter((round) => round.holes === holes)
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }

      return b.played_on.localeCompare(a.played_on);
    })
    .slice(0, 3);
}

export default async function YearEndReportPage({
  params,
  searchParams
}: PageProps) {
  const { id: playerId } = await params;
  const resolvedSearchParams = searchParams
    ? await searchParams
    : {};
  const requestedSeasonId = getSearchValue(
    resolvedSearchParams.seasonId
  );
  const currentTeam = await requireTeamStaff();
  const { supabase, team, profile } = currentTeam;

  const [playerResult, seasonsResult] = await Promise.all([
    supabase
      .from("players")
      .select(
        "id, first_name, last_name, graduation_year, status"
      )
      .eq("id", playerId)
      .eq("team_id", team.id)
      .maybeSingle(),
    supabase
      .from("seasons")
      .select(
        "id, name, starts_on, ends_on, is_active, created_at"
      )
      .eq("team_id", team.id)
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false })
  ]);

  if (playerResult.error) {
    return (
      <EmptyState
        title="Year-end report unavailable"
        message={playerResult.error.message}
      />
    );
  }

  if (!playerResult.data) {
    return (
      <EmptyState
        title="Player not found"
        message="The selected player could not be found for this team."
      />
    );
  }

  if (seasonsResult.error) {
    return (
      <EmptyState
        title="Year-end report unavailable"
        message={seasonsResult.error.message}
      />
    );
  }

  const player = playerResult.data as PlayerRow;
  const seasons = (seasonsResult.data ?? []) as SeasonRow[];

  if (seasons.length === 0) {
    return (
      <EmptyState
        title="No seasons available"
        message="Create a season in Settings before generating a year-end report."
        action={
          <Link
            href="/settings"
            className={secondaryButtonClassName}
          >
            Open Settings
          </Link>
        }
      />
    );
  }

  const selectedSeason =
    seasons.find((season) => season.id === requestedSeasonId) ??
    seasons.find((season) => season.is_active) ??
    seasons[0];

  const [roundsResult, summaryResult] = await Promise.all([
    supabase
      .from("rounds")
      .select(
        "id, event_id, played_on, holes, score, putts, fairways_hit, fairways_possible, greens_in_regulation, gir_possible, penalties, three_putts, notes, counts_toward_lineup"
      )
      .eq("team_id", team.id)
      .eq("player_id", player.id)
      .eq("season_id", selectedSeason.id)
      .order("played_on", { ascending: true }),
    supabase
      .from("player_season_summaries")
      .select(
        "season_summary, strengths, development_areas, next_season_goals, updated_at"
      )
      .eq("team_id", team.id)
      .eq("player_id", player.id)
      .eq("season_id", selectedSeason.id)
      .maybeSingle()
  ]);

  if (roundsResult.error) {
    return (
      <EmptyState
        title="Year-end report unavailable"
        message={roundsResult.error.message}
      />
    );
  }

  if (summaryResult.error) {
    return (
      <EmptyState
        title="Year-end report unavailable"
        message={summaryResult.error.message}
      />
    );
  }

  const rounds = (roundsResult.data ?? []) as RoundRow[];
  const summary = summaryResult.data as SummaryRow | null;
  const eventIds = Array.from(
    new Set(
      rounds
        .map((round) => round.event_id)
        .filter(isString)
    )
  );

  let events: EventRow[] = [];

  if (eventIds.length > 0) {
    const eventsResult = await supabase
      .from("events")
      .select("id, name, course_name")
      .eq("team_id", team.id)
      .in("id", eventIds);

    if (eventsResult.error) {
      return (
        <EmptyState
          title="Year-end report unavailable"
          message={eventsResult.error.message}
        />
      );
    }

    events = (eventsResult.data ?? []) as EventRow[];
  }

  const eventsById = new Map(
    events.map((event) => [event.id, event])
  );

  const roundsWithEvents: RoundWithEvent[] = rounds.map(
    (round) => {
      const event = round.event_id
        ? eventsById.get(round.event_id)
        : null;

      return {
        ...round,
        eventName: event?.name ?? null,
        courseName: event?.course_name ?? null
      };
    }
  );

  const nineHoleStats = buildFormatStats(rounds, 9);
  const eighteenHoleStats = buildFormatStats(rounds, 18);
  const bestNineHoleRounds = getBestRounds(
    roundsWithEvents,
    9
  );
  const bestEighteenHoleRounds = getBestRounds(
    roundsWithEvents,
    18
  );
  const recentRounds = [...roundsWithEvents]
    .sort((a, b) =>
      b.played_on.localeCompare(a.played_on)
    )
    .slice(0, 6);

  const playerName = `${player.first_name} ${player.last_name}`;
  const primaryColor = team.primary_color ?? "#166534";
  const secondaryColor = team.secondary_color ?? "#111827";
  const teamName = team.school_name ?? team.name;
  const initialValues = {
    seasonSummary: summary?.season_summary ?? "",
    strengths: summary?.strengths ?? "",
    developmentAreas: summary?.development_areas ?? "",
    nextSeasonGoals: summary?.next_season_goals ?? ""
  };

  return (
    <section className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          eyebrow="Player Report"
          title={`${playerName} Year-End Summary`}
          description="Review the season data, add coach comments, and print a parent-ready report."
          action={
            <Link
              href={`/players/${player.id}`}
              className={secondaryButtonClassName}
            >
              Back to Player
            </Link>
          }
        />
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm print:hidden sm:flex-row sm:items-end"
      >
        <label className="w-full max-w-md space-y-2">
          <span className="block text-sm font-semibold text-slate-700">
            Report Season
          </span>
          <select
            name="seasonId"
            defaultValue={selectedSeason.id}
            className={inputClassName}
          >
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
                {season.is_active ? " — Active" : ""}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className={secondaryButtonClassName}
        >
          Load Season
        </button>
      </form>

      <YearEndSummaryEditor
        key={selectedSeason.id}
        playerId={player.id}
        seasonId={selectedSeason.id}
        initialValues={initialValues}
      />

      <article
        className="year-end-report overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5 print:rounded-none print:border-0 print:shadow-none"
        style={{
          borderTopColor: primaryColor,
          borderTopWidth: "8px"
        }}
      >
        <header className="flex flex-col gap-5 border-b border-slate-200 p-7 sm:flex-row sm:items-center sm:justify-between print:p-0 print:pb-5">
          <div className="flex items-center gap-4">
            {team.logo_url ? (
              <Image
                src={team.logo_url}
                alt={`${teamName} logo`}
                width={72}
                height={72}
                unoptimized
                className="h-16 w-16 rounded-lg border border-slate-200 object-cover"
              />
            ) : (
              <div
                className="flex h-16 w-16 items-center justify-center rounded-lg text-xl font-bold text-white"
                style={{ backgroundColor: secondaryColor }}
              >
                {teamName
                  .split(" ")
                  .slice(0, 2)
                  .map((word) => word.charAt(0))
                  .join("")
                  .toUpperCase()}
              </div>
            )}

            <div>
              <p
                className="text-xs font-bold uppercase tracking-[0.16em]"
                style={{ color: primaryColor }}
              >
                Fairway Stats HQ
              </p>
              <h1
                className="mt-1 text-2xl font-black tracking-tight"
                style={{ color: secondaryColor }}
              >
                {teamName}
              </h1>
              <p className="text-sm text-slate-600">
                {team.name}
                {team.mascot ? ` • ${team.mascot}` : ""}
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Year-End Player Summary
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              {playerName}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {selectedSeason.name}
              {player.graduation_year
                ? ` • Class of ${player.graduation_year}`
                : ""}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {formatSeasonDates(selectedSeason)}
            </p>
          </div>
        </header>

        <div className="space-y-7 p-7 print:p-0 print:pt-6">
          <section className="avoid-print-break grid gap-5 lg:grid-cols-2 print:grid-cols-2">
            <FormatSummary
              stats={nineHoleStats}
              primaryColor={primaryColor}
            />
            <FormatSummary
              stats={eighteenHoleStats}
              primaryColor={primaryColor}
            />
          </section>

          <section className="avoid-print-break">
            <SectionHeading
              eyebrow="Season Highlights"
              title="Best Performances"
            />

            <div className="mt-4 grid gap-5 md:grid-cols-2 print:grid-cols-2">
              <PerformanceList
                title="Top 9-Hole Rounds"
                rounds={bestNineHoleRounds}
              />
              <PerformanceList
                title="Top 18-Hole Rounds"
                rounds={bestEighteenHoleRounds}
              />
            </div>
          </section>

          <section className="avoid-print-break">
            <SectionHeading
              eyebrow="Recent Form"
              title="Most Recent Rounds"
            />

            {recentRounds.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">
                No rounds were recorded for this season.
              </p>
            ) : (
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Holes</th>
                      <th className="px-4 py-3">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentRounds.map((round) => (
                      <tr key={round.id}>
                        <td className="px-4 py-3">
                          {formatDate(round.played_on)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-950">
                            {round.eventName ?? "Round"}
                          </span>
                          {round.courseName ? (
                            <span className="block text-xs text-slate-500">
                              {round.courseName}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {round.holes}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-950">
                          {round.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-5">
            <SectionHeading
              eyebrow="Coach Meeting Summary"
              title="Reflection and Next Steps"
            />

            <div className="grid gap-5 md:grid-cols-2 print:grid-cols-2">
              <MeetingSection
                title="Season Summary"
                text={summary?.season_summary}
              />
              <MeetingSection
                title="Strengths"
                text={summary?.strengths}
              />
              <MeetingSection
                title="Development Areas"
                text={summary?.development_areas}
              />
              <MeetingSection
                title="Next-Season Goals"
                text={summary?.next_season_goals}
              />
            </div>
          </section>

          <footer className="flex flex-col gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:justify-between">
            <span>Prepared by {profile.full_name}</span>
            <span>
              {summary
                ? `Last updated ${formatTimestamp(
                    summary.updated_at
                  )}`
                : `Generated ${new Date().toLocaleDateString(
                    "en-US"
                  )}`}
            </span>
          </footer>
        </div>
      </article>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-green-700">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-xl font-bold text-slate-950">
        {title}
      </h3>
    </div>
  );
}

function FormatSummary({
  stats,
  primaryColor
}: {
  stats: FormatStats;
  primaryColor: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: primaryColor }}
          >
            Season Performance
          </p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">
            {stats.holes}-Hole
          </h3>
        </div>

        <Badge tone="slate">
          {stats.roundsPlayed} rounds
        </Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric
          label="Season Average"
          value={formatAverage(stats.averageScore)}
          emphasize
        />
        <Metric
          label="Best Score"
          value={formatWholeNumber(stats.bestScore)}
        />
        <Metric
          label="Last 5 Eligible"
          value={formatAverage(stats.lastFiveAverage)}
        />
        <Metric
          label="Eligible Rounds"
          value={stats.eligibleRounds.toString()}
        />
        <Metric
          label="Average Putts"
          value={formatAverage(stats.averagePutts)}
        />
        <Metric
          label="Fairways"
          value={formatPercentage(stats.fairwayPercentage)}
        />
        <Metric
          label="GIR"
          value={formatPercentage(stats.girPercentage)}
        />
        <Metric
          label="Avg Penalties"
          value={formatAverage(stats.averagePenalties)}
        />
        <Metric
          label="Avg Three-putts"
          value={formatAverage(stats.averageThreePutts)}
        />
        <Metric
          label="Opening 3 Avg"
          value={formatAverage(stats.openingAverage)}
        />
        <Metric
          label="Final 3 Avg"
          value={formatAverage(stats.closingAverage)}
        />
      </div>

      <p className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
        {formatImprovement(stats)}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  emphasize = false
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={
          emphasize
            ? "mt-1 text-xl font-black text-green-800"
            : "mt-1 text-lg font-bold text-slate-950"
        }
      >
        {value}
      </p>
    </div>
  );
}

function PerformanceList({
  title,
  rounds
}: {
  title: string;
  rounds: RoundWithEvent[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h4 className="font-bold text-slate-950">{title}</h4>

      {rounds.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No rounds recorded.
        </p>
      ) : (
        <ol className="mt-3 space-y-3">
          {rounds.map((round, index) => (
            <li
              key={round.id}
              className="flex items-start justify-between gap-4"
            >
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  #{index + 1}{" "}
                  {round.eventName ?? "Recorded Round"}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDate(round.played_on)}
                  {round.courseName
                    ? ` • ${round.courseName}`
                    : ""}
                </p>
              </div>
              <span className="text-xl font-black text-slate-950">
                {round.score}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function MeetingSection({
  title,
  text
}: {
  title: string;
  text: string | null | undefined;
}) {
  return (
    <div className="avoid-print-break rounded-lg border border-slate-200 p-5">
      <h4 className="font-bold text-slate-950">{title}</h4>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {text?.trim() || "No comments added for this section."}
      </p>
    </div>
  );
}
