import { DashboardOverview } from "../../components/dashboard/dashboard-overview";
import { requireCurrentTeam } from "../../lib/auth/get-current-team";
import { getDashboardData } from "../../lib/dashboard/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const currentTeam = await requireCurrentTeam();
  const dashboardData = await getDashboardData(currentTeam);

  return <DashboardOverview dashboardData={dashboardData} />;
}
