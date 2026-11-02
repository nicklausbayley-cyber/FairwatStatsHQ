import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardOverview } from "../../../../components/dashboard/dashboard-overview";
import { buildDashboardFromRows, type DashboardSourceRows } from "../../../../lib/dashboard/dashboard";
import { requireSupportAdmin } from "../../../../lib/auth/support-admin";
import { createClient } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type SupportTeamPageProps = {
  params: Promise<{ teamId: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDashboardSnapshot(value: unknown): value is DashboardSourceRows & { teamId: string } {
  if (!isRecord(value)) return false;
  if (typeof value.teamId !== "string" || typeof value.teamName !== "string") return false;
  if (value.activeSeasonName !== null && typeof value.activeSeasonName !== "string") return false;
  if (!Array.isArray(value.players) || !Array.isArray(value.events) || !Array.isArray(value.rounds)) return false;
  if (!value.players.every(p => isRecord(p) && typeof p.id === "string" && typeof p.first_name === "string" && typeof p.last_name === "string" && typeof p.status === "string")) return false;
  if (!value.events.every(e => isRecord(e) && typeof e.id === "string" && typeof e.name === "string")) return false;
  if (!value.rounds.every(r =>
    isRecord(r) &&
    typeof r.id === "string" && typeof r.player_id === "string" &&
    (r.event_id === null || typeof r.event_id === "string") &&
    typeof r.played_on === "string" && typeof r.created_at === "string" &&
    typeof r.holes === "number" && typeof r.score === "number" &&
    typeof r.counts_toward_lineup === "boolean"
  )) return false;
  return true;
}

export default async function SupportTeamDashboardPage({ params }: SupportTeamPageProps) {
  await requireSupportAdmin();
  const { teamId } = await params;

  // Validate URL input before querying; the database ALSO checks the support
  // account and scopes every table query to this team ID.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(teamId)) {
    notFound();
  }

  const session = await createClient();
  const { data, error } = await session.rpc("support_team_dashboard", { target_team_id: teamId });

  if (error) {
    return (
      <section className="space-y-5">
        <Link href="/support" className="text-sm font-semibold text-emerald-800 hover:underline">Back to Support Center</Link>
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h1 className="font-bold text-red-900">Unable to open support dashboard</h1>
          <p className="mt-2 text-sm text-red-800">
            {error.code === "42501" ? "Your account is not authorized to inspect team dashboards." : "The support dashboard is temporarily unavailable. Please try again."}
          </p>
        </div>
      </section>
    );
  }

  if (data === null) notFound();
  if (!isDashboardSnapshot(data) || data.teamId !== teamId) {
    return (
      <section className="space-y-4">
        <Link href="/support" className="text-sm font-semibold text-emerald-800 hover:underline">Back to Support Center</Link>
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">The support dashboard returned incomplete data.</p>
      </section>
    );
  }

  const dashboardData = buildDashboardFromRows(data);

  return (
    <section className="space-y-6">
      <Link href="/support" className="inline-flex text-sm font-semibold text-emerald-800 hover:underline">Back to Support Center</Link>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-950">Support view · Read only</p>
        <p className="mt-1 text-sm text-amber-900">
          Viewing {data.teamName}'s dashboard results. You are not signed in as the coach, and no roster, scores, or events can be changed from this view.
        </p>
      </div>
      <DashboardOverview dashboardData={dashboardData} readOnly />
    </section>
  );
}
