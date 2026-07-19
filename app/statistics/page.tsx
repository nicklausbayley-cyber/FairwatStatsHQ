import {
  requireCurrentTeam,
  type CurrentTeamContext
} from "../../lib/auth/get-current-team";
import {
  getActiveSeasonForTeam,
  type ActiveSeason
} from "../../lib/seasons/active-season";

export const dynamic = "force-dynamic";

type SupabaseServiceClient = CurrentTeamContext["supabase"];

type SearchParams = {
  courseId?: string | string[];
  eventId?: string | string[];
};

type StatisticsPageProps = {
  searchParams?: Promise<SearchParams>;
};

type StatisticsFilters = {
  courseId: string;
  eventId: string;
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

function buildPlayerStats(players: PlayerRow[], rounds: RoundRow[]) {
  const roundsByPlayer = new Map<string, RoundRow[]>();

  rounds.forEach((round) => {
    const playerRounds = roundsByPlayer.get(round.player_id) ?? [];
    playerRounds.push(round);
    roundsByPlayer.set(round.player_id, playerRounds);
  });

  return players
    .map((player) => {
      const playerRounds = roundsByPlayer.get(player.id) ?? [];

      return {
        id: player.id,
        playerName: `${player.first_name} ${player.last_name}`,
        roundsPlayed: playerRounds.length,
        averageScore: average(playerRounds.map((round) => round.score)),
        bestScore: bestScore(playerRounds.map((round) => round.score)),
        averagePutts: average(playerRounds.map((round) => round.putts)),
        fairwayPercentage: percentageFromTotals(
          playerRounds,
          "fairways_hit",
          "fairways_possible"
        ),
        girPercentage: percentageFromTotals(
          playerRounds,
          "greens_in_regulation",
          "gir_possible"
        ),
        averagePenalties: average(playerRounds.map((round) => round.penalties)),
        averageThreePutts: average(playerRounds.map((round) => round.three_putts))
      };
    })
    .sort((a, b) => {
      const aAverage = a.averageScore ?? Number.POSITIVE_INFINITY;
      const bAverage = b.averageScore ?? Number.POSITIVE_INFINITY;

      if (aAverage !== bAverage) {
        return aAverage - bAverage;
      }

      return a.playerName.localeCompare(b.playerName);
    });
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
        "id, player_id, event_id, score, putts, fairways_hit, fairways_possible, greens_in_regulation, gir_possible, penalties, three_putts"
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
    const playerStats = buildPlayerStats(players, rounds);
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
  const currentTeam = await requireCurrentTeam();
  const statistics = await getStatistics({
    courseId: getSearchValue(resolvedSearchParams.courseId),
    eventId: getSearchValue(resolvedSearchParams.eventId)
  }, currentTeam);

  if (statistics.status === "error") {
    return (
      <section className="space-y-6">
        <StatisticsHeader />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Statistics unavailable</p>
          <p className="mt-1">{statistics.message}</p>
        </div>
      </section>
    );
  }

  if (statistics.status === "empty") {
    return (
      <section className="space-y-6">
        <StatisticsHeader />
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          {statistics.message}
        </div>
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

      {statistics.playerStats.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          No players found for this team yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-green-900/10 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.3fr_0.7fr_0.9fr_0.8fr_0.9fr_1fr_0.8fr_0.9fr_0.9fr] gap-4 border-b border-gray-100 bg-green-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-green-900 xl:grid">
            <span>Player</span>
            <span>Rounds</span>
            <span>Avg Score</span>
            <span>Best</span>
            <span>Avg Putts</span>
            <span>Fairways</span>
            <span>GIR</span>
            <span>Avg Pen.</span>
            <span>Avg 3-putts</span>
          </div>

          <div className="divide-y divide-gray-100">
            {statistics.playerStats.map((player) => (
              <PlayerStatRow key={player.id} player={player} />
            ))}
          </div>
        </div>
      )}

      <HoleBreakdownSection breakdown={statistics.holeBreakdown} />
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
    <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
        Analytics
      </p>
      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            Statistics
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
            {teamName
              ? `${teamName} player analytics loaded from Supabase.`
              : "Player analytics will appear once Supabase data is available."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {typeof playerCount === "number" ? (
            <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
              {playerCount} players
            </div>
          ) : null}
          {teamName ? (
            <div className="rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
              {activeSeasonName ? `Active: ${activeSeasonName}` : "All seasons"}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PlayerStatRow({ player }: { player: PlayerStats }) {
  return (
    <div className="grid gap-3 px-5 py-4 text-sm xl:grid-cols-[1.3fr_0.7fr_0.9fr_0.8fr_0.9fr_1fr_0.8fr_0.9fr_0.9fr] xl:items-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
          Player
        </p>
        <p className="font-medium text-gray-950">{player.playerName}</p>
      </div>
      <StatCell label="Rounds" value={player.roundsPlayed.toString()} />
      <StatCell label="Avg Score" value={formatAverage(player.averageScore)} strong />
      <StatCell label="Best" value={formatWholeNumber(player.bestScore)} />
      <StatCell label="Avg Putts" value={formatAverage(player.averagePutts)} />
      <StatCell label="Fairways" value={formatPercentage(player.fairwayPercentage)} />
      <StatCell label="GIR" value={formatPercentage(player.girPercentage)} />
      <StatCell label="Avg Penalties" value={formatAverage(player.averagePenalties)} />
      <StatCell label="Avg Three-putts" value={formatAverage(player.averageThreePutts)} />
    </div>
  );
}

function HoleBreakdownSection({ breakdown }: { breakdown: HoleBreakdown }) {
  const hardestHoleNumbers = new Set(
    breakdown.hardestHoles.map((hole) => hole.holeNumber)
  );

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Hole-by-Hole Breakdown
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
              Course Performance
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
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
            <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
              {breakdown.scorecardCount} scorecards
            </div>
            <div className="rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
              {breakdown.playerCount} players
            </div>
            <div className="rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
              {breakdown.activeSeasonName ?? "All seasons"}
            </div>
          </div>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Course</span>
            <select
              name="courseId"
              defaultValue={breakdown.selectedCourseId}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
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
            <span className="text-sm font-semibold text-gray-700">Event optional</span>
            <select
              name="eventId"
              defaultValue={breakdown.selectedEventId}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
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
            className="rounded-md bg-green-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {breakdown.note ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
          {breakdown.note}
        </div>
      ) : null}

      <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Top 3 Hardest Holes
        </p>
        {breakdown.hardestHoles.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Not enough hole-by-hole score data is available for this filter yet.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {breakdown.hardestHoles.map((hole, index) => (
              <div
                key={hole.holeNumber}
                className="rounded-lg border border-amber-200 bg-amber-50/70 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                  #{index + 1} Hardest
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-950">
                  Hole {hole.holeNumber}
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  Avg to par: {formatToPar(hole.averageScoreToPar)}
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  Avg score: {formatAverage(hole.averageScore)} across {hole.roundsPlayed} rounds
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {breakdown.holes.length === 0 ? null : (
        <div className="overflow-hidden rounded-lg border border-green-900/10 bg-white shadow-sm">
          <div className="hidden grid-cols-[0.6fr_0.7fr_0.7fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr_0.9fr_0.8fr_0.9fr] gap-3 border-b border-gray-100 bg-green-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-green-900 2xl:grid">
            <span>Hole</span>
            <span>Par/HCP</span>
            <span>Rounds</span>
            <span>Avg Score</span>
            <span>Avg +/-</span>
            <span>Avg Putts</span>
            <span>FIR</span>
            <span>GIR</span>
            <span>Avg Pen.</span>
            <span>3-putts</span>
            <span>3-putt %</span>
          </div>
          <div className="divide-y divide-gray-100">
            {breakdown.holes.map((hole) => (
              <HoleStatRow
                key={hole.holeNumber}
                hole={hole}
                isHardest={hardestHoleNumbers.has(hole.holeNumber)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HoleStatRow({
  hole,
  isHardest
}: {
  hole: HoleStats;
  isHardest: boolean;
}) {
  return (
    <div
      className={
        isHardest
          ? "grid gap-3 bg-amber-50/50 px-5 py-4 text-sm 2xl:grid-cols-[0.6fr_0.7fr_0.7fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr_0.9fr_0.8fr_0.9fr] 2xl:items-center"
          : "grid gap-3 px-5 py-4 text-sm 2xl:grid-cols-[0.6fr_0.7fr_0.7fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr_0.9fr_0.8fr_0.9fr] 2xl:items-center"
      }
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 2xl:hidden">
          Hole
        </p>
        <div className="flex items-center gap-2">
          <p className="font-semibold text-gray-950">{hole.holeNumber}</p>
          {isHardest ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
              Hard
            </span>
          ) : null}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 2xl:hidden">
          Par/HCP
        </p>
        <p className="text-gray-700">
          Par {hole.par}{hole.handicap ? ` / HCP ${hole.handicap}` : ""}
        </p>
      </div>
      <StatCell label="Rounds" value={hole.roundsPlayed.toString()} />
      <StatCell label="Avg Score" value={formatAverage(hole.averageScore)} strong />
      <StatCell label="Avg +/-" value={formatToPar(hole.averageScoreToPar)} strong />
      <StatCell label="Avg Putts" value={formatAverage(hole.averagePutts)} />
      <StatCell label="FIR" value={formatFirPercentage(hole)} />
      <StatCell label="GIR" value={formatPercentage(hole.girPercentage)} />
      <StatCell label="Avg Penalties" value={formatAverage(hole.averagePenalties)} />
      <StatCell label="Three-putts" value={hole.threePuttCount.toString()} />
      <StatCell label="Three-putt %" value={formatPercentage(hole.threePuttPercentage)} />
    </div>
  );
}

function StatCell({
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
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden 2xl:hidden">
        {label}
      </p>
      <p className={strong ? "font-semibold text-gray-950" : "text-gray-700"}>
        {value}
      </p>
    </div>
  );
}
