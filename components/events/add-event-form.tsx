"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type EventType = "practice" | "match" | "invitational" | "qualifier" | "tournament";

type FormState = {
  name: string;
  eventType: EventType | "";
  eventDate: string;
  courseName: string;
  location: string;
};

type FormMessage = {
  type: "success" | "error";
  text: string;
};

type CreateEventResult = {
  success: boolean;
  message: string;
};

const eventTypeOptions: Array<{ value: EventType; label: string }> = [
  { value: "practice", label: "Practice" },
  { value: "match", label: "Match" },
  { value: "invitational", label: "Invitational" },
  { value: "qualifier", label: "Qualifier" },
  { value: "tournament", label: "Tournament" }
];

const initialFormState: FormState = {
  name: "",
  eventType: "",
  eventDate: "",
  courseName: "",
  location: ""
};

function validateForm(form: FormState) {
  if (!form.name.trim()) {
    return "Event name is required.";
  }

  if (!form.eventType) {
    return "Event type is required.";
  }

  if (!form.eventDate) {
    return "Event date is required.";
  }

  return null;
}

export function AddEventForm({
  activeSeasonName
}: {
  activeSeasonName: string | null;
}) {
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
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: form.name.trim(),
          eventType: form.eventType,
          eventDate: form.eventDate,
          courseName: form.courseName.trim() || null,
          location: form.location.trim() || null
        })
      });
      const result = (await response.json()) as CreateEventResult;

      if (!response.ok || !result.success) {
        setMessage({
          type: "error",
          text: result.message || "Could not add event. Please try again."
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
            : "Could not add event. Please try again."
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
            Event Management
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-950">
            Add Event
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {activeSeasonName
              ? `New events will be attached to ${activeSeasonName}.`
              : "No active season is set, so new events will not be season-specific yet."}
          </p>
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-2 xl:col-span-2">
          <span className="text-sm font-semibold text-gray-700">Event name</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Event type</span>
          <select
            value={form.eventType}
            onChange={(event) =>
              updateField("eventType", event.target.value as FormState["eventType"])
            }
            required
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          >
            <option value="">Choose type</option>
            {eventTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Event date</span>
          <input
            type="date"
            value={form.eventDate}
            onChange={(event) => updateField("eventDate", event.target.value)}
            required
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-gray-700">Course name</span>
          <input
            type="text"
            value={form.courseName}
            onChange={(event) => updateField("courseName", event.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>

        <label className="space-y-2 md:col-span-2 xl:col-span-5">
          <span className="text-sm font-semibold text-gray-700">Location</span>
          <input
            type="text"
            value={form.location}
            onChange={(event) => updateField("location", event.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100"
          />
        </label>
      </div>

      <div className="flex justify-end border-t border-gray-100 pt-5">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-green-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isSubmitting ? "Adding..." : "Add Event"}
        </button>
      </div>
    </form>
  );
}
