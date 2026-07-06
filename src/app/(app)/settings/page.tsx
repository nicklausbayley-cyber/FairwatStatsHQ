import { Settings, ShieldCheck, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { getCurrentUserContext } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default async function SettingsPage() {
  const context = await getCurrentUserContext();

  return (
    <div>
      <PageHeader
        eyebrow="Team Admin"
        title="Settings"
        description="Team identity, access roles, and Supabase connection state for the current workspace."
        icon={Settings}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <section className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-graphite-900">
            Team Profile
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-graphite-700">
                Team Name
              </span>
              <input
                defaultValue={context?.team.name ?? "Fairway Varsity"}
                className="mt-2 w-full rounded-lg border border-graphite-200 px-3 py-3 text-sm outline-none focus:border-fairway-500 focus:ring-4 focus:ring-fairway-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-graphite-700">
                School
              </span>
              <input
                defaultValue={context?.team.school_name ?? "Northview High School"}
                className="mt-2 w-full rounded-lg border border-graphite-200 px-3 py-3 text-sm outline-none focus:border-fairway-500 focus:ring-4 focus:ring-fairway-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-graphite-700">
                Primary Color
              </span>
              <input
                type="color"
                defaultValue={context?.team.primary_color ?? "#176b35"}
                className="mt-2 h-12 w-full rounded-lg border border-graphite-200 bg-white px-2 py-2"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-graphite-700">
                Current Role
              </span>
              <input
                value={context?.profile.role ?? "coach"}
                readOnly
                className="mt-2 w-full rounded-lg border border-graphite-200 bg-graphite-50 px-3 py-3 text-sm capitalize text-graphite-600"
              />
            </label>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-fairway-50 text-fairway-700">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold text-graphite-900">
                  Supabase
                </h2>
                <p className="text-sm text-graphite-500">
                  {hasSupabaseEnv() ? "Environment ready" : "Environment missing"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-graphite-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg bg-graphite-100 text-graphite-700">
                <UsersRound className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold text-graphite-900">
                  Access Model
                </h2>
                <p className="text-sm text-graphite-500">
                  Team membership is resolved from `profiles.team_id`.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
