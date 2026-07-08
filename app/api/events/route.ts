import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

const eventTypes = [
  "practice",
  "match",
  "invitational",
  "qualifier",
  "tournament"
] as const;

type EventType = (typeof eventTypes)[number];

type CreateEventInput = {
  name?: string;
  eventType?: string;
  eventDate?: string;
  courseName?: string | null;
  location?: string | null;
};

function jsonResult(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

function isEventType(value: string): value is EventType {
  return eventTypes.includes(value as EventType);
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

export async function POST(request: Request) {
  let input: CreateEventInput;

  try {
    input = (await request.json()) as CreateEventInput;
  } catch {
    return jsonResult("Could not read event details.");
  }

  const name = input.name?.trim() ?? "";
  const eventType = input.eventType?.trim() ?? "";
  const eventDate = input.eventDate?.trim() ?? "";
  const courseName = input.courseName?.trim() || null;
  const location = input.location?.trim() || null;

  if (!name) {
    return jsonResult("Event name is required.");
  }

  if (!eventType) {
    return jsonResult("Event type is required.");
  }

  if (!isEventType(eventType)) {
    return jsonResult("Event type must be practice, match, invitational, qualifier, or tournament.");
  }

  if (!eventDate) {
    return jsonResult("Event date is required.");
  }

  if (!isValidDate(eventDate)) {
    return jsonResult("Event date must be a valid date.");
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
      return jsonResult("No team found. Run the demo seed file before adding events.", 404);
    }

    const { data: activeSeason, error: seasonError } = await supabase
      .from("seasons")
      .select("id")
      .eq("team_id", team.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (seasonError) {
      return jsonResult(`Could not find active season: ${seasonError.message}`, 500);
    }

    const { error } = await supabase.from("events").insert({
      team_id: team.id,
      season_id: activeSeason?.id ?? null,
      name,
      event_type: eventType,
      event_date: eventDate,
      course_name: courseName,
      location
    });

    if (error) {
      return jsonResult(`Could not add event: ${error.message}`, 500);
    }

    revalidatePath("/events");
    revalidatePath("/dashboard");
    revalidatePath("/enter-score");

    return NextResponse.json(
      { success: true, message: `${name} added to the schedule.` },
      { status: 201 }
    );
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not add event. Please try again.",
      500
    );
  }
}
