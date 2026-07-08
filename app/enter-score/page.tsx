import { createServiceRoleClient } from "../../lib/supabase/server";
import { ScoreForm } from "./score-form";

export const dynamic = "force-dynamic";

type PlayerOption = {
  id: string;
  firstName: string;
  lastName: string;
};

type EventOption = {
  id: string;
  name: string;
  eventDate: string;
  eventType: string;
};

type EnterScoreState =
  | {
      status: "ready";
      teamId: string;
      teamName: string;
      players: PlayerOption[];
      events: EventOption[];
    }
  | {
      status: "empty";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

async function getEnterScoreData(): Promise<EnterScoreState> {
  try {
    const supabase = createServiceRoleClient();

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id, name")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (teamError) {
      return {
        status: "error",
        message: teamError.message
      };
    }

    if (!team) {
      return {
        status: "empty",
        message: "No team found. Run the demo seed file before entering scores."
      };
    }

    const [playersResult, eventsResult] = await Promise.all([
      supabase
        .from("players")
        .select("id, first_name, last_name")
        .eq("team_id", team.id)
        .eq("status", "active")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),
      supabase
        .from("events")
        .select("id, name, event_date, event_type")
        .eq("team_id", team.id)
        .order("event_date", { ascending: false })
        .order("name", { ascending: true })
    ]);

    if (playersResult.error) {
      return {
        status: "error",
        message: playersResult.error.message
      };
    }

    if (eventsResult.error) {
      return {
        status: "error",
        message: eventsResult.error.message
      };
    }

    return {
      status: "ready",
      teamId: team.id,
      teamName: team.name,
      players: (playersResult.data ?? []).map((player) => ({
        id: player.id,
        firstName: player.first_name,
        lastName: player.last_name
      })),
      events: (eventsResult.data ?? []).map((event) => ({
        id: event.id,
        name: event.name,
        eventDate: event.event_date,
        eventType: event.event_type
      }))
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to load score entry data."
    };
  }
}

export default async function EnterScorePage() {
  const scoreEntry = await getEnterScoreData();

  if (scoreEntry.status === "error") {
    return (
      <section className="space-y-6">
        <EnterScoreHeader />
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Score entry unavailable</p>
          <p className="mt-1">{scoreEntry.message}</p>
        </div>
      </section>
    );
  }

  if (scoreEntry.status === "empty") {
    return (
      <section className="space-y-6">
        <EnterScoreHeader />
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          {scoreEntry.message}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <EnterScoreHeader teamName={scoreEntry.teamName} />

      {scoreEntry.players.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          No active players found for this team yet.
        </div>
      ) : (
        <ScoreForm
          teamId={scoreEntry.teamId}
          players={scoreEntry.players}
          events={scoreEntry.events}
        />
      )}
    </section>
  );
}

function EnterScoreHeader({ teamName }: { teamName?: string }) {
  return (
    <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
        Round Entry
      </p>
      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
            Enter Score
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
            {teamName
              ? `Submit a new round for ${teamName}.`
              : "Submit scores and golf stats once Supabase data is available."}
          </p>
        </div>
      </div>
    </div>
  );
}
