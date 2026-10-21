import Link from "next/link";
import {
  requireTeamStaff,
  type CurrentTeamContext
} from "../../lib/auth/get-current-team";
import {
  getActiveSeasonForTeam,
  type ActiveSeason
} from "../../lib/seasons/active-season";
import {
  Badge,
  EmptyState,
  Message,
  PageHeader,
  cn,
  inputClassName,
  primaryButtonClassName,
  tableHeaderClassName,
  tableRowClassName,
  tableShellClassName
} from "../../components/ui/primitives";

export const dynamic = "force-dynamic";

type SupabaseServiceClient = CurrentTeamContext["supabase"];

type SearchParams = {
  courseId?: string | string[];
  eventId?: string | string[];
  lineupHoles?: string | string[];
};

type StatisticsPageProps = {
  searchParams?: Promise<SearchParams>;
};

type StatisticsFilters = {
  courseId: string;
  eventId: string;
  lineupHoles: 9 | 18;
};

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
};

type RoundRow = {
  id: string;
  player_id: string;
  event_id: string | null;
  played_on: string;
  counts_toward_lineup: boolean;
  holes: number;
  score: number;
  putts: number | null;
  fairways_hit: number | null;
  fairways_possible: number | null;
  greens_in_regulation: number | null;
  gir_possible: number | null;
  penalties: number | null;
  three_putts: number | null;
};

type CourseRow = {
  id: string;
  name: string;
  location: string | null;
};

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  event_type: string;
  season_id: string | null;
};

type CourseHoleRow = {
  course_id: string;
  hole_number: number;
  par: number;
  handicap: number | null;
  yardage: number | null;
};

type RoundHoleRow = {
  id: string;
  round_id: string;
  player_id: string;
  event_id: string | null;
  course_id: string | null;
  hole_number: number;
  par: number;
  handicap: number | null;
  score: number;
  putts: number | null;
  fir: boolean | null;
  gir: boolean | null;
  penalty: number | null;
};

type PlayerStats = {
  id: string;
  playerName: string;
  lineupRank: number | null;
  lineupRoundsCount: number;
  lastFiveAverage: number | null;
  roundsPlayed: number;
  averageScore: number | null;
  bestScore: number | null;
  averagePutts: number | null;
  fairwayPercentage: number | null;
  girPercentage: number | null;
  averagePenalties: number | null;
  averageThreePutts: number | null;
};

type CourseOption = {
  id: string;
  name: string;
  location: string | null;
};

type EventOption = {
  id: string;
  name: string;
  eventDate: string;
  eventType: string;
};

type HoleStats = {
  holeNumber: number;
  par: number;
  handicap: number | null;
  roundsPlayed: number;
  averageScore: number | null;
  averageScoreToPar: number | null;
  averagePutts: number | null;
  firPercentage: number | null;
  girPercentage: number | null;
  averagePenalties: number | null;
  threePuttCount: number;
  threePuttPercentage: number | null;
};

type HoleBreakdown = {
  courses: CourseOption[];
  events: EventOption[];
  selectedCourseId: string;
  selectedCourseName: string | null;
  selectedEventId: string;
  selectedEventName: string | null;
  activeSeasonName: string | null;
  holes: HoleStats[];
  hardestHoles: HoleStats[];
  scorecardCount: number;
  playerCount: number;
  note: string | null;
};

