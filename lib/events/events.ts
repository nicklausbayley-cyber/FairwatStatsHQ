import { getActiveSeasonForTeam } from "../seasons/active-season";
import { getConfiguredHoleCount, type EventHoleSelection } from "./hole-selection";
import type { CurrentTeamContext } from "../auth/get-current-team";

export type EventListRow = {
  id: string;
  name: string;
  event_type: "practice" | "match" | "invitational" | "qualifier" | "tournament";
  event_date: string;
  course_name: string | null;
  course_id: string | null;
  hole_selection: EventHoleSelection | null;
  location: string | null;
};

export type EventCourseOption = {
  id: string;
  name: string;
  location: string | null;
  configuredHoles: 9 | 18 | null;
};

export type EventsData =
  | {
      status: "ready";
      teamName: string;
      activeSeasonName: string | null;
      events: EventListRow[];
      courses: EventCourseOption[];
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
      .select("id, name, event_type, event_date, course_name, course_id, hole_selection, location")
      .eq("team_id", team.id);

    const [eventsResult, coursesResult] = await Promise.all([
      (activeSeason ? eventsQuery.eq("season_id", activeSeason.id) : eventsQuery)
        .order("event_date", { ascending: true })
        .order("name", { ascending: true }),
      supabase.from("courses").select("id,name,location")
        .eq("team_id", team.id).order("name")
    ]);
    const { data: events, error: eventsError } = eventsResult;
    if (coursesResult.error) {
      return { status: "error", message: coursesResult.error.message };
    }

    const courseRows = coursesResult.data ?? [];
    const courseIds = courseRows.map(course => course.id);
    const holesResult = courseIds.length
      ? await supabase.from("course_holes").select("course_id,hole_number").in("course_id", courseIds)
      : { data: [] as Array<{ course_id: string; hole_number: number }>, error: null };
    if (holesResult.error) {
      return { status: "error", message: holesResult.error.message };
    }

    const courses: EventCourseOption[] = courseRows.map(course => ({
      ...course,
      configuredHoles: getConfiguredHoleCount(
        (holesResult.data ?? []).filter(hole => hole.course_id === course.id).map(hole => hole.hole_number)
      )
    }));

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
      events: events ?? [],
      courses
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
