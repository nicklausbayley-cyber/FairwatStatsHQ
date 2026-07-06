import { PlaceholderPage } from "../../components/layout/placeholder-page";

export default function StatisticsPage() {
  return (
    <PlaceholderPage
      eyebrow="Analytics"
      title="Statistics"
      description="This page will show team and player trends for scoring average, fairways, greens, putting, and event results."
      actions={[{ href: "/dashboard", label: "Back to Dashboard" }]}
    />
  );
}
