import { PlaceholderPage } from "../../../components/layout/placeholder-page";

type PlayerPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params;
  const playerName = id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return (
    <PlaceholderPage
      eyebrow="Player Profile"
      title={playerName}
      description="This page will show scoring history, stat trends, coach notes, and season progress for one player."
      actions={[{ href: "/players", label: "Back to Players" }]}
    />
  );
}
