import { RosterList } from "../../components/roster/roster-list";
import { getRosterPlayers } from "../../lib/players/roster";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const roster = await getRosterPlayers();

  return (
    <RosterList
      roster={roster}
      eyebrow="Player Directory"
      title="Players"
    />
  );
}
