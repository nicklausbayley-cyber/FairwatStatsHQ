import { redirect } from "next/navigation";
import { getCurrentTeam, isTeamStaff } from "../../lib/auth/get-current-team";
import { getPlatformAdminStatus } from "../../lib/auth/platform-admin";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const [currentTeam, platformAdmin] = await Promise.all([
    getCurrentTeam(),
    getPlatformAdminStatus()
  ]);

  if (currentTeam.data) {
    redirect(isTeamStaff(currentTeam.data.role) ? "/dashboard" : "/enter-score");
  }

  if (platformAdmin.data) {
    redirect("/onboarding");
  }

  return <LoginForm />;
}
