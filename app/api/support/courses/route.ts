import "server-only";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSupportAdminStatus, supportAdminStatusCode } from "../../../../lib/auth/support-admin";
import { isUuid, validateSupportCourseInput } from "../../../../lib/support/course-input";
import { createClient } from "../../../../lib/supabase/server";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function GET(request: Request) {
  const access = await getSupportAdminStatus();
  if (!access.data) return fail(access.error, supportAdminStatusCode(access.status));

  const teamId = new URL(request.url).searchParams.get("teamId");
  if (!isUuid(teamId)) return fail("Select a valid team.");

  try {
    // Authenticated and specifically approved by private.support_readers.
    // Safe for previews: does not require the production service-role key.
    const session = await createClient();
    const { data, error } = await session.rpc("support_team_courses", {
      target_team_id: teamId
    });

    if (error) {
      return fail(
        error.code === "42501"
          ? "Support access is not authorized for this account."
          : "Could not load courses for this team.",
        error.code === "42501" ? 403 : 503
      );
    }

    if (data === null) return fail("Team not found.", 404);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return fail("Invalid course data returned.", 503);
    }

    const result = data as Record<string, unknown>;
    if (!Array.isArray(result.courses) || !result.team) {
      return fail("Incomplete course data returned.", 503);
    }

    return NextResponse.json({
      success: true,
      team: result.team,
      courses: result.courses
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return fail("Course management is temporarily unavailable.", 503);
  }
}

export async function POST(request: Request) {
  const access = await getSupportAdminStatus();
  if (!access.data) return fail(access.error, supportAdminStatusCode(access.status));

  // Preview always connects to the real read-only support inventory. Never
  // permit any course edits there; no service-role key is configured for preview.
  if (process.env.VERCEL_ENV !== "production") {
    return fail("Preview is read-only. No course data was changed.", 403);
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return fail("Cross-origin course editing is not allowed.", 403);
      }
    } catch {
      return fail("Invalid request origin.", 403);
    }
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail("Could not read course details.");
  }

  const validated = validateSupportCourseInput(payload);
  if (!validated.valid) return fail(validated.message);
  const course = validated.value;

  try {
    const admin = createAdminClient();

    // A single database transaction writes the course, all holes, and the audit
    // event. It validates the team/course relationship and support actor again.
    const { data: courseId, error } = await admin.rpc("support_save_course", {
      p_actor_id: access.data.user.id,
      p_team_id: course.teamId,
      p_course_id: course.courseId,
      p_name: course.name,
      p_location: course.location,
      p_holes: course.holes.map(hole => ({
        hole_number: hole.holeNumber,
        par: hole.par,
        handicap: hole.handicap,
        yardage: hole.yardage
      }))
    });

    if (error || typeof courseId !== "string") {
      return fail(
        error?.code === "42501"
          ? "This account is not allowed to edit courses."
          : "Course could not be saved. No partial changes were committed.",
        error?.code === "42501" ? 403 : 500
      );
    }

    revalidatePath("/support");
    revalidatePath("/support/teams/" + course.teamId + "/courses");
    revalidatePath("/courses");
    revalidatePath("/enter-score");

    return NextResponse.json({
      success: true,
      courseId,
      message: course.courseId
        ? "Course details and hole setup updated and audited."
        : "Course and hole setup created and audited."
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return fail("Course could not be saved. No changes were committed.", 500);
  }
}
