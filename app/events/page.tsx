import { PlaceholderPage } from "../../components/layout/placeholder-page";

export default function EventsPage() {
  return (
    <PlaceholderPage
      eyebrow="Schedule"
      title="Events"
      description="This page will organize practices, matches, invitationals, qualifiers, and tournaments for the season."
      actions={[{ href: "/enter-score", label: "Enter Event Score" }]}
    />
  );
}
