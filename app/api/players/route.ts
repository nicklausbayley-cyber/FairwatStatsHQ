import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type CreatePlayerInput = {
  firstName?: string;
  lastName?: string;
  graduationYear?: number | null;
  status?: string;
};

type UpdatePlayerInput = CreatePlayerInput & {
  id?: string;
  action?: "deactivate";
};

const allowedStatuses = new Set(["active", "inactive"]);

function jsonResult(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

function normalizeYear(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    return undefined;
  }

  if (value < 2000 || value > 2100) {
    return undefined;
  }

  return value;
}

function validatePlayerDetails(input: CreatePlayerInput) {
  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  const graduationYear = normalizeYear(input.graduationYear);
  const status = input.status?.trim() || "active";

  if (!firstName) {
    return { error: "First name is required." };
  }

  if (!lastName) {
    return { error: "Last name is required." };
  }

  if (graduationYear === undefined) {
    return { error: "Graduation year must be a valid four-digit year." };
  }

  if (!allowedStatuses.has(status)) {
    return { error: "Status must be active or inactive." };
  }

  return {
    player: {
      firstName,
      lastName,
      graduationYear,
      status
    }
  };
}

function revalidateRosterViews() {
  revalidatePath("/roster");
  revalidatePath("/players");
  revalidatePath("/statistics");
}

export async function POST(request: Request) {
  let input: CreatePlayerInput;

  try {
    input = (await request.json()) as CreatePlayerInput;
  } catch {
    return jsonResult("Could not read player details.");
  }

  const validation = validatePlayerDetails(input);

  if (validation.error || !validation.player) {
    return jsonResult(validation.error ?? "Invalid player details.");
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (teamError) {
      return jsonResult(`Could not load team: ${teamError.message}`, 500);
    }

    if (!team) {
      return jsonResult("No team found. Run the demo seed file before adding players.", 404);
    }

    const { player } = validation;
    const { error } = await supabase.from("players").insert({
      team_id: team.id,
      first_name: player.firstName,
      last_name: player.lastName,
      graduation_year: player.graduationYear,
      status: player.status
    });

    if (error) {
      return jsonResult(`Could not add player: ${error.message}`, 500);
    }

    revalidateRosterViews();

    return NextResponse.json(
      { success: true, message: `${player.firstName} ${player.lastName} added to the roster.` },
      { status: 201 }
    );
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not add player. Please try again.",
      500
    );
  }
}

export async function PATCH(request: Request) {
  let input: UpdatePlayerInput;

  try {
    input = (await request.json()) as UpdatePlayerInput;
  } catch {
    return jsonResult("Could not read player details.");
  }

  const playerId = input.id?.trim() ?? "";

  if (!playerId) {
    return jsonResult("Missing player id.");
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (teamError) {
      return jsonResult(`Could not load team: ${teamError.message}`, 500);
    }

    if (!team) {
      return jsonResult("No team found. Run the demo seed file before editing players.", 404);
    }

    if (input.action === "deactivate") {
      const { data: player, error } = await supabase
        .from("players")
        .update({ status: "inactive" })
        .eq("id", playerId)
        .eq("team_id", team.id)
        .select("id, first_name, last_name")
        .maybeSingle();

      if (error) {
        return jsonResult(`Could not deactivate player: ${error.message}`, 500);
      }

      if (!player) {
        return jsonResult("Player not found for this team.", 404);
      }

      revalidateRosterViews();

      return NextResponse.json({
        success: true,
        message: `${player.first_name} ${player.last_name} is now inactive.`
      });
    }

    const validation = validatePlayerDetails(input);

    if (validation.error || !validation.player) {
      return jsonResult(validation.error ?? "Invalid player details.");
    }

    const { player: playerDetails } = validation;
    const { data: player, error } = await supabase
      .from("players")
      .update({
        first_name: playerDetails.firstName,
        last_name: playerDetails.lastName,
        graduation_year: playerDetails.graduationYear,
        status: playerDetails.status
      })
      .eq("id", playerId)
      .eq("team_id", team.id)
      .select("id, first_name, last_name")
      .maybeSingle();

    if (error) {
      return jsonResult(`Could not update player: ${error.message}`, 500);
    }

    if (!player) {
      return jsonResult("Player not found for this team.", 404);
    }

    revalidateRosterViews();

    return NextResponse.json({
      success: true,
      message: `${player.first_name} ${player.last_name} updated.`
    });
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not update player. Please try again.",
      500
    );
  }
}
