import { ClipboardPenLine, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { events, roster } from "@/lib/mock-data";

export default function EnterScorePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Round Entry"
        title="Enter Score"
        description="Record scores and core stats for practices, matches, invitationals, qualifiers, and tournaments."
        icon={ClipboardPenLine}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
        <form className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-graphite-700">
                Player
              </span>
              <select className="mt-2 w-full rounded-lg border border-graphite-200 bg-white px-3 py-3 text-sm outline-none focus:border-fairway-500 focus:ring-4 focus:ring-fairway-100">
                {roster.map((player) => (
                  <option key={player.id}>{player.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-graphite-700">
                Event
              </span>
              <select className="mt-2 w-full rounded-lg border border-graphite-200 bg-white px-3 py-3 text-sm outline-none focus:border-fairway-500 focus:ring-4 focus:ring-fairway-100">
                {events.map((event) => (
                  <option key={event.id}>{event.name}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-graphite-700">
                Played On
              </span>
              <input
                type="date"
                className="mt-2 w-full rounded-lg border border-graphite-200 bg-white px-3 py-3 text-sm outline-none focus:border-fairway-500 focus:ring-4 focus:ring-fairway-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-graphite-700">
                Holes
              </span>
              <select className="mt-2 w-full rounded-lg border border-graphite-200 bg-white px-3 py-3 text-sm outline-none focus:border-fairway-500 focus:ring-4 focus:ring-fairway-100">
                <option>18</option>
                <option>9</option>
              </select>
            </label>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Score",
              "Par",
              "Fairways Hit",
              "Fairways Possible",
              "Greens in Regulation",
              "Putts",
              "Penalty Strokes",
              "Sand Saves"
            ].map((label) => (
              <label key={label} className="block">
                <span className="text-sm font-medium text-graphite-700">
                  {label}
                </span>
                <input
                  type="number"
                  min="0"
                  className="mt-2 w-full rounded-lg border border-graphite-200 bg-white px-3 py-3 text-sm outline-none focus:border-fairway-500 focus:ring-4 focus:ring-fairway-100"
                />
              </label>
            ))}
          </div>

          <label className="mt-6 block">
            <span className="text-sm font-medium text-graphite-700">
              Round Notes
            </span>
            <textarea
              rows={5}
              className="mt-2 w-full resize-none rounded-lg border border-graphite-200 bg-white px-3 py-3 text-sm outline-none focus:border-fairway-500 focus:ring-4 focus:ring-fairway-100"
              placeholder="Short game, course conditions, weather, or swing notes."
            />
          </label>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-fairway-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-fairway-800"
            >
              <Save className="size-4" aria-hidden="true" />
              Save Score
            </button>
          </div>
        </form>

        <aside className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-graphite-900">
            Submission Checks
          </h2>
          <div className="mt-4 space-y-3">
            {[
              ["Team scope", "Saved rounds inherit the current user's team_id."],
              ["Player link", "Round player_id must belong to the same team."],
              ["Season trend", "Scores feed player profiles and team analytics."]
            ].map(([label, detail]) => (
              <div
                key={label}
                className="rounded-lg border border-graphite-100 bg-graphite-50 p-4"
              >
                <p className="font-semibold text-graphite-900">{label}</p>
                <p className="mt-1 text-sm leading-6 text-graphite-600">
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
