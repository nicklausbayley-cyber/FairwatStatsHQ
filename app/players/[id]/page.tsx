import Link from "next/link";
import { redirect } from "next/navigation";
import {
  isTeamStaff,
  requireCurrentTeam,
  type CurrentTeamContext
} from "../../../lib/auth/get-current-team";
import { getActiveSeasonForTeam } from "../../../lib/seasons/active-season";
import { LineupStatusToggle } from "../../../components/rounds/lineup-status-toggle";
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
} from "../../../components/ui/primitives";

export const dynamic = "force-dynamic";

type PlayerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PlayerRow = {
  id: string;
  team_id: string;
  profile_id: string | null;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  status: string;
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
};

type RoundWithEvent = RoundRow & {
  eventName: string | null;
};

type RoundLengthStats = {
  roundsPlayed: number;
  averageScore: number | null;
  lastFiveAverage: number | null;
  qualifyingRoundsCount: number;
  bestScore: number | null;
};

type PlayerStats = {
  roundsPlayed: number;
  nineHole: RoundLengthStats;
  eighteenHole: RoundLengthStats;
  averagePutts: number | null;
  fairwayPercentage: number | null;
  girPercentage: number | null;
  averagePenalties: number | null;
  averageThreePutts: number | null;
};

type PlayerProfileState =
  | {
      status: "ready";
      player: PlayerRow;
      activeSeasonName: string | null;
      stats: PlayerStats;
      rounds: RoundWithEvent[];
    }
  | {
      status: "not-found";
      message: string;
    }
  | {
      status: "restricted";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isString(value: string | null): value is string {
  return typeof value === "string" && value.length > 0;
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

function buildRoundLengthStats(
  rounds: RoundRow[],
  holes: 9 | 18
): RoundLengthStats {
  const formatRounds = rounds.filter(
    (round) => round.holes === holes
  );
  const qualifyingRounds = formatRounds.filter(
    (round) => round.counts_toward_lineup
  );
  const lastFiveQualifyingRounds = qualifyingRounds.slice(0, 5);

  return {
    roundsPlayed: formatRounds.length,
    averageScore: average(
      formatRounds.map((round) => round.score)
    ),
    lastFiveAverage: average(
      lastFiveQualifyingRounds.map((round) => round.score)
    ),
    qualifyingRoundsCount: qualifyingRounds.length,
    bestScore: bestScore(
      formatRounds.map((round) => round.score)
    )
  };
}

function buildStats(rounds: RoundRow[]): PlayerStats {
  return {
    roundsPlayed: rounds.length,
    nineHole: buildRoundLengthStats(rounds, 9),
    eighteenHole: buildRoundLengthStats(rounds, 18),
    averagePutts: average(rounds.map((round) => round.putts)),
    fairwayPercentage: percentageFromTotals(
      rounds,
      "fairways_hit",
      "fairways_possible"
    ),
    girPercentage: percentageFromTotals(
      rounds,
      "greens_in_regulation",
      "gir_possible"
    ),
    averagePenalties: average(
      rounds.map((round) => round.penalties)
    ),
    averageThreePutts: average(
      rounds.map((round) => round.three_putts)
    )
  };
}

function formatAverage(value: number | null) {
  return value === null ? "No data" : value.toFixed(1);
}

function formatPercentage(value: number | null) {
  return value === null ? "No data" : `${Math.round(value * 100)}%`;
}

function formatWholeNumber(value: number | null) {
  return value === null ? "No data" : value.toString();
}

function formatStatPair(hit: number | null, possible: number | null) {
  const formattedHit = hit === null ? "-" : hit.toString();
  const formattedPossible = possible === null ? "-" : possible.toString();

  return `${formattedHit} / ${formattedPossible}`;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

async function getPlayerProfile(
  playerId: string,
  currentTeam: CurrentTeamContext
): Promise<PlayerProfileState> {
  try {
    const { supabase, team, profile, role } = currentTeam;

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, team_id, profile_id, first_name, last_name, graduation_year, status")
      .eq("id", playerId)
      .eq("team_id", team.id)
      .maybeSingle();

    if (playerError) {
      return {
        status: "error",
        message: playerError.message
      };
    }

    if (!player) {
      return {
        status: "not-found",
        message: "Player profile not found."
      };
    }

    if (!isTeamStaff(role) && player.profile_id !== profile.id) {
      return {
        status: "restricted",
        message: "Players can only view their own profile."
      };
    }

    const activeSeason = await getActiveSeasonForTeam(supabase, team.id);
    const roundsQuery = supabase
      .from("rounds")
      .select(
        "id, event_id, played_on, holes, score, putts, fairways_hit, fairways_possible, greens_in_regulation, gir_possible, penalties, three_putts, notes, counts_toward_lineup"
      )
      .eq("team_id", team.id)
      .eq("player_id", player.id);

    const { data: roundsData, error: roundsError } = await (activeSeason
      ? roundsQuery.eq("season_id", activeSeason.id)
      : roundsQuery
    ).order("played_on", { ascending: false });

    if (roundsError) {
      return {
        status: "error",
        message: roundsError.message
      };
    }

    const rounds = (roundsData ?? []) as RoundRow[];
    const eventIds = Array.from(new Set(rounds.map((round) => round.event_id).filter(isString)));
    let events: EventRow[] = [];

    if (eventIds.length > 0) {
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("id, name")
        .eq("team_id", team.id)
        .in("id", eventIds);

      if (eventsError) {
        return {
          status: "error",
          message: eventsError.message
        };
      }

      events = (eventsData ?? []) as EventRow[];
    }

    const eventNames = new Map(events.map((event) => [event.id, event.name]));
    const roundsWithEvents = rounds.map((round) => ({
      ...round,
      eventName: round.event_id ? eventNames.get(round.event_id) ?? null : null
    }));

    return {
      status: "ready",
      player: player as PlayerRow,
      activeSeasonName: activeSeason?.name ?? null,
      stats: buildStats(rounds),
      rounds: roundsWithEvents
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to load player profile data."
    };
  }
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params;
  const currentTeam = await requireCurrentTeam();
  const profile = await getPlayerProfile(id, currentTeam);
  const showLineupControls = isTeamStaff(currentTeam.role);

  if (profile.status === "restricted") {
    redirect("/enter-score");
  }

  if (profile.status === "error") {
    return (
      <section className="space-y-6">
        <PlayerProfileHeader showRosterLink={showLineupControls} />
        <EmptyState title="Player profile unavailable" message={profile.message} />
      </section>
    );
  }

  if (profile.status === "not-found") {
    return (
      <section className="space-y-6">
        <PlayerProfileHeader showRosterLink={showLineupControls} />
        <EmptyState
          message={profile.message}
          action={
            <Link href="/roster" className={secondaryButtonClassName}>
              Back to Roster
            </Link>
          }
        />
      </section>
    );
  }

  const playerName = `${profile.player.first_name} ${profile.player.last_name}`;

  return (
    <section className="space-y-6">
      <PlayerProfileHeader
        playerName={playerName}
        activeSeasonName={profile.activeSeasonName}
        showRosterLink={showLineupControls}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Player Info
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
            {playerName}
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <InfoItem
              label="Graduation Year"
              value={profile.player.graduation_year?.toString() ?? "Not set"}
            />
            <InfoItem label="Status" value={profile.player.status} capitalize />
            <InfoItem
              label="Eligible 9-Hole Rounds"
              value={profile.stats.nineHole.qualifyingRoundsCount.toString()}
            />
            <InfoItem
              label="Eligible 18-Hole Rounds"
              value={profile.stats.eighteenHole.qualifyingRoundsCount.toString()}
            />
          </dl>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <RoundLengthSummaryCard
              holes={9}
              stats={profile.stats.nineHole}
            />
            <RoundLengthSummaryCard
              holes={18}
              stats={profile.stats.eighteenHole}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Total Rounds"
              value={profile.stats.roundsPlayed.toString()}
            />
            <StatCard
              label="Overall Avg Putts"
              value={formatAverage(profile.stats.averagePutts)}
            />
            <StatCard
              label="Overall Fairway Percentage"
              value={formatPercentage(profile.stats.fairwayPercentage)}
            />
            <StatCard
              label="Overall GIR Percentage"
              value={formatPercentage(profile.stats.girPercentage)}
            />
            <StatCard
              label="Overall Avg Penalties"
              value={formatAverage(profile.stats.averagePenalties)}
            />
            <StatCard
              label="Overall Avg Three-putts"
              value={formatAverage(profile.stats.averageThreePutts)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 sm:p-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Round History
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Recent Rounds
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Nine-hole and 18-hole lineup form are calculated separately using eligible rounds only.
            </p>
          </div>
          <Badge>{profile.rounds.length} rounds</Badge>
        </div>
      </div>

      {profile.rounds.length === 0 ? (
        <EmptyState
          message={
            profile.activeSeasonName
              ? `No rounds found for this player in ${profile.activeSeasonName} yet.`
              : "No rounds found for this player yet."
          }
        />
      ) : (
        <div className={tableShellClassName}>
          <div className={cn(tableHeaderClassName, showLineupControls
            ? "xl:grid xl:grid-cols-[1fr_1.35fr_0.6fr_0.65fr_0.75fr_0.9fr_0.75fr_0.75fr_0.75fr_1.2fr_1.25fr_0.85fr]"
            : "xl:grid xl:grid-cols-[1fr_1.4fr_0.7fr_0.7fr_0.8fr_1fr_0.8fr_0.8fr_0.8fr_1.4fr_0.9fr]")}
          >
            <span>Date</span>
            <span>Event</span>
            <span>Holes</span>
            <span>Score</span>
            <span>Putts</span>
            <span>Fairways</span>
            <span>GIR</span>
            <span>Penalties</span>
            <span>3-putts</span>
            <span>Notes</span>
            {showLineupControls ? <span>Lineup Average</span> : null}
            <span>Actions</span>
          </div>

          <div className="divide-y divide-gray-100">
            {profile.rounds.map((round) => (
              <RoundRowView
                key={round.id}
                round={round}
                showLineupControls={showLineupControls}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PlayerProfileHeader({
  playerName,
  activeSeasonName,
  showRosterLink
}: {
  playerName?: string;
  activeSeasonName?: string | null;
  showRosterLink: boolean;
}) {
  return (
    <PageHeader
      eyebrow="Player Profile"
      title={playerName ?? "Player Profile"}
      description={
        playerName
          ? "Scoring history, current lineup form, and recent round detail."
          : "Player details will appear once Supabase data is available."
      }
      meta={
        playerName ? (
          <Badge tone={activeSeasonName ? "green" : "slate"}>
            {activeSeasonName ? `Active: ${activeSeasonName}` : "All seasons"}
          </Badge>
        ) : null
      }
      action={
        showRosterLink ? (
          <Link href="/roster" className={secondaryButtonClassName}>
            Back to Roster
          </Link>
        ) : null
      }
    />
  );
}

function InfoItem({
  label,
  value,
  capitalize = false
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className={capitalize ? "mt-1 capitalize text-slate-950" : "mt-1 text-slate-950"}>
        {value}
      </dd>
    </div>
  );
}

function RoundLengthSummaryCard({
  holes,
  stats
}: {
  holes: 9 | 18;
  stats: RoundLengthStats;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
            Lineup Form
          </p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">
            {holes}-Hole Rounds
          </h3>
        </div>

        <Badge tone={holes === 9 ? "green" : "slate"}>
          {stats.qualifyingRoundsCount} eligible
        </Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniStat
          label="Last 5 Avg"
          value={formatAverage(stats.lastFiveAverage)}
          strong
        />
        <MiniStat
          label="Season Avg"
          value={formatAverage(stats.averageScore)}
        />
        <MiniStat
          label="Rounds"
          value={stats.roundsPlayed.toString()}
        />
        <MiniStat
          label="Best"
          value={formatWholeNumber(stats.bestScore)}
        />
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p
        className={
          strong
            ? "mt-1 text-xl font-bold text-green-800"
            : "mt-1 text-lg font-semibold text-slate-950"
        }
      >
        {value}
      </p>
    </div>
  );
}

function RoundRowView({
  round,
  showLineupControls
}: {
  round: RoundWithEvent;
  showLineupControls: boolean;
}) {
  return (
    <div className={cn(
      tableRowClassName,
      showLineupControls
        ? "xl:grid-cols-[1fr_1.35fr_0.6fr_0.65fr_0.75fr_0.9fr_0.75fr_0.75fr_0.75fr_1.2fr_1.25fr_0.85fr] xl:items-center"
        : "xl:grid-cols-[1fr_1.4fr_0.7fr_0.7fr_0.8fr_1fr_0.8fr_0.8fr_0.8fr_1.4fr_0.9fr] xl:items-center"
    )}>
      <Cell label="Date" value={formatDate(round.played_on)} strong />
      <Cell label="Event" value={round.eventName ?? "No event"} />
      <Cell label="Holes" value={round.holes.toString()} />
      <Cell label="Score" value={round.score.toString()} strong />
      <Cell label="Putts" value={round.putts?.toString() ?? "No data"} />
      <Cell
        label="Fairways"
        value={formatStatPair(round.fairways_hit, round.fairways_possible)}
      />
      <Cell
        label="GIR"
        value={formatStatPair(round.greens_in_regulation, round.gir_possible)}
      />
      <Cell label="Penalties" value={round.penalties?.toString() ?? "No data"} />
      <Cell label="Three-putts" value={round.three_putts?.toString() ?? "No data"} />
      <Cell label="Notes" value={round.notes || "No notes"} />

      {showLineupControls ? (
        <LineupStatusToggle
          roundId={round.id}
          initialValue={round.counts_toward_lineup}
        />
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
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
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
        {label}
      </p>
      <p className={strong ? "font-semibold text-slate-950" : "text-slate-700"}>
        {value}
      </p>
    </div>
  );
}
