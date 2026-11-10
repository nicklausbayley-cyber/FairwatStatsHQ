"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { TeamBranding } from "../../lib/team/branding";
import { createClient } from "../../lib/supabase/client";
import type { UserRole } from "../../lib/auth/get-current-team";

type HeaderUser = {
  name: string;
  email: string;
  role: UserRole | "platform";
  selectedTeamId?: string | null;
  teamChoices?: Array<{ id: string; name: string; role: "admin" | "coach" }>;
  playerProfileHref: string | null;
  isPlatformAdmin: boolean;
  isSupportAdmin: boolean;
  isPreviewEnvironment: boolean;
};

const staffNavItems = [
  { href: "/setup", label: "Setup" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/enter-score", label: "Enter Score" },
  { href: "/roster", label: "Roster" },
  { href: "/events", label: "Events" },
  { href: "/courses", label: "Courses" },
  { href: "/statistics", label: "Statistics" },
  { href: "/coach-insights", label: "Coach Insights" },
  { href: "/settings", label: "Settings" }
];

const fallbackPrimaryColor = "#166534";
const fallbackSecondaryColor = "#111827";

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "FS"
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getRoleLabel(user: HeaderUser) {
  if (user.role === "platform") {
    return user.isPlatformAdmin ? "Platform Admin" : "Support Admin";
  }

  return user.role.charAt(0).toUpperCase() + user.role.slice(1);
}

function getNavItems(user: HeaderUser | null) {
  if (!user) {
    return [];
  }

  const supportNavItem = user.isSupportAdmin ? [{ href: "/support", label: "Support" }] : [];
  // Onboarding uses privileged credentials configured for production only.
  // A preview support user must open the existing live onboarding workflow,
  // rather than expose those production credentials to preview deployments.
  const platformNavItem = user.isPlatformAdmin
    ? [{ href: "/onboarding", label: "Onboarding" }]
    : user.isSupportAdmin && user.isPreviewEnvironment
      ? [{ href: "https://app.fairwaystatshq.com/onboarding", label: "Onboarding (Live)" }]
      : [];

  if (user.role === "platform") {
    return [...supportNavItem, ...platformNavItem];
  }

  if (user.role === "player") {
    return [
      { href: "/enter-score", label: "Enter Score" },
      ...(user.playerProfileHref
        ? [{ href: user.playerProfileHref, label: "My Profile" }]
        : []),
      ...supportNavItem,
      ...platformNavItem
    ];
  }

  return [...staffNavItems, ...supportNavItem, ...platformNavItem];
}

export function SiteHeader({
  branding,
  user
}: {
  branding: TeamBranding | null;
  user: HeaderUser | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = getNavItems(user);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const primaryColor = branding?.primaryColor ?? fallbackPrimaryColor;
  const secondaryColor = branding?.secondaryColor ?? fallbackSecondaryColor;
  const displayName = branding?.name ?? "Fairway Stats HQ";
  const subtitle = branding
    ? [branding.schoolName, branding.mascot].filter(Boolean).join(" | ")
    : "High school golf performance tracking";

  async function handleTeamSwitch(teamId: string) {
    if (!user || teamId === user.selectedTeamId || isSwitching) return;
    setIsSwitching(true);
    setSwitchError(null);
    try {
      const response = await fetch("/api/team-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ teamId })
      });
      const result = (await response.json()) as { success?: boolean; message?: string };
      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Could not change teams.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setSwitchError(error instanceof Error ? error.message : "Could not change teams.");
    } finally {
      setIsSwitching(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header
      className="sticky top-0 z-30 border-b bg-white/95 shadow-sm shadow-slate-900/5 backdrop-blur print:hidden"
      style={{ borderColor: `${primaryColor}22` }}
    >
      <div
        className="h-1 w-full"
        style={{ backgroundColor: primaryColor }}
        aria-hidden="true"
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg text-base font-bold text-white shadow-sm ring-1 ring-slate-900/10"
            style={{ backgroundColor: secondaryColor }}
          >
            {branding?.logoUrl ? (
              <Image
                src={branding.logoUrl}
                alt={`${displayName} logo`}
                width={56}
                height={56}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(displayName)
            )}
          </div>
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: primaryColor }}
            >
              Fairway Stats HQ
            </p>
            <p
              className="truncate text-lg font-bold tracking-tight sm:text-xl"
              style={{ color: secondaryColor }}
            >
              {displayName}
            </p>
            <p className="truncate text-sm text-gray-500">{subtitle}</p>
          </div>
        </Link>

        <div className="flex min-w-0 flex-col gap-3 lg:items-end">
          {user ? (
            <nav
              className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/80 p-1"
              aria-label="Primary navigation"
            >
              {navItems.map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className="shrink-0 rounded-md px-3 py-2 text-sm font-semibold transition hover:bg-white"
                    style={
                      isActive
                        ? {
                            backgroundColor: "#ffffff",
                            color: primaryColor,
                            boxShadow: `inset 0 0 0 1px ${primaryColor}33`
                          }
                        : {
                            color: secondaryColor
                          }
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <Link
              href="/login"
              className="rounded-md px-3 py-2 text-sm font-semibold transition hover:bg-green-50"
              style={{ color: secondaryColor }}
            >
              Login
            </Link>
          )}
          {user ? (
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {user.role !== "player" && (user.teamChoices?.length ?? 0) > 1 ? (
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                  <span className="font-semibold text-slate-700">Team</span>
                  <select
                    aria-label="Active golf team"
                    className="max-w-44 rounded border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-green-600"
                    value={user.selectedTeamId ?? ""}
                    disabled={isSwitching}
                    onChange={(event) => void handleTeamSwitch(event.target.value)}
                  >
                    {user.teamChoices?.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {switchError ? (
                <span role="alert" className="text-xs font-medium text-red-700">
                  {switchError}
                </span>
              ) : null}
              <div className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                <p className="truncate font-semibold text-slate-950">
                  {user.name || user.email}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {user.email}
                </p>
              </div>
              <span
                className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                style={{
                  borderColor: `${primaryColor}33`,
                  backgroundColor: `${primaryColor}12`,
                  color: primaryColor
                }}
              >
                {getRoleLabel(user)}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md border bg-white px-3 py-2 text-sm font-semibold shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-green-100"
                style={{ borderColor: `${secondaryColor}22`, color: secondaryColor }}
              >
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
