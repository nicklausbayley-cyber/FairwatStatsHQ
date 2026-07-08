"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { EventListRow } from "../../lib/events/events";

type EventsTableProps = {
  events: EventListRow[];
};

type EventType = EventListRow["event_type"];

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

type EventActionResult = {
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

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

function formStateFromEvent(event: EventListRow): FormState {
  return {
    name: event.name,
    eventType: event.event_type,
    eventDate: event.event_date,
    courseName: event.course_name ?? "",
    location: event.location ?? ""
  };
}

function formatEventDate(eventDate: string) {
  const [year, month, day] = eventDate.split("-").map(Number);

  if (!year || !month || !day) {
    return eventDate;
  }

  return `${monthNames[month - 1]} ${day}, ${year}`;
}

function formatEventType(eventType: EventType) {
  return eventType
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

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

async function eventRequest(method: "PATCH" | "DELETE", body: unknown) {
  const response = await fetch("/api/events", {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const result = (await response.json()) as EventActionResult;

  if (!response.ok || !result.success) {
    return {
      success: false,
      message: result.message || "Could not update event. Please try again."
    };
  }

  return result;
}

export function EventsTable({ events }: EventsTableProps) {
  const router = useRouter();
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);

  async function deleteEvent(event: EventListRow) {
    const confirmed = window.confirm(
      `Delete ${event.name}? This will not delete any related rounds.`
    );

    if (!confirmed) {
      return;
    }

    setMessage(null);
    setPendingEventId(event.id);

    try {
      const result = await eventRequest("DELETE", { id: event.id });

      setMessage({
        type: result.success ? "success" : "error",
        text: result.message
      });

      if (result.success) {
        setEditingEventId(null);
        router.refresh();
      }
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not delete event. Please try again."
      });
    } finally {
      setPendingEventId(null);
    }
  }

  function handleEditSuccess(messageText: string) {
    setMessage({ type: "success", text: messageText });
    setEditingEventId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
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

      <div className="overflow-hidden rounded-lg border border-green-900/10 bg-white shadow-sm">
        <div className="hidden grid-cols-[1.1fr_0.85fr_0.9fr_1.1fr_1fr_1.1fr] gap-4 border-b border-gray-100 bg-green-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-green-900 xl:grid">
          <span>Name</span>
          <span>Type</span>
          <span>Date</span>
          <span>Course</span>
          <span>Location</span>
          <span>Actions</span>
        </div>

        <div>
          {events.map((event) => {
            const isEditing = editingEventId === event.id;

            return (
              <div key={event.id} className="border-b border-gray-100 last:border-b-0">
                <div className="grid gap-3 px-5 py-4 text-sm xl:grid-cols-[1.1fr_0.85fr_0.9fr_1.1fr_1fr_1.1fr] xl:items-center">
                  <Cell label="Name" value={event.name} strong />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
                      Type
                    </p>
                    <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
                      {formatEventType(event.event_type)}
                    </span>
                  </div>
                  <Cell label="Date" value={formatEventDate(event.event_date)} />
                  <Cell label="Course" value={event.course_name ?? "Not set"} />
                  <Cell label="Location" value={event.location ?? "Not set"} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
                      Actions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMessage(null);
                          setEditingEventId(isEditing ? null : event.id);
                        }}
                        className="rounded-md border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-800 transition hover:bg-green-50"
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEvent(event)}
                        disabled={pendingEventId === event.id}
                        className="rounded-md border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
                      >
                        {pendingEventId === event.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>

                {isEditing ? (
                  <EditEventForm
                    event={event}
                    onCancel={() => setEditingEventId(null)}
                    onSuccess={handleEditSuccess}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EditEventForm({
  event,
  onCancel,
  onSuccess
}: {
  event: EventListRow;
  onCancel: () => void;
  onSuccess: (message: string) => void;
}) {
  const [form, setForm] = useState<FormState>(() => formStateFromEvent(event));
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
      const result = await eventRequest("PATCH", {
        id: event.currentTarget.dataset.eventId,
        name: form.name.trim(),
        eventType: form.eventType,
        eventDate: form.eventDate,
        courseName: form.courseName.trim() || null,
        location: form.location.trim() || null
      });

      if (!result.success) {
        setMessage({ type: "error", text: result.message });
        return;
      }

      onSuccess(result.message);
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not update event. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      data-event-id={event.id}
      onSubmit={handleSubmit}
      className="space-y-4 bg-green-50/40 px-5 py-5"
    >
      {message ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
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

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-green-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-900 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

function Cell({
  label,
  value,
  strong = false
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
        {label}
      </p>
      <p className={strong ? "font-semibold text-gray-950" : "text-gray-700"}>
        {value}
      </p>
    </div>
  );
}
