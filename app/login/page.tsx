import { redirect } from "next/navigation";
import { getCurrentTeam, isTeamStaff } from "../../lib/auth/get-current-team";
import { getSupportAdminStatus } from "../../lib/auth/support-admin";
import { getPlatformAdminStatus } from "../../lib/auth/platform-admin";
import { loadCoachSetup } from "../../lib/setup/load";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const [currentTeam, platformAdmin, supportAdmin] = await Promise.all([
    getCurrentTeam(),
    getPlatformAdminStatus(),
    getSupportAdminStatus()
  ]);

  if (platformAdmin.data) redirect("/onboarding");
  if (supportAdmin.data) redirect("/support");

  if (currentTeam.data) {
    if (!isTeamStaff(currentTeam.data.role)) {
      redirect("/enter-score");
    }
    const setup = await loadCoachSetup(currentTeam.data);
    redirect(setup.status === "ready" && !setup.progress.complete ? "/setup" : "/dashboard");
  }


  return <LoginForm />;
}
