import { redirect } from "next/navigation";
import { getCurrentTeam, isTeamStaff } from "../../lib/auth/get-current-team";
import { getPlatformAdminStatus } from "../../lib/auth/platform-admin";
import { loadCoachSetup } from "../../lib/setup/load";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const [currentTeam, platformAdmin] = await Promise.all([
    getCurrentTeam(),
    getPlatformAdminStatus()
  ]);

  if (currentTeam.data) {
    if (!isTeamStaff(currentTeam.data.role)) {
      redirect("/enter-score");
    }
    const setup = await loadCoachSetup(currentTeam.data);
    redirect(setup.status === "ready" && !setup.progress.complete ? "/setup" : "/dashboard");
  }

  if (platformAdmin.data) {
    redirect("/onboarding");
  }

  return <LoginForm />;
}
