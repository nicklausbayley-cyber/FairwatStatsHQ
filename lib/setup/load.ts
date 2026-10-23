import {
  isTeamStaff,
  type CurrentTeamContext
} from "../auth/get-current-team";
import { getActiveSeasonForTeam } from "../seasons/active-season";
import {
  buildCoachSetupProgress,
  type CoachSetupProgress
} from "./coach-progress";

export type CoachSetupState =
  | {
      status: "ready";
      progress: CoachSetupProgress;
      activeSeasonName: string | null;
      activePlayerCount: number;
      activeSeasonEventCount: number;
    }
  | {
      status: "error";
      message: string;
    };

/**
 * All reads use the signed-in team's Supabase client and RLS.
 * An active-season event only counts if the event belongs to that season.
 */
export async function loadCoachSetup(
  currentTeam: CurrentTeamContext
): Promise<CoachSetupState> {
  if (!isTeamStaff(currentTeam.role)) {
    return {
      status: "error",
      message: "Only team coaches and administrators can use the Setup Center."
    };
  }

  try {
    const { supabase, team, user } = currentTeam;
    const [activeSeason, playerResult] = await Promise.all([
      getActiveSeasonForTeam(supabase, team.id),
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id)
        .eq("status", "active")
    ]);

    if (playerResult.error) {
      throw new Error(playerResult.error.message);
    }

    let activeSeasonEventCount = 0;
    if (activeSeason) {
      const eventResult = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("team_id", team.id)
        .eq("season_id", activeSeason.id);

      if (eventResult.error) {
        throw new Error(eventResult.error.message);
      }
      activeSeasonEventCount = eventResult.count ?? 0;
    }

    const activePlayerCount = playerResult.count ?? 0;

    return {
      status: "ready",
      progress: buildCoachSetupProgress({
        isSignedIn: Boolean(user.id),
        schoolName: team.school_name,
        logoUrl: team.logo_url,
        primaryColor: team.primary_color,
        secondaryColor: team.secondary_color,
        activeSeasonName: activeSeason?.name ?? null,
        activePlayerCount,
        activeSeasonEventCount
      }),
      activeSeasonName: activeSeason?.name ?? null,
      activePlayerCount,
      activeSeasonEventCount
    };
  } catch {
    return {
      status: "error",
      message: "Setup progress is temporarily unavailable. Please refresh or try again."
    };
  }
}
