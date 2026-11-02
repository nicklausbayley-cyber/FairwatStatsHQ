import "server-only";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getSupportAdminStatus, supportAdminStatusCode } from "../../../../lib/auth/support-admin";
import { createAdminClient } from "../../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CourseInput = { teamId?: unknown; courseId?: unknown; name?: unknown; location?: unknown };

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(request: Request) {
  const access = await getSupportAdminStatus();
  if (!access.data) return fail(access.error, supportAdminStatusCode(access.status));

  let payload: CourseInput;
  try { payload = await request.json(); } catch { return fail("Invalid request."); }
  const teamId = typeof payload.teamId === "string" ? payload.teamId : "";
  const courseId = typeof payload.courseId === "string" ? payload.courseId : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const location = typeof payload.location === "string" ? payload.location.trim() : "";

  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(teamId) || !name || name.length > 150 || location.length > 200) {
    return fail("Choose a valid team and provide a course name (up to 150 characters).");
  }

  try {
    const admin = createAdminClient();

    // Fail closed before modifying course data when the required audit table
    // has not been deployed or is not accessible to the server-side admin.
    const { error: auditReadyError } = await admin
      .from("support_audit_logs" as never)
      .select("id")
      .limit(1);
    if (auditReadyError) {
      return fail("Support course editing is unavailable until the audit log migration is applied.", 503);
    }

    const { data: team, error: teamError } = await admin.from("teams").select("id").eq("id", teamId).maybeSingle();
    if (teamError || !team) return fail("Team not found.", 404);

    if (courseId) {
      const { data: existing, error: existingError } = await admin.from("courses").select("id").eq("id", courseId).eq("team_id", teamId).maybeSingle();
      if (existingError || !existing) return fail("Course not found for this team.", 404);
    }
    const result = courseId
      ? await admin.from("courses").update({ name, location: location || null }).eq("id", courseId).eq("team_id", teamId).select("id,name").single()
      : await admin.from("courses").insert({ team_id: teamId, name, location: location || null }).select("id,name").single();

    if (result.error || !result.data) return fail("Course could not be saved.", 500);

    // Always record the actor and target; do not treat an unlogged change as success.
    const { error: auditError } = await admin.from("support_audit_logs" as never).insert({
      actor_id: access.data.user.id,
      actor_email: access.data.email,
      team_id: teamId,
      action: courseId ? "course.update" : "course.create",
      target_id: result.data.id,
      details: { name, location }
    } as never);
    if (auditError) return fail("Course saved, but the audit log failed. Contact the platform owner before making more changes.", 500);

    revalidatePath("/courses");
    revalidatePath("/support");
    return NextResponse.json({ success: true, course: result.data });
  } catch {
    return fail("Course could not be saved.", 500);
  }
}
