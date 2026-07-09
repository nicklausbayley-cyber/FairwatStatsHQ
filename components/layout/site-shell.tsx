import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { getTeamBranding } from "../../lib/team/branding";

export async function SiteShell({ children }: { children: ReactNode }) {
  const branding = await getTeamBranding();

  return (
    <div className="min-h-screen bg-[#f4f8f3]">
      <SiteHeader branding={branding} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
