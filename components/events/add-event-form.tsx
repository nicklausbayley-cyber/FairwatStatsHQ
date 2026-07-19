"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  FormSection,
  Message,
  inputClassName,
  primaryButtonClassName
} from "../ui/primitives";

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
      className="space-y-0"
    >
      <FormSection
        eyebrow="Event Management"
        title="Add Event"
        description={
          activeSeasonName
            ? `New events will be attached to ${activeSeasonName}.`
            : "No active season is set, so new events will not be season-specific yet."
        }
        footer={
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={primaryButtonClassName}
            >
              {isSubmitting ? "Adding..." : "Add Event"}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          {message ? <Message type={message.type}>{message.text}</Message> : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2 xl:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Event name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                required
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Event type</span>
              <select
                value={form.eventType}
                onChange={(event) =>
                  updateField("eventType", event.target.value as FormState["eventType"])
                }
                required
                className={inputClassName}
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
              <span className="text-sm font-semibold text-slate-700">Event date</span>
              <input
                type="date"
                value={form.eventDate}
                onChange={(event) => updateField("eventDate", event.target.value)}
                required
                className={inputClassName}
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Course name</span>
              <input
                type="text"
                value={form.courseName}
                onChange={(event) => updateField("courseName", event.target.value)}
                className={inputClassName}
              />
            </label>

            <label className="space-y-2 md:col-span-2 xl:col-span-5">
              <span className="text-sm font-semibold text-slate-700">Location</span>
              <input
                type="text"
                value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
                className={inputClassName}
              />
            </label>
          </div>
        </div>
      </FormSection>
    </form>
  );
}
