"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent
} from "react";

type TeamSettings = {
  name: string;
  schoolName: string | null;
  mascot: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
  contactEmail: string | null;
};

type FormState = {
  name: string;
  schoolName: string;
  mascot: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  contactEmail: string;
};

type FormMessage = {
  type: "success" | "error";
  text: string;
};

type TeamSettingsResult = {
  success: boolean;
  message: string;
  logoUrl?: string | null;
};

const defaultPrimaryColor = "#166534";
const defaultSecondaryColor = "#111827";
const allowedLogoMimeTypes = ["image/png", "image/jpeg", "image/webp"];

function createInitialState(team: TeamSettings): FormState {
  return {
    name: team.name,
    schoolName: team.schoolName ?? "",
    mascot: team.mascot ?? "",
    primaryColor: team.primaryColor ?? defaultPrimaryColor,
    secondaryColor: team.secondaryColor ?? defaultSecondaryColor,
    logoUrl: team.logoUrl ?? "",
    contactEmail: team.contactEmail ?? ""
  };
}

function validateForm(form: FormState) {
  if (!form.name.trim()) {
    return "Team name is required.";
  }

  return null;
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "FS"
  );
}

export function TeamSettingsForm({ team }: { team: TeamSettings }) {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<FormState>(() => createInitialState(team));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(form.logoUrl);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl(form.logoUrl);
      return;
    }

    const previewUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [form.logoUrl, logoFile]);

  function updateField<Field extends keyof FormState>(
    field: Field,
    value: FormState[Field]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setLogoFile(null);
      return;
    }

    if (!allowedLogoMimeTypes.includes(file.type)) {
      setLogoFile(null);
      event.target.value = "";
      setMessage({
        type: "error",
        text: "Choose a PNG, JPG, JPEG, or WebP image file."
      });
      return;
    }

    setMessage(null);
    setLogoFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const validationError = validateForm(form);

    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody = new FormData();
      requestBody.append("name", form.name.trim());
      requestBody.append("schoolName", form.schoolName.trim());
      requestBody.append("mascot", form.mascot.trim());
      requestBody.append("primaryColor", form.primaryColor);
      requestBody.append("secondaryColor", form.secondaryColor);
      requestBody.append("logoUrl", form.logoUrl.trim());
      requestBody.append("contactEmail", form.contactEmail.trim());

      if (logoFile) {
        requestBody.append("logoFile", logoFile);
      }

      const response = await fetch("/api/team", {
        method: "PATCH",
        body: requestBody
      });
      const result = (await response.json()) as TeamSettingsResult;

      if (!response.ok || !result.success) {
        setMessage({
          type: "error",
          text: result.message || "Could not update team settings. Please try again."
        });
        return;
      }

      if (result.logoUrl !== undefined) {
        setForm((current) => ({ ...current, logoUrl: result.logoUrl ?? "" }));
      }

      setLogoFile(null);

      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }

      setMessage({ type: "success", text: result.message });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not update team settings. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Team Settings
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
            Branding Details
          </h2>
        </div>

        {message ? (
          <div
            className={
              message.type === "success"
                ? "rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-900"
                : "rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900"
            }
          >
            {message.text}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Team name"
            value={form.name}
            onChange={(value) => updateField("name", value)}
            required
          />
          <TextField
            label="School name"
            value={form.schoolName}
            onChange={(value) => updateField("schoolName", value)}
          />
          <TextField
            label="Mascot"
            value={form.mascot}
            onChange={(value) => updateField("mascot", value)}
          />
          <TextField
            label="Contact email"
            type="email"
            value={form.contactEmail}
            onChange={(value) => updateField("contactEmail", value)}
          />
          <ColorField
            label="Primary color"
            value={form.primaryColor}
            onChange={(value) => updateField("primaryColor", value)}
          />
          <ColorField
            label="Secondary color"
            value={form.secondaryColor}
            onChange={(value) => updateField("secondaryColor", value)}
          />
          <div className="md:col-span-2">
            <LogoUploadField
              inputRef={logoInputRef}
              logoFileName={logoFile?.name ?? null}
              logoPreviewUrl={logoPreviewUrl}
              teamName={form.name}
              onChange={handleLogoChange}
            />
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 pt-5">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-green-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isSubmitting ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>

      <BrandPreview form={form} logoPreviewUrl={logoPreviewUrl} />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  required?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 focus-within:border-green-700 focus-within:ring-2 focus-within:ring-green-100">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-gray-200 bg-white"
        />
        <span className="font-mono text-sm text-gray-700">{value}</span>
      </div>
    </label>
  );
}

function LogoUploadField({
  inputRef,
  logoFileName,
  logoPreviewUrl,
  teamName,
  onChange
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  logoFileName: string | null;
  logoPreviewUrl: string;
  teamName: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const initials = getInitials(teamName);

  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-gray-700">Team logo</span>
      <div className="flex flex-col gap-4 rounded-md border border-gray-200 bg-white p-4 sm:flex-row sm:items-center">
        <div
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-green-900 text-lg font-bold text-white ring-1 ring-gray-200"
          style={
            logoPreviewUrl
              ? {
                  backgroundImage: `url(${logoPreviewUrl})`,
                  backgroundPosition: "center",
                  backgroundSize: "cover"
                }
              : undefined
          }
          aria-label="Current team logo preview"
        >
          {logoPreviewUrl ? null : initials}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
            onChange={onChange}
            className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-green-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-green-900"
          />
          <p className="text-xs leading-5 text-gray-500">
            Square PNG or JPG logos work best.
          </p>
          <p className="text-xs font-medium text-gray-600">
            {logoFileName
              ? `Ready to upload: ${logoFileName}`
              : logoPreviewUrl
                ? "Current logo will stay unless you choose a new file."
                : "No logo uploaded yet."}
          </p>
        </div>
      </div>
    </div>
  );
}

function BrandPreview({
  form,
  logoPreviewUrl
}: {
  form: FormState;
  logoPreviewUrl: string;
}) {
  const initials = getInitials(form.name);

  return (
    <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
        Preview
      </p>
      <div
        className="mt-5 overflow-hidden rounded-lg border shadow-sm"
        style={{ borderColor: form.secondaryColor }}
      >
        <div
          className="p-5 text-white"
          style={{ backgroundColor: form.primaryColor }}
        >
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-lg font-bold ring-1 ring-white/20"
              style={{
                backgroundColor: form.secondaryColor,
                ...(logoPreviewUrl
                  ? {
                      backgroundImage: `url(${logoPreviewUrl})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover"
                    }
                  : {})
              }}
            >
              {logoPreviewUrl ? null : initials}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                Fairway Stats HQ
              </p>
              <h3 className="mt-1 text-xl font-bold leading-tight">
                {form.name || "Team Name"}
              </h3>
              <p className="mt-1 text-sm opacity-90">
                {form.schoolName || "School name"}
                {form.mascot ? ` | ${form.mascot}` : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3 bg-white p-5 text-sm text-gray-700">
          <div className="flex items-center justify-between gap-3">
            <span>Primary</span>
            <span className="font-mono">{form.primaryColor}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Secondary</span>
            <span className="font-mono">{form.secondaryColor}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Contact</span>
            <span className="truncate text-right">
              {form.contactEmail || "Not set"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Logo</span>
            <span className="truncate text-right">
              {logoPreviewUrl ? "Uploaded" : "Not set"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
