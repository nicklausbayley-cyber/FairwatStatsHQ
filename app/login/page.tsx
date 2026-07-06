import { PlaceholderPage } from "../../components/layout/placeholder-page";

export default function LoginPage() {
  return (
    <PlaceholderPage
      eyebrow="Account Access"
      title="Login"
      description="This placeholder will become the sign-in screen for coaches, admins, and players."
      actions={[{ href: "/dashboard", label: "Continue to Dashboard" }]}
    />
  );
}
