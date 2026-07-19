import type { EventsData } from "../../lib/events/events";
import { AddEventForm } from "./add-event-form";
import { EventsTable } from "./events-table";
import { Badge, EmptyState, PageHeader } from "../ui/primitives";

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

      {eventsData.status === "ready" && showAddEventForm ? (
        <AddEventForm activeSeasonName={eventsData.activeSeasonName} />
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
        <EventsTable events={eventsData.events} />
      ) : null}
    </section>
  );
}
