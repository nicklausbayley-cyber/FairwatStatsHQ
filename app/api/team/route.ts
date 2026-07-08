import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type TeamSettingsInput = {
  name?: string;
  schoolName?: string | null;
  mascot?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoUrl?: string | null;
  contactEmail?: string | null;
};

type ValidatedTeamSettings = {
  name: string;
  schoolName: string | null;
  mascot: string | null;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  contactEmail: string | null;
};

type TeamSettingsValidationResult =
  | { error: string; team: null }
  | { error: null; team: ValidatedTeamSettings };

const defaultPrimaryColor = "#166534";
const defaultSecondaryColor = "#111827";

function jsonResult(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}

function optionalText(value: string | null | undefined) {
  return value?.trim() || null;
}

function isHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function isValidOptionalEmail(value: string | null) {
  if (!value) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidOptionalUrl(value: string | null) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateTeamSettings(input: TeamSettingsInput): TeamSettingsValidationResult {
  const name = input.name?.trim() ?? "";
  const schoolName = optionalText(input.schoolName);
  const mascot = optionalText(input.mascot);
  const primaryColor = input.primaryColor?.trim() || defaultPrimaryColor;
  const secondaryColor = input.secondaryColor?.trim() || defaultSecondaryColor;
  const logoUrl = optionalText(input.logoUrl);
  const contactEmail = optionalText(input.contactEmail);

  if (!name) {
    return { error: "Team name is required.", team: null };
  }

  if (!isHexColor(primaryColor)) {
    return { error: "Primary color must be a valid hex color.", team: null };
  }

  if (!isHexColor(secondaryColor)) {
    return { error: "Secondary color must be a valid hex color.", team: null };
  }

  if (!isValidOptionalUrl(logoUrl)) {
    return { error: "Logo URL must be a valid http or https URL.", team: null };
  }

  if (!isValidOptionalEmail(contactEmail)) {
    return { error: "Contact email must be a valid email address.", team: null };
  }

  return {
    error: null,
    team: {
      name,
      schoolName,
      mascot,
      primaryColor,
      secondaryColor,
      logoUrl,
      contactEmail
    }
  };
}

export async function PATCH(request: Request) {
  let input: TeamSettingsInput;

  try {
    input = (await request.json()) as TeamSettingsInput;
  } catch {
    return jsonResult("Could not read team settings.");
  }

  const validation = validateTeamSettings(input);

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
      return jsonResult("No team found. Run the demo seed file before updating settings.", 404);
    }

    const { team: teamSettings } = validation;
    const { data: updatedTeam, error } = await supabase
      .from("teams")
      .update({
        name: teamSettings.name,
        school_name: teamSettings.schoolName,
        mascot: teamSettings.mascot,
        primary_color: teamSettings.primaryColor,
        secondary_color: teamSettings.secondaryColor,
        logo_url: teamSettings.logoUrl,
        contact_email: teamSettings.contactEmail
      })
      .eq("id", team.id)
      .select("id, name")
      .maybeSingle();

    if (error) {
      return jsonResult(`Could not update team settings: ${error.message}`, 500);
    }

    if (!updatedTeam) {
      return jsonResult("Team not found.", 404);
    }

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/roster");
    revalidatePath("/events");

    return NextResponse.json({
      success: true,
      message: `${updatedTeam.name} settings updated.`
    });
  } catch (error) {
    return jsonResult(
      error instanceof Error
        ? error.message
        : "Could not update team settings. Please try again.",
      500
    );
  }
}
