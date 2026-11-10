import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";
import { resolveStaffTeamId, type StaffTeamAssignment } from "./team-selection";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type UserRole = "admin" | "coach" | "player";
export type StaffRole = "admin" | "coach";
export const selectedTeamCookie = "fshq_selected_team";

export type CurrentProfile = {
  id: string;
  team_id: string;
  role: UserRole;
  full_name: string;
  email: string;
};

export type CurrentTeam = {
  id: string;
  name: string;
  school_name: string | null;
  mascot: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
  contact_email: string | null;
};

export type AssignedTeam = CurrentTeam & { role: StaffRole };

export type CurrentTeamContext = {
  supabase: SupabaseServerClient;
  user: User;
  profile: CurrentProfile;
  team: CurrentTeam;
  role: UserRole;
  availableTeams: AssignedTeam[];
};

export type CurrentTeamResult =
  | {
      data: CurrentTeamContext;
      error: null;
      status: "ready";
    }
  | {
      data: null;
      error: string;
      status: "unauthenticated" | "missing-profile" | "missing-team" | "error";
    };

export function isTeamStaff(role: UserRole) {
  return role === "admin" || role === "coach";
}

export function authStatusCode(status: CurrentTeamResult["status"]) {
  return status === "unauthenticated" ? 401 : 403;
}

function isMissingMembershipTable(code: string | undefined) {
  // During a preview rollout the production database may not yet have the migration.
  // Never fall back after a table exists: a revoked user must not regain access.
  return code === "42P01" || code === "PGRST205";
}

export async function getCurrentTeam(): Promise<CurrentTeamResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        data: null,
        error: userError?.message ?? "Please sign in to continue.",
        status: "unauthenticated"
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, team_id, role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return { data: null, error: profileError.message, status: "error" };
    }

    if (!profile) {
      return {
        data: null,
        error: "No team profile is connected to this account.",
        status: "missing-profile"
      };
    }

    const currentProfile = profile as CurrentProfile;
    let assignments: StaffTeamAssignment[] = [];

    if (isTeamStaff(currentProfile.role)) {
      const { data, error } = await supabase
        .from("staff_team_access")
        .select("team_id, role")
        .eq("user_id", user.id);

      if (error && !isMissingMembershipTable(error.code)) {
        return { data: null, error: error.message, status: "error" };
      }

      assignments = error
        ? [{ team_id: currentProfile.team_id, role: currentProfile.role as StaffRole }]
        : ((data ?? []) as StaffTeamAssignment[]);
    } else {
      // Player access stays attached to exactly one home-team profile.
      assignments = [];
    }

    const requestedTeamId = (await cookies()).get(selectedTeamCookie)?.value;
    const selectedId = isTeamStaff(currentProfile.role)
      ? resolveStaffTeamId(assignments, currentProfile.team_id, requestedTeamId)
      : currentProfile.team_id;

    if (!selectedId) {
      return {
        data: null,
        error: "No authorized team is connected to this account.",
        status: "missing-team"
      };
    }

    const authorizedTeamIds = isTeamStaff(currentProfile.role)
      ? assignments.map(({ team_id }) => team_id)
      : [currentProfile.team_id];

    const { data: teams, error: teamError } = await supabase
      .from("teams")
      .select("id, name, school_name, mascot, primary_color, secondary_color, logo_url, contact_email")
      .in("id", authorizedTeamIds);

    if (teamError) {
      return { data: null, error: teamError.message, status: "error" };
    }

    const availableTeams: AssignedTeam[] = isTeamStaff(currentProfile.role)
      ? (teams ?? []).map((team) => ({
          ...(team as CurrentTeam),
          role: assignments.find((access) => access.team_id === team.id)!.role
        })).sort((a, b) => a.name.localeCompare(b.name))
      : [];

    const selectedTeam = (teams ?? []).find((team) => team.id === selectedId);

    if (!selectedTeam) {
      return {
        data: null,
        error: "Your selected team is not available.",
        status: "missing-team"
      };
    }

    const selectedRole: UserRole = isTeamStaff(currentProfile.role)
      ? assignments.find(({ team_id }) => team_id === selectedId)!.role
      : "player";

    return {
      data: {
        supabase,
        user,
        profile: currentProfile,
        team: selectedTeam as CurrentTeam,
        role: selectedRole,
        availableTeams
      },
      error: null,
      status: "ready"
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : "Could not load the current team.",
      status: "error"
    };
  }
}

export async function requireCurrentTeam() {
  const currentTeam = await getCurrentTeam();

  if (!currentTeam.data) {
    redirect("/login");
  }
  return currentTeam.data;
}

export async function requireTeamStaff() {
  const currentTeam = await requireCurrentTeam();
  if (!isTeamStaff(currentTeam.role)) {
    redirect("/enter-score");
  }
  return currentTeam;
}
