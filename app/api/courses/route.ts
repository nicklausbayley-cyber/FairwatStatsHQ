import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  authStatusCode,
  getCurrentTeam,
  isTeamStaff
} from "../../../lib/auth/get-current-team";

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
    const currentTeam = await getCurrentTeam();

    if (!currentTeam.data) {
      return jsonResult(currentTeam.error, authStatusCode(currentTeam.status));
    }

    if (!isTeamStaff(currentTeam.data.role)) {
      return jsonResult("Only coaches and admins can manage courses.", 403);
    }

    const { supabase, team } = currentTeam.data;

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
