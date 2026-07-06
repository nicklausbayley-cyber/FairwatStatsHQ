import { CalendarDays, MapPin, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { events } from "@/lib/mock-data";

export default function EventsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Schedule"
        title="Events"
        description="Practices, matches, invitationals, qualifiers, and tournaments for the active season."
        icon={CalendarDays}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {events.map((event) => (
          <article
            key={event.id}
            className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase text-fairway-700">
                  {event.type}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-graphite-900">
                  {event.name}
                </h2>
              </div>
              <span className="rounded-full bg-fairway-50 px-3 py-1 text-sm font-semibold text-fairway-700">
                {event.date}
              </span>
            </div>

            <div className="mt-6 space-y-3 text-sm text-graphite-600">
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-graphite-400" aria-hidden="true" />
                {event.course}
              </p>
              <p className="flex items-center gap-2">
                <Users className="size-4 text-graphite-400" aria-hidden="true" />
                {event.entries} players entered
              </p>
            </div>

            <div className="mt-6 rounded-lg bg-graphite-50 p-4">
              <p className="text-xs font-semibold uppercase text-graphite-500">
                Status
              </p>
              <p className="mt-1 font-semibold text-graphite-900">
                {event.status}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
