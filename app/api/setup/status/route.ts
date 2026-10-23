import { NextResponse } from "next/server";
import {
  authStatusCode,
  getCurrentTeam,
  isTeamStaff
} from "../../../../lib/auth/get-current-team";
import { loadCoachSetup } from "../../../../lib/setup/load";

export const dynamic = "force-dynamic";

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" }
  });
}

/**
 * Used on sign-in to send unfinished coach accounts to /setup, while
 * returning established teams directly to their dashboard.
 */
export async function GET() {
  const result = await getCurrentTeam();

  if (!result.data) {
    return json({ success: false, message: "Sign in required." }, authStatusCode(result.status));
  }
  if (!isTeamStaff(result.data.role)) {
    return json({ success: false, message: "Coach or admin account required." }, 403);
  }

  const setup = await loadCoachSetup(result.data);
  if (setup.status !== "ready") {
    return json({ success: false, message: setup.message }, 503);
  }

  return json({
    success: true,
    complete: setup.progress.complete
  });
}
