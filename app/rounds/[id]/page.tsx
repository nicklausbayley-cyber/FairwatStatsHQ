import Link from "next/link";
import { redirect } from "next/navigation";
import {
  isTeamStaff,
  requireCurrentTeam
} from "../../../lib/auth/get-current-team";
import {
  Badge,
  EmptyState,
  PageHeader,
  StatCard,
  appPanelClassName,
  secondaryButtonClassName
} from "../../../components/ui/primitives";
import { RoundScorecard } from "../../../components/rounds/round-scorecard";
import { RoundManagement } from "../../../components/rounds/round-management";
import type {
  RoundDetailsData,
  RoundEventOption,
  RoundHoleDetails
} from "../../../components/rounds/round-types";

export const dynamic = "force-dynamic";

type RoundPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type RoundRow = {
  id: string;
  team_id: string;
  player_id: string;
  event_id: string | null;
  submitted_by: string | null;
  played_on: string;
  holes: number;
  score: number;
  par: number | null;
  putts: number | null;
  fairways_hit: number | null;
  fairways_possible: number | null;
  greens_in_regulation: number | null;
  gir_possible: number | null;
  penalties: number | null;
  three_putts: number | null;
  notes: string | null;
  created_at: string;
};

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  );
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatPair(
  value: number | null,
  possible: number | null
) {
  if (value === null || possible === null) {
    return "No data";
  }

  return `${value} / ${possible}`;
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

export default async function RoundDetailsPage({
  params
}: RoundPageProps) {
  const { id: roundId } = await params;
  const currentTeam = await requireCurrentTeam();
  const { supabase, team, profile, role } = currentTeam;

  const { data: roundData, error: roundError } =
    await supabase
      .from("rounds")
      .select(
        "id, team_id, player_id, event_id, submitted_by, played_on, holes, score, par, putts, fairways_hit, fairways_possible, greens_in_regulation, gir_possible, penalties, three_putts, notes, created_at"
      )
      .eq("id", roundId)
      .eq("team_id", team.id)
      .maybeSingle();

  if (roundError) {
    return (
      <section className="space-y-6">
        <PageHeader
          eyebrow="Round Details"
          title="Round unavailable"
          description="The selected round could not be loaded."
        />
        <EmptyState
          title="Unable to load round"
          message={roundError.message}
        />
      </section>
    );
  }

  if (!roundData) {
    return (
      <section className="space-y-6">
        <PageHeader
          eyebrow="Round Details"
          title="Round not found"
          description="This round does not exist or does not belong to the current team."
        />
        <EmptyState
          message="Return to the dashboard or player profile and choose another round."
          action={
            <Link
              href="/dashboard"
              className={secondaryButtonClassName}
            >
              Back to Dashboard
            </Link>
          }
        />
      </section>
    );
  }

  const round = roundData as RoundRow;

  const { data: player } = await supabase
    .from("players")
    .select(
      "id, profile_id, first_name, last_name"
    )
    .eq("id", round.player_id)
    .eq("team_id", team.id)
    .maybeSingle();

  if (!player) {
    return (
      <section className="space-y-6">
        <PageHeader
          eyebrow="Round Details"
          title="Player unavailable"
          description="The player connected to this round could not be found."
        />
        <EmptyState message="The round is missing its player record." />
      </section>
    );
  }

  if (
    !isTeamStaff(role) &&
    player.profile_id !== profile.id
  ) {
    redirect("/enter-score");
  }

  const [
    eventResult,
    submittedByResult,
    roundHolesResult,
    eventsResult
  ] = await Promise.all([
    round.event_id
      ? supabase
          .from("events")
          .select("id, name")
          .eq("id", round.event_id)
          .eq("team_id", team.id)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null
        }),
    round.submitted_by
      ? supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", round.submitted_by)
          .eq("team_id", team.id)
          .maybeSingle()
      : Promise.resolve({
          data: null,
          error: null
        }),
    supabase
      .from("round_holes")
      .select(
        "id, course_id, hole_number, par, handicap, score, putts, fir, gir, penalty"
      )
      .eq("round_id", round.id)
      .eq("team_id", team.id)
      .order("hole_number", {
        ascending: true
      }),
    supabase
      .from("events")
      .select("id, name, event_date")
      .eq("team_id", team.id)
      .order("event_date", {
        ascending: false
      })
  ]);

  const rawHoles = roundHolesResult.data ?? [];
  const courseId =
    rawHoles.find((hole) => hole.course_id)
      ?.course_id ?? null;

  const { data: course } = courseId
    ? await supabase
        .from("courses")
        .select("id, name")
        .eq("id", courseId)
        .eq("team_id", team.id)
        .maybeSingle()
    : { data: null };

  const holeEntries: RoundHoleDetails[] =
    rawHoles.map((hole) => ({
      id: hole.id,
      holeNumber: hole.hole_number,
      par: hole.par,
      handicap: hole.handicap,
      score: hole.score,
      putts: hole.putts,
      fir: hole.fir,
      gir: hole.gir === true,
      penalty: hole.penalty
    }));

  const eventOptions: RoundEventOption[] =
    (eventsResult.data ?? []).map((event) => ({
      id: event.id,
      name: event.name,
      eventDate: event.event_date
    }));

  const roundDetails: RoundDetailsData = {
    id: round.id,
    playerId: player.id,
    playerName: `${player.first_name} ${player.last_name}`,
    eventId: round.event_id,
    eventName: eventResult.data?.name ?? null,
    courseName: course?.name ?? null,
    submittedByName:
      submittedByResult.data?.full_name ?? null,
    playedOn: round.played_on,
    holes: round.holes,
    score: round.score,
    par: round.par,
    putts: round.putts,
    fairwaysHit: round.fairways_hit,
    fairwaysPossible: round.fairways_possible,
    greensInRegulation:
      round.greens_in_regulation,
    girPossible: round.gir_possible,
    penalties: round.penalties,
    threePutts: round.three_putts,
    notes: round.notes,
    createdAt: round.created_at,
    holeEntries
  };

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Round Details"
        title={roundDetails.playerName}
        description={`${formatDate(
          roundDetails.playedOn
        )} scorecard and performance details.`}
        meta={
          <Badge tone="green">
            {roundDetails.holes} holes
          </Badge>
        }
        action={
          <Link
            href={`/players/${roundDetails.playerId}`}
            className={secondaryButtonClassName}
          >
            Back to Player
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Score"
          value={roundDetails.score.toString()}
        />
        <StatCard
          label="Score to Par"
          value={formatToPar(
            roundDetails.score,
            roundDetails.par
          )}
        />
        <StatCard
          label="Putts"
          value={
            roundDetails.putts?.toString() ??
            "No data"
          }
        />
        <StatCard
          label="Fairways"
          value={formatPair(
            roundDetails.fairwaysHit,
            roundDetails.fairwaysPossible
          )}
        />
        <StatCard
          label="GIR"
          value={formatPair(
            roundDetails.greensInRegulation,
            roundDetails.girPossible
          )}
        />
        <StatCard
          label="Penalties"
          value={
            roundDetails.penalties?.toString() ??
            "No data"
          }
        />
        <StatCard
          label="Three-putts"
          value={
            roundDetails.threePutts?.toString() ??
            "No data"
          }
        />
        <StatCard
          label="Par"
          value={
            roundDetails.par?.toString() ??
            "No data"
          }
        />
      </div>

      <div className={`${appPanelClassName} p-6 sm:p-8`}>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Round Information
        </p>

        <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem
            label="Event"
            value={
              roundDetails.eventName ?? "No event"
            }
          />
          <InfoItem
            label="Course"
            value={
              roundDetails.courseName ??
              "No course saved"
            }
          />
          <InfoItem
            label="Submitted By"
            value={
              roundDetails.submittedByName ??
              "Unknown"
            }
          />
          <InfoItem
            label="Submitted"
            value={formatDateTime(
              roundDetails.createdAt
            )}
          />
        </dl>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {roundDetails.notes || "No notes saved."}
          </p>
        </div>
      </div>

      {roundDetails.holeEntries.length > 0 ? (
        <RoundScorecard
          holes={roundDetails.holeEntries}
        />
      ) : (
        <EmptyState
          title="Summary-only round"
          message="This round was saved without hole-by-hole data, so a complete scorecard is not available."
        />
      )}

      {isTeamStaff(role) ? (
        <RoundManagement
          round={roundDetails}
          events={eventOptions}
        />
      ) : null}
    </section>
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
