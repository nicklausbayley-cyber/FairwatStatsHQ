import Link from "next/link";
import { ArrowRight, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { roster } from "@/lib/mock-data";

export default function RosterPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Players"
        title="Roster"
        description="Track eligibility, scoring averages, availability, and the stats that separate lineup tiers."
        icon={UsersRound}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {roster.map((player) => (
          <Link
            href={`/players/${player.id}`}
            key={player.id}
            className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-fairway-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-graphite-900">
                  {player.name}
                </p>
                <p className="mt-1 text-sm text-graphite-500">
                  {player.year} · {player.role}
                </p>
              </div>
              <span className="flex size-9 items-center justify-center rounded-lg bg-fairway-50 text-fairway-700">
                <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs uppercase text-graphite-500">Avg</p>
                <p className="mt-1 text-lg font-semibold">
                  {player.scoringAverage.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-graphite-500">FIR</p>
                <p className="mt-1 text-lg font-semibold">{player.fairways}%</p>
              </div>
              <div>
                <p className="text-xs uppercase text-graphite-500">GIR</p>
                <p className="mt-1 text-lg font-semibold">{player.gir}%</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <section className="mt-6 rounded-lg border border-graphite-100 bg-white shadow-sm">
        <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-graphite-100 px-5 py-3 text-xs font-semibold uppercase text-graphite-500">
          <span>Player</span>
          <span>Year</span>
          <span>Rounds</span>
          <span>Average</span>
          <span>GIR</span>
        </div>
        {roster.map((player) => (
          <div
            key={`${player.id}-row`}
            className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-graphite-100 px-5 py-4 text-sm last:border-b-0"
          >
            <Link
              href={`/players/${player.id}`}
              className="font-semibold text-graphite-900 hover:text-fairway-700"
            >
              {player.name}
            </Link>
            <span className="text-graphite-600">{player.year}</span>
            <span className="text-graphite-600">{player.rounds}</span>
            <span className="font-semibold">{player.scoringAverage}</span>
            <span className="text-graphite-600">{player.gir}%</span>
          </div>
        ))}
      </section>
    </div>
  );
}
