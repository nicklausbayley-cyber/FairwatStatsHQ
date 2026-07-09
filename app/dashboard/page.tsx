import { DashboardOverview } from "../../components/dashboard/dashboard-overview";
import { getDashboardData } from "../../lib/dashboard/dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const dashboardData = await getDashboardData();

  return <DashboardOverview dashboardData={dashboardData} />;
}
