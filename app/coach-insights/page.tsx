import Link from "next/link";
import { CoachInsightsView } from "../../components/insights/coach-insights-view";
import { EmptyState, PageHeader, secondaryButtonClassName } from "../../components/ui/primitives";
import { requireTeamStaff } from "../../lib/auth/get-current-team";
import { loadCoachInsights } from "../../lib/insights/load";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<{ holes?: string | string[] }> };

export default async function CoachInsightsPage({ searchParams }: PageProps) {
  const currentTeam = await requireTeamStaff();
  const params = searchParams ? await searchParams : {};
  const value = Array.isArray(params.holes) ? params.holes[0] : params.holes;
  const holes = value === "18" ? 18 : 9;
  const state = await loadCoachInsights(currentTeam, holes);
  if (state.status !== "ready") {
    return (
      <section className="space-y-6">
        <PageHeader eyebrow={currentTeam.team.name} title="Coach Insights"
          description="Meaningful performance changes and coaching priorities for your active season." />
        <EmptyState title={state.status === "no-season" ? "Choose an active season" : "Insights unavailable"}
          message={state.message}
          action={state.status === "no-season" ? <Link href="/settings" className={secondaryButtonClassName}>Open settings</Link> : undefined} />
      </section>
    );
  }
  return <CoachInsightsView report={state.report} teamName={currentTeam.team.name} seasonName={state.season.name} />;
}
