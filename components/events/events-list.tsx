import type { EventsData, EventListRow } from "../../lib/events/events";

type EventsListProps = {
  eventsData: EventsData;
};

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

function formatEventDate(eventDate: string) {
  const [year, month, day] = eventDate.split("-").map(Number);

  if (!year || !month || !day) {
    return eventDate;
  }

  return `${monthNames[month - 1]} ${day}, ${year}`;
}

function formatEventType(eventType: EventListRow["event_type"]) {
  return eventType
    .split("_")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function EventsList({ eventsData }: EventsListProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-green-900/10 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
          Schedule
        </p>
        <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              Events
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
              {eventsData.status === "ready"
                ? `${eventsData.teamName} schedule loaded from Supabase.`
                : "Practices, matches, qualifiers, invitationals, and tournaments will appear here."}
            </p>
          </div>
          {eventsData.status === "ready" ? (
            <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">
              {eventsData.events.length} events
            </div>
          ) : null}
        </div>
      </div>

      {eventsData.status === "error" ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
          <p className="font-semibold">Events unavailable</p>
          <p className="mt-1">{eventsData.message}</p>
        </div>
      ) : null}

      {eventsData.status === "empty" ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          {eventsData.message}
        </div>
      ) : null}

      {eventsData.status === "ready" && eventsData.events.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm leading-6 text-gray-600 shadow-sm">
          No events found for this team yet.
        </div>
      ) : null}

      {eventsData.status === "ready" && eventsData.events.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-green-900/10 bg-white shadow-sm">
          <div className="hidden grid-cols-[1.2fr_1fr_1.1fr_1.3fr_1.2fr] gap-4 border-b border-gray-100 bg-green-50/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-green-900 md:grid">
            <span>Name</span>
            <span>Type</span>
            <span>Date</span>
            <span>Course</span>
            <span>Location</span>
          </div>

          <div className="divide-y divide-gray-100">
            {eventsData.events.map((event) => (
              <div
                key={event.id}
                className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[1.2fr_1fr_1.1fr_1.3fr_1.2fr] md:items-center"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 md:hidden">
                    Name
                  </p>
                  <p className="font-medium text-gray-950">{event.name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 md:hidden">
                    Type
                  </p>
                  <span className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
                    {formatEventType(event.event_type)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 md:hidden">
                    Date
                  </p>
                  <p className="text-gray-700">
                    {formatEventDate(event.event_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 md:hidden">
                    Course
                  </p>
                  <p className="text-gray-700">
                    {event.course_name ?? "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 md:hidden">
                    Location
                  </p>
                  <p className="text-gray-700">{event.location ?? "Not set"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
