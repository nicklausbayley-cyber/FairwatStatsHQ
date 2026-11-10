import { NextResponse } from "next/server";
import { isSameOriginRequest } from "../../../lib/auth/same-origin";
import {
  getCurrentTeam,
  isTeamStaff,
  selectedTeamCookie
} from "../../../lib/auth/get-current-team";

export const dynamic = "force-dynamic";

function respond(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(request: Request) {
  // Team selection changes an HTTP-only cookie. Block cross-origin requests.
  if (!isSameOriginRequest(request)) {
    return respond("Invalid request origin.", 403);
  }

  const current = await getCurrentTeam();
  if (!current.data) {
    return respond(current.error, current.status === "unauthenticated" ? 401 : 403);
  }
  if (!isTeamStaff(current.data.role)) {
    return respond("Only coaches and team admins may switch teams.", 403);
  }

  let body: { teamId?: unknown };
  try {
    body = await request.json();
  } catch {
    return respond("Enter a valid team selection.", 400);
  }

  const teamId = typeof body.teamId === "string" ? body.teamId.trim() : "";
  if (!teamId || !current.data.availableTeams.some((team) => team.id === teamId)) {
    return respond("This team is not assigned to your account.", 403);
  }

  const response = NextResponse.json(
    { success: true, teamId },
    { headers: { "Cache-Control": "no-store" } }
  );
  response.cookies.set(selectedTeamCookie, teamId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90
  });
  return response;
}
