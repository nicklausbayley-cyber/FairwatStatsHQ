import "server-only";

import { NextResponse } from "next/server";
import { createAdminClient } from "../../../lib/supabase/admin";
import { getSupportAdminStatus, supportAdminStatusCode } from "../../../lib/auth/support-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET() {
  const access = await getSupportAdminStatus();
  if (!access.data) return fail(access.error, supportAdminStatusCode(access.status));

  try {
    const admin = createAdminClient();
    const [teamsResult, profilesResult, playersResult, coursesResult, seasonsResult, eventsResult, roundsResult] = await Promise.all([
      admin.from("teams").select("id,name,school_name,contact_email,created_at").order("name"),
      admin.from("profiles").select("team_id,role"),
      admin.from("players").select("team_id"),
      admin.from("courses").select("id,team_id,name,location").order("name"),
      admin.from("seasons").select("team_id,name,is_active"),
      admin.from("events").select("team_id"),
      admin.from("rounds").select("team_id")
    ]);
    const firstError = [teamsResult, profilesResult, playersResult, coursesResult, seasonsResult, eventsResult, roundsResult].find(r => r.error);
    if (firstError?.error) return fail("Support data could not be loaded.", 500);

    const counts = (rows: Array<{ team_id: string }> | null, id: string) =>
      (rows ?? []).filter(row => row.team_id === id).length;

    const teams = (teamsResult.data ?? []).map(team => ({
      ...team,
      coaches: (profilesResult.data ?? []).filter(p => p.team_id === team.id && (p.role === "coach" || p.role === "admin")).length,
      players: counts(playersResult.data, team.id),
      courses: counts(coursesResult.data, team.id),
      events: counts(eventsResult.data, team.id),
      rounds: counts(roundsResult.data, team.id),
      activeSeason: (seasonsResult.data ?? []).find(s => s.team_id === team.id && s.is_active)?.name ?? null
    }));
    return NextResponse.json({ success: true, teams, courses: coursesResult.data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return fail("Support console is temporarily unavailable.", 500);
  }
}
