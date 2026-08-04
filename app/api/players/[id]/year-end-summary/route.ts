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

type SummaryInput = {
  seasonId?: string;
  seasonSummary?: string | null;
  strengths?: string | null;
  developmentAreas?: string | null;
  nextSeasonGoals?: string | null;
};

function jsonResult(message: string, status = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

function cleanText(value: string | null | undefined) {
  const cleaned = value?.trim() ?? "";

  return cleaned || null;
}

function textIsValid(value: string | null) {
  return value === null || value.length <= 5000;
}

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  const { id: playerId } = await params;

  let input: SummaryInput;

  try {
    input = (await request.json()) as SummaryInput;
  } catch {
    return jsonResult("Could not read the year-end summary.");
  }

  const seasonId = input.seasonId?.trim() ?? "";
  const seasonSummary = cleanText(input.seasonSummary);
  const strengths = cleanText(input.strengths);
  const developmentAreas = cleanText(input.developmentAreas);
  const nextSeasonGoals = cleanText(input.nextSeasonGoals);

  if (!seasonId) {
    return jsonResult("A season is required.");
  }

  if (
    !textIsValid(seasonSummary) ||
    !textIsValid(strengths) ||
    !textIsValid(developmentAreas) ||
    !textIsValid(nextSeasonGoals)
  ) {
    return jsonResult(
      "Each summary section must be 5,000 characters or fewer."
    );
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
        "Only coaches and admins can manage year-end summaries.",
        403
      );
    }

    const { supabase, team, profile } = currentTeam.data;

    const [playerResult, seasonResult] = await Promise.all([
      supabase
        .from("players")
        .select("id")
        .eq("id", playerId)
        .eq("team_id", team.id)
        .maybeSingle(),
      supabase
        .from("seasons")
        .select("id")
        .eq("id", seasonId)
        .eq("team_id", team.id)
        .maybeSingle()
    ]);

    if (playerResult.error) {
      return jsonResult(
        `Could not verify player: ${playerResult.error.message}`,
        500
      );
    }

    if (seasonResult.error) {
      return jsonResult(
        `Could not verify season: ${seasonResult.error.message}`,
        500
      );
    }

    if (!playerResult.data) {
      return jsonResult("Player not found for this team.", 404);
    }

    if (!seasonResult.data) {
      return jsonResult("Season not found for this team.", 404);
    }

    const { data: summary, error } = await supabase
      .from("player_season_summaries")
      .upsert(
        {
          team_id: team.id,
          player_id: playerId,
          season_id: seasonId,
          updated_by: profile.id,
          season_summary: seasonSummary,
          strengths,
          development_areas: developmentAreas,
          next_season_goals: nextSeasonGoals,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: "team_id,player_id,season_id"
        }
      )
      .select("id, updated_at")
      .maybeSingle();

    if (error) {
      return jsonResult(
        `Could not save year-end summary: ${error.message}`,
        500
      );
    }

    if (!summary) {
      return jsonResult("The year-end summary was not saved.", 500);
    }

    revalidatePath(`/players/${playerId}`);
    revalidatePath(`/players/${playerId}/year-end-report`);

    return NextResponse.json({
      success: true,
      message: "Year-end summary saved.",
      updatedAt: summary.updated_at
    });
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not save the year-end summary.",
      500
    );
  }
}
