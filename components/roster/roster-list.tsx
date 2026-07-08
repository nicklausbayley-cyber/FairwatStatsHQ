import type { RosterData } from "../../lib/players/roster";
import { AddPlayerForm } from "./add-player-form";
import { RosterTable } from "./roster-table";

type RosterListProps = {
  roster: RosterData;
  title?: string;
  eyebrow?: string;
  showAddPlayerForm?: boolean;
};

export function RosterList({
  roster,
  title = "Roster",
  eyebrow = "Players",
  showAddPlayerForm = false
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

      {roster.status === "ready" && showAddPlayerForm ? <AddPlayerForm /> : null}

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
        <RosterTable players={roster.players} />
      ) : null}
    </section>
  );
}
