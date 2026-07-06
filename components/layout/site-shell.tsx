import Link from "next/link";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/enter-score", label: "Enter Score" },
  { href: "/roster", label: "Roster" },
  { href: "/events", label: "Events" },
  { href: "/statistics", label: "Statistics" },
  { href: "/settings", label: "Settings" }
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f4f8f3]">
      <header className="border-b border-green-900/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="group">
            <p className="text-xl font-bold tracking-tight text-green-900">
              Fairway Stats HQ
            </p>
            <p className="text-sm text-gray-500">
              High school golf performance tracking
            </p>
          </Link>

          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-green-50 hover:text-green-800"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
