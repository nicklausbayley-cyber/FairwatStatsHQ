import Link from "next/link";
import { redirect } from "next/navigation";
import {
  isTeamStaff,
  requireCurrentTeam,
  type CurrentTeamContext
} from "../../../lib/auth/get-current-team";
import { getActiveSeasonForTeam } from "../../../lib/seasons/active-season";

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
};

type EventRow = {
  id: string;
  name: string;
};

type RoundWithEvent = RoundRow & {
  eventName: string | null;
};

type PlayerStats = {
  roundsPlayed: number;
  averageScore: number | null;
  bestScore: number | null;
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

function buildStats(rounds: RoundRow[]): PlayerStats {
  return {
    roundsPlayed: rounds.length,
    averageScore: average(rounds.map((round) => round.score)),
    bestScore: bestScore(rounds.map((round) => round.score)),
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
    averagePenalties: average(rounds.map((round) => round.penalties)),
    averageThreePutts: average(rounds.map((round) => round.three_putts))
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
        "id, event_id, played_on, holes, score, putts, fairways_hit, fairways_possible, greens_in_regulation, gir_possible, penalties, three_putts, notes"
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

  if (profile.status === "restricted") {
    redirect("/enter-score");
  }

  if (profile.status === "error") {
    return (
      <section className="space-y-6">
        <PlayerProfileHeader />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Player profile unavailable</p>
          <p className="mt-1">{profile.message}</p>
        </div>
      </section>
    );
  }

  if (profile.status === "not-found") {
    return (
      <section className="space-y-6">
        <PlayerProfileHeader />
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          <p>{profile.message}</p>
          <Link
            href="/roster"
            className="mt-3 inline-flex rounded-md bg-green-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-900"
          >
            Back to Roster
          </Link>
        </div>
      </section>
    );
  }

  const playerName = `${profile.player.first_name} ${profile.player.last_name}`;

  return (
    <section className="space-y-6">
      <PlayerProfileHeader
        playerName={playerName}
        activeSeasonName={profile.activeSeasonName}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Player Info
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-950">
            {playerName}
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <InfoItem
              label="Graduation Year"
              value={profile.player.graduation_year?.toString() ?? "Not set"}
            />
            <InfoItem label="Status" value={profile.player.status} capitalize />
          </dl>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Rounds Played" value={profile.stats.roundsPlayed.toString()} />
          <StatCard label="Average Score" value={formatAverage(profile.stats.averageScore)} />
          <StatCard label="Best Score" value={formatWholeNumber(profile.stats.bestScore)} />
          <StatCard label="Average Putts" value={formatAverage(profile.stats.averagePutts)} />
          <StatCard label="Fairway Percentage" value={formatPercentage(profile.stats.fairwayPercentage)} />
          <StatCard label="GIR Percentage" value={formatPercentage(profile.stats.girPercentage)} />
          <StatCard label="Average Penalties" value={formatAverage(profile.stats.averagePenalties)} />
          <StatCard label="Average Three-putts" value={formatAverage(profile.stats.averageThreePutts)} />
        </div>
      </div>

      <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Round History
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
              Recent Rounds
            </h2>
          </div>
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
            {profile.rounds.length} rounds
          </div>
        </div>
      </div>

      {profile.rounds.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          {profile.activeSeasonName
            ? `No rounds found for this player in ${profile.activeSeasonName} yet.`
            : "No rounds found for this player yet."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-green-900/10 bg-white shadow-sm">
          <div className="hidden grid-cols-[1fr_1.4fr_0.7fr_0.7fr_0.8fr_1fr_0.8fr_0.8fr_0.8fr_1.4fr] gap-4 border-b border-gray-100 bg-green-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-green-900 xl:grid">
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
          </div>

          <div className="divide-y divide-gray-100">
            {profile.rounds.map((round) => (
              <RoundRowView key={round.id} round={round} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function PlayerProfileHeader({
  playerName,
  activeSeasonName
}: {
  playerName?: string;
  activeSeasonName?: string | null;
}) {
  return (
    <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
        Player Profile
      </p>
      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            {playerName ?? "Player Profile"}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
            {playerName
              ? "Scoring history and stat summary loaded from Supabase."
              : "Player details will appear once Supabase data is available."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {playerName ? (
            <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
              {activeSeasonName ? `Active: ${activeSeasonName}` : "All seasons"}
            </div>
          ) : null}
          <Link
            href="/roster"
            className="inline-flex rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800 transition hover:bg-green-100"
          >
            Back to Roster
          </Link>
        </div>
      </div>
    </div>
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
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className={capitalize ? "mt-1 capitalize text-gray-950" : "mt-1 text-gray-950"}>
        {value}
      </dd>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-green-900/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-950">{value}</p>
    </div>
  );
}

function RoundRowView({ round }: { round: RoundWithEvent }) {
  return (
    <div className="grid gap-3 px-5 py-4 text-sm xl:grid-cols-[1fr_1.4fr_0.7fr_0.7fr_0.8fr_1fr_0.8fr_0.8fr_0.8fr_1.4fr] xl:items-center">
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
      <p className={strong ? "font-semibold text-gray-950" : "text-gray-700"}>
        {value}
      </p>
    </div>
  );
}