type StatisticsState =
  | {
      status: "ready";
      teamName: string;
      activeSeasonName: string | null;
      lineupHoles: 9 | 18;
      playerStats: PlayerStats[];
      holeBreakdown: HoleBreakdown;
    }
  | {
      status: "empty";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

function getSearchValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getLineupHoles(
  value: string | string[] | undefined
): 9 | 18 {
  return getSearchValue(value) === "18" ? 18 : 9;
}

function buildStatisticsHref(
  filters: Pick<StatisticsFilters, "courseId" | "eventId">,
  lineupHoles: 9 | 18
) {
  const params = new URLSearchParams();

  params.set("lineupHoles", lineupHoles.toString());

  if (filters.courseId) {
    params.set("courseId", filters.courseId);
  }

  if (filters.eventId) {
    params.set("eventId", filters.eventId);
  }

  return `/statistics?${params.toString()}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "fetch failed") {
      return "Could not reach Supabase from the dev server. Check that your Supabase project is awake, your environment variables are set, and then restart npm run dev.";
    }

    return error.message;
  }

  return "Unable to load statistics data.";
}

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

function percentageFromBooleanRows(rows: RoundHoleRow[], key: "fir" | "gir") {
  const recordedRows = rows.filter((row) => typeof row[key] === "boolean");

  if (recordedRows.length === 0) {
    return null;
  }

  return recordedRows.filter((row) => row[key] === true).length / recordedRows.length;
}

function getHoleDefinitions(courseHoles: CourseHoleRow[], roundHoles: RoundHoleRow[]) {
  if (courseHoles.length > 0) {
    return courseHoles;
  }

  const holesByNumber = new Map<number, CourseHoleRow>();

  roundHoles.forEach((hole) => {
    if (holesByNumber.has(hole.hole_number)) {
      return;
    }

    holesByNumber.set(hole.hole_number, {
      course_id: hole.course_id ?? "",
      hole_number: hole.hole_number,
      par: hole.par,
      handicap: hole.handicap,
      yardage: null
    });
  });

  return Array.from(holesByNumber.values()).sort(
    (a, b) => a.hole_number - b.hole_number
  );
}

function buildHoleStats(courseHoles: CourseHoleRow[], roundHoles: RoundHoleRow[]) {
  const holesByNumber = new Map<number, RoundHoleRow[]>();

  roundHoles.forEach((hole) => {
    const holeRows = holesByNumber.get(hole.hole_number) ?? [];
    holeRows.push(hole);
    holesByNumber.set(hole.hole_number, holeRows);
  });

  return getHoleDefinitions(courseHoles, roundHoles).map((hole) => {
    const holeRows = holesByNumber.get(hole.hole_number) ?? [];
    const puttRows = holeRows.filter((row) => isNumber(row.putts));
    const fairwayRows = holeRows.filter(
      (row) => row.par !== 3 && typeof row.fir === "boolean"
    );
    const threePuttCount = puttRows.filter((row) => (row.putts ?? 0) >= 3).length;

    return {
      holeNumber: hole.hole_number,
      par: hole.par,
      handicap: hole.handicap,
      roundsPlayed: holeRows.length,
      averageScore: average(holeRows.map((row) => row.score)),
      averageScoreToPar: average(holeRows.map((row) => row.score - row.par)),
      averagePutts: average(holeRows.map((row) => row.putts)),
      firPercentage:
        hole.par === 3
          ? null
          : percentageFromBooleanRows(fairwayRows, "fir"),
      girPercentage: percentageFromBooleanRows(holeRows, "gir"),
      averagePenalties: average(holeRows.map((row) => row.penalty)),
      threePuttCount,
      threePuttPercentage:
        puttRows.length > 0 ? threePuttCount / puttRows.length : null
    };
  });
}

function getHardestHoles(holes: HoleStats[]) {
  return [...holes]
    .filter((hole) => hole.roundsPlayed > 0 && hole.averageScoreToPar !== null)
    .sort((a, b) => {
      const bAverage = b.averageScoreToPar ?? Number.NEGATIVE_INFINITY;
      const aAverage = a.averageScoreToPar ?? Number.NEGATIVE_INFINITY;

      if (bAverage !== aAverage) {
        return bAverage - aAverage;
      }

      return a.holeNumber - b.holeNumber;
    })
    .slice(0, 3);
}

function buildHoleBreakdownNote(
  selectedCourseId: string,
  holeCount: number,
  scorecardCount: number
) {
  if (!selectedCourseId) {
    return "Add or select a course to see hole-by-hole analytics.";
  }

  if (holeCount === 0) {
    return "This course does not have saved hole setup yet. Add holes on the Courses page before tracking trends.";
  }

  if (scorecardCount === 0) {
    return "No hole-by-hole rounds match these filters yet.";
  }

  if (scorecardCount < 3) {
    return "Early read: add more hole-by-hole rounds before making coaching decisions from this breakdown.";
  }

  return null;
}

function emptyHoleBreakdown(
  activeSeasonName: string | null,
  note: string
): HoleBreakdown {
  return {
    courses: [],
    events: [],
    selectedCourseId: "",
    selectedCourseName: null,
    selectedEventId: "",
    selectedEventName: null,
    activeSeasonName,
    holes: [],
    hardestHoles: [],
    scorecardCount: 0,
    playerCount: 0,
    note
  };
}

function formatAverage(value: number | null) {
  return value === null ? "No data" : value.toFixed(1);
}

function formatPercentage(value: number | null) {
  return value === null ? "No data" : `${Math.round(value * 100)}%`;
}

function formatFirPercentage(hole: HoleStats) {
  return hole.par === 3 ? "N/A" : formatPercentage(hole.firPercentage);
}

function formatWholeNumber(value: number | null) {
  return value === null ? "No data" : value.toString();
}

function formatToPar(value: number | null) {
  if (value === null) {
    return "No data";
  }

  if (Math.abs(value) < 0.05) {
    return "E";
  }

  return value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1);
}

function formatEventLabel(event: EventOption) {
  return `${event.name} (${event.eventDate})`;
}

function getLastFiveLineupRounds(
  rounds: RoundRow[],
  lineupHoles: 9 | 18
) {
  return [...rounds]
    .filter(
      (round) =>
        round.counts_toward_lineup &&
        round.holes === lineupHoles
    )
    .sort((a, b) => {
      const dateComparison = b.played_on.localeCompare(a.played_on);

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return b.id.localeCompare(a.id);
    })
    .slice(0, 5);
}

function buildPlayerStats(
  players: PlayerRow[],
  rounds: RoundRow[],
  lineupHoles: 9 | 18
) {
  const roundsByPlayer = new Map<string, RoundRow[]>();

  rounds.forEach((round) => {
    const playerRounds = roundsByPlayer.get(round.player_id) ?? [];
    playerRounds.push(round);
    roundsByPlayer.set(round.player_id, playerRounds);
  });

  const sortedStats = players
    .map((player) => {
      const playerRounds = roundsByPlayer.get(player.id) ?? [];
      const formatRounds = playerRounds.filter(
        (round) => round.holes === lineupHoles
      );
      const lineupRounds = getLastFiveLineupRounds(
        playerRounds,
        lineupHoles
      );

      return {
        id: player.id,
        playerName: `${player.first_name} ${player.last_name}`,
        lineupRank: null as number | null,
        lineupRoundsCount: lineupRounds.length,
        lastFiveAverage: average(
          lineupRounds.map((round) => round.score)
        ),
        roundsPlayed: formatRounds.length,
        averageScore: average(
          formatRounds.map((round) => round.score)
        ),
        bestScore: bestScore(
          formatRounds.map((round) => round.score)
        ),
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
        )
      };
    })
    .sort((a, b) => {
      const aLineupAverage =
        a.lastFiveAverage ?? Number.POSITIVE_INFINITY;
      const bLineupAverage =
        b.lastFiveAverage ?? Number.POSITIVE_INFINITY;

      if (aLineupAverage !== bLineupAverage) {
        return aLineupAverage - bLineupAverage;
      }

      const aFormatAverage =
        a.averageScore ?? Number.POSITIVE_INFINITY;
      const bFormatAverage =
        b.averageScore ?? Number.POSITIVE_INFINITY;

      if (aFormatAverage !== bFormatAverage) {
        return aFormatAverage - bFormatAverage;
      }

      return a.playerName.localeCompare(b.playerName);
    });

  let lineupRank = 0;

  return sortedStats.map((player) => ({
    ...player,
    lineupRank:
      player.lastFiveAverage === null
        ? null
        : ++lineupRank
  }));
}

async function getHoleBreakdown(
  supabase: SupabaseServiceClient,
  teamId: string,
  activeSeason: ActiveSeason | null,
  rounds: RoundRow[],
  filters: StatisticsFilters
): Promise<HoleBreakdown> {
  try {
    const [coursesResult, eventsResult] = await Promise.all([
      supabase
        .from("courses")
        .select("id, name, location")
        .eq("team_id", teamId)
        .order("name", { ascending: true }),
      supabase
        .from("events")
        .select("id, name, event_date, event_type, season_id")
        .eq("team_id", teamId)
        .order("event_date", { ascending: true })
        .order("name", { ascending: true })
    ]);

    if (coursesResult.error) {
      return emptyHoleBreakdown(
        activeSeason?.name ?? null,
        `Hole-by-hole analytics could not load courses: ${coursesResult.error.message}`
      );
    }

    if (eventsResult.error) {
      return emptyHoleBreakdown(
        activeSeason?.name ?? null,
        `Hole-by-hole analytics could not load events: ${eventsResult.error.message}`
      );
    }

    const courses = (coursesResult.data ?? []) as CourseRow[];
    const events = (eventsResult.data ?? []) as EventRow[];
    const eventOptionsSource = activeSeason
      ? events.filter((event) => event.season_id === activeSeason.id)
      : events;
    const selectedCourse =
      courses.find((course) => course.id === filters.courseId) ?? courses[0] ?? null;
    const selectedEvent =
      eventOptionsSource.find((event) => event.id === filters.eventId) ?? null;
    const selectedCourseId = selectedCourse?.id ?? "";
    const selectedEventId = selectedEvent?.id ?? "";
    const baseBreakdown = {
      courses: courses.map((course) => ({
        id: course.id,
        name: course.name,
        location: course.location
      })),
      events: eventOptionsSource.map((event) => ({
        id: event.id,
        name: event.name,
        eventDate: event.event_date,
        eventType: event.event_type
      })),
      selectedCourseId,
      selectedCourseName: selectedCourse?.name ?? null,
      selectedEventId,
      selectedEventName: selectedEvent?.name ?? null,
      activeSeasonName: activeSeason?.name ?? null
    };

    if (!selectedCourseId) {
      return {
        ...baseBreakdown,
        holes: [],
        hardestHoles: [],
        scorecardCount: 0,
        playerCount: 0,
        note: buildHoleBreakdownNote("", 0, 0)
      };
    }

    const { data: courseHolesData, error: courseHolesError } = await supabase
      .from("course_holes")
      .select("course_id, hole_number, par, handicap, yardage")
      .eq("course_id", selectedCourseId)
      .order("hole_number", { ascending: true });

    if (courseHolesError) {
      return {
        ...baseBreakdown,
        holes: [],
        hardestHoles: [],
        scorecardCount: 0,
        playerCount: 0,
        note: `Hole-by-hole analytics could not load course holes: ${courseHolesError.message}`
      };
    }

    const selectedCourseHoles = (courseHolesData ?? []) as CourseHoleRow[];
    const filteredRoundIds = rounds
      .filter((round) => !selectedEventId || round.event_id === selectedEventId)
      .map((round) => round.id);
    let roundHoles: RoundHoleRow[] = [];

    if (filteredRoundIds.length > 0) {
      let roundHolesQuery = supabase
        .from("round_holes")
        .select(
          "id, round_id, player_id, event_id, course_id, hole_number, par, handicap, score, putts, fir, gir, penalty"
        )
        .eq("team_id", teamId)
        .eq("course_id", selectedCourseId)
        .in("round_id", filteredRoundIds);

      if (selectedEventId) {
        roundHolesQuery = roundHolesQuery.eq("event_id", selectedEventId);
      }

      const { data: roundHolesData, error: roundHolesError } = await roundHolesQuery
        .order("hole_number", { ascending: true })
        .order("created_at", { ascending: true });

      if (roundHolesError) {
        return {
          ...baseBreakdown,
          holes: buildHoleStats(selectedCourseHoles, []),
          hardestHoles: [],
          scorecardCount: 0,
          playerCount: 0,
          note: `Hole-by-hole analytics could not load round holes: ${roundHolesError.message}`
        };
      }

      roundHoles = (roundHolesData ?? []) as RoundHoleRow[];
    }

    const holes = buildHoleStats(selectedCourseHoles, roundHoles);
    const scorecardCount = new Set(roundHoles.map((hole) => hole.round_id)).size;
    const playerCount = new Set(roundHoles.map((hole) => hole.player_id)).size;

    return {
      ...baseBreakdown,
      holes,
      hardestHoles: getHardestHoles(holes),
      scorecardCount,
      playerCount,
      note: buildHoleBreakdownNote(selectedCourseId, holes.length, scorecardCount)
    };
  } catch (error) {
    return emptyHoleBreakdown(
      activeSeason?.name ?? null,
      `Hole-by-hole analytics could not reach Supabase: ${getErrorMessage(error)}`
    );
  }
}

async function getStatistics(
  filters: StatisticsFilters,
  currentTeam: CurrentTeamContext
): Promise<StatisticsState> {
  try {
    const { supabase, team } = currentTeam;

    const activeSeason = await getActiveSeasonForTeam(supabase, team.id);
    const roundsQuery = supabase
      .from("rounds")
      .select(
        "id, player_id, event_id, played_on, counts_toward_lineup, holes, score, putts, fairways_hit, fairways_possible, greens_in_regulation, gir_possible, penalties, three_putts"
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
    const playerStats = buildPlayerStats(
      players,
      rounds,
      filters.lineupHoles
    );
    const holeBreakdown = await getHoleBreakdown(
      supabase,
      team.id,
      activeSeason,
      rounds,
      filters
    );

    return {
      status: "ready",
      teamName: team.name,
      activeSeasonName: activeSeason?.name ?? null,
      lineupHoles: filters.lineupHoles,
      playerStats,
      holeBreakdown
    };
  } catch (error) {
    return {
      status: "error",
      message: getErrorMessage(error)
    };
  }
}

export default async function StatisticsPage({ searchParams }: StatisticsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const currentTeam = await requireTeamStaff();
  const filters: StatisticsFilters = {
    courseId: getSearchValue(resolvedSearchParams.courseId),
    eventId: getSearchValue(resolvedSearchParams.eventId),
    lineupHoles: getLineupHoles(resolvedSearchParams.lineupHoles)
  };
  const statistics = await getStatistics(filters, currentTeam);

  if (statistics.status === "error") {
    return (
      <section className="space-y-6">
        <StatisticsHeader />
        <EmptyState title="Statistics unavailable" message={statistics.message} />
      </section>
    );
  }

  if (statistics.status === "empty") {
    return (
      <section className="space-y-6">
        <StatisticsHeader />
        <EmptyState message={statistics.message} />
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

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 sm:p-8">
        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Lineup Form
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Last Five Eligible {statistics.lineupHoles}-Hole Rounds
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Rankings only compare rounds with the same number of holes.
              Nine-hole and 18-hole scores are never blended together.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center xl:flex-col xl:items-end">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <Link
                href={buildStatisticsHref(
                  {
                    courseId:
                      statistics.holeBreakdown.selectedCourseId,
                    eventId:
                      statistics.holeBreakdown.selectedEventId
                  },
                  9
                )}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-semibold transition",
                  statistics.lineupHoles === 9
                    ? "bg-green-800 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-950"
                )}
              >
                9-Hole
              </Link>

              <Link
                href={buildStatisticsHref(
                  {
                    courseId:
                      statistics.holeBreakdown.selectedCourseId,
                    eventId:
                      statistics.holeBreakdown.selectedEventId
                  },
                  18
                )}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-semibold transition",
                  statistics.lineupHoles === 18
                    ? "bg-green-800 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-950"
                )}
              >
                18-Hole
              </Link>
            </div>

            <Badge tone="green">
              {
                statistics.playerStats.filter(
                  (player) => player.lineupRank !== null
                ).length
              } ranked
            </Badge>
          </div>
        </div>
      </div>

      {statistics.playerStats.length === 0 ? (
        <EmptyState message="No players found for this team yet." />
      ) : (
        <div className={tableShellClassName}>
          <div
            className={cn(
              tableHeaderClassName,
              "xl:grid xl:grid-cols-[0.45fr_1.45fr_0.8fr_0.75fr_0.85fr_0.65fr_0.65fr_0.85fr_0.85fr_0.7fr_0.75fr_0.85fr]"
            )}
          >
            <span>Rank</span>
            <span>Player</span>
            <span>Last 5 Avg</span>
            <span>Counted</span>
            <span>{statistics.lineupHoles}-Hole Avg</span>
            <span>{statistics.lineupHoles}-Hole Rounds</span>
            <span>Best</span>
            <span>Avg Putts</span>
            <span>Fairways</span>
            <span>GIR</span>
            <span>Avg Pen.</span>
            <span>Avg 3-putts</span>
          </div>

          <div className="divide-y divide-gray-100">
            {statistics.playerStats.map((player) => (
              <PlayerStatRow
                key={player.id}
                player={player}
                lineupHoles={statistics.lineupHoles}
              />
            ))}
          </div>
        </div>
      )}

      <HoleBreakdownSection
        breakdown={statistics.holeBreakdown}
        lineupHoles={statistics.lineupHoles}
      />
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
    <PageHeader
      eyebrow="Analytics"
      title="Statistics"
      description={
        teamName
          ? `${teamName} lineup form, player analytics, scoring trends, and hole-by-hole performance.`
          : "Player analytics will appear once Supabase data is available."
      }
      meta={
        <>
          {typeof playerCount === "number" ? (
            <Badge>{playerCount} players</Badge>
          ) : null}
          {teamName ? (
            <Badge tone={activeSeasonName ? "green" : "slate"}>
              {activeSeasonName ? `Active: ${activeSeasonName}` : "All seasons"}
            </Badge>
          ) : null}
        </>
      }
    />
  );
}

function PlayerStatRow({
  player,
  lineupHoles
}: {
  player: PlayerStats;
  lineupHoles: 9 | 18;
}) {
  const isProjectedLineup =
    player.lineupRank !== null && player.lineupRank <= 5;

  return (
    <div
      className={cn(
        tableRowClassName,
        "sm:grid-cols-2 xl:grid-cols-[0.45fr_1.45fr_0.8fr_0.75fr_0.85fr_0.65fr_0.65fr_0.85fr_0.85fr_0.7fr_0.75fr_0.85fr] xl:items-center",
        isProjectedLineup && "bg-green-50/50 hover:bg-green-50"
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
          Rank
        </p>

        {player.lineupRank === null ? (
          <span className="font-semibold text-slate-400">—</span>
        ) : (
          <Badge tone={isProjectedLineup ? "green" : "slate"}>
            #{player.lineupRank}
          </Badge>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
          Player
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-gray-950">
            {player.playerName}
          </p>

          {isProjectedLineup ? (
            <Badge tone="green">Top 5</Badge>
          ) : null}
        </div>
      </div>

      <StatCell
        label="Last 5 Avg"
        value={formatAverage(player.lastFiveAverage)}
        strong
      />

      <StatCell
        label="Counted"
        value={
          player.lineupRoundsCount === 1
            ? "1 of 5"
            : `${player.lineupRoundsCount} of 5`
        }
      />

      <StatCell
        label={`${lineupHoles}-Hole Avg`}
        value={formatAverage(player.averageScore)}
      />

      <StatCell
        label={`${lineupHoles}-Hole Rounds`}
        value={player.roundsPlayed.toString()}
      />

      <StatCell
        label="Best"
        value={formatWholeNumber(player.bestScore)}
      />

      <StatCell
        label="Avg Putts"
        value={formatAverage(player.averagePutts)}
      />

      <StatCell
        label="Fairways"
        value={formatPercentage(player.fairwayPercentage)}
      />

      <StatCell
        label="GIR"
        value={formatPercentage(player.girPercentage)}
      />

      <StatCell
        label="Avg Penalties"
        value={formatAverage(player.averagePenalties)}
      />

      <StatCell
        label="Avg Three-putts"
        value={formatAverage(player.averageThreePutts)}
      />
    </div>
  );
}

function HoleBreakdownSection({
  breakdown,
  lineupHoles
}: {
  breakdown: HoleBreakdown;
  lineupHoles: 9 | 18;
}) {
  const hardestHoleNumbers = new Set(
    breakdown.hardestHoles.map((hole) => hole.holeNumber)
  );

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Hole-by-Hole Breakdown
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Course Performance
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              {breakdown.selectedCourseName
                ? `Showing ${breakdown.selectedCourseName}${
                    breakdown.selectedEventName
                      ? ` for ${breakdown.selectedEventName}`
                      : " across selected season rounds"
                  }.`
                : "Select a course to view team scoring by hole."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{breakdown.scorecardCount} scorecards</Badge>
            <Badge tone="slate">{breakdown.playerCount} players</Badge>
            <Badge tone="slate">{breakdown.activeSeasonName ?? "All seasons"}</Badge>
          </div>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <input
            type="hidden"
            name="lineupHoles"
            value={lineupHoles}
          />
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Course</span>
            <select
              name="courseId"
              defaultValue={breakdown.selectedCourseId}
              className={inputClassName}
            >
              {breakdown.courses.length === 0 ? (
                <option value="">No courses found</option>
              ) : null}
              {breakdown.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}{course.location ? ` - ${course.location}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Event optional</span>
            <select
              name="eventId"
              defaultValue={breakdown.selectedEventId}
              className={inputClassName}
            >
              <option value="">
                {breakdown.activeSeasonName
                  ? `All ${breakdown.activeSeasonName} events`
                  : "All events"}
              </option>
              {breakdown.events.map((event) => (
                <option key={event.id} value={event.id}>
                  {formatEventLabel(event)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className={primaryButtonClassName}
          >
            Apply Filters
          </button>
        </form>
      </div>

      {breakdown.note ? (
        <Message type="error">{breakdown.note}</Message>
      ) : null}

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Top 3 Hardest Holes
        </p>
        {breakdown.hardestHoles.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Not enough hole-by-hole score data is available for this filter yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {breakdown.hardestHoles.map((hole, index) => (
              <div
                key={hole.holeNumber}
                className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  #{index + 1} Hardest
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950">
                  Hole {hole.holeNumber}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Avg to par: {formatToPar(hole.averageScoreToPar)}
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Avg score: {formatAverage(hole.averageScore)} across {hole.roundsPlayed} rounds
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {breakdown.holes.length > 0 ? (
        <section
          aria-labelledby="hole-performance-heading"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">
                Hole-by-hole insights
              </p>
              <h3
                id="hole-performance-heading"
                className="mt-1 text-xl font-bold tracking-tight text-slate-950"
              >
                Full Course Performance
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                A scorecard-style view of every hole, with scoring, accuracy, and putting side by side.
              </p>
            </div>
            <Badge tone="slate">{breakdown.holes.length} holes</Badge>
          </div>

          <div className="space-y-8 p-4 sm:p-6 lg:p-7">
            {breakdown.holes.some((hole) => hole.holeNumber <= 9) ? (
              <HoleNineGroup
                title="Front Nine"
                range="Holes 1-9"
                holes={breakdown.holes.filter((hole) => hole.holeNumber <= 9)}
                hardestHoleNumbers={hardestHoleNumbers}
              />
            ) : null}
            {breakdown.holes.some((hole) => hole.holeNumber > 9) ? (
              <HoleNineGroup
                title="Back Nine"
                range="Holes 10-18"
                holes={breakdown.holes.filter((hole) => hole.holeNumber > 9)}
                hardestHoleNumbers={hardestHoleNumbers}
              />
            ) : null}
            <p className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
              Statistics use scorecards with saved hole-by-hole data. FIR does not apply to par-3 holes.
              The 3+ putt metric counts holes with at least three recorded putts.
              A dash means that metric has no recorded data yet.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function HoleNineGroup({
  title,
  range,
  holes,
  hardestHoleNumbers
}: {
  title: string;
  range: string;
  holes: HoleStats[];
  hardestHoleNumbers: Set<number>;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-7 w-1 rounded-full bg-green-700" aria-hidden="true" />
          <div>
            <h4 className="text-base font-bold text-slate-950">{title}</h4>
            <p className="text-xs text-slate-500">{range}</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          {holes.length} {holes.length === 1 ? "hole" : "holes"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {holes.map((hole) => (
          <HolePerformanceCard
            key={hole.holeNumber}
            hole={hole}
            isHardest={hardestHoleNumbers.has(hole.holeNumber)}
          />
        ))}
      </div>
    </div>
  );
}

function holeScoreTone(averageScoreToPar: number | null) {
  if (averageScoreToPar === null) {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  if (averageScoreToPar <= 0) {
    return "border-green-200 bg-green-50 text-green-800";
  }
  if (averageScoreToPar < 1) {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }
  return "border-rose-200 bg-rose-50 text-rose-800";
}

function HolePerformanceCard({
  hole,
  isHardest
}: {
  hole: HoleStats;
  isHardest: boolean;
}) {
  const hasData = hole.roundsPlayed > 0;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border bg-white p-4 transition-shadow hover:shadow-md sm:p-5",
        isHardest ? "border-amber-200" : "border-slate-200"
      )}
      aria-label={"Hole " + hole.holeNumber + " performance"}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-1",
          isHardest ? "bg-amber-400" : "bg-green-700"
        )}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl font-bold tabular-nums text-slate-900">
            {hole.holeNumber}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Hole {hole.holeNumber}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Par {hole.par}
              {hole.handicap !== null ? " · HCP " + hole.handicap : ""}
            </p>
          </div>
        </div>
        {isHardest ? (
          <Badge tone="amber">Top 3 hardest</Badge>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto] items-end gap-2">
        <div>
          <p className="text-xs font-medium text-slate-500">Average score</p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-slate-950">
            {hole.averageScore === null ? "—" : hole.averageScore.toFixed(1)}
          </p>
        </div>
        <div className="text-right">
          <p className="mb-2 text-xs font-medium text-slate-500">Avg. to par</p>
          <span className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-sm font-bold tabular-nums",
            holeScoreTone(hole.averageScoreToPar)
          )}>
            {hole.averageScoreToPar === null
              ? "—"
              : formatToPar(hole.averageScoreToPar)}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
        <HoleRateMeter label="GIR" rate={hole.girPercentage} />
        <HoleRateMeter
          label="FIR"
          rate={hole.firPercentage}
          notApplicable={hole.par === 3}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-lg bg-slate-50 py-3">
        <div className="px-2 text-center">
          <p className="text-[11px] font-medium text-slate-500">Avg. putts</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
            {hole.averagePutts === null ? "—" : hole.averagePutts.toFixed(1)}
          </p>
        </div>
        <div className="px-2 text-center">
          <p className="text-[11px] font-medium text-slate-500">Avg. pen.</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
            {hole.averagePenalties === null ? "—" : hole.averagePenalties.toFixed(1)}
          </p>
        </div>
        <div className="px-2 text-center">
          <p className="text-[11px] font-medium text-slate-500">3+ putts</p>
          <p className="mt-1 text-sm font-bold tabular-nums text-slate-900">
            {hole.threePuttPercentage === null ? "—" : formatPercentage(hole.threePuttPercentage)}
          </p>
          <p className="text-[10px] text-slate-500">
            {hole.threePuttPercentage === null ? "Not tracked" : hole.threePuttCount + " holes"}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {hasData
          ? hole.roundsPlayed + " " + (hole.roundsPlayed === 1 ? "scorecard" : "scorecards") + " recorded"
          : "No hole-by-hole scores recorded yet"}
      </p>
    </article>
  );
}

function HoleRateMeter({
  label,
  rate,
  notApplicable = false
}: {
  label: string;
  rate: number | null;
  notApplicable?: boolean;
}) {
  const percentage = rate === null || notApplicable
    ? null
    : Math.max(0, Math.min(100, Math.round(rate * 100)));

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="font-bold tabular-nums text-slate-900">
          {notApplicable ? "N/A" : percentage === null ? "—" : percentage + "%"}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        {percentage !== null ? (
          <div
            className="h-full rounded-full bg-green-700"
            style={{ width: percentage + "%" }}
            role="progressbar"
            aria-label={label === "GIR" ? "Greens in regulation" : "Fairways hit"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentage}
          />
        ) : null}
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  strong = false,
  hideLabelAt = "xl"
}: {
  label: string;
  value: string;
  strong?: boolean;
  hideLabelAt?: "xl" | "2xl";
}) {
  return (
    <div>
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-wide text-gray-500",
          hideLabelAt === "2xl" ? "2xl:hidden" : "xl:hidden"
        )}
      >
        {label}
      </p>
      <p className={strong ? "font-semibold text-slate-950" : "text-slate-700"}>
        {value}
      </p>
    </div>
  );
}
