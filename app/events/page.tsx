import { EventsList } from "../../components/events/events-list";
import { requireCurrentTeam } from "../../lib/auth/get-current-team";
import { getTeamEvents } from "../../lib/events/events";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const currentTeam = await requireCurrentTeam();
  const eventsData = await getTeamEvents(currentTeam);

  return <EventsList eventsData={eventsData} showAddEventForm />;
}
