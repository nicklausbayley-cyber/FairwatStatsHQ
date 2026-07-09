"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { TeamBranding } from "../../lib/team/branding";

const navItems = [
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

export function SiteHeader({ branding }: { branding: TeamBranding | null }) {
  const pathname = usePathname();
  const primaryColor = branding?.primaryColor ?? fallbackPrimaryColor;
  const secondaryColor = branding?.secondaryColor ?? fallbackSecondaryColor;
  const displayName = branding?.name ?? "Fairway Stats HQ";
  const subtitle = branding
    ? [branding.schoolName, branding.mascot].filter(Boolean).join(" | ")
    : "High school golf performance tracking";

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
              <img
                src={branding.logoUrl}
                alt={`${displayName} logo`}
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
      </div>
    </header>
  );
}
