"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { UserRole } from "../../lib/auth/get-current-team";
import type { TeamBranding } from "../../lib/team/branding";
import { SiteHeader } from "./site-header";

type ShellUser = {
  name: string;
  email: string;
  role: UserRole | "platform";
  playerProfileHref: string | null;
  isPlatformAdmin: boolean;
};

const publicAuthPaths = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/account-setup"
];

export function SiteShellFrame({
  children,
  branding,
  user
}: {
  children: ReactNode;
  branding: TeamBranding | null;
  user: ShellUser | null;
}) {
  const pathname = usePathname();

  const isPublicAuthPage = publicAuthPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isPublicAuthPage || !user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen print:min-h-0">
      <SiteHeader branding={branding} user={user} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10 print:max-w-none print:px-0 print:py-0">
        {children}
      </main>
    </div>
  );
}
