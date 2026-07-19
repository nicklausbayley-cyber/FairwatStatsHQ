"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "../../lib/supabase/client";

type FormMessage = {
  type: "error" | "success";
  text: string;
};

async function getSignedInRedirectPath(role: string | null | undefined) {
  if (role === "player") {
    return "/enter-score";
  }

  if (role === "admin" || role === "coach") {
    return "/dashboard";
  }

  const onboardingResponse = await fetch("/api/onboarding");

  if (onboardingResponse.ok) {
    return "/onboarding";
  }

  return null;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!email.trim() || !password) {
      setMessage({ type: "error", text: "Email and password are required." });
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }

      let profileRole: string | null = null;

      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        profileRole = profile?.role ?? null;
      }

      const nextPath = await getSignedInRedirectPath(profileRole);

      if (!nextPath) {
        setMessage({
          type: "error",
          text:
            "Signed in, but no team profile is connected to this account. Please contact your coach or platform admin."
        });
        return;
      }

      setMessage({
        type: "success",
        text:
          nextPath === "/enter-score"
            ? "Signed in. Opening score entry..."
            : nextPath === "/onboarding"
              ? "Signed in. Opening onboarding..."
              : "Signed in. Opening dashboard..."
      });

      router.push(nextPath);
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not sign in. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 px-6 py-10 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:px-14">
          <div className="absolute left-[-120px] top-[-120px] h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute bottom-[-140px] right-[-120px] h-80 w-80 rounded-full bg-lime-400/10 blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-xl font-black shadow-xl backdrop-blur">
                FS
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200">
                  Fairway Stats HQ
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Team Golf Analytics
                </h1>
              </div>
            </div>

            <div className="mt-16 max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-200">
                Built for high school programs
              </p>
              <h2 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Know where your players are improving before the next match.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-200">
                Track rounds, hole-by-hole stats, trends, and player development from one clean dashboard.
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-12 grid gap-4 sm:grid-cols-3 lg:mt-0">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl backdrop-blur">
              <p className="text-2xl font-black text-white">18</p>
              <p className="mt-1 text-sm text-slate-200">Hole-by-hole tracking</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl backdrop-blur">
              <p className="text-2xl font-black text-white">GIR</p>
              <p className="mt-1 text-sm text-slate-200">Player trend insights</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-xl backdrop-blur">
              <p className="text-2xl font-black text-white">HQ</p>
              <p className="mt-1 text-sm text-slate-200">Coach-ready dashboard</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-50 px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
                Secure Sign In
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                Welcome back
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sign in to your Fairway Stats HQ account to access your team dashboard.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 sm:p-8"
            >
              <div className="space-y-5">
                {message ? (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                      message.type === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {message.text}
                  </div>
                ) : null}

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-800">
                    Email address
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    placeholder="coach@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-semibold text-slate-800">
                    Password
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-lg shadow-emerald-900/20 transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
                >
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </button>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                Accounts are created by your coach or Fairway Stats HQ admin.
                Contact your team admin if you need access.
              </div>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Fairway Stats HQ · High school golf performance tracking
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
