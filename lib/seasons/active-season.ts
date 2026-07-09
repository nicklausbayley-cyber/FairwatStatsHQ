import type { createServiceRoleClient } from "../supabase/server";

type SupabaseServiceClient = ReturnType<typeof createServiceRoleClient>;

export type ActiveSeason = {
  id: string;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
};

export async function getActiveSeasonForTeam(
  supabase: SupabaseServiceClient,
  teamId: string
): Promise<ActiveSeason | null> {
  const { data: activeSeason, error } = await supabase
    .from("seasons")
    .select("id, name, starts_on, ends_on")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load active season: ${error.message}`);
  }

  return activeSeason as ActiveSeason | null;
}
