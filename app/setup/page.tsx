import Link from "next/link";
import { CoachWelcomeView } from "../../components/setup/coach-welcome-view";
import { EmptyState, PageHeader, secondaryButtonClassName } from "../../components/ui/primitives";
import { requireTeamStaff } from "../../lib/auth/get-current-team";
import { loadCoachSetup } from "../../lib/setup/load";

export const dynamic = "force-dynamic";

export default async function CoachSetupPage() {
  const currentTeam = await requireTeamStaff();
  const setup = await loadCoachSetup(currentTeam);

  if (setup.status === "error") {
    return (
      <section className="space-y-6">
        <PageHeader
          eyebrow="Coach Setup"
          title="Coach Welcome Center"
          description="Prepare your team for the upcoming golf season."
        />
        <EmptyState
          title="Setup progress unavailable"
          message={setup.message}
          action={
            <Link href="/dashboard" className={secondaryButtonClassName}>
              Go to dashboard
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <CoachWelcomeView
      teamName={currentTeam.team.name}
      activeSeasonName={setup.activeSeasonName}
      activePlayerCount={setup.activePlayerCount}
      progress={setup.progress}
    />
  );
}
