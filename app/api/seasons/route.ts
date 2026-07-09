import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type CreateSeasonInput = {
  name?: string;
  startsOn?: string | null;
  endsOn?: string | null;
};

type SetActiveSeasonInput = {
  id?: string;
};

function jsonResult(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

function optionalText(value: string | null | undefined) {
  return value?.trim() || null;
}

function isValidOptionalDate(value: string | null) {
  if (!value) {
    return true;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function revalidateSeasonViews() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/events");
  revalidatePath("/enter-score");
  revalidatePath("/statistics");
  revalidatePath("/players");
  revalidatePath("/players/[id]", "page");
}

async function getFirstTeam() {
  const supabase = createServiceRoleClient();
  const { data: team, error } = await supabase
    .from("teams")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return { supabase, team, error };
}

export async function POST(request: Request) {
  let input: CreateSeasonInput;

  try {
    input = (await request.json()) as CreateSeasonInput;
  } catch {
    return jsonResult("Could not read season details.");
  }

  const name = input.name?.trim() ?? "";
  const startsOn = optionalText(input.startsOn);
  const endsOn = optionalText(input.endsOn);

  if (!name) {
    return jsonResult("Season name is required.");
  }

  if (!isValidOptionalDate(startsOn)) {
    return jsonResult("Start date must be a valid date.");
  }

  if (!isValidOptionalDate(endsOn)) {
    return jsonResult("End date must be a valid date.");
  }

  if (startsOn && endsOn && startsOn > endsOn) {
    return jsonResult("End date must be after the start date.");
  }

  try {
    const { supabase, team, error: teamError } = await getFirstTeam();

    if (teamError) {
      return jsonResult(`Could not load team: ${teamError.message}`, 500);
    }

    if (!team) {
      return jsonResult("No team found. Run the demo seed file before adding seasons.", 404);
    }

    const { data: activeSeason, error: activeSeasonError } = await supabase
      .from("seasons")
      .select("id")
      .eq("team_id", team.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (activeSeasonError) {
      return jsonResult(`Could not check active season: ${activeSeasonError.message}`, 500);
    }

    const { data: season, error } = await supabase
      .from("seasons")
      .insert({
        team_id: team.id,
        name,
        starts_on: startsOn,
        ends_on: endsOn,
        is_active: !activeSeason
      })
      .select("id, name, is_active")
      .maybeSingle();

    if (error) {
      return jsonResult(`Could not create season: ${error.message}`, 500);
    }

    if (!season) {
      return jsonResult("Season was not created.", 500);
    }

    revalidateSeasonViews();

    return NextResponse.json(
      {
        success: true,
        message: season.is_active
          ? `${season.name} created and set active.`
          : `${season.name} created.`
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not create season. Please try again.",
      500
    );
  }
}

export async function PATCH(request: Request) {
  let input: SetActiveSeasonInput;

  try {
    input = (await request.json()) as SetActiveSeasonInput;
  } catch {
    return jsonResult("Could not read season details.");
  }

  const seasonId = input.id?.trim() ?? "";

  if (!seasonId) {
    return jsonResult("Missing season id.");
  }

  try {
    const { supabase, team, error: teamError } = await getFirstTeam();

    if (teamError) {
      return jsonResult(`Could not load team: ${teamError.message}`, 500);
    }

    if (!team) {
      return jsonResult("No team found. Run the demo seed file before updating seasons.", 404);
    }

    const { data: selectedSeason, error: selectedSeasonError } = await supabase
      .from("seasons")
      .select("id, name")
      .eq("id", seasonId)
      .eq("team_id", team.id)
      .maybeSingle();

    if (selectedSeasonError) {
      return jsonResult(`Could not find season: ${selectedSeasonError.message}`, 500);
    }

    if (!selectedSeason) {
      return jsonResult("Season not found for this team.", 404);
    }

    const { error: deactivateError } = await supabase
      .from("seasons")
      .update({ is_active: false })
      .eq("team_id", team.id);

    if (deactivateError) {
      return jsonResult(`Could not clear active seasons: ${deactivateError.message}`, 500);
    }

    const { data: activeSeason, error: activateError } = await supabase
      .from("seasons")
      .update({ is_active: true })
      .eq("id", selectedSeason.id)
      .eq("team_id", team.id)
      .select("id, name")
      .maybeSingle();

    if (activateError) {
      return jsonResult(`Could not set active season: ${activateError.message}`, 500);
    }

    if (!activeSeason) {
      return jsonResult("Season not found for this team.", 404);
    }

    revalidateSeasonViews();

    return NextResponse.json({
      success: true,
      message: `${activeSeason.name} is now the active season.`
    });
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not update active season. Please try again.",
      500
    );
  }
}
