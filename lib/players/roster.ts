import { createServiceRoleClient } from "../supabase/server";

export type PlayerRosterRow = {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number | null;
  status: string;
};

export type RosterData =
  | {
      status: "ready";
      teamName: string;
      players: PlayerRosterRow[];
    }
  | {
      status: "empty";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

export async function getRosterPlayers(): Promise<RosterData> {
  try {
    const supabase = createServiceRoleClient();

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (teamError) {
      return {
        status: "error",
        message: teamError.message
      };
    }

    if (!team) {
      return {
        status: "empty",
        message: "No team found. Run the demo seed file to add roster data."
      };
    }

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, first_name, last_name, graduation_year, status")
      .eq("team_id", team.id)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (playersError) {
      return {
        status: "error",
        message: playersError.message
      };
    }

    return {
      status: "ready",
      teamName: team.name,
      players: players ?? []
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to load roster data."
    };
  }
}
