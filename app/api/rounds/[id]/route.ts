import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  authStatusCode,
  getCurrentTeam,
  isTeamStaff
} from "../../../../lib/auth/get-current-team";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type HoleUpdateInput = {
  holeNumber?: number;
  score?: number;
  putts?: number | null;
  fir?: boolean | null;
  gir?: boolean | null;
  penalty?: number | null;
};

type RoundUpdateInput = {
  playedOn?: string;
  eventId?: string | null;
  notes?: string | null;
  holes?: number;
  score?: number;
  par?: number | null;
  putts?: number | null;
  fairwaysHit?: number | null;
  fairwaysPossible?: number | null;
  greensInRegulation?: number | null;
  girPossible?: number | null;
  penalties?: number | null;
  threePutts?: number | null;
  holeEntries?: HoleUpdateInput[];
};

type ExistingRoundHole = {
  id: string;
  round_id: string;
  team_id: string;
  player_id: string;
  event_id: string | null;
  course_id: string | null;
  hole_number: number;
  par: number;
  handicap: number | null;
  score: number;
  putts: number | null;
  fir: boolean | null;
  gir: boolean | null;
  penalty: number | null;
};

function jsonResult(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isNullableInteger(value: unknown): value is number | null {
  return value === null || isInteger(value);
}

function isValidDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00`))
  );
}

function validateNonNegative(
  label: string,
  value: number | null | undefined
) {
  if (
    value !== null &&
    value !== undefined &&
    (!isInteger(value) || value < 0)
  ) {
    return `${label} must be a whole number that is 0 or greater.`;
  }

  return null;
}

function validateSummaryInput(input: RoundUpdateInput) {
  if (input.holes !== 9 && input.holes !== 18) {
    return "Holes must be 9 or 18.";
  }

  if (!isInteger(input.score) || input.score <= 0) {
    return "Score is required and must be greater than 0.";
  }

  if (
    input.par !== null &&
    input.par !== undefined &&
    (!isInteger(input.par) || input.par < 0)
  ) {
    return "Par must be a whole number that is 0 or greater.";
  }

  const validationErrors = [
    validateNonNegative("Putts", input.putts),
    validateNonNegative("Fairways hit", input.fairwaysHit),
    validateNonNegative(
      "Fairways possible",
      input.fairwaysPossible
    ),
    validateNonNegative(
      "Greens in regulation",
      input.greensInRegulation
    ),
    validateNonNegative("GIR possible", input.girPossible),
    validateNonNegative("Penalties", input.penalties),
    validateNonNegative("Three-putts", input.threePutts)
  ];

  const validationError = validationErrors.find(Boolean);

  if (validationError) {
    return validationError;
  }

  if (
    input.fairwaysHit !== null &&
    input.fairwaysHit !== undefined &&
    input.fairwaysPossible !== null &&
    input.fairwaysPossible !== undefined &&
    input.fairwaysHit > input.fairwaysPossible
  ) {
    return "Fairways hit cannot exceed fairways possible.";
  }

  if (
    input.greensInRegulation !== null &&
    input.greensInRegulation !== undefined &&
    input.girPossible !== null &&
    input.girPossible !== undefined &&
    input.greensInRegulation > input.girPossible
  ) {
    return "Greens in regulation cannot exceed GIR possible.";
  }

  return null;
}

function validateHoleUpdates(
  inputHoles: HoleUpdateInput[],
  existingHoles: ExistingRoundHole[]
) {
  if (
    inputHoles.length !== existingHoles.length ||
    (inputHoles.length !== 9 && inputHoles.length !== 18)
  ) {
    return `This round must continue to contain ${existingHoles.length} holes.`;
  }

  const existingNumbers = new Set(
    existingHoles.map((hole) => hole.hole_number)
  );
  const suppliedNumbers = new Set<number>();

  for (const hole of inputHoles) {
    if (
      !isInteger(hole.holeNumber) ||
      !existingNumbers.has(hole.holeNumber)
    ) {
      return "Every submitted hole must match a saved hole on this round.";
    }

    if (suppliedNumbers.has(hole.holeNumber)) {
      return "Hole numbers must be unique.";
    }

    suppliedNumbers.add(hole.holeNumber);

    if (!isInteger(hole.score) || hole.score <= 0) {
      return `Hole ${hole.holeNumber} score is required and must be greater than 0.`;
    }

    if (
      !isNullableInteger(hole.putts) ||
      (hole.putts !== null &&
        hole.putts !== undefined &&
        hole.putts < 0)
    ) {
      return `Hole ${hole.holeNumber} putts must be 0 or greater.`;
    }

    if (
      !isNullableInteger(hole.penalty) ||
      (hole.penalty !== null &&
        hole.penalty !== undefined &&
        hole.penalty < 0)
    ) {
      return `Hole ${hole.holeNumber} penalty strokes must be 0 or greater.`;
    }

    if (
      hole.fir !== null &&
      hole.fir !== undefined &&
      typeof hole.fir !== "boolean"
    ) {
      return `Hole ${hole.holeNumber} FIR must be true, false, or null.`;
    }

    if (
      hole.gir !== null &&
      hole.gir !== undefined &&
      typeof hole.gir !== "boolean"
    ) {
      return `Hole ${hole.holeNumber} GIR must be true, false, or null.`;
    }
  }

  return null;
}

function calculateHoleTotals(
  holes: Array<{
    par: number;
    score: number;
    putts: number | null;
    fir: boolean | null;
    gir: boolean;
    penalty: number | null;
  }>
) {
  const puttValues = holes
    .map((hole) => hole.putts)
    .filter((value): value is number => value !== null);

  const fairwayHoles = holes.filter((hole) => hole.par !== 3);

  return {
    holes: holes.length,
    score: holes.reduce(
      (total, hole) => total + hole.score,
      0
    ),
    par: holes.reduce(
      (total, hole) => total + hole.par,
      0
    ),
    putts:
      puttValues.length > 0
        ? puttValues.reduce(
            (total, value) => total + value,
            0
          )
        : null,
    fairwaysHit: fairwayHoles.filter(
      (hole) => hole.fir === true
    ).length,
    fairwaysPossible: fairwayHoles.length,
    greensInRegulation: holes.filter(
      (hole) => hole.gir
    ).length,
    girPossible: holes.length,
    penalties: holes.reduce(
      (total, hole) => total + (hole.penalty ?? 0),
      0
    ),
    threePutts: puttValues.filter(
      (value) => value >= 3
    ).length
  };
}

function revalidateRoundViews(
  roundId: string,
  playerId: string
) {
  revalidatePath("/dashboard");
  revalidatePath("/statistics");
  revalidatePath("/players");
  revalidatePath("/players/[id]", "page");
  revalidatePath(`/players/${playerId}`);
  revalidatePath(`/rounds/${roundId}`);
  revalidatePath("/roster");
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  const { id: roundId } = await params;

  if (!roundId) {
    return jsonResult("Missing round id.");
  }

  let input: RoundUpdateInput;

  try {
    input = (await request.json()) as RoundUpdateInput;
  } catch {
    return jsonResult("Could not read round details.");
  }

  const playedOn = input.playedOn?.trim() ?? "";

  if (!playedOn || !isValidDate(playedOn)) {
    return jsonResult("Played date must be a valid date.");
  }

  try {
    const currentTeam = await getCurrentTeam();

    if (!currentTeam.data) {
      return jsonResult(
        currentTeam.error,
        authStatusCode(currentTeam.status)
      );
    }

    if (!isTeamStaff(currentTeam.data.role)) {
      return jsonResult(
        "Only coaches and admins can edit rounds.",
        403
      );
    }

    const { supabase, team } = currentTeam.data;

    const { data: round, error: roundError } =
      await supabase
        .from("rounds")
        .select(
          "id, team_id, player_id, event_id, holes"
        )
        .eq("id", roundId)
        .eq("team_id", team.id)
        .maybeSingle();

    if (roundError) {
      return jsonResult(
        `Could not load round: ${roundError.message}`,
        500
      );
    }

    if (!round) {
      return jsonResult(
        "Round not found for this team.",
        404
      );
    }

    const eventId = input.eventId?.trim() || null;

    if (eventId) {
      const { data: event, error: eventError } =
        await supabase
          .from("events")
          .select("id")
          .eq("id", eventId)
          .eq("team_id", team.id)
          .maybeSingle();

      if (eventError) {
        return jsonResult(
          `Could not verify event: ${eventError.message}`,
          500
        );
      }

      if (!event) {
        return jsonResult(
          "Event not found for this team.",
          404
        );
      }
    }

    const { data: existingHoleData, error: holesError } =
      await supabase
        .from("round_holes")
        .select(
          "id, round_id, team_id, player_id, event_id, course_id, hole_number, par, handicap, score, putts, fir, gir, penalty"
        )
        .eq("round_id", round.id)
        .eq("team_id", team.id)
        .order("hole_number", { ascending: true });

    if (holesError) {
      return jsonResult(
        `Could not load round holes: ${holesError.message}`,
        500
      );
    }

    const existingHoles =
      (existingHoleData ?? []) as ExistingRoundHole[];
    const isHoleByHoleRound = existingHoles.length > 0;

    if (isHoleByHoleRound) {
      const inputHoles = input.holeEntries ?? [];
      const validationError = validateHoleUpdates(
        inputHoles,
        existingHoles
      );

      if (validationError) {
        return jsonResult(validationError);
      }

      const inputByHole = new Map(
        inputHoles.map((hole) => [
          hole.holeNumber as number,
          hole
        ])
      );

      const updatedHoles = existingHoles.map(
        (existingHole) => {
          const submittedHole = inputByHole.get(
            existingHole.hole_number
          );

          if (!submittedHole) {
            throw new Error(
              `Hole ${existingHole.hole_number} was not submitted.`
            );
          }

          return {
            id: existingHole.id,
            team_id: team.id,
            round_id: round.id,
            player_id: round.player_id,
            event_id: eventId,
            course_id: existingHole.course_id,
            hole_number: existingHole.hole_number,
            par: existingHole.par,
            handicap: existingHole.handicap,
            score: submittedHole.score as number,
            putts: submittedHole.putts ?? null,
            fir:
              existingHole.par === 3
                ? null
                : submittedHole.fir ?? false,
            gir: submittedHole.gir ?? false,
            penalty: submittedHole.penalty ?? null
          };
        }
      );

      const totals = calculateHoleTotals(updatedHoles);

      const { error: upsertError } = await supabase
        .from("round_holes")
        .upsert(updatedHoles, {
          onConflict: "round_id,hole_number"
        });

      if (upsertError) {
        return jsonResult(
          `Could not update hole scores: ${upsertError.message}`,
          500
        );
      }

      const { data: updatedRound, error: updateError } =
        await supabase
          .from("rounds")
          .update({
            event_id: eventId,
            played_on: playedOn,
            holes: totals.holes,
            score: totals.score,
            par: totals.par,
            putts: totals.putts,
            fairways_hit: totals.fairwaysHit,
            fairways_possible:
              totals.fairwaysPossible,
            greens_in_regulation:
              totals.greensInRegulation,
            gir_possible: totals.girPossible,
            penalties: totals.penalties,
            three_putts: totals.threePutts,
            notes: input.notes?.trim() || null
          })
          .eq("id", round.id)
          .eq("team_id", team.id)
          .select("id")
          .maybeSingle();

      if (updateError) {
        return jsonResult(
          `Could not update round: ${updateError.message}`,
          500
        );
      }

      if (!updatedRound) {
        return jsonResult(
          "Round not found for this team.",
          404
        );
      }
    } else {
      if (input.holes !== round.holes) {
        return jsonResult(
          `This round must remain a ${round.holes}-hole round.`
        );
      }

      const validationError =
        validateSummaryInput(input);

      if (validationError) {
        return jsonResult(validationError);
      }

      const { data: updatedRound, error: updateError } =
        await supabase
          .from("rounds")
          .update({
            event_id: eventId,
            played_on: playedOn,
            holes: input.holes as 9 | 18,
            score: input.score as number,
            par: input.par ?? null,
            putts: input.putts ?? null,
            fairways_hit:
              input.fairwaysHit ?? null,
            fairways_possible:
              input.fairwaysPossible ?? null,
            greens_in_regulation:
              input.greensInRegulation ?? null,
            gir_possible:
              input.girPossible ?? null,
            penalties: input.penalties ?? null,
            three_putts:
              input.threePutts ?? null,
            notes: input.notes?.trim() || null
          })
          .eq("id", round.id)
          .eq("team_id", team.id)
          .select("id")
          .maybeSingle();

      if (updateError) {
        return jsonResult(
          `Could not update round: ${updateError.message}`,
          500
        );
      }

      if (!updatedRound) {
        return jsonResult(
          "Round not found for this team.",
          404
        );
      }
    }

    revalidateRoundViews(
      round.id,
      round.player_id
    );

    return NextResponse.json({
      success: true,
      message: "Round updated successfully."
    });
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not update round. Please try again.",
      500
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  const { id: roundId } = await params;

  if (!roundId) {
    return jsonResult("Missing round id.");
  }

  try {
    const currentTeam = await getCurrentTeam();

    if (!currentTeam.data) {
      return jsonResult(
        currentTeam.error,
        authStatusCode(currentTeam.status)
      );
    }

    if (!isTeamStaff(currentTeam.data.role)) {
      return jsonResult(
        "Only coaches and admins can delete rounds.",
        403
      );
    }

    const { supabase, team } = currentTeam.data;

    const { data: deletedRound, error } =
      await supabase
        .from("rounds")
        .delete()
        .eq("id", roundId)
        .eq("team_id", team.id)
        .select("id, player_id")
        .maybeSingle();

    if (error) {
      return jsonResult(
        `Could not delete round: ${error.message}`,
        500
      );
    }

    if (!deletedRound) {
      return jsonResult(
        "Round not found for this team.",
        404
      );
    }

    revalidateRoundViews(
      deletedRound.id,
      deletedRound.player_id
    );

    return NextResponse.json({
      success: true,
      message: "Round deleted successfully."
    });
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not delete round. Please try again.",
      500
    );
  }
}
