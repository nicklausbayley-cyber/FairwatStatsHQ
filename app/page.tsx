import { PlaceholderPage } from "../components/layout/placeholder-page";

export default function HomePage() {
  return (
    <PlaceholderPage
      eyebrow="Welcome"
      title="Fairway Stats HQ"
      description="A clean starting point for a multi-team golf performance dashboard. Use the navigation to open the placeholder pages."
      actions={[
        { href: "/dashboard", label: "Open Dashboard" },
        { href: "/enter-score", label: "Enter Score" }
      ]}
    />
  );
}
