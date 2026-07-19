import { getActiveSeasonForTeam } from "../../lib/seasons/active-season";
import {
  requireCurrentTeam,
  type CurrentTeamContext
} from "../../lib/auth/get-current-team";
import { Badge, EmptyState, PageHeader } from "../../components/ui/primitives";
import { ScoreForm } from "./score-form";

export const dynamic = "force-dynamic";

type PlayerOption = {
  id: string;
  firstName: string;
  lastName: string;
};

type EventOption = {
  id: string;
  name: string;
  eventDate: string;
  eventType: string;
};

type CourseOption = {
  id: string;
  name: string;
  location: string | null;
};

type EnterScoreState =
  | {
      status: "ready";
      teamId: string;
      teamName: string;
      activeSeasonName: string | null;
      players: PlayerOption[];
      events: EventOption[];
      courses: CourseOption[];
      isPlayerEntryLocked: boolean;
    }
  | {
      status: "empty";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

async function getEnterScoreData(
  currentTeam: CurrentTeamContext
): Promise<EnterScoreState> {
  try {
    const { supabase, team, profile, role } = currentTeam;

    const activeSeason = await getActiveSeasonForTeam(supabase, team.id);
    const eventsQuery = supabase
      .from("events")
      .select("id, name, event_date, event_type")
      .eq("team_id", team.id);

    const eventsRequest = (activeSeason
      ? eventsQuery.eq("season_id", activeSeason.id)
      : eventsQuery
    )
      .order("event_date", { ascending: false })
      .order("name", { ascending: true });

    const coursesRequest = supabase
      .from("courses")
      .select("id, name, location")
      .eq("team_id", team.id)
      .order("name", { ascending: true });

    if (role === "player") {
      const { data: player, error: playerError } = await supabase
        .from("players")
        .select("id, first_name, last_name, status")
        .eq("team_id", team.id)
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (playerError) {
        return {
          status: "error",
          message: playerError.message
        };
      }

      if (!player) {
        return {
          status: "empty",
          message:
            "Your player profile is not connected yet. Please contact your coach."
        };
      }

      if (player.status !== "active") {
        return {
          status: "empty",
          message:
            "Your player profile is not active yet. Please contact your coach."
        };
      }

      const [eventsResult, coursesResult] = await Promise.all([
        eventsRequest,
        coursesRequest
      ]);

      if (eventsResult.error) {
        return {
          status: "error",
          message: eventsResult.error.message
        };
      }

      if (coursesResult.error) {
        return {
          status: "error",
          message: coursesResult.error.message
        };
      }

      return {
        status: "ready",
        teamId: team.id,
        teamName: team.name,
        activeSeasonName: activeSeason?.name ?? null,
        isPlayerEntryLocked: true,
        players: [
          {
            id: player.id,
            firstName: player.first_name,
            lastName: player.last_name
          }
        ],
        events: (eventsResult.data ?? []).map((event) => ({
          id: event.id,
          name: event.name,
          eventDate: event.event_date,
          eventType: event.event_type
        })),
        courses: (coursesResult.data ?? []).map((course) => ({
          id: course.id,
          name: course.name,
          location: course.location
        }))
      };
    }

    const [playersResult, eventsResult, coursesResult] = await Promise.all([
      supabase
        .from("players")
        .select("id, first_name, last_name")
        .eq("team_id", team.id)
        .eq("status", "active")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),
      eventsRequest,
      coursesRequest
    ]);

    if (playersResult.error) {
      return {
        status: "error",
        message: playersResult.error.message
      };
    }

    if (eventsResult.error) {
      return {
        status: "error",
        message: eventsResult.error.message
      };
    }

    if (coursesResult.error) {
      return {
        status: "error",
        message: coursesResult.error.message
      };
    }

    return {
      status: "ready",
      teamId: team.id,
      teamName: team.name,
      activeSeasonName: activeSeason?.name ?? null,
      isPlayerEntryLocked: false,
      players: (playersResult.data ?? []).map((player) => ({
        id: player.id,
        firstName: player.first_name,
        lastName: player.last_name
      })),
      events: (eventsResult.data ?? []).map((event) => ({
        id: event.id,
        name: event.name,
        eventDate: event.event_date,
        eventType: event.event_type
      })),
      courses: (coursesResult.data ?? []).map((course) => ({
        id: course.id,
        name: course.name,
        location: course.location
      }))
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to load score entry data."
    };
  }
}

export default async function EnterScorePage() {
  const currentTeam = await requireCurrentTeam();
  const scoreEntry = await getEnterScoreData(currentTeam);

  if (scoreEntry.status === "error") {
    return (
      <section className="space-y-6">
        <EnterScoreHeader />
        <EmptyState title="Score entry unavailable" message={scoreEntry.message} />
      </section>
    );
  }

  if (scoreEntry.status === "empty") {
    return (
      <section className="space-y-6">
        <EnterScoreHeader />
        <EmptyState message={scoreEntry.message} />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <EnterScoreHeader
        teamName={scoreEntry.teamName}
        activeSeasonName={scoreEntry.activeSeasonName}
      />

      {scoreEntry.players.length === 0 ? (
        <EmptyState message="No active players found for this team yet." />
      ) : (
        <ScoreForm
          teamId={scoreEntry.teamId}
          activeSeasonName={scoreEntry.activeSeasonName}
          players={scoreEntry.players}
          events={scoreEntry.events}
          courses={scoreEntry.courses}
          isPlayerEntryLocked={scoreEntry.isPlayerEntryLocked}
        />
      )}
    </section>
  );
}

function EnterScoreHeader({
  teamName,
  activeSeasonName
}: {
  teamName?: string;
  activeSeasonName?: string | null;
}) {
  return (
    <PageHeader
      eyebrow="Round Entry"
      title="Enter Score"
      description={
        teamName
          ? `Submit a new round for ${teamName} with summary stats or hole-by-hole scoring.`
          : "Submit scores and golf stats once Supabase data is available."
      }
      meta={
        teamName ? (
          <Badge tone={activeSeasonName ? "green" : "slate"}>
            {activeSeasonName ? `Active: ${activeSeasonName}` : "All seasons"}
          </Badge>
        ) : null
      }
    />
  );
}
