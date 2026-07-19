import { EventsList } from "../../components/events/events-list";
import { requireTeamStaff } from "../../lib/auth/get-current-team";
import { getTeamEvents } from "../../lib/events/events";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const currentTeam = await requireTeamStaff();
  const eventsData = await getTeamEvents(currentTeam);

  return <EventsList eventsData={eventsData} showAddEventForm />;
}
