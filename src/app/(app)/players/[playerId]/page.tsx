import { notFound } from "next/navigation";
import { Activity, Flag, NotebookPen, UserRound } from "lucide-react";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { PerformanceTrendChart } from "@/components/charts/performance-trend-chart";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { categoryBreakdown, roster, seasonTrend } from "@/lib/mock-data";

type PlayerProfileProps = {
  params: Promise<{
    playerId: string;
  }>;
};

export default async function PlayerProfilePage({ params }: PlayerProfileProps) {
  const { playerId } = await params;
  const player = roster.find((item) => item.id === playerId);

  if (!player) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        eyebrow="Player Profile"
        title={player.name}
        description={`${player.year} · ${player.role} · ${player.rounds} recorded rounds this season.`}
        icon={UserRound}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Average"
          value={player.scoringAverage.toFixed(1)}
          detail="Season scoring average across submitted rounds."
          icon={Flag}
        />
        <StatCard
          label="Fairways"
          value={`${player.fairways}%`}
          detail="Driving accuracy from tracked tee shots."
          icon={Activity}
          tone="dark"
        />
        <StatCard
          label="GIR"
          value={`${player.gir}%`}
          detail="Greens reached in regulation from submitted stats."
          icon={Activity}
          tone="blue"
        />
        <StatCard
          label="Coach Notes"
          value="4"
          detail="Recent technical, mental, and course-management notes."
          icon={NotebookPen}
          tone="gold"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <section className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-graphite-900">
            Scoring Path
          </h2>
          <p className="mt-1 text-sm text-graphite-500">
            Player average trend through the active season.
          </p>
          <PerformanceTrendChart data={seasonTrend} />
        </section>

        <section className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-graphite-900">
            Skill Profile
          </h2>
          <p className="mt-1 text-sm text-graphite-500">
            Current strengths and pressure points.
          </p>
          <CategoryBarChart data={categoryBreakdown} />
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-graphite-900">
          Coach Notes
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            "Tempo stayed stable under match pressure.",
            "Needs tighter approach targets from 140 to 165.",
            "Putting routine improved on short comebackers."
          ].map((note) => (
            <div
              key={note}
              className="rounded-lg border border-graphite-100 bg-graphite-50 p-4 text-sm leading-6 text-graphite-700"
            >
              {note}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
