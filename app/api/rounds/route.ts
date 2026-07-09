import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type HoleEntryInput = {
  holeNumber?: number;
  par?: number;
  handicap?: number | null;
  score?: number;
  putts?: number | null;
  fir?: boolean | null;
  gir?: boolean | null;
  penalty?: number | null;
};

type SubmitRoundInput = {
  teamId: string;
  playerId: string;
  eventId: string | null;
  courseId?: string | null;
  playedOn: string;
  holes: 9 | 18;
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
  holeEntries?: HoleEntryInput[];
};

type CalculatedHoleTotals = {
  holes: 9 | 18;
  score: number;
  par: number;
  putts: number | null;
  fairwaysHit: number;
  fairwaysPossible: number;
  greensInRegulation: number;
  girPossible: number;
  penalties: number;
  threePutts: number;
};

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isMissingText(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

function validateNonNegative(label: string, value: number | null) {
  if (value !== null && (!Number.isFinite(value) || value < 0)) {
    return `${label} must be 0 or greater.`;
  }

  return null;
}

function jsonResult(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

function hasHoleEntries(input: SubmitRoundInput) {
  return Array.isArray(input.holeEntries) && input.holeEntries.length > 0;
}

function validateHoleEntries(holeEntries: HoleEntryInput[]) {
  if (holeEntries.length !== 9 && holeEntries.length !== 18) {
    return "Hole-by-hole entry must include 9 or 18 holes.";
  }

  const holeNumbers = new Set<number>();

  for (const hole of holeEntries) {
    if (!isInteger(hole.holeNumber) || hole.holeNumber < 1 || hole.holeNumber > 18) {
      return "Each hole needs a number from 1 to 18.";
    }

    if (holeNumbers.has(hole.holeNumber)) {
      return "Hole numbers must be unique.";
    }

    holeNumbers.add(hole.holeNumber);

    if (!isInteger(hole.par) || hole.par < 3 || hole.par > 6) {
      return `Hole ${hole.holeNumber} par must be between 3 and 6.`;
    }

    if (!isInteger(hole.score) || hole.score <= 0) {
      return `Hole ${hole.holeNumber} score is required and must be greater than 0.`;
    }

    if (
      hole.handicap !== null &&
      hole.handicap !== undefined &&
      (!isInteger(hole.handicap) || hole.handicap < 1 || hole.handicap > 18)
    ) {
      return `Hole ${hole.holeNumber} handicap must be between 1 and 18.`;
    }

    if (
      hole.putts !== null &&
      hole.putts !== undefined &&
      (!isInteger(hole.putts) || hole.putts < 0)
    ) {
      return `Hole ${hole.holeNumber} putts must be 0 or greater.`;
    }

    if (
      hole.penalty !== null &&
      hole.penalty !== undefined &&
      (!isInteger(hole.penalty) || hole.penalty < 0)
    ) {
      return `Hole ${hole.holeNumber} penalty strokes must be 0 or greater.`;
    }
  }

  return null;
}

function calculateHoleTotals(holeEntries: HoleEntryInput[]): CalculatedHoleTotals {
  const putts = holeEntries
    .map((hole) => hole.putts)
    .filter((value): value is number => isNumber(value));
  const nonParThreeHoles = holeEntries.filter((hole) => hole.par !== 3);

  return {
    holes: holeEntries.length as 9 | 18,
    score: holeEntries.reduce((total, hole) => total + (hole.score ?? 0), 0),
    par: holeEntries.reduce((total, hole) => total + (hole.par ?? 0), 0),
    putts: putts.length > 0 ? putts.reduce((total, value) => total + value, 0) : null,
    fairwaysHit: nonParThreeHoles.filter((hole) => hole.fir === true).length,
    fairwaysPossible: nonParThreeHoles.length,
    greensInRegulation: holeEntries.filter((hole) => hole.gir === true).length,
    girPossible: holeEntries.length,
    penalties: holeEntries.reduce((total, hole) => total + (hole.penalty ?? 0), 0),
    threePutts: putts.filter((value) => value >= 3).length
  };
}

function validateSummaryInput(input: SubmitRoundInput) {
  if (input.holes !== 9 && input.holes !== 18) {
    return "Holes must be 9 or 18.";
  }

  if (!isNumber(input.score) || input.score <= 0) {
    return "Score is required and must be greater than 0.";
  }

  const nonNegativeChecks = [
    validateNonNegative("Par", input.par),
    validateNonNegative("Putts", input.putts),
    validateNonNegative("Fairways hit", input.fairwaysHit),
    validateNonNegative("Fairways possible", input.fairwaysPossible),
    validateNonNegative("Greens in regulation", input.greensInRegulation),
    validateNonNegative("GIR possible", input.girPossible),
    validateNonNegative("Penalties", input.penalties),
    validateNonNegative("Three-putts", input.threePutts)
  ];
  const nonNegativeError = nonNegativeChecks.find(Boolean);

  if (nonNegativeError) {
    return nonNegativeError;
  }

  if (
    input.fairwaysHit !== null &&
    input.fairwaysPossible !== null &&
    input.fairwaysHit > input.fairwaysPossible
  ) {
    return "Fairways hit cannot exceed fairways possible.";
  }

  if (
    input.greensInRegulation !== null &&
    input.girPossible !== null &&
    input.greensInRegulation > input.girPossible
  ) {
    return "Greens in regulation cannot exceed GIR possible.";
  }

  return null;
}

export async function POST(request: Request) {
  let input: SubmitRoundInput;

  try {
    input = (await request.json()) as SubmitRoundInput;
  } catch {
    return jsonResult("Could not read score submission.");
  }

  if (isMissingText(input.teamId)) {
    return jsonResult("Missing team context.");
  }

  if (isMissingText(input.playerId)) {
    return jsonResult("Please choose a player.");
  }

  if (isMissingText(input.playedOn)) {
    return jsonResult("Please enter the played date.");
  }

  const holeEntryMode = hasHoleEntries(input);
  const holeEntries = input.holeEntries ?? [];

  if (holeEntryMode) {
    const holeValidationError = validateHoleEntries(holeEntries);

    if (holeValidationError) {
      return jsonResult(holeValidationError);
    }

    if (isMissingText(input.courseId)) {
      return jsonResult("Course is required for hole-by-hole entry.");
    }
  } else {
    const summaryValidationError = validateSummaryInput(input);

    if (summaryValidationError) {
      return jsonResult(summaryValidationError);
    }
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: activeSeason, error: seasonError } = await supabase
      .from("seasons")
      .select("id")
      .eq("team_id", input.teamId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (seasonError) {
      return jsonResult(`Could not find active season: ${seasonError.message}`, 500);
    }

    if (holeEntryMode && input.courseId) {
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("id")
        .eq("id", input.courseId)
        .eq("team_id", input.teamId)
        .maybeSingle();

      if (courseError) {
        return jsonResult(`Could not verify course: ${courseError.message}`, 500);
      }

      if (!course) {
        return jsonResult("Course not found for this team.", 404);
      }
    }

    const totals = holeEntryMode ? calculateHoleTotals(holeEntries) : null;
    const { data: round, error } = await supabase
      .from("rounds")
      .insert({
        team_id: input.teamId,
        season_id: activeSeason?.id ?? null,
        event_id: input.eventId || null,
        player_id: input.playerId,
        played_on: input.playedOn,
        holes: totals?.holes ?? input.holes,
        score: totals?.score ?? input.score,
        par: totals?.par ?? input.par,
        putts: totals?.putts ?? input.putts,
        fairways_hit: totals?.fairwaysHit ?? input.fairwaysHit,
        fairways_possible: totals?.fairwaysPossible ?? input.fairwaysPossible,
        greens_in_regulation:
          totals?.greensInRegulation ?? input.greensInRegulation,
        gir_possible: totals?.girPossible ?? input.girPossible,
        penalties: totals?.penalties ?? input.penalties,
        three_putts: totals?.threePutts ?? input.threePutts,
        notes: input.notes?.trim() || null
      })
      .select("id")
      .maybeSingle();

    if (error) {
      return jsonResult(`Could not save round: ${error.message}`, 500);
    }

    if (!round) {
      return jsonResult("Round was not saved.", 500);
    }

    if (holeEntryMode) {
      const { error: roundHolesError } = await supabase.from("round_holes").insert(
        holeEntries.map((hole) => ({
          team_id: input.teamId,
          round_id: round.id,
          player_id: input.playerId,
          event_id: input.eventId || null,
          course_id: input.courseId || null,
          hole_number: hole.holeNumber as number,
          par: hole.par as number,
          handicap: hole.handicap ?? null,
          score: hole.score as number,
          putts: hole.putts ?? null,
          fir: hole.par === 3 ? null : hole.fir ?? false,
          gir: hole.gir ?? false,
          penalty: hole.penalty ?? null
        }))
      );

      if (roundHolesError) {
        await supabase.from("rounds").delete().eq("id", round.id);
        return jsonResult(`Could not save hole scores: ${roundHolesError.message}`, 500);
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/statistics");
    revalidatePath("/players");
    revalidatePath("/players/[id]", "page");
    revalidatePath("/roster");

    return NextResponse.json(
      { success: true, message: "Round submitted successfully." },
      { status: 201 }
    );
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not save round. Please try again.",
      500
    );
  }
}
