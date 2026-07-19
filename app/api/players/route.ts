import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  authStatusCode,
  getCurrentTeam,
  isTeamStaff
} from "../../../lib/auth/get-current-team";

export const dynamic = "force-dynamic";

type PlayerStatus = "active" | "inactive";

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

type ValidatedPlayerDetails = {
  firstName: string;
  lastName: string;
  graduationYear: number | null;
  status: PlayerStatus;
};

type PlayerValidationResult =
  | { error: string; player: null }
  | { error: null; player: ValidatedPlayerDetails };

const allowedStatuses = new Set<PlayerStatus>(["active", "inactive"]);

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

function isPlayerStatus(value: string): value is PlayerStatus {
  return allowedStatuses.has(value as PlayerStatus);
}

function validatePlayerDetails(input: CreatePlayerInput): PlayerValidationResult {
  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  const graduationYear = normalizeYear(input.graduationYear);
  const status = input.status?.trim() || "active";

  if (!firstName) {
    return { error: "First name is required.", player: null };
  }

  if (!lastName) {
    return { error: "Last name is required.", player: null };
  }

  if (graduationYear === undefined) {
    return { error: "Graduation year must be a valid four-digit year.", player: null };
  }

  if (!isPlayerStatus(status)) {
    return { error: "Status must be active or inactive.", player: null };
  }

  return {
    error: null,
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

  if (validation.error) {
    return jsonResult(validation.error);
  }

  const player = validation.player;

  if (!player) {
    return jsonResult("Invalid player details.");
  }

  try {
    const currentTeam = await getCurrentTeam();

    if (!currentTeam.data) {
      return jsonResult(currentTeam.error, authStatusCode(currentTeam.status));
    }

    if (!isTeamStaff(currentTeam.data.role)) {
      return jsonResult("Only coaches and admins can manage the roster.", 403);
    }

    const { supabase, team } = currentTeam.data;
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
    const currentTeam = await getCurrentTeam();

    if (!currentTeam.data) {
      return jsonResult(currentTeam.error, authStatusCode(currentTeam.status));
    }

    if (!isTeamStaff(currentTeam.data.role)) {
      return jsonResult("Only coaches and admins can manage the roster.", 403);
    }

    const { supabase, team } = currentTeam.data;

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

    if (validation.error) {
      return jsonResult(validation.error);
    }

    const playerDetails = validation.player;

    if (!playerDetails) {
      return jsonResult("Invalid player details.");
    }

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
