import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type {
  CurrentUserContext,
  TeamProfile,
  TeamSummary,
  UserRole
} from "@/lib/types/database";

type ProfileQueryResult = TeamProfile & {
  teams: TeamSummary | TeamSummary[] | null;
};

function normalizeTeam(team: TeamSummary | TeamSummary[] | null) {
  if (Array.isArray(team)) {
    return team[0] ?? null;
  }

  return team;
}

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (claimsError || typeof claims?.sub !== "string") {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, team_id, role, full_name, email, avatar_url, teams(id, name, school_name, mascot, primary_color)"
    )
    .eq("id", claims.sub)
    .single<ProfileQueryResult>();

  if (error || !data) {
    return null;
  }

  const team = normalizeTeam(data.teams);

  if (!team) {
    return null;
  }

  const profile: TeamProfile = {
    id: data.id,
    team_id: data.team_id,
    role: data.role as UserRole,
    full_name: data.full_name,
    email: data.email,
    avatar_url: data.avatar_url
  };

  return {
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : data.email,
    profile,
    team
  };
}
