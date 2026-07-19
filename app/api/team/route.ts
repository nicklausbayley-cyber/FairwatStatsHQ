import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  authStatusCode,
  getCurrentTeam,
  isTeamStaff
} from "../../../lib/auth/get-current-team";
import { createAdminClient } from "../../../lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

type TeamSettingsRequest = {
  input: TeamSettingsInput;
  logoFile: File | null;
};

const defaultPrimaryColor = "#166534";
const defaultSecondaryColor = "#111827";
const logoBucketName = "team-logos";
const allowedLogoMimeTypes = ["image/png", "image/jpeg", "image/webp"];
const allowedLogoExtensions = ["png", "jpg", "jpeg", "webp"];

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

function formText(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : undefined;
}

function getLogoFile(value: FormDataEntryValue | null) {
  if (typeof File === "undefined" || !(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

async function readTeamSettingsRequest(
  request: Request
): Promise<TeamSettingsRequest> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();

    return {
      input: {
        name: formText(formData, "name"),
        schoolName: formText(formData, "schoolName"),
        mascot: formText(formData, "mascot"),
        primaryColor: formText(formData, "primaryColor"),
        secondaryColor: formText(formData, "secondaryColor"),
        logoUrl: formText(formData, "logoUrl"),
        contactEmail: formText(formData, "contactEmail")
      },
      logoFile: getLogoFile(formData.get("logoFile"))
    };
  }

  return {
    input: (await request.json()) as TeamSettingsInput,
    logoFile: null
  };
}

function getLogoFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && allowedLogoExtensions.includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/jpeg") {
    return "jpg";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return null;
}

function validateLogoFile(file: File) {
  if (!allowedLogoMimeTypes.includes(file.type)) {
    return "Logo must be a PNG, JPG, JPEG, or WebP image file.";
  }

  if (!getLogoFileExtension(file)) {
    return "Logo file must end in .png, .jpg, .jpeg, or .webp.";
  }

  return null;
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

async function ensureLogoBucket(
  supabase: ReturnType<typeof createAdminClient>
) {
  const { data: bucket, error: getBucketError } = await supabase.storage.getBucket(
    logoBucketName
  );

  if (!getBucketError && bucket) {
    if (!bucket.public) {
      const { error: updateBucketError } = await supabase.storage.updateBucket(
        logoBucketName,
        {
          public: true,
          allowedMimeTypes: allowedLogoMimeTypes
        }
      );

      if (updateBucketError) {
        return `Could not make the team logo bucket public: ${updateBucketError.message}`;
      }
    }

    return null;
  }

  const { error: createBucketError } = await supabase.storage.createBucket(
    logoBucketName,
    {
      public: true,
      allowedMimeTypes: allowedLogoMimeTypes
    }
  );

  if (
    createBucketError &&
    !createBucketError.message.toLowerCase().includes("already exists")
  ) {
    return `Could not create the team logo bucket: ${createBucketError.message}`;
  }

  return null;
}

async function uploadLogoFile({
  supabase,
  teamId,
  logoFile
}: {
  supabase: ReturnType<typeof createAdminClient>;
  teamId: string;
  logoFile: File;
}) {
  const validationError = validateLogoFile(logoFile);

  if (validationError) {
    return { publicUrl: null, error: validationError };
  }

  const bucketError = await ensureLogoBucket(supabase);

  if (bucketError) {
    return { publicUrl: null, error: bucketError };
  }

  const extension = getLogoFileExtension(logoFile);

  if (!extension) {
    return { publicUrl: null, error: "Could not read the logo file type." };
  }

  const filePath = `${teamId}/${Date.now()}-${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(logoBucketName)
    .upload(filePath, logoFile, {
      cacheControl: "31536000",
      contentType: logoFile.type,
      upsert: false
    });

  if (uploadError) {
    return {
      publicUrl: null,
      error: `Could not upload team logo: ${uploadError.message}`
    };
  }

  const { data } = supabase.storage.from(logoBucketName).getPublicUrl(filePath);

  if (!data.publicUrl) {
    return { publicUrl: null, error: "Could not create a public logo URL." };
  }

  return { publicUrl: data.publicUrl, error: null };
}

export async function PATCH(request: Request) {
  let settingsRequest: TeamSettingsRequest;

  try {
    settingsRequest = await readTeamSettingsRequest(request);
  } catch {
    return jsonResult("Could not read team settings.");
  }

  const validation = validateTeamSettings(settingsRequest.input);

  if (validation.error) {
    return jsonResult(validation.error);
  }

  const teamSettings = validation.team;

  if (!teamSettings) {
    return jsonResult("Invalid team settings.");
  }

  if (settingsRequest.logoFile) {
    const logoValidationError = validateLogoFile(settingsRequest.logoFile);

    if (logoValidationError) {
      return jsonResult(logoValidationError);
    }
  }

  try {
    const currentTeam = await getCurrentTeam();

    if (!currentTeam.data) {
      return jsonResult(currentTeam.error, authStatusCode(currentTeam.status));
    }

    if (!isTeamStaff(currentTeam.data.role)) {
      return jsonResult("Only coaches and admins can update team settings.", 403);
    }

    const { supabase, team } = currentTeam.data;
    let logoUrl = teamSettings.logoUrl;

    if (settingsRequest.logoFile) {
      const adminSupabase = createAdminClient();
      const logoUpload = await uploadLogoFile({
        supabase: adminSupabase,
        teamId: team.id,
        logoFile: settingsRequest.logoFile
      });

      if (logoUpload.error) {
        return jsonResult(logoUpload.error, 500);
      }

      logoUrl = logoUpload.publicUrl;
    }

    const { data: updatedTeam, error } = await supabase
      .from("teams")
      .update({
        name: teamSettings.name,
        school_name: teamSettings.schoolName,
        mascot: teamSettings.mascot,
        primary_color: teamSettings.primaryColor,
        secondary_color: teamSettings.secondaryColor,
        logo_url: logoUrl,
        contact_email: teamSettings.contactEmail
      })
      .eq("id", team.id)
      .select("id, name, logo_url")
      .maybeSingle();

    if (error) {
      return jsonResult(`Could not update team settings: ${error.message}`, 500);
    }

    if (!updatedTeam) {
      return jsonResult("Team not found.", 404);
    }

    revalidatePath("/", "layout");
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/roster");
    revalidatePath("/events");
    revalidatePath("/statistics");
    revalidatePath("/enter-score");
    revalidatePath("/players");

    return NextResponse.json({
      success: true,
      message: `${updatedTeam.name} settings updated.`,
      logoUrl: updatedTeam.logo_url
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
