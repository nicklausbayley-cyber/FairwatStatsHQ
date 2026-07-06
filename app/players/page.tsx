import Link from "next/link";
import { PlaceholderPage } from "../../components/layout/placeholder-page";

const samplePlayers = [
  { id: "avery-ellis", name: "Avery Ellis" },
  { id: "mason-cole", name: "Mason Cole" },
  { id: "nora-brooks", name: "Nora Brooks" }
];

export default function PlayersPage() {
  return (
    <div className="space-y-6">
      <PlaceholderPage
        eyebrow="Player Profiles"
        title="Players"
        description="This page will become the player directory with links to individual performance profiles."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        {samplePlayers.map((player) => (
          <Link
            key={player.id}
            href={`/players/${player.id}`}
            className="rounded-lg border border-green-900/10 bg-white p-4 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-green-700 hover:text-green-800"
          >
            {player.name}
          </Link>
        ))}
      </section>
    </div>
  );
}
