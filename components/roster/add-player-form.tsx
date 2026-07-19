"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  FormSection,
  Message,
  inputClassName,
  primaryButtonClassName
} from "../ui/primitives";

type FormState = {
  firstName: string;
  lastName: string;
  graduationYear: string;
  status: "active" | "inactive";
};

type FormMessage = {
  type: "success" | "error";
  text: string;
};

type CreatePlayerResult = {
  success: boolean;
  message: string;
};

const initialFormState: FormState = {
  firstName: "",
  lastName: "",
  graduationYear: "",
  status: "active"
};

function parseGraduationYear(value: string) {
  if (value.trim() === "") {
    return null;
  }

  return Number(value);
}

function validateForm(form: FormState) {
  if (!form.firstName.trim()) {
    return "First name is required.";
  }

  if (!form.lastName.trim()) {
    return "Last name is required.";
  }

  const graduationYear = parseGraduationYear(form.graduationYear);

  if (
    graduationYear !== null &&
    (!Number.isInteger(graduationYear) || graduationYear < 2000 || graduationYear > 2100)
  ) {
    return "Graduation year must be a valid four-digit year.";
  }

  return null;
}

export function AddPlayerForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFormState);
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
      const response = await fetch("/api/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          graduationYear: parseGraduationYear(form.graduationYear),
          status: form.status
        })
      });
      const result = (await response.json()) as CreatePlayerResult;

      if (!response.ok || !result.success) {
        setMessage({
          type: "error",
          text: result.message || "Could not add player. Please try again."
        });
        return;
      }

      setForm(initialFormState);
      setMessage({ type: "success", text: result.message });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not add player. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-0"
    >
      <FormSection
        eyebrow="Roster Management"
        title="Add Player"
        description="Add a golfer to the active team roster. Player account linking can be handled later through their profile record."
        footer={
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={primaryButtonClassName}
            >
              {isSubmitting ? "Adding..." : "Add Player"}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {message ? <Message type={message.type}>{message.text}</Message> : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">First name</span>
              <input
                type="text"
                value={form.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                required
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Last name</span>
              <input
                type="text"
                value={form.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                required
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Graduation year
              </span>
              <input
                type="number"
                value={form.graduationYear}
                onChange={(event) => updateField("graduationYear", event.target.value)}
                min={2000}
                max={2100}
                inputMode="numeric"
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Status</span>
              <select
                value={form.status}
                onChange={(event) =>
                  updateField("status", event.target.value as FormState["status"])
                }
                className={inputClassName}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
        </div>
      </FormSection>
    </form>
  );
}
