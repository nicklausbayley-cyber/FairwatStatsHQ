import type { RosterData } from "../../lib/players/roster";
import { AddPlayerForm } from "./add-player-form";
import { RosterTable } from "./roster-table";
import { Badge, EmptyState, PageHeader } from "../ui/primitives";

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
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={
          roster.status === "ready"
            ? `${roster.teamName} roster, player profiles, graduation years, and active status.`
            : "Player records will appear here once Supabase data is available."
        }
        meta={
          roster.status === "ready" ? (
            <Badge>{roster.players.length} players</Badge>
          ) : null
        }
      />

      {roster.status === "ready" && showAddPlayerForm ? <AddPlayerForm /> : null}

      {roster.status === "error" ? (
        <EmptyState title="Roster unavailable" message={roster.message} />
      ) : null}

      {roster.status === "empty" ? (
        <EmptyState message={roster.message} />
      ) : null}

      {roster.status === "ready" && roster.players.length === 0 ? (
        <EmptyState message="No players found for this team yet." />
      ) : null}

      {roster.status === "ready" && roster.players.length > 0 ? (
        <RosterTable players={roster.players} />
      ) : null}
    </section>
  );
}
