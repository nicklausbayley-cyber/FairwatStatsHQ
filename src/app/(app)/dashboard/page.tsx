import {
  CalendarDays,
  ClipboardList,
  Flag,
  Gauge,
  TrendingDown
} from "lucide-react";
import { CategoryBarChart } from "@/components/charts/category-bar-chart";
import { PerformanceTrendChart } from "@/components/charts/performance-trend-chart";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  categoryBreakdown,
  events,
  recentRounds,
  roster,
  seasonTrend
} from "@/lib/mock-data";

export default function DashboardPage() {
  const topPlayer = roster[0];

  return (
    <div>
      <PageHeader
        eyebrow="Season Command Center"
        title="Dashboard"
        description="Current scoring form, upcoming events, and the player signals coaches need before the next lineup decision."
        icon={Gauge}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Team Average"
          value="81.9"
          detail="Down 4.5 strokes across the last six measured rounds."
          icon={TrendingDown}
        />
        <StatCard
          label="Active Players"
          value="14"
          detail="Four varsity locks, six qualifier candidates, four development spots."
          icon={ClipboardList}
          tone="dark"
        />
        <StatCard
          label="Next Event"
          value="Apr 24"
          detail="Spring Qualifier at Maple Ridge GC with 14 entries."
          icon={CalendarDays}
          tone="gold"
        />
        <StatCard
          label="Low Average"
          value={topPlayer.scoringAverage.toFixed(1)}
          detail={`${topPlayer.name} leads through ${topPlayer.rounds} recorded rounds.`}
          icon={Flag}
          tone="blue"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-graphite-900">
                Scoring Trend
              </h2>
              <p className="text-sm text-graphite-500">
                Team average by event date, lower is better.
              </p>
            </div>
            <span className="rounded-full bg-fairway-50 px-3 py-1 text-sm font-semibold text-fairway-700">
              Spring 2026
            </span>
          </div>
          <PerformanceTrendChart data={seasonTrend} />
        </section>

        <section className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-graphite-900">
              Team Skill Mix
            </h2>
            <p className="text-sm text-graphite-500">
              Percentage rates from submitted rounds.
            </p>
          </div>
          <CategoryBarChart data={categoryBreakdown} />
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.2fr]">
        <section className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-graphite-900">
            Upcoming Events
          </h2>
          <div className="mt-4 space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="rounded-lg border border-graphite-100 bg-graphite-50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-graphite-900">
                      {event.name}
                    </p>
                    <p className="mt-1 text-sm text-graphite-500">
                      {event.course}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-fairway-700">
                    {event.date}
                  </span>
                </div>
                <p className="mt-3 text-sm text-graphite-600">
                  {event.type} · {event.entries} entries · {event.status}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-graphite-900">
            Recent Rounds
          </h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-graphite-100">
            <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr] bg-graphite-50 px-4 py-3 text-xs font-semibold uppercase text-graphite-500">
              <span>Player</span>
              <span>Score</span>
              <span>FIR</span>
              <span>Putts</span>
            </div>
            {recentRounds.map((round) => (
              <div
                key={`${round.player}-${round.event}`}
                className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr] border-t border-graphite-100 px-4 py-3 text-sm"
              >
                <span>
                  <span className="block font-medium text-graphite-900">
                    {round.player}
                  </span>
                  <span className="text-graphite-500">{round.event}</span>
                </span>
                <span className="font-semibold text-graphite-900">
                  {round.score}
                </span>
                <span className="text-graphite-600">{round.fairways}</span>
                <span className="text-graphite-600">{round.putts}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
