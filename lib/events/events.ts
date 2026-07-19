import { getActiveSeasonForTeam } from "../seasons/active-season";
import type { CurrentTeamContext } from "../auth/get-current-team";

export type EventListRow = {
  id: string;
  name: string;
  event_type: "practice" | "match" | "invitational" | "qualifier" | "tournament";
  event_date: string;
  course_name: string | null;
  location: string | null;
};

export type EventsData =
  | {
      status: "ready";
      teamName: string;
      activeSeasonName: string | null;
      events: EventListRow[];
    }
  | {
      status: "empty";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

export async function getTeamEvents(
  currentTeam: CurrentTeamContext
): Promise<EventsData> {
  try {
    const { supabase, team } = currentTeam;

    const activeSeason = await getActiveSeasonForTeam(supabase, team.id);
    const eventsQuery = supabase
      .from("events")
      .select("id, name, event_type, event_date, course_name, location")
      .eq("team_id", team.id);

    const { data: events, error: eventsError } = await (activeSeason
      ? eventsQuery.eq("season_id", activeSeason.id)
      : eventsQuery
    )
      .order("event_date", { ascending: true })
      .order("name", { ascending: true });

    if (eventsError) {
      return {
        status: "error",
        message: eventsError.message
      };
    }

    return {
      status: "ready",
      teamName: team.name,
      activeSeasonName: activeSeason?.name ?? null,
      events: events ?? []
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to load event data."
    };
  }
}
