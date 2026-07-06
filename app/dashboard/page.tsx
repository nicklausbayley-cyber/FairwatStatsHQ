import { PlaceholderPage } from "../../components/layout/placeholder-page";

export default function DashboardPage() {
  return (
    <PlaceholderPage
      eyebrow="Team Overview"
      title="Dashboard"
      description="This page will show team scoring trends, recent rounds, upcoming events, and season highlights."
      actions={[
        { href: "/enter-score", label: "Enter Score" },
        { href: "/statistics", label: "View Statistics" }
      ]}
    />
  );
}
