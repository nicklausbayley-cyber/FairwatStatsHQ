import "server-only";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isSameOriginRequest } from "../../../lib/auth/same-origin";
import type { User } from "@supabase/supabase-js";
import {
  getPlatformAdminStatus,
  platformAdminStatusCode
} from "../../../lib/auth/platform-admin";
import { createAdminClient } from "../../../lib/supabase/admin";
import type { Database } from "../../../lib/supabase/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AdminSupabaseClient = ReturnType<typeof createAdminClient>;
type PlatformAdminData = NonNullable<
  Awaited<ReturnType<typeof getPlatformAdminStatus>>["data"]
>;
type PlatformAdminGuard =
  | { data: PlatformAdminData; response: null }
  | { data: null; response: NextResponse };
type AdminClientGuard =
  | { supabase: AdminSupabaseClient; response: null }
  | { supabase: null; response: NextResponse };
type JsonBody = Record<string, unknown>;
type StaffRole = "admin" | "coach";
type ProfileRole = StaffRole | "player";
type AccountStatus = "active" | "invited" | "not_connected";
type AccountStatusItem = {
  id: string;
  teamId: string;
  profileId: string | null;
  playerId: string | null;
  name: string;
  email: string | null;
  role: ProfileRole;
  status: AccountStatus;
  lastSignInAt: string | null;
};
type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"];
type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];

const staffRoles = new Set<StaffRole>(["admin", "coach"]);
const defaultPrimaryColor = "#166534";
const defaultSecondaryColor = "#111827";
const maxAuthUserPages = 20;

function jsonResult(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

async function requirePlatformAdminForApi(): Promise<PlatformAdminGuard> {
  const platformAdmin = await getPlatformAdminStatus();

  if (!platformAdmin.data) {
    return {
      data: null,
      response: jsonResult(
        platformAdmin.error,
        platformAdminStatusCode(platformAdmin.status)
      )
    };
  }

  return { data: platformAdmin.data, response: null };
}

function getAdminClientForApi(): AdminClientGuard {
  try {
    return { supabase: createAdminClient(), response: null };
  } catch (error) {
    return {
      supabase: null,
      response: jsonResult(
        error instanceof Error
          ? error.message
          : "Supabase admin client is not configured.",
        500
      )
    };
  }
}

function readBodyObject(value: unknown): JsonBody {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonBody;
  }

  return {};
}

