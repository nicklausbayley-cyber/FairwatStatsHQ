import { PlaceholderPage } from "../../components/layout/placeholder-page";

export default function RosterPage() {
  return (
    <PlaceholderPage
      eyebrow="Players"
      title="Roster"
      description="This page will list team players, graduation years, roles, and quick performance summaries."
      actions={[{ href: "/players", label: "Open Players" }]}
    />
  );
}
