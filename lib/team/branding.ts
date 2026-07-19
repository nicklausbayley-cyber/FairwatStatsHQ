import { getCurrentTeam, type CurrentTeam } from "../auth/get-current-team";

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

export function getTeamBrandingFromTeam(team: CurrentTeam): TeamBranding {
  return {
    name: team.name,
    schoolName: team.school_name,
    mascot: team.mascot,
    primaryColor: team.primary_color || fallbackPrimaryColor,
    secondaryColor: team.secondary_color || fallbackSecondaryColor,
    logoUrl: team.logo_url
  };
}

export async function getTeamBranding(): Promise<TeamBranding | null> {
  try {
    const currentTeam = await getCurrentTeam();

    if (!currentTeam.data) {
      return null;
    }

    return getTeamBrandingFromTeam(currentTeam.data.team);
  } catch {
    return null;
  }
}