function readText(body: JsonBody, key: string) {
  const value = body[key];

  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(body: JsonBody, key: string) {
  const value = body[key];

  return value === true || value === "true";
}

function optionalText(value: string) {
  return value || null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidColor(color: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

function isValidOptionalDate(date: string | null) {
  if (!date) {
    return true;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00`));
}

function isStaffRole(role: string): role is StaffRole {
  return staffRoles.has(role as StaffRole);
}

function revalidateOnboardingViews() {
  [
    "/onboarding",
    "/dashboard",
    "/roster",
    "/players",
    "/events",
    "/courses",
    "/enter-score",
    "/statistics",
    "/settings"
  ].forEach((path) => revalidatePath(path));
  revalidatePath("/players/[id]", "page");
}

function getAccountSetupRedirect(request: Request) {
  const configuredAppUrl = process.env.APP_URL?.trim();
  const requestOrigin = new URL(request.url).origin;
  const appOrigin = configuredAppUrl || requestOrigin;

  return new URL("/account-setup", appOrigin).toString();
}

async function readJsonBody(request: Request) {
  try {
    return readBodyObject(await request.json());
  } catch {
    return null;
  }
}

async function ensureTeamExists(
  supabase: AdminSupabaseClient,
  teamId: string
) {
  const { data: team, error } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", teamId)
    .maybeSingle();

  if (error) {
    return { team: null, error: `Could not verify team: ${error.message}` };
  }

  if (!team) {
    return { team: null, error: "Choose a valid team." };
  }

  return { team, error: null };
}

async function findAuthUserByEmail(
  supabase: AdminSupabaseClient,
  email: string
) {
  const targetEmail = normalizeEmail(email);

  for (let page = 1; page <= maxAuthUserPages; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000
    });

    if (error) {
      return { user: null, error: error.message };
    }

    const user = data.users.find(
      (candidate) => normalizeEmail(candidate.email ?? "") === targetEmail
    );

    if (user) {
      return { user, error: null };
    }

    if (data.users.length < 1000) {
      break;
    }
  }

  return { user: null, error: null };
}

function getAccountStatus(user: User | undefined): AccountStatus {
  if (!user) {
    return "not_connected";
  }

  return user.email_confirmed_at ? "active" : "invited";
}

async function listAllAuthUsers(
  supabase: AdminSupabaseClient
): Promise<
  | { users: User[]; error: null }
  | { users: []; error: string }
> {
  const users: User[] = [];

  for (let page = 1; page <= maxAuthUserPages; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000
    });

    if (error) {
      return {
        users: [],
        error: error.message
      };
    }

    users.push(...data.users);

    if (data.users.length < 1000) {
      break;
    }
  }

  return {
    users,
    error: null
  };
}

async function getOrInviteAuthUser({
  supabase,
  email,
  fullName,
  redirectTo
}: {
  supabase: AdminSupabaseClient;
  email: string;
  fullName: string;
  redirectTo: string;
}): Promise<
  | { user: User; existed: boolean; error: null }
  | { user: null; existed: false; error: string }
> {
  const existingUser = await findAuthUserByEmail(supabase, email);

  if (existingUser.error) {
    return {
      user: null,
      existed: false,
      error: `Could not check existing Auth users: ${existingUser.error}`
    };
  }

  if (existingUser.user) {
    return {
      user: existingUser.user,
      existed: true,
      error: null
    };
  }

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    data: {
      full_name: fullName
    }
  });

  if (error) {
    return {
      user: null,
      existed: false,
      error: error.message
    };
  }

  if (!data.user) {
    return {
      user: null,
      existed: false,
      error: "Supabase did not return the invited Auth user."
    };
  }

  return {
    user: data.user,
    existed: false,
    error: null
  };
}

async function upsertProfile({
  supabase,
  userId,
  teamId,
  role,
  fullName,
  email
}: {
  supabase: AdminSupabaseClient;
  userId: string;
  teamId: string;
  role: ProfileRole;
  fullName: string;
  email: string;
}) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      team_id: teamId,
      role,
      full_name: fullName,
      email
    },
    { onConflict: "id" }
  );

  return error;
}

async function handleCreateTeam(
  supabase: AdminSupabaseClient,
  body: JsonBody
) {
  const name = readText(body, "teamName");
  const schoolName = readText(body, "schoolName");
  const mascot = readText(body, "mascot");
  const primaryColor = readText(body, "primaryColor") || defaultPrimaryColor;
  const secondaryColor = readText(body, "secondaryColor") || defaultSecondaryColor;
  const contactEmail = normalizeEmail(readText(body, "contactEmail"));

  if (!name) {
    return jsonResult("Team name is required.");
  }

  if (!isValidColor(primaryColor)) {
    return jsonResult("Primary color must be a valid hex color.");
  }

  if (!isValidColor(secondaryColor)) {
    return jsonResult("Secondary color must be a valid hex color.");
  }

  if (contactEmail && !isValidEmail(contactEmail)) {
    return jsonResult("Contact email must be a valid email address.");
  }

  const insertTeam: TeamInsert = {
    name,
    school_name: optionalText(schoolName),
    mascot: optionalText(mascot),
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    contact_email: optionalText(contactEmail)
  };

  const { data: team, error } = await supabase
    .from("teams")
    .insert(insertTeam)
    .select(
      "id, name, school_name, mascot, primary_color, secondary_color, contact_email"
    )
    .maybeSingle();

  if (error) {
    return jsonResult(`Could not create team: ${error.message}`, 500);
  }

  if (!team) {
    return jsonResult("Team was not created.", 500);
  }

  revalidateOnboardingViews();

  return NextResponse.json(
    {
      success: true,
      message: `${team.name} created.`,
      team,
      teamId: team.id
    },
    { status: 201 }
  );
}

async function handleCreateStaffLogin(
  supabase: AdminSupabaseClient,
  body: JsonBody,
  redirectTo: string
) {
  const teamId = readText(body, "teamId");
  const fullName = readText(body, "fullName");
  const email = normalizeEmail(readText(body, "email"));
  const role = readText(body, "role");

  if (!teamId) return jsonResult("Choose a team for this login.");
  if (!fullName) return jsonResult("Coach/admin full name is required.");
  if (!email || !isValidEmail(email)) return jsonResult("Coach/admin email must be valid.");
  if (!isStaffRole(role)) return jsonResult("Role must be admin or coach.");

  const teamCheck = await ensureTeamExists(supabase, teamId);
  if (teamCheck.error) return jsonResult(teamCheck.error);

  const authUser = await getOrInviteAuthUser({ supabase, email, fullName, redirectTo });
  if (authUser.error || !authUser.user) {
    return jsonResult(`Could not create Auth user: ${authUser.error}`, 500);
  }

  const { data: existingProfile, error: lookupError } = await supabase
    .from("profiles")
    .select("id, team_id, role")
    .eq("id", authUser.user.id)
    .maybeSingle();

  if (lookupError) return jsonResult(`Could not verify profile: ${lookupError.message}`, 500);
  if (existingProfile?.role === "player") {
    return jsonResult(
      "This email belongs to a player account. Review the account before granting coaching access.",
      409
    );
  }

  if (!existingProfile) {
    const profileError = await upsertProfile({
      supabase,
      userId: authUser.user.id,
      teamId,
      role,
      fullName,
      email
    });
    if (profileError) {
      return jsonResult(`Could not save profile: ${profileError.message}`, 500);
    }
  }
  // Existing staff profile is intentionally NOT overwritten when a second team is added.
  // Profile role/team_id remain the original home assignment; team-specific roles
  // are stored in staff_team_access.
  const { error: membershipError } = await supabase
    .from("staff_team_access")
    .upsert(
      { user_id: authUser.user.id, team_id: teamId, role },
      { onConflict: "user_id,team_id" }
    );

  if (membershipError) {
    return jsonResult(`Could not assign coach to team: ${membershipError.message}`, 500);
  }

  revalidateOnboardingViews();
  return NextResponse.json(
    {
      success: true,
      message: authUser.existed
        ? `${fullName} now has ${role} access to ${teamCheck.team?.name}. Their existing login and other team assignments remain unchanged.`
        : `Account invitation sent to ${email}. ${fullName} can create a password from the email.`,
      userId: authUser.user.id
    },
    { status: authUser.existed ? 200 : 201 }
  );
}

async function handleRemoveStaffTeamAccess(
  supabase: AdminSupabaseClient,
  body: JsonBody,
  actorUserId: string
) {
  const userId = readText(body, "userId");
  const teamId = readText(body, "teamId");
  const expectedEmail = normalizeEmail(readText(body, "email"));

  if (!userId || !teamId || !expectedEmail) {
    return jsonResult("Choose a coach and the specific team to remove.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return jsonResult(`Could not verify coach: ${profileError.message}`, 500);
  }

  if (!profile || !isStaffRole(profile.role)) {
    return jsonResult("That account is not an assigned coach or team admin.", 404);
  }

  if (normalizeEmail(profile.email) !== expectedEmail) {
    return jsonResult("Coach account changed. Refresh the account list and try again.", 409);
  }

  const teamCheck = await ensureTeamExists(supabase, teamId);
  if (teamCheck.error) return jsonResult(teamCheck.error, 404);

  // Database RPC locks the staff profile and performs the home-team transfer,
  // membership deletion and audit insert atomically.
  const { data, error } = await supabase.rpc("revoke_staff_team_access", {
    target_user_id: userId,
    target_team_id: teamId,
    actor_user_id: actorUserId
  });

  if (error) {
    if (error.message.includes("LAST_TEAM_ASSIGNMENT")) {
      return jsonResult("You cannot remove the coach's last team. Assign another team first.", 409);
    }
    if (error.message.includes("TEAM_ASSIGNMENT_NOT_FOUND")) {
      return jsonResult("This team is no longer assigned to the coach. Refresh the list.", 409);
    }
    return jsonResult(`Could not remove team access: ${error.message}`, 500);
  }

  revalidateOnboardingViews();

  return NextResponse.json({
    success: true,
    message: `${profile.full_name} no longer has access to ${teamCheck.team?.name}. Their remaining teams and login are unchanged.`,
    result: data
  }, { headers: { "Cache-Control": "no-store" } });
}

function parseRosterLines(rosterText: string) {
  const lines = rosterText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const players: Array<Omit<PlayerInsert, "team_id">> = [];

  for (const [index, line] of lines.entries()) {
    const [namePart, yearPart] = line.split(",", 2);
    const nameParts = namePart.trim().replace(/\s+/g, " ").split(" ");

    if (nameParts.length < 2) {
      return {
        players: [],
        error: `Line ${index + 1} needs first and last name.`
      };
    }

    let graduationYear: number | null = null;

    if (yearPart !== undefined && yearPart.trim()) {
      graduationYear = Number(yearPart.trim());

      if (
        !Number.isInteger(graduationYear) ||
        graduationYear < 2000 ||
        graduationYear > 2100
      ) {
        return {
          players: [],
          error: `Line ${index + 1} has an invalid graduation year.`
        };
      }
    }

    players.push({
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(" "),
      graduation_year: graduationYear,
      status: "active"
    });
  }

  return { players, error: null };
}

async function handleAddPlayers(
  supabase: AdminSupabaseClient,
  body: JsonBody
) {
  const teamId = readText(body, "teamId");
  const rosterText = readText(body, "rosterText");

  if (!teamId) {
    return jsonResult("Choose a team before adding players.");
  }

  if (!rosterText) {
    return jsonResult("Paste at least one player.");
  }

  const teamCheck = await ensureTeamExists(supabase, teamId);

  if (teamCheck.error) {
    return jsonResult(teamCheck.error);
  }

  const parsedRoster = parseRosterLines(rosterText);

  if (parsedRoster.error) {
    return jsonResult(parsedRoster.error);
  }

  if (parsedRoster.players.length === 0) {
    return jsonResult("Paste at least one player.");
  }

  const players = parsedRoster.players.map((player) => ({
    ...player,
    team_id: teamId
  }));

  const { error } = await supabase.from("players").insert(players);

  if (error) {
    return jsonResult(`Could not add players: ${error.message}`, 500);
  }

  revalidateOnboardingViews();

  return NextResponse.json(
    {
      success: true,
      message: `${players.length} player${players.length === 1 ? "" : "s"} added to ${teamCheck.team?.name}.`,
      count: players.length
    },
    { status: 201 }
  );
}

async function handleCreatePlayerLogin(
  supabase: AdminSupabaseClient,
  body: JsonBody,
  redirectTo: string
) {
  const teamId = readText(body, "teamId");
  const playerId = readText(body, "playerId");
  const email = normalizeEmail(readText(body, "playerEmail"));

  if (!teamId) {
    return jsonResult("Choose a team for this player login.");
  }

  if (!playerId) {
    return jsonResult("Choose a player.");
  }

  if (!email || !isValidEmail(email)) {
    return jsonResult("Player email must be valid.");
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .eq("id", playerId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (playerError) {
    return jsonResult(`Could not find player: ${playerError.message}`, 500);
  }

  if (!player) {
    return jsonResult("Choose a valid player for this team.", 404);
  }

  const fullName = `${player.first_name} ${player.last_name}`;
  const authUser = await getOrInviteAuthUser({
    supabase,
    email,
    fullName,
    redirectTo
  });

  if (authUser.error || !authUser.user) {
    return jsonResult(`Could not create Auth user: ${authUser.error}`, 500);
  }

  const { data: priorProfile, error: priorProfileError } = await supabase
    .from("profiles")
    .select("team_id, role")
    .eq("id", authUser.user.id)
    .maybeSingle();
  if (priorProfileError) {
    return jsonResult(`Could not verify existing account: ${priorProfileError.message}`, 500);
  }
  if (priorProfile && (priorProfile.role !== "player" || priorProfile.team_id !== teamId)) {
    return jsonResult(
      "This email is already assigned to another role or team. Review the existing account instead of replacing it.",
      409
    );
  }

  const profileError = await upsertProfile({
    supabase,
    userId: authUser.user.id,
    teamId,
    role: "player",
    fullName,
    email
  });

  if (profileError) {
    return jsonResult(`Could not save player profile: ${profileError.message}`, 500);
  }

  const { error: playerUpdateError } = await supabase
    .from("players")
    .update({ profile_id: authUser.user.id })
    .eq("id", player.id)
    .eq("team_id", teamId);

  if (playerUpdateError) {
    return jsonResult(
      `Could not connect player profile: ${playerUpdateError.message}`,
      500
    );
  }

  revalidateOnboardingViews();

  return NextResponse.json(
    {
      success: true,
      message: authUser.existed
        ? `${fullName} was connected to the existing Auth user. This email already has an account, so no new invitation was sent.`
        : `Account invitation sent to ${email}. ${fullName} can create a password from the email.`,
      userId: authUser.user.id
    },
    { status: authUser.existed ? 200 : 201 }
  );
}

async function handleResendInvitation(
  supabase: AdminSupabaseClient,
  body: JsonBody,
  redirectTo: string
) {
  const email = normalizeEmail(readText(body, "email"));

  if (!email || !isValidEmail(email)) {
    return jsonResult("Enter a valid email address.");
  }

  const existingUser = await findAuthUserByEmail(supabase, email);

  if (existingUser.error) {
    return jsonResult(
      `Could not check the existing Auth user: ${existingUser.error}`,
      500
    );
  }

  if (!existingUser.user) {
    return jsonResult(
      "No invited account was found for that email. Send an initial invitation first.",
      404
    );
  }

  if (existingUser.user.email_confirmed_at) {
    return jsonResult(
      "This account is already active. The user should use Forgot password instead.",
      409
    );
  }

  const metadata = existingUser.user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === "string" ? metadata.full_name.trim() : "";

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo,
    ...(fullName
      ? {
          data: {
            full_name: fullName
          }
        }
      : {})
  });

  if (error) {
    return jsonResult(
      `Could not resend the invitation: ${error.message}`,
      500
    );
  }

  return NextResponse.json({
    success: true,
    message: `A new account invitation was sent to ${email}.`
  });
}

async function handleCreateSeason(
  supabase: AdminSupabaseClient,
  body: JsonBody
) {
  const teamId = readText(body, "teamId");
  const name = readText(body, "seasonName");
  const startsOn = optionalText(readText(body, "startsOn"));
  const endsOn = optionalText(readText(body, "endsOn"));
  const setActive = readBoolean(body, "setActive");

  if (!teamId) {
    return jsonResult("Choose a team for this season.");
  }

  if (!name) {
    return jsonResult("Season name is required.");
  }

  if (!isValidOptionalDate(startsOn)) {
    return jsonResult("Start date must be a valid date.");
  }

  if (!isValidOptionalDate(endsOn)) {
    return jsonResult("End date must be a valid date.");
  }

  if (startsOn && endsOn && startsOn > endsOn) {
    return jsonResult("End date must be after the start date.");
  }

  const teamCheck = await ensureTeamExists(supabase, teamId);

  if (teamCheck.error) {
    return jsonResult(teamCheck.error);
  }

  if (setActive) {
    const { error: clearActiveError } = await supabase
      .from("seasons")
      .update({ is_active: false })
      .eq("team_id", teamId);

    if (clearActiveError) {
      return jsonResult(
        `Could not clear active seasons: ${clearActiveError.message}`,
        500
      );
    }
  }

  const { data: season, error } = await supabase
    .from("seasons")
    .insert({
      team_id: teamId,
      name,
      starts_on: startsOn,
      ends_on: endsOn,
      is_active: setActive
    })
    .select("id, name, is_active")
    .maybeSingle();

  if (error) {
    return jsonResult(`Could not create season: ${error.message}`, 500);
  }

  if (!season) {
    return jsonResult("Season was not created.", 500);
  }

  revalidateOnboardingViews();

  return NextResponse.json(
    {
      success: true,
      message: season.is_active
        ? `${season.name} created and set active.`
        : `${season.name} created.`,
      seasonId: season.id
    },
    { status: 201 }
  );
}

export async function GET() {
  const platformAdmin = await requirePlatformAdminForApi();

  if (!platformAdmin.data) {
    return platformAdmin.response;
  }

  const adminClient = getAdminClientForApi();

  if (!adminClient.supabase) {
    return adminClient.response;
  }

  const [teamsResult, playersResult, profilesResult, staffAccessResult, authUsersResult] =
    await Promise.all([
      adminClient.supabase
        .from("teams")
        .select(
          "id, name, school_name, mascot, primary_color, secondary_color, contact_email"
        )
        .order("name", { ascending: true }),
      adminClient.supabase
        .from("players")
        .select(
          "id, team_id, first_name, last_name, graduation_year, status, profile_id"
        )
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true }),
      adminClient.supabase
        .from("profiles")
        .select("id, team_id, role, full_name, email")
        .order("full_name", { ascending: true }),
      adminClient.supabase
        .from("staff_team_access")
        .select("user_id, team_id, role"),
      listAllAuthUsers(adminClient.supabase)
    ]);

  if (teamsResult.error) {
    return jsonResult(
      `Could not load teams: ${teamsResult.error.message}`,
      500
    );
  }

  if (playersResult.error) {
    return jsonResult(
      `Could not load players: ${playersResult.error.message}`,
      500
    );
  }

  if (profilesResult.error) {
    return jsonResult(
      `Could not load profiles: ${profilesResult.error.message}`,
      500
    );
  }

  if (staffAccessResult.error) {
    return jsonResult(
      `Could not load staff team assignments: ${staffAccessResult.error.message}`,
      500
    );
  }

  if (authUsersResult.error) {
    return jsonResult(
      `Could not load account statuses: ${authUsersResult.error}`,
      500
    );
  }

  const teams = teamsResult.data ?? [];
  const players = playersResult.data ?? [];
  const profiles = profilesResult.data ?? [];

  const authUsersById = new Map(
    authUsersResult.users.map((user) => [user.id, user])
  );

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );

  const teamNamesById = new Map(
    teams.map((team) => [team.id, team.name])
  );

  const staffAccounts: AccountStatusItem[] = [];
  for (const access of staffAccessResult.data ?? []) {
    const profile = profilesById.get(access.user_id);
    if (!profile) continue;
    const authUser = authUsersById.get(access.user_id);
    staffAccounts.push({
      id: `staff-${access.user_id}-${access.team_id}`,
      teamId: access.team_id,
      profileId: access.user_id,
      playerId: null,
      name: profile.full_name,
      email: profile.email || authUser?.email || null,
      role: access.role,
      status: getAccountStatus(authUser),
      lastSignInAt: authUser?.last_sign_in_at ?? null
    });
  }

  const playerAccounts: AccountStatusItem[] = players.map((player) => {
    const profile = player.profile_id
      ? profilesById.get(player.profile_id)
      : undefined;

    const authUser = player.profile_id
      ? authUsersById.get(player.profile_id)
      : undefined;

    return {
      id: `player-${player.id}`,
      teamId: player.team_id,
      profileId: player.profile_id,
      playerId: player.id,
      name: `${player.first_name} ${player.last_name}`,
      email: profile?.email || authUser?.email || null,
      role: "player",
      status: getAccountStatus(authUser),
      lastSignInAt: authUser?.last_sign_in_at ?? null
    };
  });

  const roleOrder: Record<ProfileRole, number> = {
    admin: 0,
    coach: 1,
    player: 2
  };

  const accounts = [...staffAccounts, ...playerAccounts].sort(
    (first, second) =>
      (teamNamesById.get(first.teamId) ?? "").localeCompare(
        teamNamesById.get(second.teamId) ?? ""
      ) ||
      roleOrder[first.role] - roleOrder[second.role] ||
      first.name.localeCompare(second.name)
  );

  return NextResponse.json({
    success: true,
    teams,
    players,
    accounts
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonResult("Invalid request origin.", 403);
  }

  const platformAdmin = await requirePlatformAdminForApi();

  if (!platformAdmin.data) {
    return platformAdmin.response;
  }

  const body = await readJsonBody(request);

  if (!body) {
    return jsonResult("Could not read onboarding request.");
  }

  const action = readText(body, "action");
  const accountSetupRedirect = getAccountSetupRedirect(request);
  const adminClient = getAdminClientForApi();

  if (!adminClient.supabase) {
    return adminClient.response;
  }

  switch (action) {
    case "create-team":
      return handleCreateTeam(adminClient.supabase, body);
    case "create-staff-login":
      return handleCreateStaffLogin(adminClient.supabase, body, accountSetupRedirect);
    case "remove-staff-team-access":
      return handleRemoveStaffTeamAccess(
        adminClient.supabase,
        body,
        platformAdmin.data.user.id
      );
    case "add-players":
      return handleAddPlayers(adminClient.supabase, body);
    case "create-player-login":
      return handleCreatePlayerLogin(adminClient.supabase, body, accountSetupRedirect);
    case "resend-invitation":
      return handleResendInvitation(
        adminClient.supabase,
        body,
        accountSetupRedirect
      );
    case "create-season":
      return handleCreateSeason(adminClient.supabase, body);
    default:
      return jsonResult("Choose a valid onboarding action.");
  }
}
