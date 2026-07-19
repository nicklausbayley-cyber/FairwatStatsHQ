import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type UserRole = "admin" | "coach" | "player";

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

export type CurrentTeamContext = {
  supabase: SupabaseServerClient;
  user: User;
  profile: CurrentProfile;
  team: CurrentTeam;
  role: UserRole;
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

export async function getCurrentTeam(): Promise<CurrentTeamResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      return {
        data: null,
        error: userError.message,
        status: "unauthenticated"
      };
    }

    if (!user) {
      return {
        data: null,
        error: "Please sign in to continue.",
        status: "unauthenticated"
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, team_id, role, full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return {
        data: null,
        error: profileError.message,
        status: "error"
      };
    }

    if (!profile) {
      return {
        data: null,
        error: "No team profile is connected to this account.",
        status: "missing-profile"
      };
    }

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select(
        "id, name, school_name, mascot, primary_color, secondary_color, logo_url, contact_email"
      )
      .eq("id", profile.team_id)
      .maybeSingle();

    if (teamError) {
      return {
        data: null,
        error: teamError.message,
        status: "error"
      };
    }

    if (!team) {
      return {
        data: null,
        error: "No team is connected to this account.",
        status: "missing-team"
      };
    }

    return {
      data: {
        supabase,
        user,
        profile: profile as CurrentProfile,
        team: team as CurrentTeam,
        role: profile.role as UserRole
      },
      error: null,
      status: "ready"
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Could not load the current team.",
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
