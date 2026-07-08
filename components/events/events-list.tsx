import type { EventsData } from "../../lib/events/events";
import { AddEventForm } from "./add-event-form";
import { EventsTable } from "./events-table";

type EventsListProps = {
  eventsData: EventsData;
  showAddEventForm?: boolean;
};

export function EventsList({
  eventsData,
  showAddEventForm = false
}: EventsListProps) {
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

      {eventsData.status === "ready" && showAddEventForm ? <AddEventForm /> : null}

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
        <EventsTable events={eventsData.events} />
      ) : null}
    </section>
  );
}
