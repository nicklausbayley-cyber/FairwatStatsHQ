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

type EventDetailsInput = {
  name?: string;
  eventType?: string;
  eventDate?: string;
  courseName?: string | null;
  location?: string | null;
};

type UpdateEventInput = EventDetailsInput & {
  id?: string;
};

type DeleteEventInput = {
  id?: string;
};

type ValidatedEventDetails = {
  name: string;
  eventType: EventType;
  eventDate: string;
  courseName: string | null;
  location: string | null;
};

type EventValidationResult =
  | { error: string; event: null }
  | { error: null; event: ValidatedEventDetails };

function jsonResult(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

function isEventType(value: string): value is EventType {
  return eventTypes.includes(value as EventType);
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

function validateEventDetails(input: EventDetailsInput): EventValidationResult {
  const name = input.name?.trim() ?? "";
  const eventType = input.eventType?.trim() ?? "";
  const eventDate = input.eventDate?.trim() ?? "";
  const courseName = input.courseName?.trim() || null;
  const location = input.location?.trim() || null;

  if (!name) {
    return { error: "Event name is required.", event: null };
  }

  if (!eventType) {
    return { error: "Event type is required.", event: null };
  }

  if (!isEventType(eventType)) {
    return {
      error: "Event type must be practice, match, invitational, qualifier, or tournament.",
      event: null
    };
  }

  if (!eventDate) {
    return { error: "Event date is required.", event: null };
  }

  if (!isValidDate(eventDate)) {
    return { error: "Event date must be a valid date.", event: null };
  }

  return {
    error: null,
    event: {
      name,
      eventType,
      eventDate,
      courseName,
      location
    }
  };
}

function revalidateEventViews() {
  revalidatePath("/events");
  revalidatePath("/dashboard");
  revalidatePath("/enter-score");
}

export async function POST(request: Request) {
  let input: EventDetailsInput;

  try {
    input = (await request.json()) as EventDetailsInput;
  } catch {
    return jsonResult("Could not read event details.");
  }

  const validation = validateEventDetails(input);

  if (validation.error) {
    return jsonResult(validation.error);
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

    const { event } = validation;
    const { error } = await supabase.from("events").insert({
      team_id: team.id,
      season_id: activeSeason?.id ?? null,
      name: event.name,
      event_type: event.eventType,
      event_date: event.eventDate,
      course_name: event.courseName,
      location: event.location
    });

    if (error) {
      return jsonResult(`Could not add event: ${error.message}`, 500);
    }

    revalidateEventViews();

    return NextResponse.json(
      { success: true, message: `${event.name} added to the schedule.` },
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

export async function PATCH(request: Request) {
  let input: UpdateEventInput;

  try {
    input = (await request.json()) as UpdateEventInput;
  } catch {
    return jsonResult("Could not read event details.");
  }

  const eventId = input.id?.trim() ?? "";

  if (!eventId) {
    return jsonResult("Missing event id.");
  }

  const validation = validateEventDetails(input);

  if (validation.error) {
    return jsonResult(validation.error);
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
      return jsonResult("No team found. Run the demo seed file before editing events.", 404);
    }

    const { event } = validation;
    const { data: updatedEvent, error } = await supabase
      .from("events")
      .update({
        name: event.name,
        event_type: event.eventType,
        event_date: event.eventDate,
        course_name: event.courseName,
        location: event.location
      })
      .eq("id", eventId)
      .eq("team_id", team.id)
      .select("id, name")
      .maybeSingle();

    if (error) {
      return jsonResult(`Could not update event: ${error.message}`, 500);
    }

    if (!updatedEvent) {
      return jsonResult("Event not found for this team.", 404);
    }

    revalidateEventViews();

    return NextResponse.json({
      success: true,
      message: `${updatedEvent.name} updated.`
    });
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not update event. Please try again.",
      500
    );
  }
}

export async function DELETE(request: Request) {
  let input: DeleteEventInput;

  try {
    input = (await request.json()) as DeleteEventInput;
  } catch {
    return jsonResult("Could not read event details.");
  }

  const eventId = input.id?.trim() ?? "";

  if (!eventId) {
    return jsonResult("Missing event id.");
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
      return jsonResult("No team found. Run the demo seed file before deleting events.", 404);
    }

    const { count: roundCount, error: roundsError } = await supabase
      .from("rounds")
      .select("id", { count: "exact", head: true })
      .eq("team_id", team.id)
      .eq("event_id", eventId);

    if (roundsError) {
      return jsonResult(`Could not check event rounds: ${roundsError.message}`, 500);
    }

    if ((roundCount ?? 0) > 0) {
      return jsonResult(
        "This event has rounds attached and cannot be deleted. Edit the event instead.",
        409
      );
    }

    const { data: deletedEvent, error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("team_id", team.id)
      .select("id, name")
      .maybeSingle();

    if (error) {
      return jsonResult(`Could not delete event: ${error.message}`, 500);
    }

    if (!deletedEvent) {
      return jsonResult("Event not found for this team.", 404);
    }

    revalidateEventViews();

    return NextResponse.json({
      success: true,
      message: `${deletedEvent.name} deleted.`
    });
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not delete event. Please try again.",
      500
    );
  }
}
