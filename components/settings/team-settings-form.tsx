"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

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
};

const defaultPrimaryColor = "#166534";
const defaultSecondaryColor = "#111827";

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

export function TeamSettingsForm({ team }: { team: TeamSettings }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => createInitialState(team));
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<Field extends keyof FormState>(
    field: Field,
    value: FormState[Field]
  ) {
    setForm((current) => ({ ...current, [field]: value }));
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
      const response = await fetch("/api/team", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: form.name.trim(),
          schoolName: form.schoolName.trim() || null,
          mascot: form.mascot.trim() || null,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          logoUrl: form.logoUrl.trim() || null,
          contactEmail: form.contactEmail.trim() || null
        })
      });
      const result = (await response.json()) as TeamSettingsResult;

      if (!response.ok || !result.success) {
        setMessage({
          type: "error",
          text: result.message || "Could not update team settings. Please try again."
        });
        return;
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
            <TextField
              label="Logo URL"
              type="url"
              value={form.logoUrl}
              onChange={(value) => updateField("logoUrl", value)}
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

      <BrandPreview form={form} />
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
  type?: "text" | "email" | "url";
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

function BrandPreview({ form }: { form: FormState }) {
  const initials = form.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("") || "FS";

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
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-lg font-bold"
              style={{ backgroundColor: form.secondaryColor }}
            >
              {initials}
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
            <span>Logo URL</span>
            <span className="truncate text-right">
              {form.logoUrl || "Not set"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
