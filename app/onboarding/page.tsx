import { OnboardingPanel } from "./onboarding-panel";
import { Badge, PageHeader } from "../../components/ui/primitives";
import { requirePlatformAdmin } from "../../lib/auth/platform-admin";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const platformAdmin = await requirePlatformAdmin();

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Platform Admin"
        title="Onboarding"
        description="Create teams, connect coach logins, bulk load rosters, and prepare starter seasons from one controlled internal workflow."
        meta={
          <>
            <Badge tone="amber">Internal only</Badge>
            <Badge tone="slate">{platformAdmin.email}</Badge>
          </>
        }
      />

      <OnboardingPanel />
    </section>
  );
}
