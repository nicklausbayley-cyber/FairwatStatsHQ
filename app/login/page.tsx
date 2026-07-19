import { redirect } from "next/navigation";
import { getCurrentTeam } from "../../lib/auth/get-current-team";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const currentTeam = await getCurrentTeam();

  if (currentTeam.data) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
