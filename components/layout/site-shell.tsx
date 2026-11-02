import type { ReactNode } from "react";
import { getCurrentTeam } from "../../lib/auth/get-current-team";
import { getSupportAdminStatus } from "../../lib/auth/support-admin";
import { getPlatformAdminStatus } from "../../lib/auth/platform-admin";
import { getTeamBrandingFromTeam } from "../../lib/team/branding";
import { SiteShellFrame } from "./site-shell-frame";

export async function SiteShell({ children }: { children: ReactNode }) {
  const [currentTeam, platformAdmin, supportAdmin] = await Promise.all([
    getCurrentTeam(),
    getPlatformAdminStatus(),
    getSupportAdminStatus()
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

  const isPreviewEnvironment = process.env.VERCEL_ENV === "preview";

  const user = currentTeam.data
    ? {
        name: currentTeam.data.profile.full_name,
        email:
          currentTeam.data.profile.email ||
          currentTeam.data.user.email ||
          "",
        role: currentTeam.data.role,
        playerProfileHref,
        isPlatformAdmin: platformAdmin.data !== null,
        isSupportAdmin: supportAdmin.data !== null,
        isPreviewEnvironment
      }
    : platformAdmin.data
      ? {
          name: platformAdmin.data.email,
          email: platformAdmin.data.email,
          role: "platform" as const,
          playerProfileHref: null,
          isPlatformAdmin: true,
          isSupportAdmin: true,
          isPreviewEnvironment
        }
      : supportAdmin.data
        ? { name: supportAdmin.data.email, email: supportAdmin.data.email, role: "platform" as const, playerProfileHref: null, isPlatformAdmin: false, isSupportAdmin: true, isPreviewEnvironment }
        : null;

  return (
    <SiteShellFrame branding={branding} user={user}>
      {children}
    </SiteShellFrame>
  );
}
