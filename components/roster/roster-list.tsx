import Link from "next/link";
import type { RosterData } from "../../lib/players/roster";

type RosterListProps = {
  roster: RosterData;
  title?: string;
  eyebrow?: string;
};

export function RosterList({
  roster,
  title = "Roster",
  eyebrow = "Players"
}: RosterListProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          {eyebrow}
        </p>
        <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
              {roster.status === "ready"
                ? `${roster.teamName} players loaded from Supabase.`
                : "Player records will appear here once Supabase data is available."}
            </p>
          </div>
          {roster.status === "ready" ? (
            <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
              {roster.players.length} players
            </div>
          ) : null}
        </div>
      </div>

      {roster.status === "error" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Roster unavailable</p>
          <p className="mt-1">{roster.message}</p>
        </div>
      ) : null}

      {roster.status === "empty" ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          {roster.message}
        </div>
      ) : null}

      {roster.status === "ready" && roster.players.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          No players found for this team yet.
        </div>
      ) : null}

      {roster.status === "ready" && roster.players.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-green-900/10 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.4fr_1.4fr_1fr_1fr] gap-4 border-b border-gray-100 bg-green-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-green-900 sm:grid">
            <span>First Name</span>
            <span>Last Name</span>
            <span>Graduation</span>
            <span>Status</span>
          </div>

          <div className="divide-y divide-gray-100">
            {roster.players.map((player) => (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="grid gap-3 px-5 py-4 text-sm transition hover:bg-green-50/60 sm:grid-cols-[1.4fr_1.4fr_1fr_1fr] sm:items-center"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 sm:hidden">
                    First Name
                  </p>
                  <p className="font-medium text-green-800">
                    {player.first_name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 sm:hidden">
                    Last Name
                  </p>
                  <p className="text-gray-700">{player.last_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 sm:hidden">
                    Graduation
                  </p>
                  <p className="text-gray-700">
                    {player.graduation_year ?? "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 sm:hidden">
                    Status
                  </p>
                  <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold capitalize text-green-800">
                    {player.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
