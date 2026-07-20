import type { ReactNode } from "react";
import { getCurrentTeam } from "../../lib/auth/get-current-team";
import { getPlatformAdminStatus } from "../../lib/auth/platform-admin";
import { getTeamBrandingFromTeam } from "../../lib/team/branding";
import { SiteShellFrame } from "./site-shell-frame";

export async function SiteShell({ children }: { children: ReactNode }) {
  const [currentTeam, platformAdmin] = await Promise.all([
    getCurrentTeam(),
    getPlatformAdminStatus()
  ]);

  let playerProfileHref: string | null = null;

  if (currentTeam.data?.role === "player") {
    const { data: player } = await currentTeam.data.supabase
      .from("players")
      .select("id")
      .eq("team_id", currentTeam.data.team.id)
      .eq("profile_id", currentTeam.data.profile.id)
      .maybeSingle();

    playerProfileHref = player ? `/players/${player.id}` : null;
  }

  const branding = currentTeam.data
    ? getTeamBrandingFromTeam(currentTeam.data.team)
    : null;

  const user = currentTeam.data
    ? {
        name: currentTeam.data.profile.full_name,
        email:
          currentTeam.data.profile.email ||
          currentTeam.data.user.email ||
          "",
        role: currentTeam.data.role,
        playerProfileHref,
        isPlatformAdmin: platformAdmin.data !== null
      }
    : platformAdmin.data
      ? {
          name: platformAdmin.data.email,
          email: platformAdmin.data.email,
          role: "platform" as const,
          playerProfileHref: null,
          isPlatformAdmin: true
        }
      : null;

  return (
    <SiteShellFrame branding={branding} user={user}>
      {children}
    </SiteShellFrame>
  );
}
