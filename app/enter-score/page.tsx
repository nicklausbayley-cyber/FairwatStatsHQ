import { PlaceholderPage } from "../../components/layout/placeholder-page";

export default function EnterScorePage() {
  return (
    <PlaceholderPage
      eyebrow="Round Entry"
      title="Enter Score"
      description="This page will let players and coaches submit scores and core golf stats for practices, matches, qualifiers, and tournaments."
      actions={[{ href: "/events", label: "View Events" }]}
    />
  );
}
