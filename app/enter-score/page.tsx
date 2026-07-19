import { getActiveSeasonForTeam } from "../../lib/seasons/active-season";
import {
  requireCurrentTeam,
  type CurrentTeamContext
} from "../../lib/auth/get-current-team";
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
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Score entry unavailable</p>
          <p className="mt-1">{scoreEntry.message}</p>
        </div>
      </section>
    );
  }

  if (scoreEntry.status === "empty") {
    return (
      <section className="space-y-6">
        <EnterScoreHeader />
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          {scoreEntry.message}
        </div>
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
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          No active players found for this team yet.
        </div>
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
    <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
        Round Entry
      </p>
      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            Enter Score
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
            {teamName
              ? `Submit a new round for ${teamName}.`
              : "Submit scores and golf stats once Supabase data is available."}
          </p>
        </div>
        {teamName ? (
          <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
            {activeSeasonName ? `Active: ${activeSeasonName}` : "All seasons"}
          </div>
        ) : null}
      </div>
    </div>
  );
}
