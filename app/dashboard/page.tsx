import { DashboardOverview } from "../../components/dashboard/dashboard-overview";
import { requireTeamStaff } from "../../lib/auth/get-current-team";
import { getDashboardData } from "../../lib/dashboard/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const currentTeam = await requireTeamStaff();
  const dashboardData = await getDashboardData(currentTeam);

  return <DashboardOverview dashboardData={dashboardData} />;
}
