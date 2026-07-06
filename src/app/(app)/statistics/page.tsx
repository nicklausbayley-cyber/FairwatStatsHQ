import { BarChart3, CircleGauge, Target } from "lucide-react";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { PerformanceTrendChart } from "@/components/charts/performance-trend-chart";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { categoryBreakdown, roster, seasonTrend } from "@/lib/mock-data";

export default function StatisticsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="Statistics"
        description="Team-level trends for scoring, ball striking, putting, and event performance."
        icon={BarChart3}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Best 4 of 6"
          value="322"
          detail="Projected team score from the latest qualifying sample."
          icon={CircleGauge}
        />
        <StatCard
          label="GIR Gain"
          value="+8%"
          detail="Improvement since the first two events."
          icon={Target}
          tone="blue"
        />
        <StatCard
          label="Putting Avg"
          value="31.2"
          detail="Team putts per 18 holes over the last week."
          icon={BarChart3}
          tone="gold"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-graphite-900">
            Season Average
          </h2>
          <PerformanceTrendChart data={seasonTrend} />
        </section>
        <section className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-graphite-900">
            Conversion Rates
          </h2>
          <CategoryBarChart data={categoryBreakdown} />
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-graphite-100 bg-white shadow-sm">
        <div className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-graphite-100 px-5 py-3 text-xs font-semibold uppercase text-graphite-500">
          <span>Player</span>
          <span>Average</span>
          <span>Fairways</span>
          <span>GIR</span>
        </div>
        {roster.map((player) => (
          <div
            key={player.id}
            className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-graphite-100 px-5 py-4 text-sm last:border-b-0"
          >
            <span className="font-semibold text-graphite-900">
              {player.name}
            </span>
            <span>{player.scoringAverage.toFixed(1)}</span>
            <span>{player.fairways}%</span>
            <span>{player.gir}%</span>
          </div>
        ))}
      </section>
    </div>
  );
}
