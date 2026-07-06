import { PlaceholderPage } from "../../components/layout/placeholder-page";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      eyebrow="Team Setup"
      title="Settings"
      description="This page will eventually hold team settings, roster controls, account roles, and season configuration."
      actions={[{ href: "/dashboard", label: "Back to Dashboard" }]}
    />
  );
}
