import { createServiceRoleClient } from "../supabase/server";

export type TeamBranding = {
  name: string;
  schoolName: string | null;
  mascot: string | null;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
};

const fallbackPrimaryColor = "#166534";
const fallbackSecondaryColor = "#111827";

export async function getTeamBranding(): Promise<TeamBranding | null> {
  try {
    const supabase = createServiceRoleClient();

    const { data: team, error } = await supabase
      .from("teams")
      .select("name, school_name, mascot, primary_color, secondary_color, logo_url")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !team) {
      return null;
    }

    return {
      name: team.name,
      schoolName: team.school_name,
      mascot: team.mascot,
      primaryColor: team.primary_color || fallbackPrimaryColor,
      secondaryColor: team.secondary_color || fallbackSecondaryColor,
      logoUrl: team.logo_url
    };
  } catch {
    return null;
  }
}
