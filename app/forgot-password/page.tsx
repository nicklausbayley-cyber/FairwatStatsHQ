"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "../../lib/supabase/client";

const genericSuccessMessage =
  "If an account exists for that email, a password reset link has been sent. Check your inbox and spam folder.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");

    if (error) {
      setMessage({
        type: "error",
        text: "This password reset link is invalid or has expired. Request a new link."
      });
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!email.trim()) {
      setMessage({
        type: "error",
        text: "Enter the email address connected to your account."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`
      });

      setMessage({
        type: "success",
        text: genericSuccessMessage
      });
    } catch {
      setMessage({
        type: "error",
        text: "The reset request could not be completed. Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/fairway-stats-hq-logo.png"
            alt="Fairway Stats HQ logo"
            className="mx-auto h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-xl"
          />
          <p className="mt-5 text-sm font-bold uppercase tracking-[0.2em] text-emerald-200">
            Fairway Stats HQ
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">
            Reset your password
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Enter the email address connected to your account and we will send
            you a secure reset link.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </button>

            <Link
              href="/login"
              className="block text-center text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
