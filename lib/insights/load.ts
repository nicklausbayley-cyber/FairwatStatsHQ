import { isTeamStaff, type CurrentTeamContext } from "../auth/get-current-team";
import { getActiveSeasonForTeam, type ActiveSeason } from "../seasons/active-season";
import { buildCoachInsights } from "./engine";
import type {
  CoachInsightsReport, InsightEvent, InsightHoleRow, InsightPlayer, InsightRoundRow, RoundFormat
} from "./types";

const PAGE_SIZE = 500;

type QueryResult<T> = { data: T[] | null; error: { message: string } | null };

/** Page all rows; a season's hole stats can easily exceed Supabase's row limit. */
export async function readAllPages<T>(fetchPage: (start: number, end: number) => PromiseLike<QueryResult<T>>) {
  const rows: T[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await fetchPage(start, start + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export type CoachInsightsState =
  | { status: "ready"; season: ActiveSeason; report: CoachInsightsReport }
  | { status: "no-season"; message: string }
  | { status: "error"; message: string };

/** Staff authorization, team boundaries, and active season are enforced here too,
 * so a future API/report consumer cannot accidentally bypass the page guard.
 */
export async function loadCoachInsights(currentTeam: CurrentTeamContext, holes: RoundFormat): Promise<CoachInsightsState> {
  if (!isTeamStaff(currentTeam.role)) {
    return { status: "error", message: "Coach Insights is available to coaches and team admins." };
  }
  try {
    const { supabase, team } = currentTeam;
    const season = await getActiveSeasonForTeam(supabase, team.id);
    if (!season) return { status: "no-season", message: "Set an active season in Settings to start building Coach Insights." };

    const [rounds, players, events] = await Promise.all([
      readAllPages<InsightRoundRow>((start, end) => supabase.from("rounds")
        .select("id, team_id, season_id, player_id, event_id, played_on, created_at, holes, score, putts, fairways_hit, fairways_possible, greens_in_regulation, gir_possible, penalties, three_putts")
        .eq("team_id", team.id).eq("season_id", season.id).order("id").range(start, end)),
      readAllPages<InsightPlayer>((start, end) => supabase.from("players")
        .select("id, first_name, last_name").eq("team_id", team.id).order("id").range(start, end)),
      readAllPages<InsightEvent>((start, end) => supabase.from("events")
        .select("id, event_type").eq("team_id", team.id).eq("season_id", season.id).order("id").range(start, end))
    ]);

    const holeRows: InsightHoleRow[] = [];
    const ids = rounds.filter((round) => round.holes === holes).map((round) => round.id);
    for (let start = 0; start < ids.length; start += 100) {
      const batch = ids.slice(start, start + 100);
      holeRows.push(...await readAllPages<InsightHoleRow>((from, to) => supabase.from("round_holes")
        .select("round_id, hole_number, par, score, putts, fir, gir, penalty")
        .eq("team_id", team.id).in("round_id", batch).order("id").range(from, to)));
    }

    // Retain both formats for counting-score eligibility checks, while analyzing
    // hole completeness for the chosen format only.
    return { status: "ready", season, report: buildCoachInsights({ rounds, players, events, holeRows, holes }) };
  } catch {
    return { status: "error", message: "Could not load Coach Insights. Please try again." };
  }
}
