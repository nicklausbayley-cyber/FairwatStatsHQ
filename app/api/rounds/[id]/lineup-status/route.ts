import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  authStatusCode,
  getCurrentTeam,
  isTeamStaff
} from "../../../../../lib/auth/get-current-team";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type LineupStatusInput = {
  countsTowardLineup?: boolean;
};

function jsonResult(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  const { id: roundId } = await params;

  let input: LineupStatusInput;

  try {
    input = (await request.json()) as LineupStatusInput;
  } catch {
    return jsonResult("Could not read lineup status.");
  }

  if (typeof input.countsTowardLineup !== "boolean") {
    return jsonResult("Lineup status must be true or false.");
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
        "Only coaches and admins can change lineup status.",
        403
      );
    }

    const { supabase, team } = currentTeam.data;

    const { data: updatedRound, error } = await supabase
      .from("rounds")
      .update({
        counts_toward_lineup: input.countsTowardLineup
      })
      .eq("id", roundId)
      .eq("team_id", team.id)
      .select("id, player_id")
      .maybeSingle();

    if (error) {
      return jsonResult(
        `Could not update lineup status: ${error.message}`,
        500
      );
    }

    if (!updatedRound) {
      return jsonResult("Round not found for this team.", 404);
    }

    revalidatePath("/statistics");
    revalidatePath(`/players/${updatedRound.player_id}`);
    revalidatePath(`/rounds/${roundId}`);

    return NextResponse.json({
      success: true,
      message: input.countsTowardLineup
        ? "Round now counts toward lineup average."
        : "Round excluded from lineup average."
    });
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not update lineup status.",
      500
    );
  }
}
