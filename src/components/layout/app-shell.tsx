import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  ClipboardPenLine,
  Gauge,
  LogOut,
  Settings,
  UsersRound
} from "lucide-react";
import { signOut } from "@/app/actions";
import type { CurrentUserContext } from "@/lib/types/database";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/enter-score", label: "Enter Score", icon: ClipboardPenLine },
  { href: "/roster", label: "Roster", icon: UsersRound },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/statistics", label: "Statistics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({
  children,
  context
}: {
  children: React.ReactNode;
  context: CurrentUserContext;
}) {
  return (
    <div className="min-h-screen bg-graphite-50/70 text-graphite-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-graphite-200 bg-white lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-graphite-100 px-6 py-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-lg bg-fairway-700 text-white">
                <Gauge className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-base font-semibold">
                  Fairway Stats HQ
                </span>
                <span className="block text-sm text-graphite-500">
                  {context.team.name}
                </span>
              </span>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-graphite-600 transition hover:bg-fairway-50 hover:text-fairway-800"
              >
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-graphite-100 p-4">
            <div className="rounded-lg bg-graphite-50 p-4">
              <p className="text-sm font-semibold text-graphite-900">
                {context.profile.full_name}
              </p>
              <p className="mt-1 text-xs uppercase text-fairway-700">
                {context.profile.role}
              </p>
              <form action={signOut} className="mt-4">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-graphite-200 bg-white px-3 py-2 text-sm font-semibold text-graphite-700 transition hover:border-fairway-300 hover:text-fairway-800"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-graphite-200 bg-white/90 px-4 py-3 backdrop-blur md:px-8 lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-fairway-700 text-white">
                <Gauge className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  Fairway Stats HQ
                </span>
                <span className="block text-xs text-graphite-500">
                  {context.team.name}
                </span>
              </span>
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="flex size-10 items-center justify-center rounded-lg border border-graphite-200 bg-white text-graphite-600"
                aria-label="Sign out"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 md:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-graphite-200 bg-white px-2 py-2 shadow-lg lg:hidden">
          {navigation.slice(0, 5).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-medium text-graphite-600"
            >
              <item.icon className="size-5" aria-hidden="true" />
              <span>{item.label.replace("Enter ", "")}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
