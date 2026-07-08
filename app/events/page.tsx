import { EventsList } from "../../components/events/events-list";
import { getTeamEvents } from "../../lib/events/events";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const eventsData = await getTeamEvents();

  return <EventsList eventsData={eventsData} showAddEventForm />;
}
