"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "../../lib/supabase/client";

type SessionStatus = "checking" | "valid" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasUpdated, setWasUpdated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkRecoverySession() {
      const code = new URLSearchParams(window.location.search).get("code");

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          if (isMounted) {
            setSessionStatus("invalid");
          }
          return;
        }

        window.history.replaceState({}, document.title, "/reset-password");
      }

      const {
        data: { user },
        error
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      setSessionStatus(!error && user ? "valid" : "invalid");
    }

    void checkRecoverySession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "Your new password must be at least 8 characters."
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: "The passwords do not match."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setMessage({
          type: "error",
          text:
            "The password could not be updated. The reset link may have expired."
        });
        return;
      }

      await supabase.auth.signOut();

      setWasUpdated(true);
      setMessage({
        type: "success",
        text: "Your password has been updated successfully. You can now sign in."
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setMessage({
        type: "error",
        text: "The password could not be updated. Please request a new link."
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
            Choose a new password
          </h1>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
          {sessionStatus === "checking" ? (
            <p className="text-center text-sm text-slate-600">
              Verifying your reset link...
            </p>
          ) : sessionStatus === "invalid" ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                This password reset link is invalid or has expired. Request a
                new link.
              </div>

              <Link
                href="/forgot-password"
                className="block rounded-2xl bg-emerald-700 px-5 py-3.5 text-center text-sm font-bold text-white hover:bg-emerald-800"
              >
                Request New Link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
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

              {!wasUpdated ? (
                <>
                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-800">
                      New password
                    </span>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-800">
                      Confirm new password
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      autoComplete="new-password"
                      required
                      minLength={8}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-bold uppercase tracking-[0.15em] text-white hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {isSubmitting ? "Updating..." : "Update Password"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="w-full rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  Return to Sign In
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
