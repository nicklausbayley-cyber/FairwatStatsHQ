"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { EventListRow, EventCourseOption } from "../../lib/events/events";
import { eventHoleSelectionLabel, type EventHoleSelection } from "../../lib/events/hole-selection";
import { EventCourseFields } from "./event-course-fields";
import {
  Badge,
  Message,
  cn,
  dangerButtonClassName,
  inputClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  tableHeaderClassName,
  tableRowClassName,
  tableShellClassName
} from "../ui/primitives";

type EventsTableProps = {
  events: EventListRow[];
  courses: EventCourseOption[];
  previewReadOnly?: boolean;
};

type EventType = EventListRow["event_type"];

type FormState = {
  name: string;
  eventType: EventType | "";
  eventDate: string;
  courseName: string;
  courseId: string;
  holeSelection: EventHoleSelection | "";
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
    courseId: event.course_id ?? "",
    holeSelection: event.hole_selection ?? "",
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

  if (form.courseId && !form.holeSelection) {
    return "Choose Front 9, Back 9, or Full 18 for this course.";
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

export function EventsTable({ events, courses, previewReadOnly = false }: EventsTableProps) {
  const router = useRouter();
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);

  async function deleteEvent(event: EventListRow) {
    if (previewReadOnly) return;
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
        <Message type={message.type}>{message.text}</Message>
      ) : null}

      <div className={tableShellClassName}>
        <div className={cn(tableHeaderClassName, "xl:grid xl:grid-cols-[1.1fr_0.85fr_0.9fr_1.1fr_1fr_1.4fr]")}>
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
                <div className={cn(tableRowClassName, "xl:grid-cols-[1.1fr_0.85fr_0.9fr_1.1fr_1fr_1.4fr] xl:items-center")}>
                  <Cell label="Name" value={event.name} strong />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
                      Type
                    </p>
                    <Badge>
                      {formatEventType(event.event_type)}
                    </Badge>
                  </div>
                  <Cell label="Date" value={formatEventDate(event.event_date)} />
                  <div>
                    <Cell label="Course" value={event.course_name ?? "Not set"} />
                    {event.hole_selection ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-800">
                        {eventHoleSelectionLabel(event.hole_selection, courses.find(c => c.id === event.course_id)?.configuredHoles === 9)}
                      </p>
                    ) : null}
                  </div>
                  <Cell label="Location" value={event.location ?? "Not set"} />
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 xl:hidden">
                      Actions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/events/${event.id}/report`}
                        className={cn(
                          secondaryButtonClassName,
                          "px-3 py-1.5 text-xs"
                        )}
                      >
                        View Report
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setMessage(null);
                          setEditingEventId(isEditing ? null : event.id);
                        }}
                        className={cn(secondaryButtonClassName, "px-3 py-1.5 text-xs")}
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEvent(event)}
                        disabled={previewReadOnly || pendingEventId === event.id}
                        className={dangerButtonClassName}
                      >
                        {pendingEventId === event.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>

                {isEditing ? (
                  <EditEventForm
                    eventItem={event}
                    courses={courses}
                    previewReadOnly={previewReadOnly}
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
  eventItem,
  courses,
  previewReadOnly,
  onCancel,
  onSuccess
}: {
  eventItem: EventListRow;
  courses: EventCourseOption[];
  previewReadOnly: boolean;
  onCancel: () => void;
  onSuccess: (message: string) => void;
}) {
  const [form, setForm] = useState<FormState>(() => formStateFromEvent(eventItem));
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
    if (previewReadOnly) {
      setMessage({ type: "success", text: "Draft looks valid. Preview mode did not update this event." });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await eventRequest("PATCH", {
        id: eventItem.id,
        name: form.name.trim(),
        eventType: form.eventType,
        eventDate: form.eventDate,
        courseId: form.courseId || null,
        holeSelection: form.holeSelection || null,
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
    <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-100 bg-slate-50/70 px-5 py-5">
      {message ? (
        <Message type={message.type}>{message.text}</Message>
      ) : null}

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

        <EventCourseFields
          courses={courses}
          value={form}
          onChange={changes => setForm(current => ({ ...current, ...changes }))}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className={secondaryButtonClassName}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={primaryButtonClassName}
        >
          {isSubmitting ? "Saving..." : previewReadOnly ? "Validate Draft (No Save)" : "Save Changes"}
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
