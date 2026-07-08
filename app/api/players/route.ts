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

export async function POST(request: Request) {
  let input: CreatePlayerInput;

  try {
    input = (await request.json()) as CreatePlayerInput;
  } catch {
    return jsonResult("Could not read player details.");
  }

  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  const graduationYear = normalizeYear(input.graduationYear);
  const status = input.status?.trim() || "active";

  if (!firstName) {
    return jsonResult("First name is required.");
  }

  if (!lastName) {
    return jsonResult("Last name is required.");
  }

  if (graduationYear === undefined) {
    return jsonResult("Graduation year must be a valid four-digit year.");
  }

  if (!allowedStatuses.has(status)) {
    return jsonResult("Status must be active or inactive.");
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

    const { error } = await supabase.from("players").insert({
      team_id: team.id,
      first_name: firstName,
      last_name: lastName,
      graduation_year: graduationYear,
      status
    });

    if (error) {
      return jsonResult(`Could not add player: ${error.message}`, 500);
    }

    revalidatePath("/roster");
    revalidatePath("/players");
    revalidatePath("/statistics");

    return NextResponse.json(
      { success: true, message: `${firstName} ${lastName} added to the roster.` },
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
