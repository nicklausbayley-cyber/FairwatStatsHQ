import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type SubmitRoundInput = {
  teamId: string;
  playerId: string;
  eventId: string | null;
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
};

function isNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

  if (input.holes !== 9 && input.holes !== 18) {
    return jsonResult("Holes must be 9 or 18.");
  }

  if (!isNumber(input.score) || input.score <= 0) {
    return jsonResult("Score is required and must be greater than 0.");
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
    return jsonResult(nonNegativeError);
  }

  if (
    input.fairwaysHit !== null &&
    input.fairwaysPossible !== null &&
    input.fairwaysHit > input.fairwaysPossible
  ) {
    return jsonResult("Fairways hit cannot exceed fairways possible.");
  }

  if (
    input.greensInRegulation !== null &&
    input.girPossible !== null &&
    input.greensInRegulation > input.girPossible
  ) {
    return jsonResult("Greens in regulation cannot exceed GIR possible.");
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

    const { error } = await supabase.from("rounds").insert({
      team_id: input.teamId,
      season_id: activeSeason?.id ?? null,
      event_id: input.eventId || null,
      player_id: input.playerId,
      played_on: input.playedOn,
      holes: input.holes,
      score: input.score,
      par: input.par,
      putts: input.putts,
      fairways_hit: input.fairwaysHit,
      fairways_possible: input.fairwaysPossible,
      greens_in_regulation: input.greensInRegulation,
      gir_possible: input.girPossible,
      penalties: input.penalties,
      three_putts: input.threePutts,
      notes: input.notes?.trim() || null
    });

    if (error) {
      return jsonResult(`Could not save round: ${error.message}`, 500);
    }

    revalidatePath("/dashboard");
    revalidatePath("/statistics");
    revalidatePath("/players");
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
