"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

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

  function updateField(field: keyof FormState, value: string) {
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
      className="space-y-5 rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
            Roster Management
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
            Add Player
          </h2>
        </div>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">First name</span>
          <input
            type="text"
            value={form.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
            required
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Last name</span>
          <input
            type="text"
            value={form.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
            required
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">
            Graduation year
          </span>
          <input
            type="number"
            value={form.graduationYear}
            onChange={(event) => updateField("graduationYear", event.target.value)}
            min={2000}
            max={2100}
            inputMode="numeric"
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Status</span>
          <select
            value={form.status}
            onChange={(event) =>
              updateField("status", event.target.value as FormState["status"])
            }
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm capitalize text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="flex justify-end border-t border-gray-100 pt-5">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-green-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isSubmitting ? "Adding..." : "Add Player"}
        </button>
      </div>
    </form>
  );
}
