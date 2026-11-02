import type { EventsData } from "../../lib/events/events";
import { AddEventForm } from "./add-event-form";
import { EventsTable } from "./events-table";
import { Badge, EmptyState, PageHeader } from "../ui/primitives";

type EventsListProps = {
  eventsData: EventsData;
  showAddEventForm?: boolean;
  previewReadOnly?: boolean;
};

export function EventsList({
  eventsData,
  showAddEventForm = false,
  previewReadOnly = false
}: EventsListProps) {
  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Schedule"
        title="Events"
        description={
          eventsData.status === "ready"
            ? `${eventsData.teamName} practices, matches, qualifiers, invitationals, and tournaments.`
            : "Practices, matches, qualifiers, invitationals, and tournaments will appear here."
        }
        meta={
          eventsData.status === "ready" ? (
            <>
              <Badge>{eventsData.events.length} events</Badge>
              <Badge tone={eventsData.activeSeasonName ? "green" : "slate"}>
                {eventsData.activeSeasonName
                  ? `Active: ${eventsData.activeSeasonName}`
                  : "All seasons"}
              </Badge>
            </>
          ) : null
        }
      />

      {previewReadOnly ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Preview mode: you can configure and validate event drafts, but no events or scores will be saved here.
        </p>
      ) : null}

      {eventsData.status === "ready" && showAddEventForm ? (
        <AddEventForm activeSeasonName={eventsData.activeSeasonName} courses={eventsData.courses} previewReadOnly={previewReadOnly} />
      ) : null}

      {eventsData.status === "error" ? (
        <EmptyState title="Events unavailable" message={eventsData.message} />
      ) : null}

      {eventsData.status === "empty" ? (
        <EmptyState message={eventsData.message} />
      ) : null}

      {eventsData.status === "ready" && eventsData.events.length === 0 ? (
        <EmptyState
          message={
            eventsData.activeSeasonName
              ? `No events found for ${eventsData.activeSeasonName} yet.`
              : "No events found for this team yet."
          }
        />
      ) : null}

      {eventsData.status === "ready" && eventsData.events.length > 0 ? (
        <EventsTable events={eventsData.events} courses={eventsData.courses} previewReadOnly={previewReadOnly} />
      ) : null}
    </section>
  );
}
