import { RosterList } from "../../components/roster/roster-list";
import { requireCurrentTeam } from "../../lib/auth/get-current-team";
import { getRosterPlayers } from "../../lib/players/roster";

export const dynamic = "force-dynamic";

export default async function PlayersPage() {
  const currentTeam = await requireCurrentTeam();
  const roster = await getRosterPlayers(currentTeam);

  return (
    <RosterList
      roster={roster}
      eyebrow="Player Directory"
      title="Players"
    />
  );
}
