import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type CreateCourseInput = {
  name?: string;
  location?: string | null;
};

function jsonResult(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(request: Request) {
  let input: CreateCourseInput;

  try {
    input = (await request.json()) as CreateCourseInput;
  } catch {
    return jsonResult("Could not read course details.");
  }

  const name = input.name?.trim() ?? "";
  const location = input.location?.trim() || null;

  if (!name) {
    return jsonResult("Course name is required.");
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
      return jsonResult("No team found. Run the demo seed file before adding courses.", 404);
    }

    const { data: course, error } = await supabase
      .from("courses")
      .insert({
        team_id: team.id,
        name,
        location
      })
      .select("id, name")
      .maybeSingle();

    if (error) {
      return jsonResult(`Could not add course: ${error.message}`, 500);
    }

    if (!course) {
      return jsonResult("Course was not created.", 500);
    }

    revalidatePath("/courses");
    revalidatePath("/enter-score");

    return NextResponse.json(
      {
        success: true,
        message: `${course.name} added.`,
        courseId: course.id
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not add course. Please try again.",
      500
    );
  }
}
