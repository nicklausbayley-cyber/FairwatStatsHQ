"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { TeamBranding } from "../../lib/team/branding";
import { createClient } from "../../lib/supabase/client";
import type { UserRole } from "../../lib/auth/get-current-team";

type HeaderUser = {
  name: string;
  email: string;
  role: UserRole;
  playerProfileHref: string | null;
};

const staffNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/enter-score", label: "Enter Score" },
  { href: "/roster", label: "Roster" },
  { href: "/events", label: "Events" },
  { href: "/courses", label: "Courses" },
  { href: "/statistics", label: "Statistics" },
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

function getRoleLabel(role: UserRole) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getNavItems(user: HeaderUser | null) {
  if (!user) {
    return [];
  }

  if (user.role === "player") {
    return [
      { href: "/enter-score", label: "Enter Score" },
      ...(user.playerProfileHref
        ? [{ href: user.playerProfileHref, label: "My Profile" }]
        : [])
    ];
  }

  return staffNavItems;
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
  const primaryColor = branding?.primaryColor ?? fallbackPrimaryColor;
  const secondaryColor = branding?.secondaryColor ?? fallbackSecondaryColor;
  const displayName = branding?.name ?? "Fairway Stats HQ";
  const subtitle = branding
    ? [branding.schoolName, branding.mascot].filter(Boolean).join(" | ")
    : "High school golf performance tracking";

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b bg-white" style={{ borderColor: `${primaryColor}22` }}>
      <div
        className="h-1 w-full"
        style={{ backgroundColor: primaryColor }}
        aria-hidden="true"
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md text-base font-bold text-white shadow-sm"
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
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: primaryColor }}
            >
              Fairway Stats HQ
            </p>
            <p
              className="truncate text-xl font-bold tracking-tight"
              style={{ color: secondaryColor }}
            >
              {displayName}
            </p>
            <p className="truncate text-sm text-gray-500">{subtitle}</p>
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {user ? (
            <nav className="flex flex-wrap gap-2" aria-label="Primary navigation">
              {navItems.map((item) => {
                const isActive = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className="rounded-md px-3 py-2 text-sm font-medium transition hover:bg-green-50"
                    style={
                      isActive
                        ? {
                            backgroundColor: primaryColor,
                            color: "#ffffff"
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
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-md bg-gray-50 px-3 py-2 text-sm">
                <p className="font-semibold text-gray-900">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-500">
                  {user.email ? `${user.email} | ` : ""}{getRoleLabel(user.role)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md border px-3 py-2 text-sm font-semibold transition hover:bg-gray-50"
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
