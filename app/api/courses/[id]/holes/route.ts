import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "../../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CourseHoleInput = {
  holeNumber?: number;
  par?: number;
  handicap?: number | null;
  yardage?: number | null;
};

type SaveCourseHolesInput = {
  holes?: CourseHoleInput[];
};

function jsonResult(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function validateHoleInput(hole: CourseHoleInput) {
  if (!isInteger(hole.holeNumber) || hole.holeNumber < 1 || hole.holeNumber > 18) {
    return "Each hole needs a number from 1 to 18.";
  }

  if (!isInteger(hole.par) || hole.par < 3 || hole.par > 6) {
    return `Hole ${hole.holeNumber} par must be between 3 and 6.`;
  }

  if (
    hole.handicap !== null &&
    hole.handicap !== undefined &&
    (!isInteger(hole.handicap) || hole.handicap < 1 || hole.handicap > 18)
  ) {
    return `Hole ${hole.holeNumber} handicap must be between 1 and 18.`;
  }

  if (
    hole.yardage !== null &&
    hole.yardage !== undefined &&
    (!isInteger(hole.yardage) || hole.yardage <= 0)
  ) {
    return `Hole ${hole.holeNumber} yardage must be greater than 0.`;
  }

  return null;
}

async function getTeamCourse(courseId: string) {
  const supabase = createServiceRoleClient();

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (teamError) {
    return { supabase, course: null, error: `Could not load team: ${teamError.message}` };
  }

  if (!team) {
    return { supabase, course: null, error: "No team found. Run the demo seed file first." };
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, team_id, name")
    .eq("id", courseId)
    .eq("team_id", team.id)
    .maybeSingle();

  if (courseError) {
    return { supabase, course: null, error: `Could not load course: ${courseError.message}` };
  }

  if (!course) {
    return { supabase, course: null, error: "Course not found for this team." };
  }

  return { supabase, course, error: null };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id: courseId } = await params;

  if (!courseId) {
    return jsonResult("Missing course id.");
  }

  try {
    const { supabase, course, error } = await getTeamCourse(courseId);

    if (error || !course) {
      return jsonResult(error ?? "Course not found.", error?.includes("not found") ? 404 : 500);
    }

    const { data: holes, error: holesError } = await supabase
      .from("course_holes")
      .select("id, hole_number, par, handicap, yardage")
      .eq("course_id", course.id)
      .order("hole_number", { ascending: true });

    if (holesError) {
      return jsonResult(`Could not load course holes: ${holesError.message}`, 500);
    }

    return NextResponse.json({ success: true, holes: holes ?? [] });
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not load course holes. Please try again.",
      500
    );
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id: courseId } = await params;

  if (!courseId) {
    return jsonResult("Missing course id.");
  }

  let input: SaveCourseHolesInput;

  try {
    input = (await request.json()) as SaveCourseHolesInput;
  } catch {
    return jsonResult("Could not read hole setup.");
  }

  const holes = input.holes ?? [];

  if (holes.length !== 9 && holes.length !== 18) {
    return jsonResult("Course setup must include 9 or 18 holes.");
  }

  const holeNumbers = new Set<number>();

  for (const hole of holes) {
    const validationError = validateHoleInput(hole);

    if (validationError) {
      return jsonResult(validationError);
    }

    holeNumbers.add(hole.holeNumber as number);
  }

  if (holeNumbers.size !== holes.length) {
    return jsonResult("Hole numbers must be unique.");
  }

  try {
    const { supabase, course, error } = await getTeamCourse(courseId);

    if (error || !course) {
      return jsonResult(error ?? "Course not found.", error?.includes("not found") ? 404 : 500);
    }

    const { error: deleteError } = await supabase
      .from("course_holes")
      .delete()
      .eq("course_id", course.id);

    if (deleteError) {
      return jsonResult(`Could not replace course holes: ${deleteError.message}`, 500);
    }

    const { error: insertError } = await supabase.from("course_holes").insert(
      holes.map((hole) => ({
        course_id: course.id,
        hole_number: hole.holeNumber as number,
        par: hole.par as number,
        handicap: hole.handicap ?? null,
        yardage: hole.yardage ?? null
      }))
    );

    if (insertError) {
      return jsonResult(`Could not save course holes: ${insertError.message}`, 500);
    }

    revalidatePath("/courses");
    revalidatePath("/enter-score");

    return NextResponse.json({
      success: true,
      message: `${course.name} hole setup saved.`
    });
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not save course holes. Please try again.",
      500
    );
  }
}
