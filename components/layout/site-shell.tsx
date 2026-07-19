import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { getCurrentTeam } from "../../lib/auth/get-current-team";
import { getTeamBrandingFromTeam } from "../../lib/team/branding";

export async function SiteShell({ children }: { children: ReactNode }) {
  const currentTeam = await getCurrentTeam();
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
        email: currentTeam.data.profile.email || currentTeam.data.user.email || "",
        role: currentTeam.data.role,
        playerProfileHref
      }
    : null;

  return (
    <div className="min-h-screen bg-[#f4f8f3]">
      <SiteHeader branding={branding} user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
