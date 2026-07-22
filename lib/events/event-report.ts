import type { CurrentTeamContext } from "../auth/get-current-team";

export type EventReportRound = {
  id: string;
  playerId: string;
  playerName: string;
  playedOn: string;
  holes: number;
  score: number;
  par: number | null;
  putts: number | null;
  fairwaysHit: number | null;
  fairwaysPossible: number | null;
  greensInRegulation: number | null;
  girPossible: number | null;
  penalties: number | null;
  threePutts: number | null;
  notes: string | null;
  counting: boolean;
};

export type EventReportData =
  | {
      status: "ready";
      teamName: string;
      schoolName: string | null;
      event: {
        id: string;
        name: string;
        eventType:
          | "practice"
          | "match"
          | "invitational"
          | "qualifier"
          | "tournament";
        eventDate: string;
        courseName: string | null;
        location: string | null;
      };
      rounds: EventReportRound[];
      summary: {
        totalRounds: number;
        uniquePlayers: number;
        countingScores: number;
        teamScore: number | null;
        teamToPar: number | null;
        lowScore: number | null;
        averagePutts: number | null;
        fairwayPercentage: number | null;
        girPercentage: number | null;
      };
    }
  | {
      status: "not-found";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

type RoundRow = {
  id: string;
  player_id: string;
  played_on: string;
  holes: number;
  score: number;
  par: number | null;
  putts: number | null;
  fairways_hit: number | null;
  fairways_possible: number | null;
  greens_in_regulation: number | null;
  gir_possible: number | null;
  penalties: number | null;
  three_putts: number | null;
  notes: string | null;
  created_at: string;
};

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
};

function average(values: Array<number | null>) {
  const validValues = values.filter(
    (value): value is number =>
      typeof value === "number" &&
      Number.isFinite(value)
  );

  if (validValues.length === 0) {
    return null;
  }

  return (
    validValues.reduce(
      (total, value) => total + value,
      0
    ) / validValues.length
  );
}

function percentageFromTotals(
  rounds: RoundRow[],
  hitKey:
    | "fairways_hit"
    | "greens_in_regulation",
  possibleKey:
    | "fairways_possible"
    | "gir_possible"
) {
  const totals = rounds.reduce(
    (current, round) => {
      const hit = round[hitKey];
      const possible = round[possibleKey];

      if (
        hit === null ||
        possible === null ||
        possible <= 0
      ) {
        return current;
      }

      return {
        hit: current.hit + hit,
        possible: current.possible + possible
      };
    },
    {
      hit: 0,
      possible: 0
    }
  );

  if (totals.possible === 0) {
    return null;
  }

  return totals.hit / totals.possible;
}

export async function getEventReport(
  eventId: string,
  currentTeam: CurrentTeamContext
): Promise<EventReportData> {
  try {
    const { supabase, team } = currentTeam;

    const { data: event, error: eventError } =
      await supabase
        .from("events")
        .select(
          "id, team_id, name, event_type, event_date, course_name, location"
        )
        .eq("id", eventId)
        .eq("team_id", team.id)
        .maybeSingle();

    if (eventError) {
      return {
        status: "error",
        message: eventError.message
      };
    }

    if (!event) {
      return {
        status: "not-found",
        message:
          "This event does not exist or does not belong to the current team."
      };
    }

    const { data: roundData, error: roundsError } =
      await supabase
        .from("rounds")
        .select(
          "id, player_id, played_on, holes, score, par, putts, fairways_hit, fairways_possible, greens_in_regulation, gir_possible, penalties, three_putts, notes, created_at"
        )
        .eq("team_id", team.id)
        .eq("event_id", event.id)
        .order("score", {
          ascending: true
        })
        .order("created_at", {
          ascending: true
        });

    if (roundsError) {
      return {
        status: "error",
        message: roundsError.message
      };
    }

    const rounds = (roundData ?? []) as RoundRow[];
    const playerIds = Array.from(
      new Set(
        rounds.map((round) => round.player_id)
      )
    );

    let players: PlayerRow[] = [];

    if (playerIds.length > 0) {
      const {
        data: playerData,
        error: playersError
      } = await supabase
        .from("players")
        .select("id, first_name, last_name")
        .eq("team_id", team.id)
        .in("id", playerIds);

      if (playersError) {
        return {
          status: "error",
          message: playersError.message
        };
      }

      players = (playerData ?? []) as PlayerRow[];
    }

    const playerNames = new Map(
      players.map((player) => [
        player.id,
        `${player.first_name} ${player.last_name}`
      ])
    );

    const bestRoundByPlayer =
      new Map<string, RoundRow>();

    for (const round of rounds) {
      const existing =
        bestRoundByPlayer.get(round.player_id);

      if (
        !existing ||
        round.score < existing.score
      ) {
        bestRoundByPlayer.set(
          round.player_id,
          round
        );
      }
    }

    const countingCandidates = Array.from(
      bestRoundByPlayer.values()
    )
      .sort(
        (left, right) =>
          left.score - right.score
      )
      .slice(0, 4);

    const countingRoundIds = new Set(
      countingCandidates.map((round) => round.id)
    );

    const reportRounds: EventReportRound[] =
      rounds.map((round) => ({
        id: round.id,
        playerId: round.player_id,
        playerName:
          playerNames.get(round.player_id) ??
          "Unknown Player",
        playedOn: round.played_on,
        holes: round.holes,
        score: round.score,
        par: round.par,
        putts: round.putts,
        fairwaysHit: round.fairways_hit,
        fairwaysPossible:
          round.fairways_possible,
        greensInRegulation:
          round.greens_in_regulation,
        girPossible: round.gir_possible,
        penalties: round.penalties,
        threePutts: round.three_putts,
        notes: round.notes,
        counting: countingRoundIds.has(round.id)
      }));

    const teamScore =
      countingCandidates.length === 4
        ? countingCandidates.reduce(
            (total, round) =>
              total + round.score,
            0
          )
        : null;

    const teamToPar =
      countingCandidates.length === 4 &&
      countingCandidates.every(
        (round) => round.par !== null
      )
        ? countingCandidates.reduce(
            (total, round) =>
              total +
              round.score -
              (round.par ?? 0),
            0
          )
        : null;

    return {
      status: "ready",
      teamName: team.name,
      schoolName: team.school_name,
      event: {
        id: event.id,
        name: event.name,
        eventType: event.event_type,
        eventDate: event.event_date,
        courseName: event.course_name,
        location: event.location
      },
      rounds: reportRounds,
      summary: {
        totalRounds: rounds.length,
        uniquePlayers:
          bestRoundByPlayer.size,
        countingScores:
          countingCandidates.length,
        teamScore,
        teamToPar,
        lowScore:
          rounds.length > 0
            ? Math.min(
                ...rounds.map(
                  (round) => round.score
                )
              )
            : null,
        averagePutts: average(
          rounds.map((round) => round.putts)
        ),
        fairwayPercentage:
          percentageFromTotals(
            rounds,
            "fairways_hit",
            "fairways_possible"
          ),
        girPercentage: percentageFromTotals(
          rounds,
          "greens_in_regulation",
          "gir_possible"
        )
      }
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to load the event report."
    };
  }
}
