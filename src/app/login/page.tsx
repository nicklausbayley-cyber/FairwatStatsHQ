import { Flag, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { signInWithPassword } from "@/app/actions";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
    setup?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const envReady = hasSupabaseEnv();

  if (envReady) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;

    if (claims) {
      redirect("/dashboard");
    }
  }

  return (
    <main className="min-h-screen px-4 py-6 text-graphite-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-fairway-200 bg-white/80 px-4 py-2 text-sm font-semibold text-fairway-800 shadow-sm">
            <span className="flex size-8 items-center justify-center rounded-full bg-fairway-700 text-white">
              <Flag className="size-4" aria-hidden="true" />
            </span>
            Fairway Stats HQ
          </div>

          <div className="max-w-2xl space-y-5">
            <h1 className="text-4xl font-semibold tracking-normal text-graphite-900 sm:text-5xl">
              One clear view of every player, round, and trend.
            </h1>
            <p className="text-lg leading-8 text-graphite-600">
              Team-scoped dashboards for high school golf programs, built around
              clean scoring workflows and season-long performance signals.
            </p>
          </div>

          <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
            {[
              ["Team locked", "Users resolve to one team profile."],
              ["Role aware", "Admin, coach, and player paths are separated."],
              ["RLS first", "Supabase policies enforce team boundaries."]
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-white bg-white/85 p-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-graphite-900">
                  {label}
                </p>
                <p className="mt-2 text-sm leading-6 text-graphite-600">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-graphite-100 bg-white p-6 shadow-xl shadow-fairway-900/10 sm:p-8">
          <div className="mb-8 flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-semibold uppercase text-fairway-700">
                Secure Sign In
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-graphite-900">
                Welcome back
              </h2>
            </div>
            <div className="flex size-11 items-center justify-center rounded-lg bg-fairway-50 text-fairway-700">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </div>
          </div>

          {params.error ? (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {params.error}
            </div>
          ) : null}

          {!envReady || params.setup ? (
            <div className="mb-5 rounded-lg border border-pin-400/40 bg-[#fff8e8] px-4 py-3 text-sm leading-6 text-graphite-700">
              Add Supabase values to `.env.local` before signing in locally.
            </div>
          ) : null}

          <form action={signInWithPassword} className="space-y-5">
            <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
            <label className="block">
              <span className="text-sm font-medium text-graphite-700">
                Email
              </span>
              <span className="mt-2 flex items-center gap-3 rounded-lg border border-graphite-200 bg-white px-3 py-3 focus-within:border-fairway-500 focus-within:ring-4 focus-within:ring-fairway-100">
                <Mail className="size-4 text-graphite-400" aria-hidden="true" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="coach@school.edu"
                  className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-graphite-400"
                />
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-graphite-700">
                Password
              </span>
              <span className="mt-2 flex items-center gap-3 rounded-lg border border-graphite-200 bg-white px-3 py-3 focus-within:border-fairway-500 focus-within:ring-4 focus-within:ring-fairway-100">
                <LockKeyhole
                  className="size-4 text-graphite-400"
                  aria-hidden="true"
                />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Enter password"
                  className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-graphite-400"
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={!envReady}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fairway-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-fairway-800 disabled:cursor-not-allowed disabled:bg-graphite-300"
            >
              Sign in
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
